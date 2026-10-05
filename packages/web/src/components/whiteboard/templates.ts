import { WhiteboardElement } from './types';

export interface TemplateMeta {
  id: string;
  title: string;
  category: 'brainstorm' | 'retro' | 'strategy' | 'design';
  categoryLabel: string;
  description: string;
  tags: string[];
  icon: string;
}

export const TEMPLATE_METAS: TemplateMeta[] = [
  // 1. Brainstorming
  {
    id: 'open_brainstorm',
    title: 'Brainstorm Tự Do',
    category: 'brainstorm',
    categoryLabel: 'Brainstorming',
    description: 'Bảng động não kinh điển chia 3 cột: Vấn đề hiện tại, Ý tưởng đột phá, và Thử nghiệm nhanh.',
    tags: ['Ý tưởng', 'Sáng tạo', 'Nhóm'],
    icon: '💡',
  },
  {
    id: 'crazy_8s',
    title: 'Crazy 8s (8 ý tưởng trong 8 phút)',
    category: 'brainstorm',
    categoryLabel: 'Brainstorming',
    description: 'Phương pháp Design Sprint: 8 khung phác thảo nhanh giúp giải phóng sức sáng tạo thần tốc.',
    tags: ['Design Sprint', 'Tốc độ', 'Phác thảo'],
    icon: '⚡',
  },
  {
    id: 'mindmap',
    title: 'Sơ Đồ Tư Duy (Mind Map)',
    category: 'brainstorm',
    categoryLabel: 'Brainstorming',
    description: 'Khai triển một chủ đề cốt lõi thành các nhánh ý tưởng logic, kết nối bằng mũi tên thông minh.',
    tags: ['Mindmap', 'Phân cấp', 'Tư duy'],
    icon: '🧠',
  },
  {
    id: 'how_might_we',
    title: 'How Might We (HMW)',
    category: 'brainstorm',
    categoryLabel: 'Brainstorming',
    description: 'Đặt câu hỏi "Làm thế nào để chúng ta..." để biến thách thức khó khăn thành cơ hội đổi mới.',
    tags: ['HMW', 'Đổi mới', 'Cơ hội'],
    icon: '🎯',
  },

  // 2. Retrospective
  {
    id: 'start_stop_continue',
    title: 'Start / Stop / Continue',
    category: 'retro',
    categoryLabel: 'Họp Retrospective',
    description: 'Điều chỉnh cách làm việc sau dự án: Bắt đầu làm gì, Dừng việc gì lại, và Tiếp tục phát huy gì.',
    tags: ['Agile', 'Sprint', 'Cải tiến'],
    icon: '🔄',
  },
  {
    id: 'four_ls',
    title: '4Ls (Liked / Learned / Lacked / Longed)',
    category: 'retro',
    categoryLabel: 'Họp Retrospective',
    description: 'Đánh giá 4 góc nhìn: Thích gì (Liked), Học được gì (Learned), Thiếu gì (Lacked), Khao khát gì (Longed).',
    tags: ['4Ls', 'Bài học', 'Phản tư'],
    icon: '🧭',
  },
  {
    id: 'mad_sad_glad',
    title: 'Mad / Sad / Glad',
    category: 'retro',
    categoryLabel: 'Họp Retrospective',
    description: 'Mẫu giải tỏa cảm xúc nhóm: Những gì gây bực mình (Mad), Đáng tiếc (Sad), và Khiến cả nhóm vui sướng (Glad).',
    tags: ['Cảm xúc', 'Gắn kết', 'Retrospective'],
    icon: '🎭',
  },
  {
    id: 'sailboat',
    title: 'Sailboat Retro (Thuyền buồm)',
    category: 'retro',
    categoryLabel: 'Họp Retrospective',
    description: 'Biểu tượng kinh điển: Gió thuận (Thúc đẩy), Mỏ neo (Cản trở), Đá ngầm (Rủi ro tiềm ẩn), Đảo ngọc (Mục tiêu).',
    tags: ['Sailboat', 'Ẩn dụ', 'Mục tiêu'],
    icon: '⛵',
  },

  // 3. Chiến lược & Kế hoạch
  {
    id: 'swot',
    title: 'Ma Trận SWOT',
    category: 'strategy',
    categoryLabel: 'Chiến Lược & Kế Hoạch',
    description: 'Phân tích toàn diện: Strengths (Điểm mạnh), Weaknesses (Điểm yếu), Opportunities (Cơ hội), Threats (Thách thức).',
    tags: ['SWOT', 'Chiến lược', 'Phân tích'],
    icon: '📊',
  },
  {
    id: 'eisenhower',
    title: 'Ma Trận Eisenhower',
    category: 'strategy',
    categoryLabel: 'Chiến Lược & Kế Hoạch',
    description: 'Phân loại công việc theo Khẩn cấp & Quan trọng: Làm ngay, Lên lịch, Ủy quyền, và Loại bỏ lãng phí.',
    tags: ['Quản lý thời gian', 'Ưu tiên', 'Năng suất'],
    icon: '⏳',
  },
  {
    id: 'impact_effort',
    title: 'Ma Trận Tác Động vs Nỗ Lực',
    category: 'strategy',
    categoryLabel: 'Chiến Lược & Kế Hoạch',
    description: 'Trục 2x2 Impact vs Effort để nhận diện: Quick Wins (Thắng nhanh), Dự án lớn, Việc lặt vặt, và Hố sâu thời gian.',
    tags: ['2x2 Matrix', 'Quick Wins', 'Tối ưu'],
    icon: '⚖️',
  },
  {
    id: 'roadmap',
    title: 'Lộ Trình Phát Triển (Roadmap)',
    category: 'strategy',
    categoryLabel: 'Chiến Lược & Kế Hoạch',
    description: 'Lộ trình theo 4 quý (Q1, Q2, Q3, Q4) với các mốc milestone, tính năng chính và chỉ số đo lường.',
    tags: ['Timeline', 'Quý', 'Phát hành'],
    icon: '🗺️',
  },

  // 4. Thiết kế & Khách hàng
  {
    id: 'customer_journey',
    title: 'Customer Journey Map',
    category: 'design',
    categoryLabel: 'Thiết Kế & Khách Hàng',
    description: 'Mô tả 5 giai đoạn trải nghiệm: Nhận biết -> Tìm hiểu -> Ra quyết định -> Sử dụng -> Giới thiệu người khác.',
    tags: ['UX', 'Hành trình', 'Khách hàng'],
    icon: '👥',
  },
  {
    id: 'user_persona',
    title: 'User Persona & Empathy Map',
    category: 'design',
    categoryLabel: 'Thiết Kế & Khách Hàng',
    description: 'Chân dung người dùng điển hình: Thông tin nhân khẩu, Mục tiêu, Nỗi đau (Pain points), và Hành vi điển hình.',
    tags: ['Persona', 'Nỗi đau', 'Thấu cảm'],
    icon: '🎨',
  },
  {
    id: 'wireframe',
    title: 'Khung Giao Diện Web & App',
    category: 'design',
    categoryLabel: 'Thiết Kế & Khách Hàng',
    description: 'Bộ khung sườn phác thảo màn hình giao diện: Header, Navigation bar, Hero section, Feature cards, CTA buttons.',
    tags: ['Wireframe', 'UI/UX', 'Layout'],
    icon: '📱',
  },
  {
    id: 'mockup_ui_canvas',
    title: 'Bản Vẽ Thiết Kế UI & Slide Trang Chủ',
    category: 'design',
    categoryLabel: 'Thiết Kế & Bản Vẽ',
    description: 'Bản vẽ chi tiết giao diện trang chủ gồm Thanh điều hướng, Hero Banner và Nút CTA tím có bình luận gắn kèm.',
    tags: ['UI Mockup', 'Figma', 'CTA Button', 'Slide'],
    icon: '🎨',
  },
];

