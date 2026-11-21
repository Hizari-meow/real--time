export interface WikiPage {
  id: string;
  title: string;
  areaId: 'onboarding' | 'sop' | 'guides' | 'projects' | 'decisions' | 'templates' | 'faq' | 'archive' | string;
  areaName?: string;
  topic?: string;
  type: 'SOP' | 'Hướng dẫn' | 'Biên bản' | 'Mẫu' | 'FAQ' | 'Dự án' | string;
  owner: string;
  status: 'Đã duyệt' | 'Cần cập nhật' | 'Nháp' | string;
  lastReviewed?: string;
  tags: string[];
  summary?: string;
  content: string;
  icon?: string;
  parentId?: string | null;
  linkedDocId?: string;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WikiArea {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export const WIKI_AREAS: WikiArea[] = [
  { id: 'all', name: 'Tất cả khu vực', icon: '🏠', desc: 'Toàn bộ kho tri thức' },
  { id: 'onboarding', name: '👋 Bắt đầu (Onboarding)', icon: '👋', desc: 'Chào mừng, checklist tuần đầu, phân công' },
  { id: 'sop', name: '📋 Quy trình (SOP)', icon: '📋', desc: 'Quy trình hàng ngày, xử lý sự cố, runbook' },
  { id: 'guides', name: '📚 Hướng dẫn & Công cụ', icon: '📚', desc: 'Cách dùng hệ thống, tài khoản, phân quyền' },
  { id: 'projects', name: '🗂️ Dự án', icon: '🗂️', desc: 'Đang triển khai & bài học kinh nghiệm' },
  { id: 'decisions', name: '📝 Họp & Quyết định', icon: '📝', desc: 'Biên bản họp, nhật ký quyết định kỹ thuật' },
  { id: 'templates', name: '📑 Mẫu & Biểu mẫu', icon: '📑', desc: 'Khung PRD, post-mortem, kịch bản mẫu' },
  { id: 'faq', name: '❓ FAQ', icon: '❓', desc: 'Câu hỏi thường gặp giải đáp nhanh' },
  { id: 'archive', name: '🗃️ Lưu trữ', icon: '🗃️', desc: 'Tài liệu cũ, quy chuẩn đã thay thế' },
];
