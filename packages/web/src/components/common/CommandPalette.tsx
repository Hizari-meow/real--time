'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Table,
  CheckSquare,
  Palette,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Server,
  User,
  ArrowRight,
  HardDrive,
  Clock,
  X,
  Plus,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Trang & Không gian' | 'Thao tác nhanh' | 'Tài liệu' | 'Thành viên';
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAICopilot?: () => void;
  onOpenDrive?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenAICopilot,
  onOpenDrive,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    // Spaces
    {
      id: 'nav-home',
      title: 'Trang chủ Workspace',
      subtitle: 'Xem tổng quan dự án, tài liệu gần đây và chỉ số',
      category: 'Trang & Không gian',
      icon: <FileText className="w-4 h-4 text-blue-600" />,
      action: () => router.push('/'),
      keywords: ['home', 'trang chu', 'dashboard'],
    },
    {
      id: 'nav-chat',
      title: 'Hệ thống Chat Zalo',
      subtitle: 'Nhắn tin thời gian thực, gọi video, tin tự hủy, khóa PIN',
      category: 'Trang & Không gian',
      icon: <MessageSquare className="w-4 h-4 text-sky-600" />,
      action: () => router.push('/chat'),
      keywords: ['chat', 'zalo', 'tin nhan', 'call', 'video'],
    },
    {
      id: 'nav-tasks',
      title: 'Bảng công việc Kanban',
      subtitle: 'Quản lý sprint, danh sách việc, báo cáo tiến độ & tự động hóa',
      category: 'Trang & Không gian',
      icon: <CheckSquare className="w-4 h-4 text-emerald-600" />,
      action: () => router.push('/tasks'),
      keywords: ['kanban', 'tasks', 'cong viec', 'sprint', 'todo'],
    },
    {
      id: 'nav-whiteboard',
      title: 'Bảng trắng Brainstorming (M5)',
      subtitle: 'Vẽ tự do, sơ đồ mindmap, dot-voting 3 phiếu, timer & workshop 6 bước',
      category: 'Trang & Không gian',
      icon: <Palette className="w-4 h-4 text-amber-600" />,
      action: () => router.push('/whiteboard?board=open_brainstorm'),
      keywords: ['whiteboard', 'bang trang', 've', 'paint', 'mindmap', 'brainstorm'],
    },
    {
      id: 'nav-design',
      title: 'Bản vẽ Thiết kế UI Workspace & Slide (Figma Canvas - M1)',
      subtitle: 'Mockup giao diện, canvas vector, bình luận Pin ghim vị trí, CSS code inspector',
      category: 'Trang & Không gian',
      icon: <Sparkles className="w-4 h-4 text-purple-600" />,
      action: () => router.push('/design/design_ui_workspace'),
      keywords: ['design', 'figma', 'canvas', 'ui', 'slide', 'mockup', 'pin'],
    },
    {
      id: 'nav-drive',
      title: 'Kho lưu trữ Cloud Drive (MinIO S3)',
      subtitle: 'Quản lý tài liệu, tệp đính kèm và bản chụp CRDT snapshot',
      category: 'Trang & Không gian',
      icon: <HardDrive className="w-4 h-4 text-indigo-600" />,
      action: () => {
        if (onOpenDrive) onOpenDrive();
        else router.push('/?tab=drive');
      },
      keywords: ['file', 'tep', 'cloud', 'drive', 's3', 'storage'],
    },

    // Quick Actions
    {
      id: 'act-new-doc',
      title: 'Tạo tài liệu cộng tác mới',
      subtitle: 'Khởi tạo trang soạn thảo CRDT Yjs không xung đột',
      category: 'Thao tác nhanh',
      icon: <Plus className="w-4 h-4 text-emerald-600" />,
      action: () => router.push(`/doc/doc-${Date.now()}`),
      keywords: ['new doc', 'tao tai lieu', 'create document'],
    },
    {
      id: 'act-ai-copilot',
      title: 'Hỏi Trợ lý AI Copilot',
      subtitle: 'Tóm tắt thảo luận, trích xuất việc cần làm và trau chuốt văn bản',
      category: 'Thao tác nhanh',
      icon: <Sparkles className="w-4 h-4 text-purple-600" />,
      action: () => {
        if (onOpenAICopilot) onOpenAICopilot();
      },
      keywords: ['ai', 'copilot', 'tro ly', 'tom tat', 'summary'],
    },

    // Documents, Spreadsheets & Whiteboards
    {
      id: 'doc-rfc',
      title: 'Kiến Trúc Hội Tụ Dữ Liệu Thời Gian Thực Bằng Yjs CRDT (RFC v4)',
      subtitle: 'Tài liệu kỹ thuật đồng thuận phân tán, benchmark 5,000 CCU',
      category: 'Tài liệu',
      icon: <FileText className="w-4 h-4 text-blue-600" />,
      action: () => router.push('/doc/doc_rfc_consensus'),
      keywords: ['rfc', 'crdt', 'consensus', 'tai lieu', 'dong thuan'],
    },
    {
      id: 'sheet-fin',
      title: 'Báo Cáo Tài Chính & Doanh Thu Q4-2026 (Excel)',
      subtitle: 'Bảng tính Excel 25 dòng, 11 cột, công thức SUM/VAT và bình luận ô C12',
      category: 'Tài liệu',
      icon: <Table className="w-4 h-4 text-emerald-600" />,
      action: () => router.push('/sheet/sheet_fin_q4'),
      keywords: ['sheet', 'excel', 'tai chinh', 'doanh thu', 'bang tinh', 'c12'],
    },
    {
      id: 'design-figma-mockup',
      title: 'Bản Vẽ Thiết Kế UI Workspace & Slide Figma (M1)',
      subtitle: 'Bản vẽ UI Figma, nút CTA tím có ghim bình luận #1 và CSS Inspector',
      category: 'Tài liệu',
      icon: <Sparkles className="w-4 h-4 text-purple-600" />,
      action: () => router.push('/design/design_ui_workspace'),
      keywords: ['figma', 'design', 'ui', 'slide', 'canvas', 'cta', 'pin'],
    },
    {
      id: 'board-brainstorm',
      title: 'Bảng Trắng Brainstorm Sơ Đồ & Hội Thảo (M5)',
      subtitle: '3 cột ý tưởng, phiên biểu quyết Dot Voting và workshop 6 bước chốt kế hoạch',
      category: 'Tài liệu',
      icon: <Palette className="w-4 h-4 text-amber-600" />,
      action: () => router.push('/whiteboard?board=open_brainstorm'),
      keywords: ['whiteboard', 'brainstorm', 'so do', 'retro', 'workshop'],
    },
    {
      id: 'doc-sop',
      title: 'SOP-01: Quy trình Triển khai Cụm Máy chủ & Redis Mesh',
      subtitle: 'Cẩm nang vận hành và chuẩn mực DevOps cho đội ngũ',
      category: 'Tài liệu',
      icon: <ShieldCheck className="w-4 h-4 text-zinc-600" />,
      action: () => router.push('/?tab=wiki'),
      keywords: ['sop', 'wiki', 'quy trinh', 'deploy'],
    },

    // Team Members
    {
      id: 'usr-nam',
      title: 'Nguyễn Văn Nam (Trưởng nhóm Kỹ thuật)',
      subtitle: 'Đang trực tuyến • Nhắn tin hoặc giao việc',
      category: 'Thành viên',
      icon: <User className="w-4 h-4 text-blue-500" />,
      action: () => router.push('/chat'),
      keywords: ['nam', 'lead', 'tech lead'],
    },
    {
      id: 'usr-linh',
      title: 'Trần Thị Linh (Product Manager)',
      subtitle: 'Đang trực tuyến • Nhắn tin hoặc giao việc',
      category: 'Thành viên',
      icon: <User className="w-4 h-4 text-pink-500" />,
      action: () => router.push('/chat'),
      keywords: ['linh', 'pm', 'product'],
    },
  ];

  // Filter commands by query
  const filteredCommands = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.keywords && cmd.keywords.some((k) => k.toLowerCase().includes(q)))
    );
  });

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-[12vh] px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-zinc-200/90 w-full max-w-2xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="h-14 px-4 border-b border-zinc-200 flex items-center gap-3 bg-zinc-50/50">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Tìm kiếm tài liệu, công việc, tin nhắn, người dùng hoặc lệnh nhanh... (↑ ↓ để chọn, Enter để mở)"
            className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-200/70 text-zinc-600 border border-zinc-300">
            ESC
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-zinc-100">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Không tìm thấy kết quả phù hợp cho &quot;{query}&quot;</p>
              <p className="text-xs mt-1 text-zinc-400">Thử tìm kiếm với từ khóa khác như &quot;chat&quot;, &quot;kanban&quot;, &quot;tài liệu&quot;</p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 text-blue-900' : 'text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white shadow-xs' : 'bg-zinc-100'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate text-zinc-900">
                          {cmd.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 font-medium">
                          {cmd.category}
                        </span>
                      </div>
                      {cmd.subtitle && (
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {cmd.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {isSelected && (
                      <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                        Mở <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="h-10 px-4 border-t border-zinc-100 bg-zinc-50/80 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[10px] shadow-2xs font-mono mr-1">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[10px] shadow-2xs font-mono mr-1.5">
                ↓
              </kbd>
              Điều hướng
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[10px] shadow-2xs font-mono mr-1.5">
                ↵
              </kbd>
              Chọn
            </span>
          </div>
          <div className="flex items-center gap-1 font-medium text-zinc-600">
            <span>Phím tắt nhanh: </span>
            <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[10px] shadow-2xs font-mono text-zinc-800">
              ⌘ K
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
