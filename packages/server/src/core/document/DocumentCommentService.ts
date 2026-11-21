import crypto from 'node:crypto';
import { getPrismaClient } from '../../storage/db.js';
import { MentionService } from '../mention/MentionService.js';
import { NotificationService } from '../notification/NotificationService.js';
import { publishDomainEvent } from '../events/event-system.js';

export interface CreateCommentInput {
  orgId: string;
  documentId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  anchorJson?: string;
  parentId?: string | null;
}

export class DocumentCommentService {
  private static instance: DocumentCommentService | null = null;

  public static getInstance(): DocumentCommentService {
    if (!DocumentCommentService.instance) {
      DocumentCommentService.instance = new DocumentCommentService();
    }
    return DocumentCommentService.instance;
  }

  /**
   * Create and persist a document contextual comment
   */
  public async createComment(input: CreateCommentInput) {
    const prisma = getPrismaClient();
    const cleanContent = input.content.trim();
    if (!cleanContent) throw new Error('Nội dung bình luận không được để trống');

    const commentId = `cmt-${crypto.randomUUID().slice(0, 8)}`;
    const comment = await prisma.documentComment.create({
      data: {
        id: commentId,
        orgId: input.orgId,
        documentId: input.documentId,
        authorId: input.authorId,
        authorName: input.authorName,
        authorAvatar: input.authorAvatar || null,
        content: cleanContent,
        anchorJson: input.anchorJson || null,
        status: 'open',
        parentId: input.parentId || null,
      },
    });

    // Detect and resolve @mentions
    const mentionTokens = MentionService.getInstance().extractMentionTokens(cleanContent);
    if (mentionTokens.length > 0) {
      const mentionedUsers = await MentionService.getInstance().resolveMentionedUsers(
        input.orgId,
        mentionTokens,
        input.authorId
      );

      // Create notification for each mentioned user
      for (const m of mentionedUsers) {
        await NotificationService.getInstance().createNotification({
          orgId: input.orgId,
          userId: m.userId,
          actorId: input.authorId,
          type: 'mention',
          title: `${input.authorName} đã nhắc bạn trong một tài liệu`,
          body: cleanContent.slice(0, 120),
          senderName: input.authorName,
          targetUrl: `/doc/${input.documentId}#${comment.id}`,
          targetLabel: 'Mở bình luận trong tài liệu',
          targetDocId: input.documentId,
          isPriority: true,
          metadata: { commentId: comment.id, documentId: input.documentId },
        });
      }
    }

    // Publish domain event
    await publishDomainEvent({
      type: 'comment.created',
      orgId: input.orgId,
      actor: { type: 'user', id: input.authorId, name: input.authorName },
      resource: { type: 'document', id: input.documentId },
      data: {
        commentId: comment.id,
        documentId: input.documentId,
        authorName: input.authorName,
        content: cleanContent,
      },
    });

    return comment;
  }

  /**
   * List threaded comments for document
   */
  public async listComments(documentId: string, orgId: string) {
    const prisma = getPrismaClient();

    const comments = await prisma.documentComment.findMany({
      where: { documentId, orgId },
      orderBy: { createdAt: 'asc' },
    });

    // Threading: attach replies to root comments
    const rootComments: any[] = [];
    const replyMap = new Map<string, any[]>();

    for (const c of comments) {
      if (c.parentId) {
        if (!replyMap.has(c.parentId)) replyMap.set(c.parentId, []);
        replyMap.get(c.parentId)!.push(c);
      }
    }

    for (const c of comments) {
      if (!c.parentId) {
        rootComments.push({
          ...c,
          replies: replyMap.get(c.id) || [],
        });
      }
    }

    return rootComments;
  }

  /**
   * Resolve / unresolve a comment thread
   */
  public async resolveComment(commentId: string, orgId: string, resolved: boolean = true) {
    const prisma = getPrismaClient();
    const status = resolved ? 'resolved' : 'open';

    await prisma.documentComment.updateMany({
      where: { id: commentId, orgId },
      data: { status, updatedAt: new Date() },
    });

    const comment = await prisma.documentComment.findFirst({
      where: { id: commentId, orgId },
    });

    if (comment) {
      await publishDomainEvent({
        type: resolved ? 'comment.resolved' : 'comment.reopened',
        orgId,
        actor: { type: 'system', id: 'system' },
        resource: { type: 'document', id: comment.documentId },
        data: { commentId, documentId: comment.documentId, status },
      });
    }

    return comment;
  }

  /**
   * Delete comment
   */
  public async deleteComment(commentId: string, orgId: string) {
    const prisma = getPrismaClient();

    // Delete replies first
    await prisma.documentComment.deleteMany({
      where: { parentId: commentId, orgId },
    });

    // Delete comment
    await prisma.documentComment.deleteMany({
      where: { id: commentId, orgId },
    });

    return true;
  }
}
