'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Tag,
  Share2,
  ChevronRight,
  Folder,
  FileText,
  Copy,
  Check,
  Edit3,
  ExternalLink,
  Archive,
  HelpCircle,
  Layers,
  Sparkles,
  ArrowLeft,
  X,
  ShieldAlert,
  Play,
  CheckSquare,
} from 'lucide-react';
import { emitDomainEvent } from '../../lib/domain-event-bus';

export interface WikiPage {
  id: string;
  title: string;
  areaId: 'onboarding' | 'sop' | 'guides' | 'projects' | 'decisions' | 'templates' | 'faq' | 'archive';
  areaName: string;
  topic: string;
  type: 'SOP' | 'Hướng dẫn' | 'Biên bản' | 'Mẫu' | 'FAQ' | 'Dự án';
  owner: string;
  status: 'Đã duyệt' | 'Cần cập nhật' | 'Nháp';
  lastReviewed: string;
  tags: string[];
  summary: string;
  content: string;
  linkedDocId?: string;
}

export const WIKI_AREAS = [
  { id: 'all', name: 'Tất cả khu vực', icon: '🏠' },
  { id: 'onboarding', name: '👋 Bắt đầu (Onboarding)', icon: '👋', desc: 'Chào mừng, checklist tuần đầu, phân công' },
  { id: 'sop', name: '📋 Quy trình (SOP)', icon: '📋', desc: 'Quy trình hàng ngày, xử lý sự cố, runbook' },
  { id: 'guides', name: '📚 Hướng dẫn & Công cụ', icon: '📚', desc: 'Cách dùng hệ thống, tài khoản, phân quyền' },
  { id: 'projects', name: '🗂️ Dự án', icon: '🗂️', desc: 'Đang triển khai & bài học kinh nghiệm' },
  { id: 'decisions', name: '📝 Họp & Quyết định', icon: '📝', desc: 'Biên bản họp, nhật ký quyết định kỹ thuật' },
  { id: 'templates', name: '📑 Mẫu & Biểu mẫu', icon: '📑', desc: 'Khung PRD, post-mortem, kịch bản mẫu' },
  { id: 'faq', name: '❓ FAQ', icon: '❓', desc: 'Câu hỏi thường gặp giải đáp nhanh' },
  { id: 'archive', name: '🗃️ Lưu trữ', icon: '🗃️', desc: 'Tài liệu cũ, quy chuẩn đã thay thế' },
];

