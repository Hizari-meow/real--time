import crypto from 'node:crypto';
import { getPrismaClient } from '../../storage/db.js';
import {
  publishDomainEvent,
  stageOutboxEventInTransaction,
  dispatchCommittedOutboxEvent,
} from '../events/index.js';

export interface CreateWikiPageInput {
  orgId: string;
  title: string;
  areaId?: string;
  topic?: string;
  type?: 'SOP' | 'Hướng dẫn' | 'Biên bản' | 'Mẫu' | 'FAQ' | 'Dự án';
  owner: string;
  status?: 'draft' | 'pending_approval' | 'approved';
  tags?: string[];
  summary?: string;
  content: string;
  icon?: string;
  parentId?: string | null;
  linkedDocId?: string | null;
}

export class WikiService {
  private static instance: WikiService | null = null;

  public static getInstance(): WikiService {
    if (!WikiService.instance) {
      WikiService.instance = new WikiService();
    }
    return WikiService.instance;
  }

  /**
   * Create a new wiki page in workspace
   */
  public async createPage(input: CreateWikiPageInput) {
    const prisma = getPrismaClient();
    const cleanTitle = input.title.trim();
    if (!cleanTitle) throw new Error('Tiêu đề trang không được để trống');

    const id = `wiki-${crypto.randomUUID().slice(0, 8)}`;
    const page = await prisma.wikiPage.create({
      data: {
        id,
        orgId: input.orgId,
        title: cleanTitle,
        areaId: input.areaId || 'general',
        topic: input.topic || null,
        type: input.type || 'SOP',
        owner: input.owner,
        status: input.status || 'draft',
        tags: input.tags || [],
        summary: input.summary || '',
        content: input.content,
        icon: input.icon || '📄',
        parentId: input.parentId || null,
        linkedDocId: input.linkedDocId || null,
        lastReviewed: input.type === 'SOP' && input.status === 'approved' ? new Date().toISOString() : null,
      },
    });

    await publishDomainEvent({
      type: 'wiki.page_created',
      orgId: input.orgId,
      actor: { type: 'user', id: input.owner, name: input.owner },
      resource: { type: 'wiki_page', id: page.id, title: page.title },
      data: {
        pageId: page.id,
        title: page.title,
        type: page.type,
        areaId: page.areaId,
      },
    });

    return page;
  }

  /**
   * Get single wiki page by ID
   */
  public async getPage(id: string, orgId: string) {
    const prisma = getPrismaClient();
    const page = await prisma.wikiPage.findFirst({
      where: { id, orgId },
    });
    return page;
  }

  /**
   * List wiki pages with filtering and multi-tenant workspace isolation
   */
  public async listPages(
    orgId: string,
    query: {
      areaId?: string;
      type?: string;
      status?: string;
      tag?: string;
      search?: string;
      isArchived?: boolean;
    } = {}
  ) {
    const prisma = getPrismaClient();

    const where: any = {
      orgId,
      isArchived: query.isArchived === true,
    };

    if (query.areaId && query.areaId !== 'all') {
      where.areaId = query.areaId;
    }

    if (query.type && query.type !== 'all') {
      where.type = query.type;
    }

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.tag && query.tag.trim()) {
      where.tags = { has: query.tag.trim() };
    }

