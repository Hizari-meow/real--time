import { ZaloUser, ZaloConversation, ZaloMessage } from './types';

export const PRESET_USERS: ZaloUser[] = [
  {
    id: 'usr_nam',
    name: 'Nguyễn Văn Nam',
    color: '#0068ff', // Zalo Blue
    phone: '0912 345 678',
    role: 'leader',
    isOnline: true,
  },
  {
    id: 'usr_mai',
    name: 'Trần Thị Mai',
    color: '#ec4899',
    phone: '0988 765 432',
    role: 'deputy',
    isOnline: true,
  },
  {
    id: 'usr_long',
    name: 'Lê Hoàng Long',
    color: '#10b981',
    phone: '0903 112 233',
    role: 'member',
    isOnline: false,
    lastSeen: Date.now() - 1000 * 60 * 15,
  },
  {
    id: 'usr_alice',
    name: 'Alice (Kiến trúc sư)',
    color: '#8b5cf6',
    phone: '0934 556 789',
    role: 'leader',
    isOnline: true,
  },
  {
    id: 'usr_bob',
    name: 'Bob (DevOps)',
    color: '#f59e0b',
    phone: '0977 889 900',
    role: 'member',
    isOnline: false,
    lastSeen: Date.now() - 1000 * 60 * 45,
  },
];

/**
 * Computes deterministic direct message room ID between two users
 */
