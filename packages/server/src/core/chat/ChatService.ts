import { getPrismaClient } from '../../storage/db.js';
import { publishDomainEvent } from '../events/event-system.js';
import {
  ChannelSummary,
  FormattedMessage,
  AggregatedReaction,
  CreateChannelInput,
  SendMessageInput,
} from './types.js';

export class ChatService {
  private static instance: ChatService | null = null;

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Helper: aggregate raw MessageReaction records into { emoji, count, users }
   */
  private aggregateReactions(reactions: { emoji: string; userId: string }[]): AggregatedReaction[] {
    const map = new Map<string, string[]>();
    for (const r of reactions) {
      const users = map.get(r.emoji) || [];
      users.push(r.userId);
      map.set(r.emoji, users);
    }
    return Array.from(map.entries()).map(([emoji, users]) => ({
      emoji,
      count: users.length,
      users,
    }));
  }

  /**
   * Helper: format a Prisma Message into a client-ready FormattedMessage
   */
  private formatMessage(msg: any): FormattedMessage {
    const reactions = msg.reactions ? this.aggregateReactions(msg.reactions) : [];
    const replies = msg.replies || [];
    const threadCount = typeof msg._count?.replies === 'number' ? msg._count.replies : replies.length;
    let threadLastReplyAt: string | null = null;
    if (replies.length > 0) {
      const last = replies[replies.length - 1];
      threadLastReplyAt = last.createdAt ? new Date(last.createdAt).toISOString() : null;
    }

    return {
      id: msg.id,
      channelId: msg.channelId,
      parentId: msg.parentId || null,
      seq: msg.seq,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderColor: msg.senderColor || '#2563eb',
      senderRole: msg.senderRole || 'Thành viên',
      content: msg.content,
      type: msg.type || 'text',
      reactions,
      threadCount,
      threadLastReplyAt,
      createdAt: new Date(msg.createdAt).toISOString(),
    };
  }

  /**
   * Check if a user is an active member of the workspace
   */
  public async getWorkspaceMember(userId: string, orgId: string) {
    const prisma = getPrismaClient();
    return prisma.member.findFirst({
      where: {
        userId,
        orgId,
        status: 'active',
      },
    });
  }

