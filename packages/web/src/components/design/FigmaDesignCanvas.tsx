'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  MousePointer,
  Square,
  Circle,
  Type,
  Hand,
  MessageSquare,
  Play,
  Layers,
  Component,
  Copy,
  Download,
  Share2,
  Undo2,
  Redo2,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Send,
  X,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sliders,
  Code,
  FileText,
  Sparkles,
  Presentation,
  Check,
  CheckSquare,
  Move,
} from 'lucide-react';
import { getCollaboratorColor } from '@collab/shared';

export type FigmaToolType = 'select' | 'frame' | 'rectangle' | 'circle' | 'text' | 'hand' | 'comment';

export interface FigmaElement {
  id: string;
  name: string;
  type: 'frame' | 'rectangle' | 'circle' | 'text' | 'button' | 'card' | 'input' | 'slide';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  borderRadius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  shadow?: { x: number; y: number; blur: number; color: string };
  // Text specific
  text?: string;
  fontSize?: number;
  fontWeight?: 'normal' | '500' | '600' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  // Hierarchy
  parentId?: string; // If inside a frame
  locked?: boolean;
  hidden?: boolean;
}

export interface FigmaCommentPin {
  id: string;
  x: number;
  y: number;
  pinNumber: number;
  authorName: string;
  authorColor: string;
  authorRole: string;
  content: string;
  timestamp: number;
  resolved: boolean;
  assignedTask?: {
    assignee: string;
    deadline: string;
  };
  replies?: {
    id: string;
    authorName: string;
    authorColor: string;
    content: string;
    timestamp: number;
  }[];
}

export interface FigmaDesignCanvasProps {
  designId: string;
  designTitle?: string;
  currentUser?: {
    id: string;
    name: string;
    color: string;
  };
}

// Seed Mockup elements ONLY for the demo design "design_ui_workspace"
const SEED_DEMO_ELEMENTS: FigmaElement[] = [
  // Frame 1: Desktop Landing Page (1000 x 640)
  {
    id: 'frame_desktop',
    name: 'Artboard: Desktop App (1000×640)',
    type: 'frame',
    x: 80,
    y: 80,
    width: 1000,
    height: 640,
    borderRadius: 24,
    fill: '#ffffff',
    stroke: '#e4e4e7',
    strokeWidth: 2,
    shadow: { x: 0, y: 12, blur: 32, color: 'rgba(0,0,0,0.06)' },
  },
  // Header Component inside Desktop Frame
  {
    id: 'el_header_bg',
    name: 'Header Navbar',
    type: 'rectangle',
    parentId: 'frame_desktop',
    x: 80,
    y: 80,
    width: 1000,
    height: 64,
    fill: '#f8fafc',
    stroke: '#e2e8f0',
    strokeWidth: 1,
  },
  {
    id: 'el_logo_text',
    name: 'Logo Text',
    type: 'text',
    parentId: 'frame_desktop',
    x: 110,
    y: 102,
    width: 180,
    height: 24,
    text: '✦ CollabStudio 2026',
    fontSize: 16,
    fontWeight: 'bold',
    textColor: '#0f172a',
  },
  // Hero Heading Text
  {
    id: 'el_hero_heading',
    name: 'Hero Title',
    type: 'text',
    parentId: 'frame_desktop',
    x: 180,
    y: 200,
    width: 800,
    height: 48,
    text: 'Nền Tảng Cộng Tác Thời Gian Thực Đột Phá',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    textColor: '#0f172a',
  },
  {
    id: 'el_hero_subtitle',
    name: 'Hero Subtitle',
    type: 'text',
    parentId: 'frame_desktop',
    x: 230,
    y: 260,
    width: 700,
    height: 40,
    text: 'Tài liệu, Bảng tính Excel và Bản vẽ UI Figma kết hợp mượt mà trong một không gian duy nhất.',
    fontSize: 15,
    fontWeight: 'normal',
    textAlign: 'center',
    textColor: '#64748b',
  },
  // Primary CTA Button (PURPLE CTA WITH COMMENT PIN #1)
  {
    id: 'el_cta_button',
    name: 'Nút CTA: Bắt đầu Phiên Làm Việc Mới',
    type: 'button',
    parentId: 'frame_desktop',
    x: 430,
    y: 330,
    width: 300,
    height: 52,
    borderRadius: 16,
    fill: '#9333ea', // Brand Purple
    shadow: { x: 0, y: 8, blur: 20, color: 'rgba(147, 51, 234, 0.35)' },
    text: 'Bắt đầu Phiên Làm Việc Mới ⚡',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    textColor: '#ffffff',
  },
  // Feature Cards
  {
    id: 'el_card_1',
    name: 'Card: Bảng tính Excel',
    type: 'card',
    parentId: 'frame_desktop',
    x: 130,
    y: 430,
    width: 270,
    height: 160,
    borderRadius: 20,
    fill: '#f0fdf4',
    stroke: '#bbf7d0',
    strokeWidth: 1.5,
    text: '📊 Bảng Tính Excel\nTính toán công thức SUM, AVERAGE, ghim trao đổi ngay trên ô tính.',
    fontSize: 13,
    textColor: '#166534',
  },
  {
    id: 'el_card_2',
    name: 'Card: Bản vẽ Figma',
    type: 'card',
    parentId: 'frame_desktop',
    x: 445,
    y: 430,
    width: 270,
    height: 160,
    borderRadius: 20,
    fill: '#faf5ff',
    stroke: '#e9d5ff',
    strokeWidth: 1.5,
    text: '🎨 Bản Vẽ Figma UI\nFrames, layers, xuất CSS, ghim bình luận trực quan theo tọa độ.',
    fontSize: 13,
    textColor: '#6b21a8',
  },
  {
    id: 'el_card_3',
    name: 'Card: Yjs CRDT',
    type: 'card',
    parentId: 'frame_desktop',
    x: 760,
    y: 430,
    width: 270,
    height: 160,
    borderRadius: 20,
    fill: '#eff6ff',
    stroke: '#bfdbfe',
    strokeWidth: 1.5,
    text: '⚡ Hội Tụ Thời Gian Thực\nKhông xung đột dữ liệu, độ trễ <5ms trên 5,000 kết nối đồng thời.',
    fontSize: 13,
    textColor: '#1e40af',
  },

  // Frame 2: Presentation Slide (800 x 450 - 16:9)
  {
    id: 'frame_slide_1',
    name: 'Slide 1: Giới Thiệu Dự Án (16:9)',
    type: 'slide',
    x: 1140,
    y: 80,
    width: 800,
    height: 450,
    borderRadius: 20,
    fill: '#0f172a', // Dark theme slide
    shadow: { x: 0, y: 12, blur: 30, color: 'rgba(0,0,0,0.15)' },
  },
  {
    id: 'el_slide_title',
    name: 'Slide Title',
    type: 'text',
    parentId: 'frame_slide_1',
    x: 1200,
    y: 200,
    width: 680,
    height: 60,
    text: 'Chiến Lược Tăng Trưởng Hệ Sinh Thái 2026',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    textColor: '#f8fafc',
  },
  {
    id: 'el_slide_sub',
    name: 'Slide Subtitle',
    type: 'text',
    parentId: 'frame_slide_1',
    x: 1200,
    y: 270,
    width: 680,
    height: 40,
    text: 'Trình bày bởi: Phòng Kỹ Thuật & Đội Ngũ UI/UX Lead',
    fontSize: 15,
    fontWeight: 'normal',
    textAlign: 'center',
    textColor: '#94a3b8',
  },
];