    if (query.search && query.search.trim()) {
      where.OR = [
        { title: { contains: query.search.trim(), mode: 'insensitive' } },
        { summary: { contains: query.search.trim(), mode: 'insensitive' } },
        { content: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const pages = await prisma.wikiPage.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return pages;
  }

  /**
   * Get nested page tree for navigation sidebar
   */
  public async getTree(orgId: string) {
    const prisma = getPrismaClient();

    const pages = await prisma.wikiPage.findMany({
      where: { orgId, isArchived: false },
      select: {
        id: true,
        title: true,
        icon: true,
        areaId: true,
        parentId: true,
        type: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { title: 'asc' },
    });

    // Build hierarchical tree
    const nodeMap = new Map<string, any>();
    const rootNodes: any[] = [];

    for (const p of pages) {
      nodeMap.set(p.id, { ...p, children: [] });
    }

    for (const p of pages) {
      const node = nodeMap.get(p.id);
      if (p.parentId && nodeMap.has(p.parentId)) {
        nodeMap.get(p.parentId).children.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  /**
   * Update wiki page
   */
  public async updatePage(id: string, orgId: string, data: Partial<CreateWikiPageInput>) {
    const prisma = getPrismaClient();

    const updateData: any = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.areaId !== undefined) updateData.areaId = data.areaId;
    if (data.topic !== undefined) updateData.topic = data.topic;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.linkedDocId !== undefined) updateData.linkedDocId = data.linkedDocId;

    const updated = await prisma.wikiPage.updateMany({
      where: { id, orgId },
      data: updateData,
    });

    if (updated.count === 0) throw new Error('Trang không tồn tại trong không gian làm việc');

    const page = await this.getPage(id, orgId);

    await publishDomainEvent({
      type: 'wiki.page_updated',
      orgId,
      actor: { type: 'user', id: data.owner || 'system' },
      resource: { type: 'wiki_page', id, title: page?.title },
      data: { pageId: id, title: page?.title },
    });

    return page;
  }

  /**
   * Update page approval status (specifically for SOP reviews)
   */
  public async updateStatus(id: string, orgId: string, status: 'draft' | 'pending_approval' | 'approved', reviewer?: string) {
    const prisma = getPrismaClient();

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'approved') {
      updateData.lastReviewed = new Date().toISOString();
    }

    let approvedEnvelope: any = null;
    let sopEnvelope: any = null;

    const page = await this.getPage(id, orgId);

    await prisma.$transaction(async (tx) => {
      await tx.wikiPage.updateMany({
        where: { id, orgId },
        data: updateData,
      });

      if (status === 'approved') {
        approvedEnvelope = await stageOutboxEventInTransaction(tx, {
          type: 'approval.approved',
          orgId,
          actor: { type: 'user', id: reviewer || 'system' },
          resource: { type: 'wiki_page', id, title: page?.title },
          data: {
            pageId: id,
            title: page?.title,
            type: page?.type,
            status: 'approved',
            reviewer: reviewer || 'system',
          },
        });

        if (page?.type === 'SOP') {
          sopEnvelope = await stageOutboxEventInTransaction(tx, {
            type: 'sop.published',
            orgId,
            actor: { type: 'user', id: reviewer || 'system' },
            resource: { type: 'wiki_page', id, title: page.title },
            data: { pageId: id, title: page.title, status },
          });
        }
      }
    });

    if (approvedEnvelope) dispatchCommittedOutboxEvent(approvedEnvelope).catch(() => {});
    if (sopEnvelope) dispatchCommittedOutboxEvent(sopEnvelope).catch(() => {});

    return await this.getPage(id, orgId);
  }

  /**
   * Move page in tree with cycle detection
   */
  public async movePage(id: string, orgId: string, newParentId: string | null) {
    const prisma = getPrismaClient();

    const page = await prisma.wikiPage.findFirst({ where: { id, orgId } });
    if (!page) {
      throw new Error('Trang không tồn tại trong không gian làm việc');
    }

    // Moving to root
    if (!newParentId) {
      await prisma.wikiPage.updateMany({
        where: { id, orgId },
        data: { parentId: null, updatedAt: new Date() },
      });
      return this.getPage(id, orgId);
    }

    // Self-parenting cycle
    if (newParentId === id) {
      throw new Error('Trang không thể là cha của chính nó');
    }

    // Validate parent exists in the same workspace
    const parent = await prisma.wikiPage.findFirst({
      where: { id: newParentId, orgId },
    });
    if (!parent) {
      throw new Error('Trang cha không tồn tại trong không gian làm việc');
    }

    // Cycle detection: traverse upward from newParentId to ensure id is not an ancestor
    let currentAncestorId: string | null = newParentId;
    const visited = new Set<string>();
    let depth = 0;
    const MAX_DEPTH = 100;

    while (currentAncestorId) {
      if (currentAncestorId === id) {
        throw new Error('Không thể di chuyển trang vào nhánh con của chính nó (phát hiện chu trình)');
      }
      if (visited.has(currentAncestorId) || depth++ > MAX_DEPTH) {
        throw new Error('Phát hiện chu trình hoặc vượt quá độ sâu phân cấp tối đa');
      }
      visited.add(currentAncestorId);

      const ancestor: { parentId: string | null } | null = await prisma.wikiPage.findFirst({
        where: { id: currentAncestorId, orgId },
        select: { parentId: true },
      });
      currentAncestorId = ancestor?.parentId || null;
    }

    await prisma.wikiPage.updateMany({
      where: { id, orgId },
      data: { parentId: newParentId, updatedAt: new Date() },
    });
    return this.getPage(id, orgId);
  }

  /**
   * Discover backlinks pointing to this page
   */
  public async getBacklinks(id: string, orgId: string) {
    const prisma = getPrismaClient();
    const currentPage = await this.getPage(id, orgId);
    if (!currentPage) return [];

    // Search pages mentioning [[Title]] or wiki/id
    const candidates = await prisma.wikiPage.findMany({
      where: {
        orgId,
        id: { not: id },
        isArchived: false,
      },
      select: {
        id: true,
        title: true,
        icon: true,
        areaId: true,
        type: true,
        content: true,
      },
    });

    const titleToken = `[[${currentPage.title}]]`;
    const idToken = `/wiki/${id}`;

    const backlinks = candidates
      .filter((p) => p.content.includes(titleToken) || p.content.includes(idToken))
      .map((p) => ({
        id: p.id,
        title: p.title,
        icon: p.icon,
        areaId: p.areaId,
        type: p.type,
      }));

    return backlinks;
  }

  /**
   * Get all distinct tags in workspace
   */
  public async listTags(orgId: string) {
    const prisma = getPrismaClient();
    const pages = await prisma.wikiPage.findMany({
      where: { orgId, isArchived: false },
      select: { tags: true },
    });

    const tagCounts = new Map<string, number>();
    for (const p of pages) {
      for (const t of p.tags) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
    }

    return Array.from(tagCounts.entries()).map(([tag, count]) => ({
      tag,
      count,
    }));
  }

  /**
   * Archive / Unarchive page
   */
  public async archivePage(id: string, orgId: string, isArchived: boolean = true) {
    const prisma = getPrismaClient();
    await prisma.wikiPage.updateMany({
      where: { id, orgId },
      data: { isArchived, updatedAt: new Date() },
    });

    if (isArchived) {
      await publishDomainEvent({
        type: 'wiki.page_archived',
        orgId,
        actor: { type: 'system', id: 'system' },
        resource: { type: 'wiki_page', id },
        data: { pageId: id },
      });
    }

    return this.getPage(id, orgId);
  }

  /**
   * Delete wiki page permanently
   */
  public async deletePage(id: string, orgId: string) {
    const prisma = getPrismaClient();
    // Reparent any child pages to root
    await prisma.wikiPage.updateMany({
      where: { orgId, parentId: id },
      data: { parentId: null, updatedAt: new Date() },
    });

    await prisma.wikiPage.deleteMany({
      where: { id, orgId },
    });

    return true;
  }
}