const INITIAL_WIKI_PAGES: WikiPage[] = [
  // 1. Onboarding
  {
    id: 'wiki-onb-01',
    title: 'Checklist Tuần Đầu Tiên Cho Nhân Viên Mới',
    areaId: 'onboarding',
    areaName: '👋 Bắt đầu (Onboarding)',
    topic: 'Checklist tuần đầu',
    type: 'Hướng dẫn',
    owner: 'Trần Thị Linh (PM)',
    status: 'Đã duyệt',
    lastReviewed: '2026-09-28',
    tags: ['#onboarding', '#nhan-su', '#tuan-dau'],
    summary: 'Danh sách các việc cần hoàn thành trong 5 ngày làm việc đầu tiên để hòa nhập nhanh.',
    content: `## 🎯 Mục tiêu tuần đầu tiên
Chào mừng bạn gia nhập đội ngũ! Trang này giúp bạn nắm rõ các bước cần làm trong 5 ngày đầu:

### Ngày 1: Thiết lập môi trường & Tài khoản
- [x] Nhận email kích hoạt tài khoản hệ thống cộng tác Collaborative Workspace.
- [x] Đăng nhập vào Zalo Chat nội bộ, gia nhập kênh **#tat-ca-thanh-vien** và **#du-an-alpha**.
- [x] Đổi mã PIN bảo mật cá nhân tại mục Cài đặt.
- [x] Giới thiệu bản thân ngắn gọn trong kênh chung.

### Ngày 2 - 3: Tìm hiểu Kiến trúc & Công cụ
- [ ] Đọc tài liệu **ARCH-01: Kiến trúc Mạng Phân tán & CRDT Yjs** trong mục Quy trình (SOP).
- [ ] Tham gia một buổi gọi thoại (Huddle) thử nghiệm với người hướng dẫn (Buddy).
- [ ] Thử tạo một tài liệu nháp và mời đồng nghiệp cùng gõ đồng thời để kiểm tra con trỏ trực tiếp.

### Ngày 4 - 5: Giao việc & Tham gia Sprint
- [ ] Truy cập Bảng Kanban (\`/tasks\`), nhận thẻ công việc đầu tiên được giao.
- [ ] Họp 1-on-1 với Quản lý trực tiếp để thống nhất mục tiêu 30 ngày.

> 💡 **Quy tắc vàng**: Nếu có câu hỏi lặp lại trên chat, hãy kiểm tra mục **FAQ** hoặc gửi kèm link trang Wiki này!`,
  },
  {
    id: 'wiki-onb-02',
    title: 'Sơ đồ Ai Làm Gì & Danh bạ Liên hệ Khi Cần Hỗ trợ',
    areaId: 'onboarding',
    areaName: '👋 Bắt đầu (Onboarding)',
    topic: 'Ai làm gì, liên hệ ai',
    type: 'Hướng dẫn',
    owner: 'Nguyễn Văn Nam',
    status: 'Đã duyệt',
    lastReviewed: '2026-09-25',
    tags: ['#onboarding', '#lien-he', '#vai-tro'],
    summary: 'Bảng phân công trách nhiệm rõ ràng giúp biết chính xác cần tìm ai khi gặp sự cố.',
    content: `## 👥 Ma trận Trách nhiệm & Liên hệ

| Vấn đề / Yêu cầu | Người phụ trách chính | Kênh Zalo liên hệ | Thời gian phản hồi |
| :--- | :--- | :--- | :--- |
| **Quyền truy cập, lỗi tài khoản, bảo mật** | Ban Quản Trị (Admin) | \`#ho-tro-it\` | Trong vòng 15 phút |
| **Sự cố hạ tầng server, NGINX, Redis sập** | Lê Hoàng (DevOps) | \`#oncall-infra\` | Ngay lập tức (< 5 phút) |
| **Kế hoạch tính năng, yêu cầu nghiệp vụ (PRD)** | Trần Thị Linh (PM) | Chat trực tiếp | Trong ngày |
| **Kiến trúc mã nguồn, review thuật toán CRDT** | Nguyễn Văn Nam (Lead) | \`#tech-discuss\` | 1 - 2 giờ |`,
  },

  // 2. SOP
  {
    id: 'wiki-sop-01',
    title: 'Quy trình Xử lý Sự cố Máy chủ & Runbook On-Call (P1/P2)',
    areaId: 'sop',
    areaName: '📋 Quy trình (SOP)',
    topic: 'Quy trình xử lý sự cố, ngoại lệ',
    type: 'SOP',
    owner: 'Lê Hoàng (DevOps)',
    status: 'Cần cập nhật',
    lastReviewed: '2026-09-15',
    tags: ['#sop', '#oncall', '#runbook', '#p1'],
    summary: 'Các bước chuẩn hóa khi phát hiện độ trễ WebSocket tăng đột biến hoặc Redis cluster rớt mạng.',
    content: `## 🚨 Quy trình Ứng phó Sự cố Khẩn cấp (Runbook)

### 1. Phân loại mức độ nghiêm trọng
- **Mức P1 (Nghiêm trọng cao nhất)**: Hệ thống WebSocket Gateway không thể nhận kết nối, mất đồng bộ CRDT > 50% người dùng.
- **Mức P2 (Trung bình)**: Một trong hai node (\`ws-node-1\` hoặc \`ws-node-2\`) bị dừng nhưng NGINX đã tự động chuyển tải sang node còn lại.

### 2. Các bước xử lý ngay lập tức
1. **Kiểm tra trạng thái NGINX & Cụm node**:
   - Truy cập tab **Giám sát Cụm máy chủ** hoặc gọi lệnh: \`docker ps\`
   - Xem log lỗi: \`docker logs -f ws-node-1\`
2. **Kích hoạt Failover Redis Pub/Sub**:
   - Nếu kênh truyền bị ngắt, khởi động lại container Redis: \`docker restart collab_redis_mesh\`
3. **Thông báo toàn đội**:
   - Đăng thông báo trong kênh **#thong-bao-he-thong** trên Zalo Chat để người dùng an tâm rằng dữ liệu được bảo vệ an toàn trong IndexedDB cục bộ.
4. **Lập biên bản Post-mortem**:
   - Sau khi khôi phục, viết báo cáo bài học kinh nghiệm theo mẫu tại **📑 Mẫu & Biểu mẫu > Mẫu Post-mortem Sự cố**.`,
  },
  {
    id: 'wiki-sop-02',
    title: 'Quy trình Review Code & Triển khai Bản phát hành (Release SOP)',
    areaId: 'sop',
    areaName: '📋 Quy trình (SOP)',
    topic: 'Quy trình hằng ngày / hằng tuần',
    type: 'SOP',
    owner: 'Nguyễn Văn Nam',
    status: 'Đã duyệt',
    lastReviewed: '2026-09-30',
    tags: ['#sop', '#code-review', '#deploy', '#ci-cd'],
    summary: 'Quy chuẩn bắt buộc trước khi hợp nhất Pull Request vào nhánh chính.',
    content: `## 📋 Tiêu chuẩn Kiểm duyệt Mã nguồn (Code Review)

### Quy tắc 4 mắt (Four-eyes principle)
- Mọi thay đổi đều phải được ít nhất **1 Senior Engineer** phê duyệt.
- Kiểm thử tự động phải đạt 100% Pass trước khi merge:
  - Kiểm thử hội tụ CRDT (\`npm run test:convergence\`)
  - Kiểm thử truyền thông chéo node (\`npm run test:chat\`)

### Checklist trước khi Deploy:
- [ ] Chạy kiểm tra tĩnh và build sạch sẽ: \`npm run build\`
- [ ] Kiểm tra không lộ token hay khóa bí mật trong mã nguồn.
- [ ] Ghi lại nhật ký thay đổi (Changelog) phiên bản.`,
  },

  // 3. Guides
  {
    id: 'wiki-gui-01',
    title: 'Hướng dẫn Sử dụng Tính năng Soạn thảo Đồng thời & Phím tắt Nhanh',
    areaId: 'guides',
    areaName: '📚 Hướng dẫn & công cụ',
    topic: 'Hướng dẫn dùng từng công cụ',
    type: 'Hướng dẫn',
    owner: 'Nguyễn Văn Nam',
    status: 'Đã duyệt',
    lastReviewed: '2026-09-29',
    tags: ['#huong-dan', '#phim-tat', '#crdt', '#editor'],
    summary: 'Cách dùng menu lệnh nhanh gõ tắt Slash / và chỉnh sửa không bao giờ mất dữ liệu.',
    content: `## ✍️ Soạn thảo Đồng thời Siêu tốc

### 1. Menu gõ tắt Notion-Style (\`/\` Slash Command)
Trong văn bản, bạn chỉ cần gõ ký tự \`/\` ở đầu dòng để mở danh mục định dạng:
- \`/h1\`, \`/h2\`, \`/h3\`: Tiêu đề các cấp.
- \`/todo\`: Danh sách việc cần làm có ô tích chọn.
- \`/code\`: Khối mã nguồn lập trình có tô sáng cú pháp.
- \`/table\`: Bảng dữ liệu đa cột.

### 2. Phím tắt Lệnh nhanh toàn năng
- Nhấn **\`⌘ K\`** (Mac) hoặc **\`Ctrl + K\`** (Windows) để mở thanh tìm kiếm nhanh mọi trang, tác vụ và đồng nghiệp từ bất kỳ màn hình nào.`,
  },

  // 4. Decisions
  {
    id: 'wiki-dec-01',
    title: 'ADR-01: Vì sao Chọn CRDT Yjs Thay vì Operational Transformation (OT)?',
    areaId: 'decisions',
    areaName: '📝 Họp & quyết định',
    topic: 'Nhật ký quyết định',
    type: 'Biên bản',
    owner: 'Alice Tech (Kiến trúc sư)',
    status: 'Đã duyệt',
    lastReviewed: '2026-09-20',
    tags: ['#adr', '#crdt', '#architecture', '#quyet-dinh'],
    summary: 'Phân tích lý do chọn cấu trúc dữ liệu CRDT để hỗ trợ làm việc ngoại tuyến và mạng phân tán.',
    content: `## 💡 Bối cảnh & Quyết định Kiến trúc

### Vấn đề đặt ra:
Hệ thống cần cho phép nhiều người cùng soạn thảo văn bản và vẽ bảng trắng thời gian thực, có khả năng hoạt động tốt cả khi mạng chập chờn (Offline-first).

### So sánh OT (Google Docs) vs CRDT (Yjs):
- **OT (Operational Transformation)**: Bắt buộc phải có một máy chủ trung tâm làm trọng tài phân xử thứ tự thao tác. Nếu mất kết nối với server, client không thể tiếp tục ghi nhận sửa đổi phức tạp.
- **CRDT (Conflict-free Replicated Data Type)**:
  - Cho phép chỉnh sửa độc lập phi tập trung.
  - Tự động hội tụ dữ liệu chính xác 100% bằng thuật toán toán học khi các thiết bị kết nối lại.
  - Phù hợp hoàn hảo với kiến trúc nhiều WebSocket node phía sau cân bằng tải NGINX.

### Kết luận:
Nhóm quyết định chọn **Yjs** làm nền tảng cốt lõi cho Document, Bảng trắng và Bảng Kanban.`,
  },

  // 5. Templates
  {
    id: 'wiki-tem-01',
    title: 'Mẫu Tài Liệu Yêu Cầu Sản Phẩm Chuẩn (PRD Template)',
    areaId: 'templates',
    areaName: '📑 Mẫu & biểu mẫu (template)',
    topic: 'Biểu mẫu chuẩn',
    type: 'Mẫu',
    owner: 'Trần Thị Linh (PM)',
    status: 'Đã duyệt',
    lastReviewed: '2026-09-27',
    tags: ['#mau', '#prd', '#product', '#template'],
    summary: 'Khung tài liệu bắt buộc khi đề xuất tính năng hoặc sản phẩm mới.',
    content: `## 📄 MẪU PRD CHUẨN DOANH NGHIỆP

### 1. Tổng quan & Vấn đề cần giải quyết
- **Tên tính năng**: [Tên tính năng ngắn gọn]
- **Vấn đề người dùng gặp phải**: [Người dùng đang khó khăn ở điểm nào?]
- **Mục tiêu đo lường được (Metrics)**: [Tăng năng suất 30%, giảm thời gian họp...]

### 2. Chân dung người dùng (User Persona)
- Ai là người hưởng lợi trực tiếp?

### 3. Kịch bản sử dụng (User Stories & Flow)
- *Là một thành viên nhóm, tôi muốn... để có thể...*

### 4. Tiêu chí Nghiệm thu (Acceptance Criteria)
- [ ] Trường hợp sử dụng thành công (Happy Path).
- [ ] Xử lý ngoại lệ khi mất mạng hoặc người dùng nhập sai.`,
  },

  // 6. FAQ
  {
    id: 'wiki-faq-01',
    title: 'FAQ: Các Câu Hỏi Thường Gặp Về Quyền Hạn & Sao Lưu Dữ Liệu',
    areaId: 'faq',
    areaName: '❓ FAQ',
    topic: 'Câu hỏi thường gặp',
    type: 'FAQ',
    owner: 'Ban Quản Trị',
    status: 'Đã duyệt',
    lastReviewed: '2026-09-30',
    tags: ['#faq', '#hoi-dap', '#bao-mat'],
    summary: 'Giải đáp nhanh các thắc mắc về phân quyền, khôi phục bản cũ và tính riêng tư của tin nhắn chat.',
    content: `## ❓ CÂU HỎI THƯỜNG GẶP (FAQ)

### 1. Dữ liệu có bị mất khi tôi tắt trình duyệt mà chưa nhấn Lưu?
**Trả lời**: Hoàn toàn **KHÔNG**. Hệ thống tự động lưu từng ký tự ngay khi bạn gõ qua CRDT Yjs và lưu đệm vào IndexedDB máy tính. Ngoài ra, máy chủ định kỳ chụp ảnh sao lưu (Snapshot) lên MinIO S3.

### 2. Làm thế nào để khóa một cuộc trò chuyện riêng tư bằng mã PIN?
**Trả lời**: Trong khung Chat Zalo, bấm vào menu 3 chấm ở góc trên bên phải hội thoại -> chọn **Khóa cuộc trò chuyện** -> Nhập mã PIN 4 số. Cuộc trò chuyện này sẽ yêu cầu nhập PIN mỗi khi mở lại.

### 3. Tôi có thể khôi phục lại nội dung tài liệu của ngày hôm qua không?
**Trả lời**: **CÓ**. Trong trang soạn thảo văn bản, bấm vào icon **Lịch sử phiên bản (Clock)** ở góc trên để xem danh sách các mốc thời gian và bấm nút *Khôi phục phiên bản này*.`,
  },
];