const SEED_DEMO_COMMENTS: FigmaCommentPin[] = [
  {
    id: 'pin_figma_1',
    x: 580,
    y: 356, // Right on the CTA Button!
    pinNumber: 1,
    authorName: 'Nguyễn Văn Nam',
    authorColor: '#2563eb',
    authorRole: 'Trưởng nhóm Kỹ thuật (Lead)',
    content: '@Giang duyệt giúp em bản thiết kế nút bấm CTA màu tím này nhé! Tone màu #9333ea rất nổi bật và đã đồng bộ theo Design System.',
    timestamp: Date.now() - 1000 * 60 * 35,
    resolved: false,
    replies: [
      {
        id: 'rep_fig_1',
        authorName: 'Trần Thị Giang',
        authorColor: '#ec4899',
        content: 'Đã duyệt tone màu tím này nhé Nam! Độ tương phản WCAG AAA rất chuẩn.',
        timestamp: Date.now() - 1000 * 60 * 15,
      },
    ],
  },
];

export function FigmaDesignCanvas({
  designId,
  designTitle = 'Bản Vẽ Thiết Kế UI & Slide',
  currentUser = { id: 'usr_nam', name: 'Nguyễn Văn Nam', color: '#2563eb' },
}: FigmaDesignCanvasProps) {
  const isSeedDemoDesign = designId === 'design_ui_workspace' || designId === 'mockup_ui_canvas';

  const [title, setTitle] = useState(designTitle);
  const [activeTool, setActiveTool] = useState<FigmaToolType>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    isSeedDemoDesign ? 'el_cta_button' : null
  );

  // Left sidebar tab: 'layers' | 'assets'
  const [leftTab, setLeftTab] = useState<'layers' | 'assets'>('layers');
  // Right sidebar tab: 'design' | 'inspect'
  const [rightTab, setRightTab] = useState<'design' | 'inspect'>('design');

  // Zoom & Viewport
  const [zoom, setZoom] = useState<number>(100);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const startPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Presentation / Prototype Mode
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [presentationSlideIndex, setPresentationSlideIndex] = useState<number>(0);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Elements state: Empty if NEW, seed if DEMO
  const [elements, setElements] = useState<FigmaElement[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`collab_figma_elements_${designId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    if (isSeedDemoDesign) {
      return SEED_DEMO_ELEMENTS;
    }
    // Brand new clean empty frame
    return [
      {
        id: `frame_clean_${Date.now()}`,
        name: 'Artboard Mới (1000×600)',
        type: 'frame',
        x: 100,
        y: 100,
        width: 1000,
        height: 600,
        borderRadius: 20,
        fill: '#ffffff',
        stroke: '#e4e4e7',
        strokeWidth: 2,
        shadow: { x: 0, y: 8, blur: 24, color: 'rgba(0,0,0,0.06)' },
      },
    ];
  });

  // Comments state: Empty if NEW, seed if DEMO
  const [commentPins, setCommentPins] = useState<FigmaCommentPin[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`collab_figma_comments_${designId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    if (isSeedDemoDesign) {
      return SEED_DEMO_COMMENTS;
    }
    return [];
  });

  const [activeCommentId, setActiveCommentId] = useState<string | null>(
    isSeedDemoDesign ? 'pin_figma_1' : null
  );
  const [newCommentInput, setNewCommentInput] = useState('');
  const [replyInputText, setReplyInputText] = useState<Record<string, string>>({});
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);

  // Save to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`collab_figma_elements_${designId}`, JSON.stringify(elements));
    } catch {}
  }, [elements, designId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`collab_figma_comments_${designId}`, JSON.stringify(commentPins));
    } catch {}
  }, [commentPins, designId]);

  // Selected Element
  const selectedElement = useMemo(() => {
    return elements.find((el) => el.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

  // Slide frames for presentation mode
  const slideFrames = useMemo(() => {
    return elements.filter((el) => el.type === 'slide' || el.type === 'frame');
  }, [elements]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'f' || e.key === 'F') setActiveTool('frame');
      if (e.key === 'r' || e.key === 'R') setActiveTool('rectangle');
      if (e.key === 'o' || e.key === 'O') setActiveTool('circle');
      if (e.key === 't' || e.key === 'T') setActiveTool('text');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      if (e.key === 'c' || e.key === 'C') {
        setActiveTool('comment');
        showToast('Chế độ Bình luận Figma: Nhấp chuột lên vị trí thiết kế để ghim.');
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          handleDeleteSelected();
        }
      }
      if (e.key === 'Escape') {
        if (isPresentationMode) setIsPresentationMode(false);
        setActiveCommentId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, isPresentationMode]);

  // Update selected element property
  const updateSelected = (updates: Partial<FigmaElement>) => {
    if (!selectedElementId) return;
    setElements((prev) =>
      prev.map((el) => (el.id === selectedElementId ? { ...el, ...updates } : el))
    );
  };

  // Delete selected
  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedElementId));
    setSelectedElementId(null);
    showToast('Đã xóa thành phần khỏi bản vẽ.');
  };

  // Add a new element
  const handleAddShape = (type: 'rectangle' | 'circle' | 'text' | 'button' | 'card' | 'slide') => {
    const newId = `el_${type}_${Date.now()}`;
    const baseElement: FigmaElement = {
      id: newId,
      name: `${type.toUpperCase()} Mới`,
      type,
      x: 200 + Math.random() * 80,
      y: 180 + Math.random() * 80,
      width: type === 'slide' ? 800 : type === 'card' ? 260 : type === 'button' ? 220 : 160,
      height: type === 'slide' ? 450 : type === 'card' ? 140 : type === 'button' ? 48 : 120,
      borderRadius: type === 'circle' ? 9999 : type === 'button' ? 12 : type === 'card' ? 16 : 8,
      fill: type === 'button' ? '#2563eb' : type === 'card' ? '#f8fafc' : type === 'slide' ? '#0f172a' : '#3b82f6',
      stroke: type === 'card' ? '#e2e8f0' : undefined,
      strokeWidth: type === 'card' ? 1 : 0,
      shadow: type === 'button' ? { x: 0, y: 4, blur: 12, color: 'rgba(37,99,235,0.3)' } : undefined,
      text: type === 'button' ? 'Nút Bấm Mới' : type === 'card' ? 'Thẻ Nội Dung' : type === 'text' ? 'Văn bản thiết kế' : undefined,
      fontSize: type === 'button' ? 14 : 16,
      fontWeight: type === 'button' ? 'bold' : 'normal',
      textColor: type === 'button' || type === 'slide' ? '#ffffff' : '#18181b',
    };

    setElements((prev) => [...prev, baseElement]);
    setSelectedElementId(newId);
    setActiveTool('select');
    showToast(`Đã thêm ${type} vào bản vẽ.`);
  };

  // Click on Canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvasRect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.round((e.clientX - canvasRect.left - pan.x) / (zoom / 100));
    const clickY = Math.round((e.clientY - canvasRect.top - pan.y) / (zoom / 100));

    // If in Comment Mode: Drop new comment pin!
    if (activeTool === 'comment') {
      const pinNum = commentPins.length + 1;
      const newPin: FigmaCommentPin = {
        id: `pin_figma_${Date.now()}`,
        x: clickX,
        y: clickY,
        pinNumber: pinNum,
        authorName: currentUser.name,
        authorColor: currentUser.color,
        authorRole: 'Thành viên thiết kế',
        content: '',
        timestamp: Date.now(),
        resolved: false,
        replies: [],
      };
      setCommentPins((prev) => [...prev, newPin]);
      setActiveCommentId(newPin.id);
      setActiveTool('select');
      showToast(`Đã ghim Pin #${pinNum} tại tọa độ (${clickX}, ${clickY})!`);
      return;
    }
  };

  // Submit comment content
  const handleSavePinContent = (pinId: string) => {
    if (!newCommentInput.trim()) return;
    setCommentPins((prev) =>
      prev.map((p) => (p.id === pinId ? { ...p, content: newCommentInput.trim() } : p))
    );
    setNewCommentInput('');
    showToast('Đã lưu nội dung bình luận!');
  };

  // Add thread reply to pin
  const handleAddPinReply = (pinId: string) => {
    const text = replyInputText[pinId]?.trim();
    if (!text) return;
    setCommentPins((prev) =>
      prev.map((p) =>
        p.id === pinId
          ? {
              ...p,
              replies: [
                ...(p.replies || []),
                {
                  id: `rep_${Date.now()}`,
                  authorName: currentUser.name,
                  authorColor: currentUser.color,
                  content: text,
                  timestamp: Date.now(),
                },
              ],
            }
          : p
      )
    );
    setReplyInputText((prev) => ({ ...prev, [pinId]: '' }));
    showToast('Đã phản hồi bình luận.');
  };

  // Toggle Resolve
  const handleTogglePinResolve = (pinId: string) => {
    setCommentPins((prev) =>
      prev.map((p) => (p.id === pinId ? { ...p, resolved: !p.resolved } : p))
    );
    showToast('Đã cập nhật trạng thái giải quyết.');
  };

  // Convert Pin Comment to Kanban Task
  const handleConvertPinToTask = (pin: FigmaCommentPin) => {
    try {
      const stored = localStorage.getItem('collab_kanban_external_tasks');
      const tasks = stored ? JSON.parse(stored) : [];
      const taskKey = `WEB-${Math.floor(10 + Math.random() * 89)}`;
      const deadline = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

      const newTask = {
        id: `task_from_figma_${Date.now()}`,
        key: taskKey,
        title: `[Bản vẽ: ${title}] Pin #${pin.pinNumber}: ${pin.content.slice(0, 35)}...`,
        description: `Giao việc từ ghim bình luận #${pin.pinNumber} của ${pin.authorName} trong bản vẽ Figma "${title}":\n"${pin.content}"`,
        column: 'todo' as const,
        priority: 'high' as const,
        assigneeName: currentUser.name,
        assigneeColor: currentUser.color,
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: deadline,
        labels: ['Thiết kế', 'UI/UX'],
        checklist: [
          { id: 'c1', text: `Xem lại vùng thiết kế tại vị trí Pin #${pin.pinNumber}`, completed: false },
          { id: 'c2', text: 'Cập nhật lại giao diện hoặc màu sắc theo góp ý', completed: false },
        ],
        source_ref: {
          type: 'comment' as const,
          id: pin.id,
          title: `${title} (Pin #${pin.pinNumber})`,
          url: `/design/${designId}#pin=${pin.id}`,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      tasks.push(newTask);
      localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('collab_task_created'));

      setCommentPins((prev) =>
        prev.map((p) =>
          p.id === pin.id
            ? {
                ...p,
                assignedTask: {
                  assignee: currentUser.name,
                  deadline: '3 ngày tới',
                },
              }
            : p
        )
      );

      showToast(`Đã tạo nhiệm vụ ${taskKey} trên Kanban giao cho @${currentUser.name}!`);

      // Audit log
      try {
        const storedLogs = localStorage.getItem('collab_audit_logs');
        const logs = storedLogs ? JSON.parse(storedLogs) : [];
        logs.unshift({
          id: 'aud_' + Date.now(),
          action: `Chuyển bình luận Pin #${pin.pinNumber} bản vẽ "${title}" thành thẻ việc ${taskKey}`,
          userName: currentUser.name,
          userRole: 'Designer',
          module: 'Bản vẽ Figma (M1)',
          timestamp: Date.now(),
          status: 'success',
        });
        localStorage.setItem('collab_audit_logs', JSON.stringify(logs.slice(0, 50)));
      } catch {}
    } catch (err) {
      console.warn('Failed to convert pin to task', err);
    }
  };

  // Generate CSS code for selected element
  const generatedCSS = useMemo(() => {
    if (!selectedElement) return '/* Chọn một thành phần trên canvas để xem mã CSS */';
    const el = selectedElement;
    return `/* Figma Component CSS: ${el.name} */
.component {
  width: ${el.width}px;
  height: ${el.height}px;
  background-color: ${el.fill || 'transparent'};
  ${el.borderRadius ? `border-radius: ${el.borderRadius}px;` : ''}
  ${el.strokeWidth ? `border: ${el.strokeWidth}px solid ${el.stroke || '#000'};` : ''}
  ${el.shadow ? `box-shadow: ${el.shadow.x}px ${el.shadow.y}px ${el.shadow.blur}px ${el.shadow.color};` : ''}
  ${el.text ? `color: ${el.textColor || '#000000'};
  font-size: ${el.fontSize || 14}px;
  font-weight: ${el.fontWeight || 'normal'};
  text-align: ${el.textAlign || 'left'};` : ''}
}`;
  }, [selectedElement]);

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] font-sans text-zinc-100 select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP FIGMA HEADER BAR */}
      <header className="h-12 px-3 border-b border-zinc-800 bg-[#2c2c2c] flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Quay lại Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-white text-xs shadow-xs">
            F
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-bold text-xs text-white bg-transparent hover:bg-zinc-800 focus:bg-zinc-900 focus:ring-1 focus:ring-purple-500 px-2 py-1 rounded-md transition-all truncate max-w-xs"
            />
            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/60 font-semibold">
              Figma Design Canvas
            </span>
          </div>
        </div>

        {/* Center Toolbar: Tools (V, F, R, O, T, H, C) */}
        <div className="flex items-center bg-[#1e1e1e] p-0.5 rounded-xl border border-zinc-700/80 shadow-inner">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTool === 'select' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
            title="Con trỏ chọn (V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleAddShape('rectangle')}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Hình chữ nhật (R)"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleAddShape('circle')}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Hình tròn (O)"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleAddShape('text')}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Văn bản (T)"
          >
            <Type className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleAddShape('button')}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Nút bấm Component (Button)"
          >
            <Component className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleAddShape('slide')}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Slide Thuyết Trình (16:9)"
          >
            <Presentation className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-zinc-700 mx-1" />

          {/* Comment Pin Tool (C) */}
          <button
            onClick={() => {
              setActiveTool('comment');
              showToast('Đang ở chế độ Comment Pin (C): Nhấp lên canvas để đặt ghim bình luận!');
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              activeTool === 'comment' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-amber-400'
            }`}
            title="Ghim bình luận trực tiếp trên Canvas (C)"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold font-mono">C</span>
          </button>
        </div>

        {/* Right Actions: Zoom, Presentation Mode, Share */}
        <div className="flex items-center gap-2">
          {/* Zoom Level */}
          <div className="flex items-center gap-1 bg-zinc-800/80 px-2 py-1 rounded-lg text-xs font-mono text-zinc-300 border border-zinc-700">
            <button onClick={() => setZoom((z) => Math.max(z - 15, 25))} className="hover:text-white cursor-pointer">
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="w-10 text-center">{zoom}%</span>
            <button onClick={() => setZoom((z) => Math.min(z + 15, 200))} className="hover:text-white cursor-pointer">
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Comments Drawer Trigger */}
          <button
            onClick={() => setCommentsDrawerOpen((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              commentsDrawerOpen
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Pins ({commentPins.filter((p) => !p.resolved).length})</span>
          </button>

          {/* Presentation Mode (Play) */}
          <button
            onClick={() => {
              setIsPresentationMode(true);
              setPresentationSlideIndex(0);
            }}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Bật chế độ Trình chiếu Slide / Prototype (Play)"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Trình chiếu</span>
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE BODY: LEFT PANEL + CANVAS VIEWPORT + RIGHT INSPECTOR */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: LAYERS & ASSETS */}
        <aside className="w-60 bg-[#252525] border-r border-zinc-800 flex flex-col shrink-0 text-xs">
          {/* Tabs */}
          <div className="h-9 border-b border-zinc-800 flex items-center px-2 gap-1 bg-[#202020]">
            <button
              onClick={() => setLeftTab('layers')}
              className={`flex-1 py-1 text-center font-semibold rounded-md transition-colors cursor-pointer ${
                leftTab === 'layers' ? 'bg-[#2c2c2c] text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Lớp (Layers)
            </button>
            <button
              onClick={() => setLeftTab('assets')}
              className={`flex-1 py-1 text-center font-semibold rounded-md transition-colors cursor-pointer ${
                leftTab === 'assets' ? 'bg-[#2c2c2c] text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Linh kiện (Assets)
            </button>
          </div>

          {/* Left Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {leftTab === 'layers' ? (
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5 px-1.5">
                  Thành phần ({elements.length})
                </span>
                {elements.map((el) => {
                  const isSelected = selectedElementId === el.id;
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElementId(el.id)}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors group ${
                        isSelected
                          ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                          : 'hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-zinc-500 font-mono text-[10px]">
                          {el.type === 'frame' ? '⚏' : el.type === 'slide' ? '▶' : el.type === 'text' ? 'T' : '■'}
                        </span>
                        <span className="truncate text-xs font-medium">{el.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSelected({ hidden: !el.hidden });
                          }}
                          className="p-1 text-zinc-400 hover:text-white"
                        >
                          {el.hidden ? <EyeOff className="w-3 h-3 text-rose-400" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Assets & UI Component Presets */
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block px-1">
                  Kéo thả / Thêm linh kiện
                </span>
                <button
                  onClick={() => handleAddShape('button')}
                  className="w-full p-2 bg-[#2c2c2c] hover:bg-[#333] border border-zinc-700 rounded-xl text-left flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                    BTN
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white">Nút Bấm (Button)</p>
                    <p className="text-[10px] text-zinc-400">Primary CTA với shadow</p>
                  </div>
                </button>

                <button
                  onClick={() => handleAddShape('card')}
                  className="w-full p-2 bg-[#2c2c2c] hover:bg-[#333] border border-zinc-700 rounded-xl text-left flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                    CRD
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white">Thẻ Tính Năng (Card)</p>
                    <p className="text-[10px] text-zinc-400">Bo góc, border tinh tế</p>
                  </div>
                </button>

                <button
                  onClick={() => handleAddShape('slide')}
                  className="w-full p-2 bg-[#2c2c2c] hover:bg-[#333] border border-zinc-700 rounded-xl text-left flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                    SLD
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white">Slide 16:9 Presentation</p>
                    <p className="text-[10px] text-zinc-400">Khung thuyết trình báo cáo</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER CANVASPACE (INFINITE VIEWPORT WITH PIN LAYERS) */}
        <div
          onClick={handleCanvasClick}
          className="flex-1 relative overflow-auto bg-[#181818] cursor-crosshair selection:bg-purple-500/30"
          style={{
            backgroundImage: 'radial-gradient(#333333 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Zoomed Container */}
          <div
            style={{
              transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: '0 0',
              position: 'relative',
              width: '3000px',
              height: '2000px',
            }}
          >
            {/* Render Figma Elements */}
            {elements
              .filter((el) => !el.hidden)
              .map((el) => {
                const isSelected = selectedElementId === el.id;
                return (
                  <div
                    key={el.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(el.id);
                    }}
                    style={{
                      position: 'absolute',
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                      backgroundColor: el.fill || 'transparent',
                      borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                      border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.stroke}` : undefined,
                      boxShadow: el.shadow
                        ? `${el.shadow.x}px ${el.shadow.y}px ${el.shadow.blur}px ${el.shadow.color}`
                        : undefined,
                      color: el.textColor || undefined,
                      fontSize: el.fontSize ? `${el.fontSize}px` : undefined,
                      fontWeight: el.fontWeight || undefined,
                      textAlign: el.textAlign || undefined,
                    }}
                    className={`transition-all select-none cursor-pointer flex flex-col justify-center ${
                      isSelected ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-[#181818] z-20' : 'z-10'
                    }`}
                  >
                    {/* Element Label Pill for frames */}
                    {(el.type === 'frame' || el.type === 'slide') && (
                      <span className="absolute -top-5 left-1 text-[11px] font-mono text-zinc-400 font-semibold truncate max-w-sm">
                        {el.name}
                      </span>
                    )}

                    {/* Content inside text/button/card */}
                    {el.text && (
                      <div className="p-3 leading-relaxed whitespace-pre-line">
                        {el.text}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* In-Canvas Figma Comment Pins */}
            {commentPins.map((pin) => {
              const isActive = activeCommentId === pin.id;
              return (
                <div
                  key={pin.id}
                  style={{
                    position: 'absolute',
                    left: `${pin.x}px`,
                    top: `${pin.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCommentId(pin.id);
                  }}
                  className="z-30 cursor-pointer group"
                >
                  {/* Circular Numbered Pin Badge */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg transition-transform ${
                      pin.resolved
                        ? 'bg-zinc-600 scale-90 opacity-70'
                        : isActive
                        ? 'bg-rose-500 scale-125 ring-4 ring-rose-400/40 animate-bounce'
                        : 'bg-rose-500 group-hover:scale-110'
                    }`}
                  >
                    {pin.pinNumber}
                  </div>

                  {/* Popover Card */}
                  {isActive && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-8 top-0 w-72 bg-white text-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 p-3 z-40 animate-in fade-in zoom-in-95"
                    >
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-zinc-100">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                            style={{ backgroundColor: pin.authorColor }}
                          >
                            {pin.authorName.slice(0, 1)}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-zinc-900">{pin.authorName}</span>
                            <span className="text-[9px] text-zinc-400 block">{pin.authorRole}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleTogglePinResolve(pin.id)}
                          className={`p-1 rounded text-xs cursor-pointer ${
                            pin.resolved ? 'text-emerald-600 font-bold' : 'text-zinc-400 hover:text-emerald-600'
                          }`}
                          title="Đánh dấu đã giải quyết"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>

                      {pin.content ? (
                        <p className="text-xs text-zinc-700 leading-relaxed mb-2">{pin.content}</p>
                      ) : (
                        <div className="space-y-1.5 mb-2">
                          <textarea
                            rows={2}
                            value={newCommentInput}
                            onChange={(e) => setNewCommentInput(e.target.value)}
                            placeholder="Nhập nội dung bình luận..."
                            className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none"
                          />
                          <button
                            onClick={() => handleSavePinContent(pin.id)}
                            className="w-full py-1 bg-purple-600 text-white rounded-lg text-xs font-bold"
                          >
                            Lưu bình luận
                          </button>
                        </div>
                      )}

                      {/* Replies */}
                      {pin.replies && pin.replies.length > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-zinc-100">
                          {pin.replies.map((r) => (
                            <div key={r.id} className="p-1.5 bg-zinc-50 rounded-lg text-[11px]">
                              <span className="font-bold text-zinc-800">{r.authorName}: </span>
                              <span className="text-zinc-600">{r.content}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Linked Kanban Task Badge */}
                      {pin.assignedTask && (
                        <div className="my-1.5 p-1.5 bg-blue-50 border border-blue-200 rounded-xl text-[10px] text-blue-900 flex items-center justify-between">
                          <span className="flex items-center gap-1 font-bold">
                            <CheckSquare className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>Task: @{pin.assignedTask.assignee}</span>
                          </span>
                          <Link
                            href="/tasks"
                            className="px-2 py-0.5 rounded bg-blue-600 text-white font-semibold text-[10px] hover:bg-blue-700 transition-colors"
                          >
                            Mở Kanban ↗
                          </Link>
                        </div>
                      )}

                      {pin.content && !pin.assignedTask && (
                        <div className="pt-1.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleConvertPinToTask(pin)}
                            className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                            title="Giao việc này lên bảng Kanban"
                          >
                            <CheckSquare className="w-3 h-3" />
                            <span>Giao việc thành Task</span>
                          </button>
                        </div>
                      )}

                      {/* Reply input */}
                      {pin.content && (
                        <div className="pt-2 border-t border-zinc-100 flex gap-1">
                          <input
                            type="text"
                            placeholder="Trả lời..."
                            value={replyInputText[pin.id] || ''}
                            onChange={(e) =>
                              setReplyInputText((prev) => ({ ...prev, [pin.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddPinReply(pin.id);
                            }}
                            className="flex-1 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                          />
                          <button
                            onClick={() => handleAddPinReply(pin.id)}
                            className="px-2 py-1 bg-purple-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Gửi
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: FIGMA INSPECTOR (DESIGN & CODE CSS) */}
        <aside className="w-72 bg-[#252525] border-l border-zinc-800 flex flex-col shrink-0 text-xs">
          {/* Tabs: Design vs Inspect Code */}
          <div className="h-9 border-b border-zinc-800 flex items-center px-2 gap-1 bg-[#202020]">
            <button
              onClick={() => setRightTab('design')}
              className={`flex-1 py-1 text-center font-semibold rounded-md transition-colors cursor-pointer ${
                rightTab === 'design' ? 'bg-[#2c2c2c] text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Thiết kế (Design)
            </button>
            <button
              onClick={() => setRightTab('inspect')}
              className={`flex-1 py-1 text-center font-semibold rounded-md transition-colors cursor-pointer ${
                rightTab === 'inspect' ? 'bg-[#2c2c2c] text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Mã CSS (Inspect)
            </button>
          </div>

          {/* Right Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {selectedElement ? (
              rightTab === 'design' ? (
                <>
                  {/* Geometry: X, Y, W, H */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Tọa độ &amp; Kích thước
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-lg">
                        <span className="text-zinc-500 font-mono text-[10px]">X</span>
                        <input
                          type="number"
                          value={selectedElement.x}
                          onChange={(e) => updateSelected({ x: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-lg">
                        <span className="text-zinc-500 font-mono text-[10px]">Y</span>
                        <input
                          type="number"
                          value={selectedElement.y}
                          onChange={(e) => updateSelected({ y: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-lg">
                        <span className="text-zinc-500 font-mono text-[10px]">W</span>
                        <input
                          type="number"
                          value={selectedElement.width}
                          onChange={(e) => updateSelected({ width: parseInt(e.target.value) || 20 })}
                          className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-lg">
                        <span className="text-zinc-500 font-mono text-[10px]">H</span>
                        <input
                          type="number"
                          value={selectedElement.height}
                          onChange={(e) => updateSelected({ height: parseInt(e.target.value) || 20 })}
                          className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Corner Radius & Fill */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Bo góc (Corner Radius)
                    </span>
                    <input
                      type="number"
                      value={selectedElement.borderRadius || 0}
                      onChange={(e) => updateSelected({ borderRadius: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-800 px-2.5 py-1 rounded-lg text-white font-mono text-xs focus:outline-none"
                    />
                  </div>

                  {/* Fill Color */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Màu nền (Fill)
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedElement.fill || '#ffffff'}
                        onChange={(e) => updateSelected({ fill: e.target.value })}
                        className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedElement.fill || '#ffffff'}
                        onChange={(e) => updateSelected({ fill: e.target.value })}
                        className="flex-1 bg-zinc-800 px-2 py-1 rounded-lg text-white font-mono text-xs focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  {/* Typography (If has text) */}
                  {selectedElement.text !== undefined && (
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Văn bản (Typography)
                      </span>
                      <textarea
                        rows={2}
                        value={selectedElement.text}
                        onChange={(e) => updateSelected({ text: e.target.value })}
                        className="w-full p-2 bg-zinc-800 rounded-lg text-white text-xs focus:outline-none resize-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={selectedElement.fontSize || 14}
                          onChange={(e) => updateSelected({ fontSize: parseInt(e.target.value) })}
                          className="bg-zinc-800 px-2 py-1 rounded-lg text-white text-xs focus:outline-none"
                        >
                          <option value={12}>12 px</option>
                          <option value={14}>14 px</option>
                          <option value={16}>16 px</option>
                          <option value={20}>20 px</option>
                          <option value={24}>24 px</option>
                          <option value={32}>32 px</option>
                        </select>
                        <select
                          value={selectedElement.fontWeight || 'normal'}
                          onChange={(e) => updateSelected({ fontWeight: e.target.value as any })}
                          className="bg-zinc-800 px-2 py-1 rounded-lg text-white text-xs focus:outline-none"
                        >
                          <option value="normal">Regular</option>
                          <option value="500">Medium</option>
                          <option value="600">Semibold</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Delete button */}
                  <div className="pt-4 border-t border-zinc-800">
                    <button
                      onClick={handleDeleteSelected}
                      className="w-full py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa thành phần</span>
                    </button>
                  </div>
                </>
              ) : (
                /* CSS Code Inspect Tab */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Mã CSS sinh tự động
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCSS);
                        showToast('Đã sao chép CSS vào clipboard!');
                      }}
                      className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Sao chép</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-zinc-900 rounded-xl font-mono text-[11px] text-purple-300 overflow-x-auto leading-relaxed border border-zinc-800">
                    {generatedCSS}
                  </pre>
                </div>
              )
            ) : (
              <div className="py-20 text-center text-zinc-500 text-xs">
                <Sliders className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                <p className="font-semibold text-zinc-400">Chưa chọn thành phần</p>
                <p className="text-[11px] mt-1 text-zinc-500">
                  Nhấp vào một khung hoặc hình vẽ để tùy chỉnh kích thước, màu sắc và CSS.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* FULLSCREEN PRESENTATION MODE (SLIDE / PROTOTYPE PLAY) */}
      {isPresentationMode && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200">
          {/* Top Presentation Bar */}
          <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-white z-50">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold">{title}</span>
              <span className="text-xs text-zinc-400 font-mono">
                Slide {presentationSlideIndex + 1}/{slideFrames.length || 1}
              </span>
            </div>
            <button
              onClick={() => setIsPresentationMode(false)}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Thoát (Esc)
            </button>
          </div>

          {/* Active Slide Rendering */}
          <div className="max-w-4xl w-full p-8 flex items-center justify-center">
            {slideFrames.length > 0 ? (
              <div
                style={{
                  width: `${slideFrames[presentationSlideIndex].width}px`,
                  height: `${slideFrames[presentationSlideIndex].height}px`,
                  backgroundColor: slideFrames[presentationSlideIndex].fill || '#0f172a',
                  borderRadius: '24px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                }}
                className="relative p-10 flex flex-col justify-center items-center text-center animate-in zoom-in-95 duration-150"
              >
                <h2 className="text-3xl font-black text-white mb-4">
                  {slideFrames[presentationSlideIndex].name}
                </h2>
                <p className="text-zinc-300 text-sm max-w-lg leading-relaxed">
                  Trình diễn prototype thiết kế tương tác theo thời gian thực.
                </p>
              </div>
            ) : (
              <div className="text-white text-center">Chưa có Slide nào được tạo.</div>
            )}
          </div>

          {/* Slide Navigation Bottom Controls */}
          {slideFrames.length > 1 && (
            <div className="absolute bottom-6 flex items-center gap-4 bg-zinc-900/90 px-4 py-2 rounded-2xl border border-zinc-700">
              <button
                disabled={presentationSlideIndex === 0}
                onClick={() => setPresentationSlideIndex((i) => Math.max(i - 1, 0))}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Trước
              </button>
              <span className="text-xs font-mono text-zinc-400">
                {presentationSlideIndex + 1} / {slideFrames.length}
              </span>
              <button
                disabled={presentationSlideIndex >= slideFrames.length - 1}
                onClick={() => setPresentationSlideIndex((i) => Math.min(i + 1, slideFrames.length - 1))}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Tiếp
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
