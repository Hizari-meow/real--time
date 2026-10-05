import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://collab_user:collab_secret@localhost:5434/collab_db?schema=public',
    },
  },
});

export async function seed() {
  console.log('--- Starting Development Database Seed ---');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Primary Workspace: Acme Corporation
  const mainOrg = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: { name: 'Acme Corporation' },
    create: {
      id: 'org_main',
      name: 'Acme Corporation',
      slug: 'acme-corp',
      domain: 'acme.local',
      plan: 'enterprise',
    },
  });

  // 2. Isolated Workspace: Isolated Workspace Ltd (for testing workspace isolation)
  const isolatedOrg = await prisma.organization.upsert({
    where: { slug: 'isolated-org' },
    update: { name: 'Isolated Workspace Ltd' },
    create: {
      id: 'org_isolated',
      name: 'Isolated Workspace Ltd',
      slug: 'isolated-org',
      domain: 'isolated.local',
      plan: 'standard',
    },
  });

  // 3. Users & Memberships for Main Workspace
  const devUsers = [
    {
      id: 'usr_owner',
      email: 'owner@collab.local',
      name: 'Nguyễn Văn Nam',
      role: 'owner',
      department: 'Ban Giám Đốc',
    },
    {
      id: 'usr_admin',
      email: 'admin@collab.local',
      name: 'Trần Thị Linh',
      role: 'admin',
      department: 'Tài Chính & Kế Toán',
    },
    {
      id: 'usr_member',
      email: 'member@collab.local',
      name: 'Lê Hoàng',
      role: 'member',
      department: 'Kỹ Thuật Phần Mềm',
    },
    {
      id: 'usr_guest',
      email: 'guest@collab.local',
      name: 'David Smith',
      role: 'guest',
      department: 'Tư Vấn Kiến Trúc',
      guestExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
    },
  ];

  for (const u of devUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        passwordHash,
      },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        passwordHash,
      },
    });

    await prisma.member.upsert({
      where: {
        orgId_userId: {
          orgId: mainOrg.id,
          userId: user.id,
        },
      },
      update: {
        name: u.name,
        role: u.role,
        department: u.department,
        guestExpiresAt: (u as any).guestExpiresAt || null,
      },
      create: {
        orgId: mainOrg.id,
        userId: user.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        guestExpiresAt: (u as any).guestExpiresAt || null,
      },
    });
  }

  // 4. Isolated User for Isolated Org
  const isolatedUser = await prisma.user.upsert({
    where: { email: 'isolated_user@collab.local' },
    update: {
      name: 'Cô Lập User',
      passwordHash,
    },
    create: {
      id: 'usr_isolated',
      email: 'isolated_user@collab.local',
      name: 'Cô Lập User',
      passwordHash,
    },
  });

  await prisma.member.upsert({
    where: {
      orgId_userId: {
        orgId: isolatedOrg.id,
        userId: isolatedUser.id,
      },
    },
    update: {
      role: 'owner',
    },
    create: {
      orgId: isolatedOrg.id,
      userId: isolatedUser.id,
      name: 'Cô Lập User',
      email: isolatedUser.email,
      role: 'owner',
      department: 'Độc Lập',
    },
  });

  // 5. Initial Seed Tasks for Main Org & Isolated Org (Demonstrating PostgreSQL persistence)
  await prisma.task.upsert({
    where: { id: 'task-main-1' },
    update: {},
    create: {
      id: 'task-main-1',
      orgId: mainOrg.id,
      title: 'Xây dựng kiến trúc Authentication & RBAC',
      description: 'Hoàn thiện Phase 0 với PostgreSQL và Prisma',
      column: 'in_progress',
      priority: 'urgent',
      assigneeId: 'usr_owner',
      assigneeName: 'Nguyễn Văn Nam',
      labels: ['Backend', 'Security', 'Phase0'],
    },
  });

  await prisma.task.upsert({
    where: { id: 'task-isolated-1' },
    update: {},
    create: {
      id: 'task-isolated-1',
      orgId: isolatedOrg.id,
      title: 'Bí mật nội bộ của Isolated Workspace',
      description: 'Chỉ thành viên của org_isolated mới được phép thấy',
      column: 'todo',
      priority: 'high',
      assigneeId: isolatedUser.id,
      assigneeName: 'Cô Lập User',
      labels: ['Confidential'],
    },
  });

  // 6. Initial Seed Channels for Main Org & Isolated Org
  const chanGeneral = await prisma.channel.upsert({
    where: { id: 'chan_general' },
    update: {},
    create: {
      id: 'chan_general',
      orgId: mainOrg.id,
      name: 'chung-thao-luan',
      type: 'public',
      topic: 'Kênh trao đổi chung của toàn công ty',
    },
  });

  const chanEngineering = await prisma.channel.upsert({
    where: { id: 'chan_engineering' },
    update: {},
    create: {
      id: 'chan_engineering',
      orgId: mainOrg.id,
      name: 'ky-thuat-dev',
      type: 'public',
      topic: 'Trao đổi kỹ thuật, kiến trúc & PR',
    },
  });

  const chanManagement = await prisma.channel.upsert({
    where: { id: 'chan_management' },
    update: {},
    create: {
      id: 'chan_management',
      orgId: mainOrg.id,
      name: 'ban-quan-tri',
      type: 'private',
      topic: 'Kênh riêng của Ban quản trị',
      members: {
        create: [
          { userId: 'usr_owner', role: 'admin' },
          { userId: 'usr_admin', role: 'member' },
        ],
      },
    },
  });

  await prisma.channel.upsert({
    where: { id: 'chan_isolated' },
    update: {},
    create: {
      id: 'chan_isolated',
      orgId: isolatedOrg.id,
      name: 'kenh-co-lap',
      type: 'public',
      topic: 'Kênh nội bộ của Isolated Org',
    },
  });

  // 7. Initial Seed Messages for General & Tech channels
  const initialMsg = await prisma.message.upsert({
    where: { id: 'msg_welcome' },
    update: {},
    create: {
      id: 'msg_welcome',
      channelId: chanGeneral.id,
      senderId: 'usr_owner',
      senderName: 'Nguyễn Văn Nam',
      senderRole: 'Ban Giám Đốc',
      senderColor: '#2563eb',
      content: 'Chào mừng cả đội đến với Nền tảng Cộng tác Thời gian thực! 🚀',
      type: 'text',
    },
  });

  await prisma.messageReaction.upsert({
    where: {
      messageId_userId_emoji: {
        messageId: initialMsg.id,
        userId: 'usr_admin',
        emoji: '👍',
      },
    },
    update: {},
    create: {
      messageId: initialMsg.id,
      userId: 'usr_admin',
      emoji: '👍',
    },
  });

  // 8. Initial Seed Audit Log
  await prisma.auditLog.create({
    data: {
      orgId: mainOrg.id,
      action: 'SYSTEM_SEED',
      actor: 'System Seed Initializer',
      target: 'Workspace Database',
      ip: '127.0.0.1',
      status: 'SUCCESS',
      details: JSON.stringify({ seededUsers: devUsers.length + 1, workspaces: 2 }),
    },
  });

  console.log('--- Development Database Seed Completed Successfully ---');
}

if (process.argv[1] && process.argv[1].includes('seed.ts')) {
  seed()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('Seed Error:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
