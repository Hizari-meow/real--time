export type WorkspaceItemType = 'doc' | 'sheet' | 'design' | 'whiteboard';

export interface WorkspaceItem {
  id: string;
  title: string;
  type: WorkspaceItemType;
  href: string;
  currentVersion: number;
  updatedAt: string;
  createdAt: string;
  owner?: { id: string; name: string; email?: string };
  badgeText: string;
  badgeClass: string;
  iconBgClass: string;
  iconTextClass: string;
  detailsSummary: string;
}

// Seed Real Workspaces Items across all 4 separate modalities
export const SEED_WORKSPACE_ITEMS: WorkspaceItem[] = [
  // 1. SPREADSHEETS (Bảng tính Excel thật -> /sheet/...)
  {
    id: 'sheet_fin_q4',
    title: 'Báo Cáo Tài Chính & Doanh Thu Q4-2026 (Excel)',
    type: 'sheet',
    href: '/sheet/sheet_fin_q4',
    currentVersion: 8,
    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    owner: { id: 'usr_linh', name: 'Trần Thị Linh' },
    badgeText: 'Bảng tính Excel',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBgClass: 'bg-emerald-50 group-hover:bg-emerald-600',
    iconTextClass: 'text-emerald-600 group-hover:text-white',
    detailsSummary: '25 dòng • 11 cột • Công thức SUM/VAT • Ô C12 đang có bình luận',
  },
  {
    id: 'sheet_budget_2027',
    title: 'Dự Toán Ngân Sách Dự Án Kỹ Thuật 2027 (Excel)',
    type: 'sheet',
    href: '/sheet/sheet_budget_2027',
    currentVersion: 4,
    updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    owner: { id: 'usr_nam', name: 'Nguyễn Văn Nam' },
    badgeText: 'Bảng tính Excel',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBgClass: 'bg-emerald-50 group-hover:bg-emerald-600',
    iconTextClass: 'text-emerald-600 group-hover:text-white',
    detailsSummary: 'Kế hoạch phân bổ chi phí cụm máy chủ & bản quyền 2027',
  },
  {
    id: 'sheet_kpi_metrics',
    title: 'Bảng Theo Dõi KPI & Hiệu Suất Nhóm (Excel)',
    type: 'sheet',
    href: '/sheet/sheet_kpi_metrics',
    currentVersion: 3,
    updatedAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    owner: { id: 'usr_hoang', name: 'Lê Hoàng' },
    badgeText: 'Bảng tính Excel',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBgClass: 'bg-emerald-50 group-hover:bg-emerald-600',
    iconTextClass: 'text-emerald-600 group-hover:text-white',
    detailsSummary: 'Chỉ số hoàn thành Sprint 24 & Đo lường SLA hội tụ CRDT',
  },

  // 2. FIGMA DESIGN CANVAS (Bản vẽ Thiết kế UI & Slide Figma -> /design/...)
  {
    id: 'design_ui_workspace',
    title: 'Bản Thiết Kế Trực Quan UI Workspace & Slide Giới Thiệu (Figma)',
    type: 'design',
    href: '/design/design_ui_workspace',
    currentVersion: 12,
    updatedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    owner: { id: 'usr_giang', name: 'Trần Thị Giang (Design Lead)' },
    badgeText: 'Bản vẽ Figma',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBgClass: 'bg-purple-50 group-hover:bg-purple-600',
    iconTextClass: 'text-purple-600 group-hover:text-white',
    detailsSummary: 'Khung Artboards Desktop 1440px & Slide 16:9 • Ghim Pin #1 tại nút CTA tím • Xuất mã CSS',
  },

  // 3. WHITEBOARD (Bảng trắng Động não & Brainstorming -> /whiteboard?board=...)
  {
    id: 'open_brainstorm',
    title: 'Bảng Trắng Động Não & Sơ Đồ Kiến Trúc (Whiteboard)',
    type: 'whiteboard',
    href: '/whiteboard?board=open_brainstorm',
    currentVersion: 6,
    updatedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    owner: { id: 'usr_alice', name: 'Alice Tech (Kiến trúc sư)' },
    badgeText: 'Bảng trắng',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBgClass: 'bg-amber-50 group-hover:bg-amber-600',
    iconTextClass: 'text-amber-600 group-hover:text-white',
    detailsSummary: 'Mindmap sơ đồ tư duy • Giấy ghi chú sticky notes màu • Bút dạ vẽ tự do',
  },

  // 4. DOCUMENTS (Tài liệu văn bản thật -> /doc/...)
  {
    id: 'doc_rfc_consensus',
    title: 'Kiến Trúc Hội Tụ Dữ Liệu Thời Gian Thực Bằng Yjs CRDT (RFC v4)',
    type: 'doc',
    href: '/doc/doc_rfc_consensus',
    currentVersion: 15,
    updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    owner: { id: 'usr_nam', name: 'Nguyễn Văn Nam' },
    badgeText: 'Văn bản',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBgClass: 'bg-blue-50 group-hover:bg-blue-600',
    iconTextClass: 'text-blue-600 group-hover:text-white',
    detailsSummary: 'Thuật toán CRDT • Thử nghiệm tải 5,000 CCU • Độ trễ <5ms',
  },
  {
    id: 'doc_sop_01',
    title: 'Quy Trình Ứng Phó Sự Cố & Triển Khai Cụm Máy Chủ (SOP-01)',
    type: 'doc',
    href: '/doc/doc_sop_01',
    currentVersion: 7,
    updatedAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    owner: { id: 'usr_hoang', name: 'Lê Hoàng' },
    badgeText: 'Văn bản',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBgClass: 'bg-blue-50 group-hover:bg-blue-600',
    iconTextClass: 'text-blue-600 group-hover:text-white',
    detailsSummary: 'Quy chuẩn DevOps • Tự động failover NGINX • Lưu trữ sao lưu Redis',
  },
  {
    id: 'doc_roadmap_2026',
    title: 'Lộ Trình Nâng Cấp Nền Tảng Cộng Tác Toàn Diện 2026',
    type: 'doc',
    href: '/doc/doc_roadmap_2026',
    currentVersion: 4,
    updatedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16).toISOString(),
    owner: { id: 'usr_linh', name: 'Trần Thị Linh' },
    badgeText: 'Văn bản',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBgClass: 'bg-blue-50 group-hover:bg-blue-600',
    iconTextClass: 'text-blue-600 group-hover:text-white',
    detailsSummary: 'Kế hoạch triển khai AI Copilot, Google Meet WebRTC và Ghim bình luận Canvas',
  },
];