export function generateTemplateElements(
  templateId: string,
  author: { id: string; name: string },
  offset = { x: 80, y: 80 }
): WhiteboardElement[] {
  const elements: WhiteboardElement[] = [];
  const now = Date.now();

  const createFrame = (
    title: string,
    x: number,
    y: number,
    w: number,
    h: number,
    borderColor = '#94a3b8',
    bgColor = '#f8fafc'
  ) => {
    elements.push({
      id: `frame_${now}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'frame',
      x: offset.x + x,
      y: offset.y + y,
      width: w,
      height: h,
      color: borderColor,
      fillColor: bgColor,
      isFilled: true,
      strokeWidth: 2,
      frameTitle: title,
      authorId: author.id,
      authorName: author.name,
      createdAt: now,
    });
  };

  const createSticky = (
    text: string,
    x: number,
    y: number,
    color: 'yellow' | 'blue' | 'pink' | 'green' | 'orange' | 'purple' | 'gray' = 'yellow',
    width = 230,
    tags?: string[],
    authorNameOverride?: string
  ) => {
    elements.push({
      id: `st_${now}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'sticky',
      x: offset.x + x,
      y: offset.y + y,
      width,
      stickyColor: color,
      color: '#eab308',
      strokeWidth: 1,
      text,
      tags,
      authorId: author.id,
      authorName: authorNameOverride || author.name,
      votes: {},
      createdAt: now,
    });
  };

  // 1. OPEN BRAINSTORM
  if (templateId === 'open_brainstorm') {
    createFrame('📌 1. VẤN ĐỀ CẦN GIẢI QUYẾT', 0, 0, 320, 520, '#ef4444', '#fef2f2');
    createFrame('💡 2. Ý TƯỞNG ĐỘT PHÁ (BRAINSTORM)', 350, 0, 320, 520, '#3b82f6', '#eff6ff');
    createFrame('🚀 3. KẾ HOẠCH THỬ NGHIỆM NHANH', 700, 0, 320, 520, '#10b981', '#f0fdf4');

    createSticky('Tỷ lệ hoàn tất đăng ký tài khoản giảm 15% trong tháng qua', 20, 60, 'pink', 280, ['Vấn đề']);
    createSticky('Người dùng phàn nàn bước xác thực email quá rườm rà', 20, 200, 'pink', 280, ['Phản hồi']);

    createSticky('Áp dụng đăng nhập 1 chạm với Google / Zalo / Apple ID', 370, 60, 'blue', 280, ['Đề xuất']);
    createSticky('Tặng ngay 14 ngày dùng thử PRO không cần thẻ tín dụng', 370, 200, 'yellow', 280, ['Kích cầu']);
    createSticky('Tích hợp AI trợ lý hướng dẫn 3 bước đầu tiên ngay trong app', 370, 340, 'purple', 280, ['Công nghệ']);

    createSticky('Chạy A/B test luồng đăng nhập rút gọn trên 20% người dùng mới', 720, 60, 'green', 280, ['A/B Test']);
    createSticky('Theo dõi biểu đồ chuyển đổi trong 7 ngày tới', 720, 200, 'green', 280, ['Chỉ số']);
  }

  // 2. CRAZY 8s
  else if (templateId === 'crazy_8s') {
    createFrame('⚡ CRAZY 8s - 8 PHÚT / 8 Ý TƯỞNG THẦN TỐC', 0, 0, 880, 540, '#f59e0b', '#fffbeb');
    const cols = 4;
    const rows = 2;
    const cellW = 190;
    const cellH = 200;
    const startX = 30;
    const startY = 70;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c + 1;
        const cx = startX + c * (cellW + 20);
        const cy = startY + r * (cellH + 25);
        createFrame(`Ý tưởng #${idx}`, cx, cy, cellW, cellH, '#cbd5e1', '#ffffff');
        createSticky(`Phác thảo #${idx}:\n- Ghi 1 ý tưởng khác biệt\n- Không sợ điên rồ`, cx + 10, cy + 50, idx % 2 === 0 ? 'yellow' : 'blue', 170);
      }
    }
  }

  // 3. MIND MAP
  else if (templateId === 'mindmap') {
    const centerNodeId = `node_center_${now}`;
    elements.push({
      id: centerNodeId,
      type: 'rectangle',
      x: offset.x + 400,
      y: offset.y + 240,
      width: 240,
      height: 75,
      color: '#2563eb',
      fillColor: '#dbeafe',
      isFilled: true,
      strokeWidth: 3,
      text: 'CHIẾN LƯỢC SẢN PHẨM 2026',
      authorId: author.id,
      authorName: author.name,
      createdAt: now,
    });

    const branches = [
      { id: `b1_${now}`, title: '1. Cộng tác Real-time', x: 80, y: 100, color: '#0891b2', bg: '#cffafe' },
      { id: `b2_${now}`, title: '2. Tích hợp AI Trợ lý', x: 740, y: 100, color: '#9333ea', bg: '#f3e8ff' },
      { id: `b3_${now}`, title: '3. An toàn Dữ liệu & S3', x: 80, y: 400, color: '#16a34a', bg: '#dcfce7' },
      { id: `b4_${now}`, title: '4. Trải nghiệm Di động', x: 740, y: 400, color: '#ea580c', bg: '#ffedd5' },
    ];

    branches.forEach((b) => {
      elements.push({
        id: b.id,
        type: 'rounded_rect',
        x: offset.x + b.x,
        y: offset.y + b.y,
        width: 220,
        height: 60,
        color: b.color,
        fillColor: b.bg,
        isFilled: true,
        strokeWidth: 2,
        text: b.title,
        authorId: author.id,
        authorName: author.name,
        createdAt: now,
      });

      // Smart Connector
      elements.push({
        id: `conn_${now}_${b.id}`,
        type: 'connector',
        x: offset.x + (b.x < 400 ? b.x + 220 : 640),
        y: offset.y + (b.y < 240 ? b.y + 30 : 275),
        width: b.x < 400 ? 400 - (b.x + 220) : b.x - 640,
        height: b.y < 240 ? 240 - b.y : b.y - 275,
        startElementId: centerNodeId,
        endElementId: b.id,
        color: '#64748b',
        strokeWidth: 2,
        authorId: author.id,
        authorName: author.name,
        createdAt: now,
      });
    });

    createSticky('CRDT Yjs WebSockets\nĐộ trễ < 15ms', 60, 190, 'blue', 200);
    createSticky('Gợi ý nội dung theo ngữ cảnh tài liệu', 740, 190, 'purple', 200);
    createSticky('Mã hóa đầu cuối & Version snapshot', 60, 490, 'green', 200);
    createSticky('Progressive Web App (PWA)', 740, 490, 'orange', 200);
  }

  // 4. HOW MIGHT WE (HMW)
  else if (templateId === 'how_might_we') {
    createFrame('🎯 CÂU HỎI TRỌNG TÂM: LÀM THẾ NÀO ĐỂ... (HOW MIGHT WE)', 0, 0, 960, 520, '#6366f1', '#eef2ff');
    createFrame('Góc độ Người Dùng Mới', 30, 70, 280, 420, '#a5b4fc', '#ffffff');
    createFrame('Góc độ Quản Trị Nhóm', 340, 70, 280, 420, '#a5b4fc', '#ffffff');
    createFrame('Góc độ Kỹ Thuật & Tốc Độ', 650, 70, 280, 420, '#a5b4fc', '#ffffff');

    createSticky('Làm thế nào để người mới tạo ngay tài liệu đầu tiên trong 10 giây?', 50, 130, 'yellow', 240);
    createSticky('Làm thế nào để họ mời đồng nghiệp tham gia mà không cần tạo mật khẩu?', 50, 270, 'yellow', 240);

    createSticky('Làm thế nào để nhóm trưởng nắm tiến độ mà không cần gọi điện hỏi?', 360, 130, 'blue', 240);
    createSticky('Làm thế nào để phân quyền xem/sửa linh hoạt cho từng thư mục?', 360, 270, 'blue', 240);

    createSticky('Làm thế nào để bảng trắng đồng bộ mượt kể cả mạng 3G chập chờn?', 670, 130, 'green', 240);
    createSticky('Làm thế nào để lưu trữ 10,000 phiên bản tệp với dung lượng nhẹ nhất?', 670, 270, 'green', 240);
  }

  // 5. START / STOP / CONTINUE RETRO
  else if (templateId === 'start_stop_continue') {
    createFrame('🚀 START - BẮT ĐẦU LÀM', 0, 0, 320, 520, '#10b981', '#f0fdf4');
    createFrame('🛑 STOP - DỪNG LẠI', 360, 0, 320, 520, '#ef4444', '#fef2f2');
    createFrame('⭐ CONTINUE - TIẾP TỤC PHÁT HUY', 720, 0, 320, 520, '#3b82f6', '#eff6ff');

    createSticky('Bắt đầu viết tài liệu kỹ thuật (SOP) trước khi bắt tay code', 20, 70, 'green', 280);
    createSticky('Bắt đầu daily meeting đúng 9:00 sáng tối đa 10 phút', 20, 210, 'green', 280);

    createSticky('Dừng việc trao đổi nhiệm vụ qua chat riêng lẻ, hãy tạo thẻ việc Kanban', 380, 70, 'pink', 280);
    createSticky('Dừng việc họp không có lịch trình chuẩn bị trước', 380, 210, 'pink', 280);

    createSticky('Tiếp tục cơ chế pair-programming cho các module phức tạp', 740, 70, 'blue', 280);
    createSticky('Tiếp tục phát hành bản cập nhật đều đặn mỗi thứ Sáu', 740, 210, 'blue', 280);
  }

  // 6. 4Ls RETRO
  else if (templateId === 'four_ls') {
    createFrame('💚 LIKED - THÍCH ĐIỀU GÌ', 0, 0, 240, 520, '#10b981', '#f0fdf4');
    createFrame('🧠 LEARNED - HỌC ĐƯỢC GÌ', 260, 0, 240, 520, '#6366f1', '#eef2ff');
    createFrame('⚠️ LACKED - THIẾU ĐIỀU GÌ', 520, 0, 240, 520, '#f59e0b', '#fffbeb');
    createFrame('🌟 LONGED FOR - KHAO KHÁT GÌ', 780, 0, 240, 520, '#ec4899', '#fdf2f8');

    createSticky('Tốc độ load trang cực nhanh, giao diện tối giản hiện đại', 15, 70, 'green', 210);
    createSticky('Hiểu sâu hơn về giải thuật CRDT và vector clock', 275, 70, 'blue', 210);
    createSticky('Thiếu tài liệu hướng dẫn cho các trường hợp ngoại lệ', 535, 70, 'yellow', 210);
    createSticky('Khao khát tính năng gọi video call trực tiếp trong bảng', 795, 70, 'pink', 210);
  }

  // 7. MAD / SAD / GLAD RETRO
  else if (templateId === 'mad_sad_glad') {
    createFrame('😡 MAD - BỰC MÌNH & CẢN TRỞ', 0, 0, 320, 520, '#ef4444', '#fef2f2');
    createFrame('😢 SAD - ĐÁNG TIẾC & HỤT HẪNG', 350, 0, 320, 520, '#64748b', '#f8fafc');
    createFrame('😄 GLAD - TỰ HÀO & VUI SƯỚNG', 700, 0, 320, 520, '#10b981', '#f0fdf4');

    createSticky('Mạng nội bộ chập chờn khiến kết nối WebSocket bị gián đoạn nhiều lần', 20, 70, 'pink', 280);
    createSticky('Không kịp bàn giao tính năng xuất PDF đúng hạn cam kết thứ Ba', 370, 70, 'gray', 280);
    createSticky('Khách hàng phản hồi rất tích cực về giao diện mới!', 720, 70, 'green', 280);
    createSticky('Toàn đội phối hợp fix bug thần tốc chỉ trong 30 phút', 720, 210, 'green', 280);
  }

  // 8. SAILBOAT RETRO
  else if (templateId === 'sailboat') {
    createFrame('⛵ SAILBOAT RETROSPECTIVE', 0, 0, 980, 540, '#0ea5e9', '#f0f9ff');
    createFrame('🌬️ GIÓ THUẬN (Đẩy thuyền đi)', 30, 60, 220, 450, '#38bdf8', '#ffffff');
    createFrame('⚓ MỎ NEO (Níu giữ lại)', 270, 60, 220, 450, '#94a3b8', '#ffffff');
    createFrame('🦈 ĐÁ NGẦM (Rủi ro rình rập)', 510, 60, 220, 450, '#f87171', '#ffffff');
    createFrame('🏝️ ĐẢO NGỌC (Đích đến)', 750, 60, 200, 450, '#4ade80', '#ffffff');

    createSticky('Đội ngũ nhiệt huyết, công nghệ Next.js & Yjs hiện đại', 45, 120, 'blue', 190);
    createSticky('Nợ kỹ thuật ở module upload ảnh cũ chưa refactor', 285, 120, 'gray', 190);
    createSticky('Máy chủ có nguy cơ quá tải khi lượng người dùng tăng gấp 10', 525, 120, 'pink', 190);
    createSticky('Đạt mốc 5,000 người dùng hàng ngày vào cuối quý', 765, 120, 'green', 170);
  }

  // 9. SWOT MATRIX
  else if (templateId === 'swot') {
    createFrame('💪 STRENGTHS (ĐIỂM MẠNH)', 0, 0, 460, 250, '#10b981', '#f0fdf4');
    createFrame('⚠️ WEAKNESSES (ĐIỂM YẾU)', 500, 0, 460, 250, '#f59e0b', '#fffbeb');
    createFrame('🚀 OPPORTUNITIES (CƠ HỘI)', 0, 290, 460, 250, '#3b82f6', '#eff6ff');
    createFrame('🛡️ THREATS (THÁCH THỨC)', 500, 290, 460, 250, '#ef4444', '#fef2f2');

    createSticky('Cộng tác đồng thời thời gian thực mượt mà không xung đột', 20, 60, 'green', 420);
    createSticky('Chưa có ứng dụng di động native trên App Store / CH Play', 520, 60, 'yellow', 420);
    createSticky('Xu hướng làm việc từ xa (Remote Work) tăng trưởng mạnh', 20, 350, 'blue', 420);
    createSticky('Sự cạnh tranh gay gắt từ các ông lớn công nghệ toàn cầu', 520, 350, 'pink', 420);
  }

  // 10. EISENHOWER MATRIX
  else if (templateId === 'eisenhower') {
    createFrame('🔥 1. LÀM NGAY (Khẩn cấp & Quan trọng)', 0, 0, 460, 250, '#ef4444', '#fef2f2');
    createFrame('📅 2. LÊN LỊCH (Không khẩn cấp nhưng Quan trọng)', 500, 0, 460, 250, '#3b82f6', '#eff6ff');
    createFrame('🤝 3. ỦY QUYỀN (Khẩn cấp nhưng Không quan trọng)', 0, 290, 460, 250, '#f59e0b', '#fffbeb');
    createFrame('🗑️ 4. LOẠI BỎ (Không khẩn cấp & Không quan trọng)', 500, 290, 460, 250, '#94a3b8', '#f8fafc');

    createSticky('Khắc phục lỗ hổng bảo mật token đăng nhập', 20, 60, 'pink', 420);
    createSticky('Viết test tự động E2E cho quy trình thanh toán', 520, 60, 'blue', 420);
    createSticky('Trả lời các email xin thông tin sản phẩm chung', 20, 350, 'yellow', 420);
    createSticky('Họp cập nhật tiến độ kéo dài hơn 1 tiếng vô bổ', 520, 350, 'gray', 420);
  }

  // 11. IMPACT VS EFFORT MATRIX
  else if (templateId === 'impact_effort') {
    createFrame('🌟 QUICK WINS (Tác động cao - Nỗ lực thấp)', 0, 0, 460, 250, '#10b981', '#f0fdf4');
    createFrame('🚀 DỰ ÁN LỚN (Tác động cao - Nỗ lực cao)', 500, 0, 460, 250, '#3b82f6', '#eff6ff');
    createFrame('🥪 VIỆC PHỤ (Tác động thấp - Nỗ lực thấp)', 0, 290, 460, 250, '#f59e0b', '#fffbeb');
    createFrame('⛔ HỐ SÂU THỜI GIAN (Tác động thấp - Nỗ lực cao)', 500, 290, 460, 250, '#ef4444', '#fef2f2');

    createSticky('Thêm phím tắt Ctrl+S và Ctrl+Z cho thanh công cụ', 20, 60, 'green', 420);
    createSticky('Tích hợp mô hình AI phân tích dữ liệu tự động', 520, 60, 'blue', 420);
    createSticky('Đổi màu icon badge thông báo', 20, 350, 'yellow', 420);
    createSticky('Viết lại toàn bộ thư viện CSS bằng framework mới mà không có lý do', 520, 350, 'pink', 420);
  }

  // 12. ROADMAP
  else if (templateId === 'roadmap') {
    createFrame('Q1 - TỐI ƯU CỐT LÕI', 0, 0, 240, 520, '#3b82f6', '#eff6ff');
    createFrame('Q2 - TÍNH NĂNG NHÓM', 260, 0, 240, 520, '#10b981', '#f0fdf4');
    createFrame('Q3 - MỞ RỘNG AI', 520, 0, 240, 520, '#8b5cf6', '#f5f3ff');
    createFrame('Q4 - QUY MÔ DOANH NGHIỆP', 780, 0, 240, 520, '#f59e0b', '#fffbeb');

    createSticky('Đồng bộ thời gian thực Yjs\nBảng trắng & Chat trực tiếp', 15, 70, 'blue', 210);
    createSticky('Quản lý phân quyền nâng cao\nKho lưu trữ đám mây Drive', 275, 70, 'green', 210);
    createSticky('Trợ lý AI tóm tắt cuộc họp\nGợi ý viết nội dung thông minh', 535, 70, 'purple', 210);
    createSticky('Bảo mật SOC2, SSO Google/Okta\nBáo cáo kiểm toán doanh nghiệp', 795, 70, 'orange', 210);
  }

  // 13. CUSTOMER JOURNEY MAP
  else if (templateId === 'customer_journey') {
    createFrame('1. NHẬN BIẾT', 0, 0, 190, 520, '#3b82f6', '#eff6ff');
    createFrame('2. TÌM HIỂU', 210, 0, 190, 520, '#6366f1', '#eef2ff');
    createFrame('3. QUYẾT ĐỊNH', 420, 0, 190, 520, '#10b981', '#f0fdf4');
    createFrame('4. SỬ DỤNG', 630, 0, 190, 520, '#f59e0b', '#fffbeb');
    createFrame('5. TRUNG THÀNH', 840, 0, 190, 520, '#ec4899', '#fdf2f8');

    createSticky('Thấy bài viết giới thiệu giải pháp cộng tác trên LinkedIn', 10, 70, 'blue', 170);
    createSticky('Vào trang chủ xem video demo 60 giây và bảng tính năng', 220, 70, 'purple', 170);
    createSticky('Đăng ký gói trải nghiệm nhóm 14 ngày', 430, 70, 'green', 170);
    createSticky('Mời 5 thành viên phòng ban cùng tạo bảng brainstorm', 640, 70, 'yellow', 170);
    createSticky('Chia sẻ liên kết cho đối tác cùng làm việc chung', 850, 70, 'pink', 170);
  }

  // 14. USER PERSONA
  else if (templateId === 'user_persona') {
    createFrame('👤 CHÂN DUNG KHÁCH HÀNG (PERSONA)', 0, 0, 960, 520, '#3b82f6', '#eff6ff');
    createFrame('Thông tin chung', 30, 70, 270, 420, '#bfdbfe', '#ffffff');
    createFrame('Mục tiêu & Kỳ vọng', 330, 70, 280, 420, '#bfdbfe', '#ffffff');
    createFrame('Nỗi đau & Rào cản (Pain Points)', 640, 70, 280, 420, '#bfdbfe', '#ffffff');

    createSticky('Họ tên: Lê Minh Anh (32 tuổi)\nVị trí: Trưởng nhóm Sản phẩm\nQuy mô nhóm: 12 người\nThiết bị: MacBook & iPad', 45, 120, 'blue', 240);
    createSticky('Muốn gom toàn bộ tài liệu, công việc và thảo luận vào 1 nơi duy nhất', 350, 120, 'green', 240);
    createSticky('Tiết kiệm 50% thời gian tổng hợp báo cáo sau các cuộc họp tuần', 350, 260, 'green', 240);
    createSticky('Các công cụ cũ phân tán, tệp tin lưu rải rác trên Drive, Zalo, Slack', 660, 120, 'pink', 240);
    createSticky('Khó theo dõi ai đang phụ trách việc gì sau các buổi brainstorm', 660, 260, 'pink', 240);
  }

  // 15. WIREFRAME
  else if (templateId === 'wireframe') {
    createFrame('📱 PHÁC THẢO KHUNG GIAO DIỆN (WIREFRAME)', 0, 0, 880, 540, '#475569', '#f8fafc');
    
    // Header
    elements.push({
      id: `wf_head_${now}`,
      type: 'rectangle',
      x: offset.x + 30,
      y: offset.y + 60,
      width: 820,
      height: 50,
      color: '#2563eb',
      fillColor: '#eff6ff',
      isFilled: true,
      strokeWidth: 2,
      text: 'Logo   |   Trang Chủ   |   Dự Án   |   Tài Liệu   |   Kho Lưu Trữ      [Đăng Nhập]',
      authorId: author.id,
      authorName: author.name,
      createdAt: now,
    });

    // Hero banner
    elements.push({
      id: `wf_hero_${now}`,
      type: 'rectangle',
      x: offset.x + 30,
      y: offset.y + 130,
      width: 820,
      height: 180,
      color: '#3b82f6',
      fillColor: '#e0e7ff',
      isFilled: true,
      strokeWidth: 2,
      text: 'TIÊU ĐỀ CHÍNH: NỀN TẢNG CỘNG TÁC THỜI GIAN THỰC ĐỈNH CAO\n\n[ Nút Bắt Đầu Miễn Phí ]     [ Xem Demo Trực Tuyến ]',
      authorId: author.id,
      authorName: author.name,
      createdAt: now,
    });

    // 3 Feature Cards
    const cardW = 250;
    const cardH = 170;
    const cards = [
      'Card 1: Tài liệu & Soạn thảo CRDT\nKhông xung đột nội dung',
      'Card 2: Bảng trắng Brainstorm\nKhông giới hạn không gian sáng tạo',
      'Card 3: Trò chuyện Zalo & Gọi video\nTrao đổi tức thời cùng đội ngũ',
    ];
    cards.forEach((cText, i) => {
      elements.push({
        id: `wf_card_${now}_${i}`,
        type: 'rectangle',
        x: offset.x + 30 + i * (cardW + 35),
        y: offset.y + 330,
        width: cardW,
        height: cardH,
        color: '#64748b',
        fillColor: '#ffffff',
        isFilled: true,
        strokeWidth: 1.5,
        text: cText,
        authorId: author.id,
        authorName: author.name,
        createdAt: now,
      });
    });
  }

  // 16. MOCKUP UI CANVAS (Matching Screenshot 2 & Hub Tab 3 View 3)
  else if (templateId === 'mockup_ui_canvas') {
    createFrame('🎨 BẢN VẼ THIẾT KẾ TRANG CHỦ CỘNG TÁC v3 (UI & SLIDE)', 0, 0, 920, 620, '#7c3aed', '#faf5ff');

    // Header Nav bar
    elements.push({
      id: `nav_head_${now}`,
      type: 'rectangle',
      x: offset.x + 40,
      y: offset.y + 60,
      width: 840,
      height: 52,
      color: '#cbd5e1',
      fillColor: '#ffffff',
      isFilled: true,
      strokeWidth: 2,
      text: '🔷 CollabPlatform 2026          Sản phẩm          Giải pháp          Bảng giá          [ Đăng nhập ]',
      authorId: author.id,
      authorName: author.name,
      createdAt: now,
    });

    // Hero section
    elements.push({
      id: `hero_sec_${now}`,
      type: 'rectangle',
      x: offset.x + 40,
      y: offset.y + 130,
      width: 840,
      height: 250,
      color: '#93c5fd',
      fillColor: '#eff6ff',
      isFilled: true,
      strokeWidth: 2,
      text: 'NỀN TẢNG CỘNG TÁC THỜI GIAN THỰC ĐỘT PHÁ\n\nMọi cuộc họp, tài liệu và nhiệm vụ nằm chung trong một không gian làm việc gắn chặt với ngữ cảnh.\nTrải nghiệm liền mạch không độ trễ cùng thuật toán CRDT.',
      authorId: author.id,
      authorName: author.name,
      createdAt: now,
    });

    // Purple CTA Button (From Screenshot 2)
    elements.push({
      id: `cta_btn_${now}`,
      type: 'rectangle',
      x: offset.x + 300,
      y: offset.y + 290,
      width: 320,
      height: 52,
      color: '#7e22ce',
      fillColor: '#9333ea',
      isFilled: true,
      strokeWidth: 2,
      text: '🚀 Bắt đầu Phiên Làm Việc Mới  [ 💬 1 ]',
      authorId: author.id,
      authorName: author.name,
      createdAt: now,
    });

    // Pinned sticky comment from @Giang
    createSticky(
      '💬 BÌNH LUẬN TRỰC TIẾP TRÊN NÚT BẤM:\n"@Giang duyệt giúp em bản thiết kế nút bấm CTA màu tím này nhé! Em đã đồng bộ theo tone màu của Design System mới."',
      360,
      360,
      'purple',
      300
    );

    // Additional feedback sticky
    createSticky(
      '💡 Ghi chú từ Lead Kỹ thuật (Nam):\n"Nút CTA này sẽ kích hoạt modal Google Meet hoặc phiên soạn thảo RFC mới chỉ với 1 cú click."',
      40,
      410,
      'yellow',
      280
    );
  }

  return elements;
}
