import { getPrismaClient } from '../../storage/db.js';

export interface MentionResolution {
  userId: string;
  name: string;
  email: string;
}

export class MentionService {
  private static instance: MentionService | null = null;

  public static getInstance(): MentionService {
    if (!MentionService.instance) {
      MentionService.instance = new MentionService();
    }
    return MentionService.instance;
  }

  /**
   * Extract raw mention tokens from content text (e.g. "@Lan", "@nam.nguyen", "@usr_owner")
   */
  public extractMentionTokens(text: string): string[] {
    if (!text || typeof text !== 'string') return [];

    // Match @word, @email, or @name (alphanumeric, dots, underscores, dashes)
    const regex = /(?:^|\s)@([a-zA-Z0-9_.\-]+)/g;
    const tokens = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        tokens.add(match[1].trim());
      }
    }

    return Array.from(tokens);
  }

  /**
   * Resolve mention tokens against active workspace members in PostgreSQL.
   * Enforces:
   * 1. Workspace Isolation: User must be a member of `orgId`.
   * 2. Self-mention exclusion: Author does not receive a self-mention notification.
   */
  public async resolveMentionedUsers(
    orgId: string,
    tokens: string[],
    authorUserId?: string
  ): Promise<MentionResolution[]> {
    if (!tokens.length) return [];

    const prisma = getPrismaClient();

    // Query active members of the workspace
    const members = await prisma.member.findMany({
      where: {
        orgId,
        status: 'active',
      },
      include: {
        user: true,
      },
    });

    const resolvedMap = new Map<string, MentionResolution>();

    for (const token of tokens) {
      const tokenLower = token.toLowerCase();

      for (const m of members) {
        // Skip author from receiving their own mention
        if (authorUserId && m.userId === authorUserId) {
          continue;
        }

        const emailName = m.email.split('@')[0].toLowerCase();
        const fullName = m.name.toLowerCase();
        const firstName = m.name.split(' ').slice(-1)[0]?.toLowerCase() || '';

        // Match against userId, full email, email prefix, full name, or first name
        const isMatch =
          m.userId.toLowerCase() === tokenLower ||
          m.email.toLowerCase() === tokenLower ||
          emailName === tokenLower ||
          fullName === tokenLower ||
          firstName === tokenLower ||
          fullName.includes(tokenLower);

        if (isMatch) {
          resolvedMap.set(m.userId, {
            userId: m.userId,
            name: m.name,
            email: m.email,
          });
        }
      }
    }

    return Array.from(resolvedMap.values());
  }
}