export function InternalWikiKnowledgeBase() {
  const router = useRouter();
  const [pages, setPages] = useState<WikiPage[]>(INITIAL_WIKI_PAGES);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Create/Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formTitle, setFormTitle] = useState('');
  const [formAreaId, setFormAreaId] = useState<any>('sop');
  const [formTopic, setFormTopic] = useState('');
  const [formType, setFormType] = useState<any>('SOP');
  const [formOwner, setFormOwner] = useState('Nguyễn Văn Nam');
  const [formStatus, setFormStatus] = useState<any>('Đã duyệt');
  const [formTags, setFormTags] = useState('#sop, #quy-trinh');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load Custom Wiki Pages from localStorage (e.g. exported from Whiteboard or created by user)
  useEffect(() => {
    const loadCustomPages = () => {
      try {
        const stored = localStorage.getItem('collab_custom_wiki_pages');
        if (stored) {
          const customList: WikiPage[] = JSON.parse(stored);
          if (Array.isArray(customList) && customList.length > 0) {
            setPages((prev) => {
              const customMap = new Map<string, WikiPage>();
              customList.forEach((c) => customMap.set(c.id, c));

              const updated = prev.map((p) => {
                if (customMap.has(p.id)) {
                  const match = customMap.get(p.id)!;
                  customMap.delete(p.id);
                  return { ...p, ...match };
                }
                return p;
              });

              const newCustom = Array.from(customMap.values());
              return [...newCustom, ...updated];
            });
          }
        }
      } catch (err) {
        console.warn('Failed to load custom wiki pages', err);
      }
    };

    loadCustomPages();

    const handleWikiUpdate = () => loadCustomPages();
    window.addEventListener('collab_wiki_updated', handleWikiUpdate);
    window.addEventListener('storage', handleWikiUpdate);

    return () => {
      window.removeEventListener('collab_wiki_updated', handleWikiUpdate);
      window.removeEventListener('storage', handleWikiUpdate);
    };
  }, []);

  // Sync URL query ?page=...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page');
      if (pageParam) {
        const match = pages.find((p) => p.id === pageParam);
        if (match) {
          setSelectedPageId(match.id);
          setSelectedAreaId(match.areaId);
        }
      }
    }
  }, [pages]);

  const persistCustomPage = (page: WikiPage) => {
    try {
      const stored = localStorage.getItem('collab_custom_wiki_pages');
      const list: WikiPage[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex((p) => p.id === page.id);
      if (idx > -1) {
        list[idx] = page;
      } else {
        list.unshift(page);
      }
      localStorage.setItem('collab_custom_wiki_pages', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('collab_wiki_updated'));
    } catch (err) {
      console.warn('Failed to persist custom wiki page', err);
    }
  };

  // Run SOP -> Generate Kanban Task with checklist (Cross-Module M6 -> M3)
  const handleRunSOP = (page: WikiPage) => {
    try {
      const stored = localStorage.getItem('collab_kanban_external_tasks');
      const tasks = stored ? JSON.parse(stored) : [];
      const taskKey = `SOP-${Math.floor(10 + Math.random() * 89)}`;
      const deadline = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

      // Parse checklist items from markdown lines
      const checklistItems: { id: string; text: string; completed: boolean }[] = [];
      const lines = page.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ')) {
          checklistItems.push({
            id: `c_${idx}`,
            text: trimmed.replace(/- \[[ x]\]\s*/, ''),
            completed: false,
          });
        } else if (/^\d+\.\s+\*\*/.test(trimmed)) {
          checklistItems.push({
            id: `c_${idx}`,
            text: trimmed.replace(/^\d+\.\s+/, '').replace(/\*\*/g, '').slice(0, 60),
            completed: false,
          });
        }
      });

      if (checklistItems.length === 0) {
        checklistItems.push(
          { id: 'c1', text: `Đọc kỹ mục đích & phạm vi áp dụng của SOP: "${page.title}"`, completed: false },
          { id: 'c2', text: 'Thực hiện tuần tự các bước vận hành theo tài liệu', completed: false },
          { id: 'c3', text: 'Nghiệm thu kết quả và gửi thông báo hoàn tất', completed: false }
        );
      }

      const newTask = {
        id: `task_sop_${Date.now()}`,
        key: taskKey,
        title: `[Thực thi SOP] ${page.title}`,
        description: `Nhiệm vụ thực thi quy trình chuẩn từ Wiki Knowledge Hub:\n"${page.summary}"\n\nChủ sở hữu SOP: ${page.owner}`,
        column: 'todo' as const,
        priority: 'high' as const,
        assigneeName: 'Nguyễn Văn Nam',
        assigneeColor: '#3b82f6',
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: deadline,
        labels: ['SOP', 'Quy trình', 'Vận hành'],
        checklist: checklistItems.slice(0, 5),
        source_ref: {
          type: 'sop' as const,
          id: page.id,
          title: page.title,
          url: `/?tab=wiki&page=${page.id}`,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      tasks.push(newTask);
      localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('collab_task_created'));

      try {
        emitDomainEvent('sop.run', { page, taskKey });
      } catch (err) {
        console.warn('Failed to emit sop.run', err);
      }

      showToast(`Đã tạo nhiệm vụ ${taskKey} trên Bảng Kanban để thực thi quy trình SOP!`);
    } catch (err) {
      console.warn('Failed to run SOP', err);
    }
  };

  // SOP Approval Workflow
  const handleUpdatePageStatus = (
    page: WikiPage,
    newStatus: 'Đã duyệt' | 'Cần cập nhật' | 'Nháp',
    note?: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedPage: WikiPage = {
      ...page,
      status: newStatus,
      lastReviewed: newStatus === 'Đã duyệt' ? today : page.lastReviewed,
    };

    setPages((prev) => prev.map((p) => (p.id === page.id ? updatedPage : p)));
    persistCustomPage(updatedPage);

    // Audit log & Cross-Module Notification (Flow E)
    if (newStatus === 'Đã duyệt') {
      try {
        emitDomainEvent('document.approved', {
          documentTitle: page.title,
          documentId: page.id,
          approverName: 'Nguyễn Văn Nam',
          version: 'v1.0 (Chính thức)',
        });
      } catch (err) {
        console.warn('Failed to emit document.approved event', err);
      }
    } else {
      try {
        const storedLogs = localStorage.getItem('collab_audit_logs');
        const logs = storedLogs ? JSON.parse(storedLogs) : [];
        logs.unshift({
          id: 'aud_' + Date.now(),
          action: `Cập nhật trạng thái quy trình: "${page.title}" sang "${newStatus}"${note ? ` (${note})` : ''}`,
          userName: 'Nguyễn Văn Nam',
          userRole: 'Reviewer / Admin',
          module: 'Cơ sở Tri thức & Wiki (M6)',
          timestamp: Date.now(),
          status: 'success',
        });
        localStorage.setItem('collab_audit_logs', JSON.stringify(logs.slice(0, 50)));
      } catch {}
    }

    showToast(`Đã cập nhật trạng thái trang thành "${newStatus}"!`);
  };

  // Filtered pages
  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      if (selectedAreaId !== 'all' && p.areaId !== selectedAreaId) return false;
      if (filterType !== 'all' && p.type !== filterType) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = p.title.toLowerCase().includes(q);
        const inTopic = p.topic.toLowerCase().includes(q);
        const inContent = p.content.toLowerCase().includes(q);
        const inTags = p.tags.some((t) => t.toLowerCase().includes(q));
        const inOwner = p.owner.toLowerCase().includes(q);
        if (!inTitle && !inTopic && !inContent && !inTags && !inOwner) return false;
      }

      return true;
    });
  }, [pages, selectedAreaId, filterType, filterStatus, searchQuery]);

  const activePage = useMemo(() => {
    return pages.find((p) => p.id === selectedPageId) || null;
  }, [pages, selectedPageId]);

  const handleCopyLink = (page: WikiPage) => {
    setCopiedLink(true);
    navigator.clipboard?.writeText?.(
      `${window.location.origin}/?tab=wiki&page=${page.id}`
    );
    showToast(`Đã sao chép link trang "${page.title}" để gửi nhanh!`);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormTitle('');
    setFormAreaId(selectedAreaId === 'all' ? 'sop' : selectedAreaId);
    setFormTopic('Quy trình hằng ngày');
    setFormType('SOP');
    setFormOwner('Nguyễn Văn Nam');
    setFormStatus('Đã duyệt');
    setFormTags('#sop, #huong-dan');
    setFormSummary('');
    setFormContent(`## 📌 Mục đích\n[Mô tả mục đích tài liệu]\n\n### Các bước thực hiện\n1. Bước 1...\n2. Bước 2...`);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (page: WikiPage) => {
    setModalMode('edit');
    setEditingId(page.id);
    setFormTitle(page.title);
    setFormAreaId(page.areaId);
    setFormTopic(page.topic);
    setFormType(page.type);
    setFormOwner(page.owner);
    setFormStatus(page.status);
    setFormTags(page.tags.join(', '));
    setFormSummary(page.summary);
    setFormContent(page.content);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const areaMeta = WIKI_AREAS.find((a) => a.id === formAreaId);
    const parsedTags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));

    if (modalMode === 'create') {
      const newPage: WikiPage = {
        id: `wiki-${Date.now()}`,
        title: formTitle.trim(),
        areaId: formAreaId,
        areaName: areaMeta?.name || '📋 Quy trình (SOP)',
        topic: formTopic.trim() || 'Chung',
        type: formType,
        owner: formOwner.trim(),
        status: formStatus,
        lastReviewed: new Date().toISOString().split('T')[0],
        tags: parsedTags,
        summary: formSummary.trim() || formTitle.trim(),
        content: formContent.trim(),
      };
      setPages((prev) => [newPage, ...prev]);
      persistCustomPage(newPage);
      setSelectedPageId(newPage.id);
      showToast(`Đã xuất bản trang Wiki "${newPage.title}"!`);
    } else if (editingId) {
      const existing = pages.find((p) => p.id === editingId);
      const updatedPage: WikiPage = {
        id: editingId,
        title: formTitle.trim(),
        areaId: formAreaId,
        areaName: areaMeta?.name || existing?.areaName || '📋 Quy trình (SOP)',
        topic: formTopic.trim(),
        type: formType,
        owner: formOwner.trim(),
        status: formStatus,
        lastReviewed: new Date().toISOString().split('T')[0],
        tags: parsedTags,
        summary: formSummary.trim(),
        content: formContent.trim(),
      };
      setPages((prev) =>
        prev.map((p) => (p.id === editingId ? { ...p, ...updatedPage } : p))
      );
      persistCustomPage(updatedPage);
      showToast('Đã cập nhật nội dung trang Wiki thành công!');
    }

    setIsModalOpen(false);
  };

  const handleToggleArchive = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === pageId) {
          const isArchived = p.areaId === 'archive';
          return {
            ...p,
            areaId: isArchived ? 'sop' : 'archive',
            areaName: isArchived ? '📋 Quy trình (SOP)' : '🗃️ Lưu trữ',
            status: isArchived ? 'Đã duyệt' : 'Cần cập nhật',
          };
        }
        return p;
      })
    );
    showToast('Đã chuyển đổi trạng thái lưu trữ!');
  };

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Notion/Confluence Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs">
              Knowledge Hub (3 Cấp)
            </span>
            <span className="text-[11px] text-white/80">• Một nội dung, một nơi chân lý</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Cơ sở Tri thức &amp; Wiki Nội bộ Doanh nghiệp
          </h2>
          <p className="text-xs text-white/80 leading-relaxed">
            Cấu trúc 3 cấp tinh gọn: <strong>Khu vực &gt; Chủ đề &gt; Trang</strong>. Trả lời trực tiếp câu hỏi &ldquo;Làm việc X thế nào?&rdquo;. Có chủ sở hữu và ngày rà soát định kỳ.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="self-start md:self-auto flex items-center gap-1.5 px-4 py-2 bg-white text-blue-800 hover:bg-blue-50 rounded-xl text-xs font-bold shadow-md transition-transform active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Viết trang Wiki mới</span>
        </button>
      </div>

      {/* Search & Property Filter Bar (Mục 4: Tìm nhanh bằng thuộc tính) */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm wiki theo câu hỏi, chủ đề, nội dung, thẻ # hoặc người phụ trách..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Quick Property Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Loại */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] text-zinc-500 font-medium">Loại:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-800"
              >
                <option value="all">Tất cả loại</option>
                <option value="SOP">SOP</option>
                <option value="Hướng dẫn">Hướng dẫn</option>
                <option value="Biên bản">Biên bản</option>
                <option value="Mẫu">Mẫu</option>
                <option value="FAQ">FAQ</option>
              </select>
            </div>

            {/* Filter Trạng thái */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] text-zinc-500 font-medium">Trạng thái:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-800"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Đã duyệt">Đã duyệt (Active)</option>
                <option value="Cần cập nhật">Cần cập nhật</option>
                <option value="Nháp">Bản nháp</option>
              </select>
            </div>

            {(filterType !== 'all' || filterStatus !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setFilterType('all');
                  setFilterStatus('all');
                  setSearchQuery('');
                  setSelectedAreaId('all');
                }}
                className="text-[11px] text-blue-600 hover:underline px-1.5"
              >
                Đặt lại lọc
              </button>
            )}
          </div>
        </div>

        {/* 8 Areas Tabs (Cấu trúc 3 cấp) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-zinc-100">
          {WIKI_AREAS.map((area) => {
            const count =
              area.id === 'all'
                ? pages.length
                : pages.filter((p) => p.areaId === area.id).length;
            const isSelected = selectedAreaId === area.id;

            return (
              <button
                key={area.id}
                onClick={() => {
                  setSelectedAreaId(area.id);
                  if (activePage && area.id !== 'all' && activePage.areaId !== area.id) {
                    setSelectedPageId(null);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-zinc-100/80 text-zinc-700 hover:bg-zinc-200/80'
                }`}
              >
                <span>{area.icon}</span>
                <span>{area.name.replace(/^[^\s]+\s/, '')}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Layout: 2 Columns (Tree list on left, Reading/Detail on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Danh sách trang (Tree list - 5 cols) */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between px-1 text-xs text-zinc-500 font-semibold">
            <span>
              {selectedAreaId === 'all'
                ? 'Tất cả tài liệu wiki'
                : WIKI_AREAS.find((a) => a.id === selectedAreaId)?.name}
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {filteredPages.length} trang
            </span>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredPages.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200 text-zinc-400 text-xs">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Không có bài viết nào phù hợp bộ lọc.</p>
              </div>
            ) : (
              filteredPages.map((page) => {
                const isSelected = activePage?.id === page.id;
                return (
                  <div
                    key={page.id}
                    onClick={() => setSelectedPageId(page.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-300 shadow-xs ring-1 ring-blue-400/30'
                        : 'bg-white border-zinc-200/80 hover:border-zinc-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            page.type === 'SOP'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              : page.type === 'Mẫu'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                              : page.type === 'FAQ'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                          }`}
                        >
                          {page.type}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {page.topic}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                          page.status === 'Đã duyệt'
                            ? 'bg-emerald-50 text-emerald-700'
                            : page.status === 'Cần cập nhật'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {page.status}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-bold line-clamp-1 mb-1 ${
                        isSelected ? 'text-blue-900' : 'text-zinc-900'
                      }`}
                    >
                      {page.title}
                    </h4>
                    <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                      {page.summary}
                    </p>

                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-zinc-100 text-[10px] text-zinc-400">
                      <span className="truncate max-w-[140px]">
                        👤 {page.owner.split(' ')[0]}...
                      </span>
                      <span className="font-mono">
                        Rà soát: {page.lastReviewed}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Chi tiết bài viết Wiki (Reading Pane - 7 cols) */}
        <div className="lg:col-span-7">
          {activePage ? (
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden flex flex-col h-full min-h-[500px]">
              {/* Header with Breadcrumb & Actions */}
              <div className="p-5 border-b border-zinc-200/80 bg-zinc-50/60 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span className="text-zinc-600">{activePage.areaName}</span>
                    <ChevronRight className="w-3 h-3 text-zinc-400" />
                    <span className="text-zinc-800 font-semibold">{activePage.topic}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyLink(activePage)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 transition-colors"
                      title="Sao chép link wiki"
                    >
                      {copiedLink ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(activePage)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                      title="Chỉnh sửa trang"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(activePage.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-zinc-100 transition-colors"
                      title={activePage.areaId === 'archive' ? 'Khôi phục' : 'Lưu trữ'}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h1 className="text-lg md:text-xl font-black text-zinc-900 leading-snug">
                  {activePage.title}
                </h1>

                {/* Attribute metadata bar (Mục 1 & 4: Chủ sở hữu, ngày rà soát, trạng thái, tags) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-white border border-zinc-200/80">
                    <span className="text-[10px] text-zinc-400 block font-medium">CHỦ SỞ HỮU</span>
                    <span className="font-semibold text-zinc-800 truncate block">
                      {activePage.owner}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-zinc-200/80">
                    <span className="text-[10px] text-zinc-400 block font-medium">TRẠNG THÁI</span>
                    <span
                      className={`font-semibold inline-block ${
                        activePage.status === 'Đã duyệt'
                          ? 'text-emerald-600'
                          : activePage.status === 'Cần cập nhật'
                          ? 'text-amber-600'
                          : 'text-zinc-600'
                      }`}
                    >
                      ● {activePage.status}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-zinc-200/80">
                    <span className="text-[10px] text-zinc-400 block font-medium">RÀ SOÁT LẦN CUỐI</span>
                    <span className="font-mono text-zinc-700 font-semibold">
                      {activePage.lastReviewed}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-zinc-200/80">
                    <span className="text-[10px] text-zinc-400 block font-medium">PHÂN LOẠI</span>
                    <span className="font-semibold text-blue-700">
                      {activePage.type}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {activePage.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md bg-zinc-200/70 text-zinc-700 text-[10px] font-mono font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* SOP Operational Execution & Approval Action Panel */}
                {activePage.type === 'SOP' && (
                  <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-purple-50/80 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                        <span>Thực thi quy trình &amp; Luồng phê duyệt (Cross-Module M6 &gt; M3)</span>
                      </div>
                      <p className="text-[11px] text-blue-700 leading-tight">
                        Tạo thẻ việc Kanban kèm checklist các bước SOP, hoặc xét duyệt phát hành quy chuẩn mới.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleRunSOP(activePage)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Chạy quy trình (Run SOP)</span>
                      </button>

                      {/* Approval status actions */}
                      {activePage.status === 'Nháp' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdatePageStatus(activePage, 'Cần cập nhật', 'Gửi hội đồng thẩm định')}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs"
                        >
                          Gửi duyệt SOP
                        </button>
                      ) : activePage.status === 'Cần cập nhật' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdatePageStatus(activePage, 'Đã duyệt', 'Đạt chuẩn release v1.0')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
                          >
                            ✓ Duyệt phát hành
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdatePageStatus(activePage, 'Nháp', 'Yêu cầu chỉnh sửa thêm')}
                            className="px-2 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-xl text-xs font-medium"
                          >
                            Yêu cầu sửa
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdatePageStatus(activePage, 'Cần cập nhật', 'Mở phiên bản sửa đổi mới')}
                          className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold border border-zinc-200"
                        >
                          Mở đợt rà soát lại
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Body: Markdown reading area */}
              <div className="p-6 overflow-y-auto flex-1 prose prose-zinc max-w-none text-xs text-zinc-800 leading-relaxed font-sans space-y-3">
                {activePage.content.split('\n\n').map((block, idx) => {
                  if (block.startsWith('## ')) {
                    return (
                      <h2
                        key={idx}
                        className="text-base font-bold text-zinc-900 pt-3 pb-1 border-b border-zinc-100"
                      >
                        {block.replace('## ', '')}
                      </h2>
                    );
                  }
                  if (block.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="text-sm font-bold text-zinc-800 pt-2">
                        {block.replace('### ', '')}
                      </h3>
                    );
                  }
                  if (block.startsWith('> ')) {
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-blue-50 border-l-4 border-blue-600 rounded-r-xl text-blue-900 text-xs italic"
                      >
                        {block.replace('> ', '')}
                      </div>
                    );
                  }
                  if (block.startsWith('|')) {
                    // Render simple table
                    const lines = block.split('\n').filter((l) => l.trim().length > 0);
                    if (lines.length >= 3) {
                      const headers = lines[0]
                        .split('|')
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0);
                      const rows = lines.slice(2).map((line) =>
                        line
                          .split('|')
                          .map((s) => s.trim())
                          .filter((s) => s.length > 0)
                      );
                      return (
                        <div key={idx} className="overflow-x-auto my-3">
                          <table className="w-full text-left border-collapse border border-zinc-200 rounded-lg text-xs">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                              <tr>
                                {headers.map((h, i) => (
                                  <th key={i} className="py-2 px-3 font-semibold text-zinc-700">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                              {rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-zinc-50/50">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="py-2 px-3 text-zinc-800">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                  }
                  return (
                    <p key={idx} className="text-zinc-700 text-xs leading-relaxed whitespace-pre-line">
                      {block}
                    </p>
                  );
                })}
              </div>

              {/* Bottom Quick-Action bar */}
              <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleCopyLink(activePage)}
                  className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-blue-600 font-semibold"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Gửi link này cho đồng nghiệp</span>
                </button>

                <button
                  onClick={() => router.push(`/doc/doc-wiki-${activePage.id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở chỉnh sửa đồng thời (CRDT Editor)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Home / Welcome Overview when no page is active */
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-zinc-900">
                  Chọn một trang Wiki từ danh sách để xem chi tiết
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Toàn bộ tài liệu được chuẩn hóa theo 3 cấp: Khu vực &gt; Chủ đề &gt; Trang. Nhấp vào bất kỳ bài viết nào ở cột trái hoặc bấm nút tạo trang mới.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-lg mx-auto pt-3 text-left">
                {WIKI_AREAS.filter((a) => a.id !== 'all').slice(0, 6).map((area) => (
                  <button
                    key={area.id}
                    onClick={() => {
                      setSelectedAreaId(area.id);
                      const first = pages.find((p) => p.areaId === area.id);
                      if (first) setSelectedPageId(first.id);
                    }}
                    className="p-3 rounded-xl bg-zinc-50 hover:bg-blue-50 border border-zinc-200/60 hover:border-blue-200 transition-all group"
                  >
                    <div className="text-lg mb-1">{area.icon}</div>
                    <div className="text-xs font-bold text-zinc-800 group-hover:text-blue-600 truncate">
                      {area.name.replace(/^[^\s]+\s/, '')}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5">{area.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-2xl overflow-hidden flex flex-col font-sans max-h-[90vh]">
            <div className="h-14 px-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-zinc-900">
                  {modalMode === 'create' ? 'Tạo trang Wiki mới' : 'Chỉnh sửa trang Wiki'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-3.5 text-xs overflow-y-auto">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Tiêu đề trang (Đặt tên rõ nghĩa, bắt đầu bằng hành động) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quy trình Xử lý Sự cố Máy chủ hoặc Cách xin nghỉ phép"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Khu vực (Cấp 1)</label>
                  <select
                    value={formAreaId}
                    onChange={(e) => setFormAreaId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-800"
                  >
                    {WIKI_AREAS.filter((a) => a.id !== 'all').map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Chủ đề (Cấp 2)</label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="Ví dụ: Checklist tuần đầu, Runbook..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Loại tài liệu</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-800"
                  >
                    <option value="SOP">SOP (Quy trình chuẩn)</option>
                    <option value="Hướng dẫn">Hướng dẫn</option>
                    <option value="Biên bản">Biên bản</option>
                    <option value="Mẫu">Mẫu (Template)</option>
                    <option value="FAQ">FAQ (Hỏi đáp)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Chủ sở hữu *</label>
                  <input
                    type="text"
                    required
                    value={formOwner}
                    onChange={(e) => setFormOwner(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Trạng thái</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-800"
                  >
                    <option value="Đã duyệt">Đã duyệt (Active)</option>
                    <option value="Cần cập nhật">Cần cập nhật</option>
                    <option value="Nháp">Bản nháp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Thẻ phân loại (ngăn cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="#onboarding, #sop, #deploy..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Tóm tắt nội dung ngắn</label>
                <input
                  type="text"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="Mô tả 1-2 câu nội dung để người khác tìm thấy nhanh..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Nội dung chi tiết (Markdown)</label>
                <textarea
                  rows={8}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 font-mono text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-xl font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {modalMode === 'create' ? 'Xuất bản trang Wiki' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