export function getDirectRoomId(userAId: string, userBId: string): string {
  const sorted = [userAId, userBId].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

/**
 * Computes deterministic personal cloud room ID
 */
export function getMyCloudRoomId(userId: string): string {
  return `cloud_${userId}`;
}

export const BASE_GROUP_CONVERSATIONS: ZaloConversation[] = [
  {
    id: 'group_tech',
    type: 'group',
    name: 'Nhóm Kỹ Thuật & Kiến Trúc',
    members: [PRESET_USERS[0], PRESET_USERS[1], PRESET_USERS[2], PRESET_USERS[3]],
    isPinned: true,
    isMuted: false,
    unreadCount: 0,
    lastMessage: {
      text: 'Mọi người đã kiểm tra cụm Redis Pub/Sub và NGINX chưa?',
      senderName: 'Nguyễn Văn Nam',
      timestamp: Date.now() - 1000 * 60 * 12,
    },
  },
  {
    id: 'group_frontend',
    type: 'group',
    name: 'Đội Ngũ Frontend & UI/UX',
    members: [PRESET_USERS[1], PRESET_USERS[3], PRESET_USERS[0]],
    isPinned: false,
    isMuted: false,
    unreadCount: 1,
    lastMessage: {
      text: 'Giao diện chat mới theo phong cách Zalo nhìn hiện đại và êm mắt hơn hẳn!',
      senderName: 'Trần Thị Mai',
      timestamp: Date.now() - 1000 * 60 * 25,
    },
  },
  {
    id: 'group_allhands',
    type: 'group',
    name: 'Kênh Thông Báo Toàn Công Ty',
    members: PRESET_USERS,
    isPinned: true,
    isMuted: true,
    unreadCount: 0,
    lastMessage: {
      text: 'Chào mừng các bạn đến với Nền tảng Cộng tác & Chat Thời Gian Thực!',
      senderName: 'Ban Quản Trị',
      timestamp: Date.now() - 1000 * 60 * 120,
    },
  },
];

export const INITIAL_MESSAGES: Record<string, ZaloMessage[]> = {
  // Cloud của tôi (My Cloud) per user
  cloud_usr_nam: [
    {
      id: 'msg_cloud_nam_1',
      roomId: 'cloud_usr_nam',
      senderId: 'usr_nam',
      senderName: 'Cloud của tôi',
      senderColor: '#0068ff',
      type: 'text',
      content: '☁️ Chào mừng bạn đến với Cloud của tôi! Đây là không gian lưu trữ cá nhân an toàn để bạn lưu ảnh, tệp tin và ghi chú riêng tư.',
      timestamp: Date.now() - 1000 * 60 * 120,
      reactions: {},
      isPinned: true,
    },
    {
      id: 'msg_cloud_nam_2',
      roomId: 'cloud_usr_nam',
      senderId: 'usr_nam',
      senderName: 'Nguyễn Văn Nam',
      senderColor: '#0068ff',
      type: 'text',
      content: 'Ghi chú công việc: Kiểm tra tính năng đồng bộ tin nhắn thời gian thực và trải nghiệm gọi thoại WebRTC.',
      timestamp: Date.now() - 1000 * 60 * 30,
      reactions: {},
    },
  ],
  cloud_usr_mai: [
    {
      id: 'msg_cloud_mai_1',
      roomId: 'cloud_usr_mai',
      senderId: 'usr_mai',
      senderName: 'Cloud của tôi',
      senderColor: '#ec4899',
      type: 'text',
      content: '☁️ Chào mừng Mai đến với Cloud cá nhân! Lưu trữ các bản phác thảo giao diện và tài liệu thiết kế tại đây.',
      timestamp: Date.now() - 1000 * 60 * 60,
      reactions: {},
      isPinned: true,
    },
  ],
  cloud_usr_long: [
    {
      id: 'msg_cloud_long_1',
      roomId: 'cloud_usr_long',
      senderId: 'usr_long',
      senderName: 'Cloud của tôi',
      senderColor: '#10b981',
      type: 'text',
      content: '☁️ Cloud của Long: Nơi lưu các liên kết tài liệu kỹ thuật và checklist kiểm thử.',
      timestamp: Date.now() - 1000 * 60 * 60,
      reactions: {},
      isPinned: true,
    },
  ],
  cloud_usr_alice: [
    {
      id: 'msg_cloud_alice_1',
      roomId: 'cloud_usr_alice',
      senderId: 'usr_alice',
      senderName: 'Cloud của tôi',
      senderColor: '#8b5cf6',
      type: 'text',
      content: '☁️ Cloud của Alice: Sơ đồ kiến trúc microservices và tài liệu hội tụ CRDT.',
      timestamp: Date.now() - 1000 * 60 * 60,
      reactions: {},
      isPinned: true,
    },
  ],
  cloud_usr_bob: [
    {
      id: 'msg_cloud_bob_1',
      roomId: 'cloud_usr_bob',
      senderId: 'usr_bob',
      senderName: 'Cloud của tôi',
      senderColor: '#f59e0b',
      type: 'text',
      content: '☁️ Cloud của Bob: Các cấu hình Docker Compose và NGINX Gateway.',
      timestamp: Date.now() - 1000 * 60 * 60,
      reactions: {},
      isPinned: true,
    },
  ],

  // Group Rooms
  group_tech: [
    {
      id: 'msg_tech_1',
      roomId: 'group_tech',
      senderId: 'usr_nam',
      senderName: 'Nguyễn Văn Nam',
      senderColor: '#0068ff',
      type: 'text',
      content: 'Chào cả nhà, chúng ta bắt đầu triển khai kiến trúc Chat thời gian thực quy mô lớn nhé! 🚀',
      timestamp: Date.now() - 1000 * 60 * 90,
      reactions: { '👍': ['usr_mai', 'usr_alice'], '🔥': ['usr_alice'] },
      isPinned: true,
    },
    {
      id: 'msg_tech_2',
      roomId: 'group_tech',
      senderId: 'usr_alice',
      senderName: 'Alice (Kiến trúc sư)',
      senderColor: '#8b5cf6',
      type: 'text',
      content: 'Cụm WebSocket gồm 2 node kết nối qua Redis Pub/Sub đã sẵn sàng chịu tải hàng chục nghìn kết nối đồng thời.',
      timestamp: Date.now() - 1000 * 60 * 60,
      reactions: { '❤️': ['usr_nam'] },
    },
    {
      id: 'msg_tech_3',
      roomId: 'group_tech',
      senderId: 'usr_mai',
      senderName: 'Trần Thị Mai',
      senderColor: '#ec4899',
      type: 'image',
      content: 'Kiến trúc phân tán Real-Time Web',
      mediaUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
      mediaMeta: { fileName: 'architecture_diagram.png', fileSize: 1024 * 350 },
      timestamp: Date.now() - 1000 * 60 * 45,
      reactions: { '😮': ['usr_nam'], '🔥': ['usr_long'] },
    },
    {
      id: 'msg_tech_4',
      roomId: 'group_tech',
      senderId: 'usr_long',
      senderName: 'Lê Hoàng Long',
      senderColor: '#10b981',
      type: 'file',
      content: 'Tài liệu kiểm thử hội tụ CRDT 500 thao tác đồng thời',
      mediaMeta: { fileName: 'CRDT_Convergence_Report.pdf', fileSize: 1024 * 1024 * 2.4, fileType: 'pdf' },
      timestamp: Date.now() - 1000 * 60 * 30,
      reactions: { '👍': ['usr_nam', 'usr_alice'] },
    },
    {
      id: 'msg_tech_5',
      roomId: 'group_tech',
      senderId: 'usr_nam',
      senderName: 'Nguyễn Văn Nam',
      senderColor: '#0068ff',
      type: 'voice',
      content: 'Tin nhắn thoại (0:12s)',
      mediaMeta: { duration: 12 },
      timestamp: Date.now() - 1000 * 60 * 20,
      reactions: { '❤️': ['usr_mai'] },
    },
    {
      id: 'msg_tech_6',
      roomId: 'group_tech',
      senderId: 'usr_mai',
      senderName: 'Trần Thị Mai',
      senderColor: '#ec4899',
      type: 'sticker',
      content: '🎉',
      timestamp: Date.now() - 1000 * 60 * 15,
      reactions: {},
    },
    {
      id: 'msg_tech_7',
      roomId: 'group_tech',
      senderId: 'usr_nam',
      senderName: 'Nguyễn Văn Nam',
      senderColor: '#0068ff',
      type: 'text',
      content: 'Mọi người đã kiểm tra cụm Redis Pub/Sub và NGINX chưa?',
      timestamp: Date.now() - 1000 * 60 * 12,
      reactions: {},
    },
  ],
  group_frontend: [
    {
      id: 'msg_fe_1',
      roomId: 'group_frontend',
      senderId: 'usr_mai',
      senderName: 'Trần Thị Mai',
      senderColor: '#ec4899',
      type: 'text',
      content: 'Giao diện chat mới theo phong cách Zalo nhìn hiện đại và êm mắt hơn hẳn!',
      timestamp: Date.now() - 1000 * 60 * 25,
      reactions: { '❤️': ['usr_alice'] },
    },
  ],
  group_allhands: [
    {
      id: 'msg_all_1',
      roomId: 'group_allhands',
      senderId: 'usr_nam',
      senderName: 'Ban Quản Trị',
      senderColor: '#0068ff',
      type: 'text',
      content: 'Chào mừng các bạn đến với Nền tảng Cộng tác & Chat Thời Gian Thực!',
      timestamp: Date.now() - 1000 * 60 * 120,
      reactions: { '🎉': ['usr_mai', 'usr_alice', 'usr_long', 'usr_bob'] },
      isPinned: true,
    },
  ],

  // 1-on-1 Direct Message Rooms
  dm_usr_mai_usr_nam: [
    {
      id: 'msg_dm_mn_1',
      roomId: 'dm_usr_mai_usr_nam',
      senderId: 'usr_nam',
      senderName: 'Nguyễn Văn Nam',
      senderColor: '#0068ff',
      type: 'text',
      content: 'Chào Mai! Bạn xem qua bố cục chat mới chuẩn phong cách Zalo nhé.',
      timestamp: Date.now() - 1000 * 60 * 60,
      reactions: { '👍': ['usr_mai'] },
    },
    {
      id: 'msg_dm_mn_2',
      roomId: 'dm_usr_mai_usr_nam',
      senderId: 'usr_mai',
      senderName: 'Trần Thị Mai',
      senderColor: '#ec4899',
      type: 'text',
      content: 'Mình vừa kiểm tra xong Nam ơi, bong bóng tin nhắn màu xanh nhạt `#e5efff` đọc rất êm mắt, không còn bị chói lóa như trước nữa!',
      timestamp: Date.now() - 1000 * 60 * 45,
      reactions: { '❤️': ['usr_nam'] },
    },
    {
      id: 'msg_dm_mn_3',
      roomId: 'dm_usr_mai_usr_nam',
      senderId: 'usr_nam',
      senderName: 'Nguyễn Văn Nam',
      senderColor: '#0068ff',
      type: 'text',
      content: 'Tuyệt vời! Tính năng lưu tin nhắn offline và chuyển đổi phòng không còn bị trắng tinh nữa rồi.',
      timestamp: Date.now() - 1000 * 60 * 10,
      reactions: {},
    },
    {
      id: 'msg_dm_mn_4',
      roomId: 'dm_usr_mai_usr_nam',
      senderId: 'usr_mai',
      senderName: 'Trần Thị Mai',
      senderColor: '#ec4899',
      type: 'text',
      content: 'Chuẩn luôn, bấm qua lại giữa các phòng cực kỳ mượt mà. 💯',
      timestamp: Date.now() - 1000 * 60 * 5,
      reactions: { '🔥': ['usr_nam'] },
    },
  ],

  dm_usr_alice_usr_nam: [
    {
      id: 'msg_dm_an_1',
      roomId: 'dm_usr_alice_usr_nam',
      senderId: 'usr_alice',
      senderName: 'Alice (Kiến trúc sư)',
      senderColor: '#8b5cf6',
      type: 'text',
      content: 'Nam ơi, kiểm tra kết nối WebRTC Calling xem tín hiệu đã ổn định chưa nhé.',
      timestamp: Date.now() - 1000 * 60 * 75,
      reactions: {},
    },
    {
      id: 'msg_dm_an_2',
      roomId: 'dm_usr_alice_usr_nam',
      senderId: 'usr_nam',
      senderName: 'Nguyễn Văn Nam',
      senderColor: '#0068ff',
      type: 'text',
      content: 'Tín hiệu âm thanh và video 1080p truyền qua PeerConnection rất tốt, độ trễ chỉ khoảng 35ms.',
      timestamp: Date.now() - 1000 * 60 * 50,
      reactions: { '👍': ['usr_alice'] },
    },
    {
      id: 'msg_dm_an_3',
      roomId: 'dm_usr_alice_usr_nam',
      senderId: 'usr_alice',
      senderName: 'Alice (Kiến trúc sư)',
      senderColor: '#8b5cf6',
      type: 'text',
      content: 'Rất tốt! Cả tính năng chia sẻ màn hình và đổi camera cũng hoạt động trơn tru.',
      timestamp: Date.now() - 1000 * 60 * 20,
      reactions: { '🎉': ['usr_nam'] },
    },
  ],

  dm_usr_long_usr_nam: [
    {
      id: 'msg_dm_ln_1',
      roomId: 'dm_usr_long_usr_nam',
      senderId: 'usr_long',
      senderName: 'Lê Hoàng Long',
      senderColor: '#10b981',
      type: 'text',
      content: 'Anh Nam ơi, em đã thêm danh mục tài liệu và bảng Kanban vào hệ thống rồi nhé.',
      timestamp: Date.now() - 1000 * 60 * 80,
      reactions: {},
    },
    {
      id: 'msg_dm_ln_2',
      roomId: 'dm_usr_long_usr_nam',
      senderId: 'usr_nam',
      senderName: 'Nguyễn Văn Nam',
      senderColor: '#0068ff',
      type: 'text',
      content: 'Tốt lắm Long! Có thể gửi trực tiếp thẻ công việc vào trong chat để mọi người cùng xem.',
      timestamp: Date.now() - 1000 * 60 * 40,
      reactions: { '👍': ['usr_long'] },
    },
  ],

  dm_usr_bob_usr_nam: [
    {
      id: 'msg_dm_bn_1',
      roomId: 'dm_usr_bob_usr_nam',
      senderId: 'usr_bob',
      senderName: 'Bob (DevOps)',
      senderColor: '#f59e0b',
      type: 'text',
      content: 'Nam kiểm tra NGINX Gateway trên cổng 8080 nhé, cấu hình reverse proxy đã hoàn thiện.',
      timestamp: Date.now() - 1000 * 60 * 100,
      reactions: {},
    },
    {
      id: 'msg_dm_bn_2',
      roomId: 'dm_usr_bob_usr_nam',
      senderId: 'usr_nam',
      senderName: 'Nguyễn Văn Nam',
      senderColor: '#0068ff',
      type: 'text',
      content: 'Đã test thành công Bob ơi, cả 2 ws-node-1 và ws-node-2 đều cân bằng tải đều đặn!',
      timestamp: Date.now() - 1000 * 60 * 35,
      reactions: { '🔥': ['usr_bob'] },
    },
  ],

  dm_usr_alice_usr_mai: [
    {
      id: 'msg_dm_am_1',
      roomId: 'dm_usr_alice_usr_mai',
      senderId: 'usr_alice',
      senderName: 'Alice (Kiến trúc sư)',
      senderColor: '#8b5cf6',
      type: 'text',
      content: 'Mai xem giúp mình phần giao diện Danh bạ và Cuộc gọi xem đã chuẩn UX chưa nhé.',
      timestamp: Date.now() - 1000 * 60 * 95,
      reactions: {},
    },
    {
      id: 'msg_dm_am_2',
      roomId: 'dm_usr_alice_usr_mai',
      senderId: 'usr_mai',
      senderName: 'Trần Thị Mai',
      senderColor: '#ec4899',
      type: 'text',
      content: 'Phần danh bạ phân chia rõ Nhóm và Đồng nghiệp, có nút gọi nhanh rất tiện Alice nhé! 👏',
      timestamp: Date.now() - 1000 * 60 * 55,
      reactions: { '❤️': ['usr_alice'] },
    },
  ],
};

/**
 * Returns customized conversation list for a specific user, separating groups and individual 1-on-1 direct rooms
 */
export function getConversationsForUser(currentUser: ZaloUser, customUsers?: ZaloUser[]): ZaloConversation[] {
  // 1. Personal "Cloud của tôi" conversation (Classic Zalo feature)
  const cloudRoomId = getMyCloudRoomId(currentUser.id);
  const cloudMessages = INITIAL_MESSAGES[cloudRoomId] || [];
  const lastCloudMsg = cloudMessages.length > 0 ? cloudMessages[cloudMessages.length - 1] : null;

  const cloudConv: ZaloConversation = {
    id: cloudRoomId,
    type: 'direct',
    name: 'Cloud của tôi',
    members: [currentUser],
    isPinned: true,
    isMuted: false,
    unreadCount: 0,
    lastMessage: lastCloudMsg
      ? {
          text: lastCloudMsg.content,
          senderName: 'Cloud',
          timestamp: lastCloudMsg.timestamp,
        }
      : {
          text: 'Lưu trữ cá nhân - Nơi lưu ảnh, tệp tin và ghi chú của riêng bạn',
          senderName: 'Cloud',
          timestamp: Date.now() - 1000 * 60 * 60,
        },
  };

  // 2. Direct message conversations for all other users
  const usersPool = customUsers && customUsers.length > 0 ? customUsers : PRESET_USERS;
  const directConversations: ZaloConversation[] = usersPool.filter(
    (u) => u.id !== currentUser.id
  ).map((otherUser) => {
    const roomId = getDirectRoomId(currentUser.id, otherUser.id);
    const roomMessages = INITIAL_MESSAGES[roomId] || [];
    const lastMsg = roomMessages.length > 0 ? roomMessages[roomMessages.length - 1] : null;

    return {
      id: roomId,
      type: 'direct',
      name: otherUser.name,
      members: [otherUser, currentUser],
      isPinned: false,
      isMuted: false,
      unreadCount: 0,
      lastMessage: lastMsg
        ? {
            text: lastMsg.content,
            senderName: lastMsg.senderName,
            timestamp: lastMsg.timestamp,
          }
        : {
            text: `Bắt đầu cuộc trò chuyện riêng với ${otherUser.name}`,
            senderName: otherUser.name,
            timestamp: Date.now() - 1000 * 60 * 60,
          },
    };
  });

  return [cloudConv, ...BASE_GROUP_CONVERSATIONS, ...directConversations];
}
