export type WhiteboardTool =
  | 'select'
  | 'hand'
  | 'pencil'
  | 'brush'
  | 'highlighter'
  | 'eraser'
  | 'text'
  | 'line'
  | 'arrow'
  | 'connector'
  | 'rectangle'
  | 'rounded_rect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'frame'
  | 'sticky'
  | 'image'
  | 'comment';

export interface WhiteboardCommentReply {
  id: string;
  authorName: string;
  authorColor: string;
  authorRole?: string;
  content: string;
  timestamp: number;
}

export interface WhiteboardCommentPin {
  id: string;
  boardId: string;
  x: number;
  y: number;
  authorId: string;
  authorName: string;
  authorColor: string;
  authorRole: string;
  content: string;
  targetElementName?: string;
  timestamp: number;
  resolved: boolean;
  replies: WhiteboardCommentReply[];
  reactions?: { emoji: string; count: number; users: string[] }[];
}

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export type StickyColor = 'yellow' | 'blue' | 'pink' | 'green' | 'orange' | 'purple' | 'gray';

export interface WhiteboardElement {
  id: string;
  type:
    | 'path'
    | 'rectangle'
    | 'rounded_rect'
    | 'circle'
    | 'triangle'
    | 'diamond'
    | 'star'
    | 'line'
    | 'arrow'
    | 'connector'
    | 'text'
    | 'sticky'
    | 'frame'
    | 'image'
    | 'wireframe_btn'
    | 'wireframe_input';
  imageUrl?: string;
  linkUrl?: string;
  points?: WhiteboardPoint[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  fillColor?: string;
  strokeWidth: number;
  isFilled?: boolean;
  opacity?: number;
  text?: string;
  fontSize?: number;
  stickyColor?: StickyColor;
  tags?: string[];
  assignee?: { id: string; name: string };
  isAnonymous?: boolean;
  votes?: Record<string, number>;
  reactions?: Record<string, string[]>; // emoji -> list of userNames
  isLocked?: boolean;
  groupId?: string;
  frameTitle?: string;
  startElementId?: string;
  endElementId?: string;
  convertedToTaskId?: string;
  authorId: string;
  authorName: string;
  createdAt: number;
}

export const STICKY_COLOR_MAP: Record<
  StickyColor,
  { bg: string; border: string; text: string; headerBg: string; badgeBg: string }
> = {
  yellow: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-950',
    headerBg: 'bg-amber-100/90',
    badgeBg: 'bg-amber-200 text-amber-800',
  },
  blue: {
    bg: 'bg-sky-50',
    border: 'border-sky-300',
    text: 'text-sky-950',
    headerBg: 'bg-sky-100/90',
    badgeBg: 'bg-sky-200 text-sky-800',
  },
  pink: {
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    text: 'text-rose-950',
    headerBg: 'bg-rose-100/90',
    badgeBg: 'bg-rose-200 text-rose-800',
  },
  green: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-950',
    headerBg: 'bg-emerald-100/90',
    badgeBg: 'bg-emerald-200 text-emerald-800',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-950',
    headerBg: 'bg-orange-100/90',
    badgeBg: 'bg-orange-200 text-orange-800',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    text: 'text-purple-950',
    headerBg: 'bg-purple-100/90',
    badgeBg: 'bg-purple-200 text-purple-800',
  },
  gray: {
    bg: 'bg-zinc-50',
    border: 'border-zinc-300',
    text: 'text-zinc-950',
    headerBg: 'bg-zinc-200/90',
    badgeBg: 'bg-zinc-200 text-zinc-800',
  },
};

export const PAINT_COLORS = [
  '#000000', // Đen
  '#4b5563', // Xám đậm
  '#9ca3af', // Xám nhạt
  '#ffffff', // Trắng
  '#991b1b', // Đỏ đô
  '#ef4444', // Đỏ tươi
  '#f97316', // Cam
  '#eab308', // Vàng
  '#15803d', // Lục đậm
  '#22c55e', // Lục tươi
  '#06b6d4', // Xanh ngọc
  '#2563eb', // Xanh dương
  '#4f46e5', // Xanh tím (Indigo)
  '#9333ea', // Tím
  '#ec4899', // Hồng
  '#78350f', // Nâu đất
];

export interface VotingSession {
  id: string;
  isActive: boolean;
  topic: string;
  votesPerPerson: number;
  durationSeconds: number;
  remainingSeconds: number;
  isSecret: boolean;
  isFinished: boolean;
  startedAt: number;
  userVotes: Record<string, number>; // stickyId -> voteCount by currentUser
}

export interface WorkshopStep {
  id: number;
  title: string;
  durationMinutes: number;
  description: string;
  instruction: string;
}

export const STANDARD_WORKSHOP_STEPS: WorkshopStep[] = [
  {
    id: 1,
    title: '1. Đặt vấn đề & Định hướng',
    durationMinutes: 5,
    description: 'Người điều phối nêu rõ câu hỏi trọng tâm, mục tiêu cần giải quyết.',
    instruction: 'Nêu câu hỏi: "Làm thế nào để...", mục tiêu kỳ vọng và phạm vi buổi họp.',
  },
  {
    id: 2,
    title: '2. Suy nghĩ độc lập (Silent Writing)',
    durationMinutes: 5,
    description: 'Mỗi người tự viết ý tưởng lên ghi chú cá nhân, giữ bí mật ý tưởng.',
    instruction: 'Dán nhiều ghi chú nhất có thể, chưa cần nhận xét hay trao đổi.',
  },
  {
    id: 3,
    title: '3. Chia sẻ & Trình bày',
    durationMinutes: 10,
    description: 'Mỗi thành viên trình bày ngắn gọn các ý tưởng vừa viết trong 1-2 phút.',
    instruction: 'Lắng nghe, làm rõ ý nghĩa mà không phản bác hay bác bỏ.',
  },
  {
    id: 4,
    title: '4. Gom nhóm & Phân loại (Clustering)',
    durationMinutes: 10,
    description: 'Kéo các ý tưởng tương đồng vào từng nhóm chủ đề và đặt tên.',
    instruction: 'Gom các ý giống nhau, phát hiện chủ đề nổi bật và phân loại màu.',
  },
  {
    id: 5,
    title: '5. Bình chọn biểu quyết (Dot Voting)',
    durationMinutes: 5,
    description: 'Mỗi người dùng số phiếu giới hạn để chọn ra các ý tưởng đột phá nhất.',
    instruction: 'Mỗi người có 3 phiếu, bấm nút vote trực tiếp trên thẻ ghi chú.',
  },
  {
    id: 6,
    title: '6. Chốt kế hoạch & Chuyển giao',
    durationMinutes: 10,
    description: 'Chọn 2 - 3 ý tưởng xuất sắc nhất, phân công người phụ trách và gửi sang Kanban.',
    instruction: 'Bấm nút "Chuyển thành Task" để giao việc ngay lập tức.',
  },
];

export interface LiveReactionItem {
  id: string;
  emoji: string;
  x: number;
  y: number;
  authorName: string;
  createdAt: number;
}