// Audit Log Seed Data
export const AUDIT_LOGS = [
  {
    id: 'audit_1',
    user: 'Nguyễn Văn Nam',
    action: 'Chỉnh sửa tài liệu',
    target: 'Distributed Consensus Engine RFC v4',
    module: 'Documents',
    time: Date.now() - 1000 * 60 * 8,
    role: 'Trưởng nhóm (Admin)',
    status: 'success',
  },
  {
    id: 'audit_2',
    user: 'Lê Hoàng Long',
    action: 'Cập nhật trạng thái công việc',
    target: 'Kiểm thử hội tụ CRDT 500 client -> Done',
    module: 'Kanban Tasks',
    time: Date.now() - 1000 * 60 * 18,
    role: 'Thành viên',
    status: 'success',
  },
  {
    id: 'audit_3',
    user: 'Trần Thị Mai',
    action: 'Ghim Pin #1 tại Nút CTA trên Bản vẽ Figma',
    target: 'Bản Thiết Kế Trực Quan UI Workspace (Figma)',
    module: 'Design Canvas',
    time: Date.now() - 1000 * 60 * 25,
    role: 'Phó nhóm',
    status: 'success',
  },
  {
    id: 'audit_4',
    user: 'Trần Thị Linh',
    action: 'Tính toán công thức =SUM(D4:D6) và trao đổi ô C12',
    target: 'Báo Cáo Tài Chính & Doanh Thu Q4-2026 (Excel)',
    module: 'Spreadsheet',
    time: Date.now() - 1000 * 60 * 35,
    role: 'Product Manager',
    status: 'success',
  },
  {
    id: 'audit_5',
    user: 'Alice (Kiến trúc sư)',
    action: 'Vẽ sơ đồ tư duy trên Bảng trắng',
    target: 'Bảng Trắng Động Não Ý Tưởng & Sơ Đồ Kiến Trúc',
    module: 'Whiteboard',
    time: Date.now() - 1000 * 60 * 50,
    role: 'Trưởng nhóm (Admin)',
    status: 'success',
  },
];