  /**
   * Verify channel access authorization
   */
  public async canAccessChannel(userId: string, orgId: string, channelId: string) {
    const prisma = getPrismaClient();

    // 1. Workspace membership is mandatory
    const wsMember = await this.getWorkspaceMember(userId, orgId);
    if (!wsMember) {
      return { allowed: false, reason: 'NOT_WORKSPACE_MEMBER' as const };
    }

    // 2. Fetch channel in active workspace
    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        orgId,
        isArchived: false,
      },
      include: {
        members: true,
      },
    });

    if (!channel) {
      return { allowed: false, reason: 'CHANNEL_NOT_FOUND' as const };
    }

    // 3. Public channel: any workspace member is allowed
    if (channel.type === 'public') {
      return { allowed: true, channel, member: wsMember };
    }

    // 4. Private, DM, or Group DM: must be an explicit channel member
    const channelMember = channel.members.find((m) => m.userId === userId);
    if (!channelMember) {
      // Workspace owner can optionally view private channels or require explicit membership
      // In accordance with zero-leakage security, private channels strictly require membership
      return { allowed: false, reason: 'NOT_CHANNEL_MEMBER' as const, channel };
    }

    return { allowed: true, channel, member: wsMember, channelMember };
  }

  /**
   * List accessible channels in the active workspace
   */
  public async listChannels(userId: string, orgId: string): Promise<ChannelSummary[]> {
    const prisma = getPrismaClient();

    const wsMember = await this.getWorkspaceMember(userId, orgId);
    if (!wsMember) {
      return [];
    }

    const channels = await prisma.channel.findMany({
      where: {
        orgId,
        isArchived: false,
      },
      include: {
        members: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filter channels: user can see public channels OR channels where they are a member
    const accessible = channels.filter((ch) => {
      if (ch.type === 'public') return true;
      return ch.members.some((m) => m.userId === userId);
    });

    return accessible.map((ch) => ({
      id: ch.id,
      orgId: ch.orgId,
      spaceId: ch.spaceId,
      name: ch.name,
      type: ch.type as any,
      topic: ch.topic,
      isArchived: ch.isArchived,
      memberCount: ch._count.members,
      createdAt: ch.createdAt,
      updatedAt: ch.updatedAt,
      members: ch.members.map((m) => ({
        userId: m.userId,
        role: m.role,
        notifLevel: m.notifLevel,
        isMuted: m.isMuted,
      })),
    }));
  }

  /**
   * Create a new channel (public, private, dm, or group_dm)
   */
  public async createChannel(
    userId: string,
    orgId: string,
    input: CreateChannelInput
  ): Promise<ChannelSummary> {
    const prisma = getPrismaClient();

    const wsMember = await this.getWorkspaceMember(userId, orgId);
    if (!wsMember) {
      throw new Error('Người dùng không phải thành viên của workspace này');
    }

    const channelType = input.type || 'public';
    const channelName = input.name.trim();

    if (!channelName) {
      throw new Error('Tên kênh không được để trống');
    }

    // Create channel
    const channel = await prisma.channel.create({
      data: {
        orgId,
        name: channelName,
        type: channelType,
        topic: input.topic || null,
        spaceId: input.spaceId || null,
      },
    });

    // Automatically add creator as channel member
    const memberIdsToAdd = new Set<string>([userId]);
    if (input.memberIds && Array.isArray(input.memberIds)) {
      input.memberIds.forEach((id) => memberIdsToAdd.add(id));
    }

    // Verify all memberIds belong to the workspace
    const validMembers = await prisma.member.findMany({
      where: {
        orgId,
        userId: { in: Array.from(memberIdsToAdd) },
        status: 'active',
      },
    });

    for (const vm of validMembers) {
      await prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId: vm.userId,
          role: vm.userId === userId ? 'admin' : 'member',
          notifLevel: 'all',
          isMuted: false,
        },
      });
    }

    const created = await prisma.channel.findUnique({
      where: { id: channel.id },
      include: {
        members: true,
        _count: { select: { members: true } },
      },
    });

    return {
      id: created!.id,
      orgId: created!.orgId,
      spaceId: created!.spaceId,
      name: created!.name,
      type: created!.type as any,
      topic: created!.topic,
      isArchived: created!.isArchived,
      memberCount: created!._count.members,
      createdAt: created!.createdAt,
      updatedAt: created!.updatedAt,
      members: created!.members.map((m) => ({
        userId: m.userId,
        role: m.role,
        notifLevel: m.notifLevel,
        isMuted: m.isMuted,
      })),
    };
  }

  /**
   * Get or create a 1:1 Direct Message channel between two users in the workspace
   */
  public async getOrCreateDMChannel(
    userId: string,
    orgId: string,
    targetUserId: string
  ): Promise<ChannelSummary> {
    const prisma = getPrismaClient();

    const [userMember, targetMember] = await Promise.all([
      this.getWorkspaceMember(userId, orgId),
      this.getWorkspaceMember(targetUserId, orgId),
    ]);

    if (!userMember || !targetMember) {
      throw new Error('Một trong hai người dùng không thuộc workspace này');
    }

    // Find existing DM channel with both users
    const existingDmChannels = await prisma.channel.findMany({
      where: {
        orgId,
        type: 'dm',
        isArchived: false,
        members: {
          some: { userId },
        },
      },
      include: {
        members: true,
        _count: { select: { members: true } },
      },
    });

    const found = existingDmChannels.find((ch) =>
      ch.members.some((m) => m.userId === targetUserId)
    );

    if (found) {
      return {
        id: found.id,
        orgId: found.orgId,
        spaceId: found.spaceId,
        name: found.name,
        type: found.type as any,
        topic: found.topic,
        isArchived: found.isArchived,
        memberCount: found._count.members,
        createdAt: found.createdAt,
        updatedAt: found.updatedAt,
        members: found.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          notifLevel: m.notifLevel,
          isMuted: m.isMuted,
        })),
      };
    }

    // Create new DM channel
    const dmName = `dm_${userMember.name.split(' ').pop() || 'User'}_${targetMember.name.split(' ').pop() || 'User'}`;
    const newChannel = await prisma.channel.create({
      data: {
        orgId,
        name: dmName,
        type: 'dm',
        topic: `Trò chuyện trực tiếp giữa ${userMember.name} và ${targetMember.name}`,
        members: {
          create: [
            { userId, role: 'member' },
            { userId: targetUserId, role: 'member' },
          ],
        },
      },
      include: {
        members: true,
        _count: { select: { members: true } },
      },
    });

    return {
      id: newChannel.id,
      orgId: newChannel.orgId,
      spaceId: newChannel.spaceId,
      name: newChannel.name,
      type: newChannel.type as any,
      topic: newChannel.topic,
      isArchived: newChannel.isArchived,
      memberCount: newChannel._count.members,
      createdAt: newChannel.createdAt,
      updatedAt: newChannel.updatedAt,
      members: newChannel.members.map((m) => ({
        userId: m.userId,
        role: m.role,
        notifLevel: m.notifLevel,
        isMuted: m.isMuted,
      })),
    };
  }

  /**
   * Get paginated messages for a channel
   */
  public async getMessages(
    userId: string,
    orgId: string,
    channelId: string,
    options: { limit?: number; beforeSeq?: number } = {}
  ): Promise<{ messages: FormattedMessage[]; hasMore: boolean }> {
    const authCheck = await this.canAccessChannel(userId, orgId, channelId);
    if (!authCheck.allowed) {
      throw new Error(`Truy cập bị từ chối: ${authCheck.reason}`);
    }

    const prisma = getPrismaClient();
    const limit = Math.min(options.limit || 50, 100);

    const where: any = {
      channelId,
      parentId: null, // Only fetch top-level messages for channel timeline
    };

    if (options.beforeSeq !== undefined) {
      where.seq = { lt: options.beforeSeq };
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { seq: 'desc' },
      take: limit + 1,
      include: {
        reactions: true,
        replies: {
          select: {
            id: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    // Return in chronological order (oldest to newest)
    items.reverse();

    return {
      messages: items.map((m) => this.formatMessage(m)),
      hasMore,
    };
  }

  /**
   * Get thread replies for a specific message
   */
  public async getThreadReplies(
    userId: string,
    orgId: string,
    parentMessageId: string
  ): Promise<FormattedMessage[]> {
    const prisma = getPrismaClient();

    const parentMessage = await prisma.message.findUnique({
      where: { id: parentMessageId },
    });

    if (!parentMessage) {
      throw new Error('Tin nhắn gốc không tồn tại');
    }

    const authCheck = await this.canAccessChannel(userId, orgId, parentMessage.channelId);
    if (!authCheck.allowed) {
      throw new Error(`Truy cập bị từ chối: ${authCheck.reason}`);
    }

    const replies = await prisma.message.findMany({
      where: { parentId: parentMessageId },
      orderBy: { createdAt: 'asc' },
      include: {
        reactions: true,
      },
    });

    return replies.map((r) => this.formatMessage(r));
  }

  /**
   * Send a message to a channel
   */
  public async sendMessage(
    userId: string,
    orgId: string,
    channelId: string,
    input: SendMessageInput
  ): Promise<FormattedMessage> {
    const authCheck = await this.canAccessChannel(userId, orgId, channelId);
    if (!authCheck.allowed) {
      throw new Error(`Truy cập bị từ chối: ${authCheck.reason}`);
    }

    const prisma = getPrismaClient();
    const wsMember = authCheck.member!;

    const content = input.content ? input.content.trim() : '';
    if (!content) {
      throw new Error('Nội dung tin nhắn không được để trống');
    }

    // If replying to a thread, verify parent exists
    if (input.parentId) {
      const parent = await prisma.message.findUnique({
        where: { id: input.parentId },
      });
      if (!parent || parent.channelId !== channelId) {
        throw new Error('Tin nhắn chủ đề không tồn tại trong kênh này');
      }
    }

    // Persist message in PostgreSQL
    const message = await prisma.message.create({
      data: {
        channelId,
        parentId: input.parentId || null,
        senderId: userId,
        senderName: input.senderName || wsMember.name,
        senderColor: input.senderColor || '#2563eb',
        senderRole: input.senderRole || wsMember.role,
        content,
        type: input.type || 'text',
      },
      include: {
        reactions: true,
        replies: {
          select: { id: true, createdAt: true },
        },
      },
    });

    const formatted = this.formatMessage(message);

    // Emit domain event message.created via EventBus & OutboxRelay
    // This triggers NotificationService automatically for any @mentions!
    try {
      await publishDomainEvent({
        type: input.parentId ? 'message.thread_reply' : 'message.created',
        orgId,
        actor: {
          type: 'user',
          id: userId,
          name: formatted.senderName,
        },
        resource: {
          type: 'channel',
          id: channelId,
          messageId: message.id,
          parentId: input.parentId || null,
        },
        data: {
          channelId,
          messageId: message.id,
          parentId: input.parentId || null,
          content,
          senderName: formatted.senderName,
          targetUrl: `/chat?channelId=${channelId}`,
        },
      });
    } catch (evtErr) {
      console.error('[ChatService] Error publishing domain event for message:', evtErr);
    }

    return formatted;
  }

  /**
   * Toggle emoji reaction on a message
   */
  public async toggleReaction(
    userId: string,
    orgId: string,
    messageId: string,
    emoji: string
  ): Promise<{ messageId: string; channelId: string; reactions: AggregatedReaction[] }> {
    const prisma = getPrismaClient();

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Tin nhắn không tồn tại');
    }

    const authCheck = await this.canAccessChannel(userId, orgId, message.channelId);
    if (!authCheck.allowed) {
      throw new Error(`Truy cập bị từ chối: ${authCheck.reason}`);
    }

    const trimmedEmoji = emoji.trim();
    if (!trimmedEmoji) {
      throw new Error('Emoji không hợp lệ');
    }

    // Check if reaction already exists
    const existing = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji: trimmedEmoji,
        },
      },
    });

    if (existing) {
      await prisma.messageReaction.delete({
        where: { id: existing.id },
      });
    } else {
      await prisma.messageReaction.create({
        data: {
          messageId,
          userId,
          emoji: trimmedEmoji,
        },
      });
    }

    // Fetch updated reactions
    const updatedReactions = await prisma.messageReaction.findMany({
      where: { messageId },
    });

    const aggregated = this.aggregateReactions(updatedReactions);

    return {
      messageId,
      channelId: message.channelId,
      reactions: aggregated,
    };
  }
}
