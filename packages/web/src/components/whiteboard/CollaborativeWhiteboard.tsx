'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import {
  Pencil,
  Paintbrush,
  Highlighter,
  Eraser,
  Type,
  Minus,
  ArrowRight,
  Square,
  Circle,
  Diamond,
  Star,
  Frame,
  Undo2,
  Redo2,
  Download,
  Trash2,
  ArrowLeft,
  X,
  Check,
  StickyNote,
  Plus,
  MousePointer,
  RotateCcw,
  Play,
  Pause,
  Clock,
  LayoutTemplate,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Unlock,
  Layers,
  Vote,
  Sparkles,
  Flame,
  CheckSquare,
  Share2,
  Tv,
  Users,
  Compass,
  Image as ImageIcon,
  Copy,
  Wand2,
  Printer,
  ChevronDown,
  MessageSquare,
  BookOpen,
} from 'lucide-react';
import {
  WhiteboardTool,
  WhiteboardElement,
  WhiteboardPoint,
  PAINT_COLORS,
  StickyColor,
  STICKY_COLOR_MAP,
  VotingSession,
  STANDARD_WORKSHOP_STEPS,
  LiveReactionItem,
  WhiteboardCommentPin,
  WhiteboardCommentReply,
} from './types';
import { ResilientWebSocketProvider } from '../../lib/yjs-provider';
import { generateTemplateElements } from './templates';
import { BrainstormWorkshopModal } from './BrainstormWorkshopModal';
import { VotingSessionModal } from './VotingSessionModal';
import { BulkStickyModal } from './BulkStickyModal';
import { AIBrainstormModal } from './AIBrainstormModal';
import { TemplatesModal } from './TemplatesModal';
import { WhiteboardCommentsDrawer } from './WhiteboardCommentsDrawer';
import { WhiteboardCommentCard } from './WhiteboardCommentCard';
import { emitDomainEvent } from '../../lib/domain-event-bus';

export const WHITEBOARD_BOARDS = [
  {
    id: 'open_brainstorm',
    title: 'Bảng Trắng Brainstorm Sơ Đồ Hệ Thống & Phân Hệ',
    icon: '💡',
    desc: '3 cột: Vấn đề hiện tại, Ý tưởng đột phá, Thử nghiệm nhanh',
  },
  {
    id: 'start_stop_continue',
    title: 'Sprint Retrospective (Start / Stop / Continue)',
    icon: '🔄',
    desc: 'Mẫu họp cải tiến quy trình chuẩn 3 cột',
  },
  {
    id: 'four_ls',
    title: '4Ls Retrospective (Liked / Learned / Lacked / Longed)',
    icon: '🧭',
    desc: 'Đánh giá 4 góc nhìn: Thích gì, Học được gì, Thiếu gì, Mong ước gì',
  },
  {
    id: 'mad_sad_glad',
    title: 'Mad / Sad / Glad Retrospective',
    icon: '🎭',
    desc: 'Giải tỏa cảm xúc: Bực mình (Mad), Buồn tiếc (Sad), Vui sướng (Glad)',
  },
  {
    id: 'sailboat',
    title: 'Sailboat Retrospective (Gió, Thuyền, Neo, Đá Ngầm)',
    icon: '⛵',
    desc: 'Phân tích động lực thúc đẩy và rủi ro cản trở dự án',
  },
  {
    id: 'swot',
    title: 'Ma Trận SWOT Chiến Lược (4 Ô)',
    icon: '📊',
    desc: 'Phân tích Điểm mạnh, Điểm yếu, Cơ hội và Thách thức',
  },
  {
    id: 'eisenhower',
    title: 'Ma Trận Quản Lý Thời Gian Eisenhower (4 Ô)',
    icon: '⏳',
    desc: 'Phân loại: Khẩn cấp & Quan trọng, Ủy quyền, Lên lịch, Loại bỏ',
  },
  {
    id: 'roadmap',
    title: 'Lộ Trình Phát Triển Sản Phẩm (Roadmap 4 Quý)',
    icon: '🗺️',
    desc: 'Kế hoạch phát hành Q1, Q2, Q3, Q4 và các mốc Milestone',
  },
  {
    id: 'mindmap',
    title: 'Sơ Đồ Tư Duy Khái Niệm (Mind Map)',
    icon: '🧠',
    desc: 'Phân nhánh ý tưởng từ chủ đề trung tâm với mũi tên thông minh',
  },
  {
    id: 'crazy_8s',
    title: 'Crazy 8s Workshop Động Não Nhanh',
    icon: '⚡',
    desc: '8 khung vẽ phác thảo ý tưởng nhanh trong 8 phút',
  },
  {
    id: 'wireframe',
    title: 'Khung Giao Diện Web & Mobile App (Wireframe)',
    icon: '📱',
    desc: 'Phác thảo wireframe đa màn hình',
  },
];

interface CollaborativeWhiteboardProps {
  currentUser?: { id: string; name: string; color: string };
  boardId?: string;
}

const STROKE_WIDTHS = [
  { label: '1px', value: 1 },
  { label: '2px', value: 2 },
  { label: '4px', value: 4 },
  { label: '8px', value: 8 },
];

const DEFAULT_WHITEBOARD_USER = { id: 'usr_nam', name: 'Nguyễn Văn Nam', color: '#2563eb' };

export function CollaborativeWhiteboard({
  currentUser = DEFAULT_WHITEBOARD_USER,
  boardId: propBoardId,
}: CollaborativeWhiteboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryBoard = searchParams ? searchParams.get('board') : null;

  // Board persistence: defaults to mockup_ui_canvas or last used board
  const [currentBoardId, setCurrentBoardId] = useState<string>(() => {
    if (propBoardId) return propBoardId;
    if (queryBoard) return queryBoard;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('collab_active_board_id');
      if (stored && stored !== 'mockup_ui_canvas') return stored;
    }
    return 'open_brainstorm';
  });

  useEffect(() => {
    if (queryBoard && queryBoard !== currentBoardId) {
      setCurrentBoardId(queryBoard);
    }
  }, [queryBoard, currentBoardId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentBoardId) {
      localStorage.setItem('collab_active_board_id', currentBoardId);
    }
  }, [currentBoardId]);

  const activeBoard = currentBoardId;
  const storageKey = `collab_whiteboard_elements_${activeBoard}`;
  const docId = `workspace_whiteboard_${activeBoard}`;

  // Board Switcher state
  const [boardSwitcherOpen, setBoardSwitcherOpen] = useState(false);

  // Comments state
  const commentsStorageKey = `collab_whiteboard_comments_${activeBoard}`;
  const [comments, setComments] = useState<WhiteboardCommentPin[]>([]);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<WhiteboardCommentPin | null>(null);
  const [newCommentCoord, setNewCommentCoord] = useState<{ x: number; y: number } | null>(null);

  // Load comments
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(commentsStorageKey);
      if (stored) {
        setComments(JSON.parse(stored));
        return;
      }
    } catch {}

    setComments([]);
  }, [commentsStorageKey]);

  const saveComments = (newComments: WhiteboardCommentPin[]) => {
    setComments(newComments);
    try {
      localStorage.setItem(commentsStorageKey, JSON.stringify(newComments));
    } catch {}
  };

  const handleCreateComment = (content: string, targetName?: string) => {
    if (!newCommentCoord) return;
    const newPin: WhiteboardCommentPin = {
      id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      boardId: activeBoard,
      x: Math.round(newCommentCoord.x),
      y: Math.round(newCommentCoord.y),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorColor: currentUser.color,
      authorRole: 'Trưởng nhóm Kỹ thuật (Lead)',
      content,
      targetElementName: targetName || `Tọa độ (${Math.round(newCommentCoord.x)}, ${Math.round(newCommentCoord.y)})`,
      timestamp: Date.now(),
      resolved: false,
      replies: [],
    };
    const next = [...comments, newPin];
    saveComments(next);
    setNewCommentCoord(null);
    setSelectedPin(newPin);
    showToast('Đã gắn bình luận thành công lên bảng vẽ!');
  };

  const handleToggleResolveComment = (pinId: string) => {
    const next = comments.map((c) => (c.id === pinId ? { ...c, resolved: !c.resolved } : c));
    saveComments(next);
    if (selectedPin?.id === pinId) {
      setSelectedPin((prev) => (prev ? { ...prev, resolved: !prev.resolved } : null));
    }
    showToast('Đã cập nhật trạng thái bình luận!');
  };

  const handleAddReplyToComment = (pinId: string, replyText: string) => {
    const newReply: WhiteboardCommentReply = {
      id: `rep_${Date.now()}`,
      authorName: currentUser.name,
      authorColor: currentUser.color,
      authorRole: 'Thành viên dự án',
      content: replyText,
      timestamp: Date.now(),
    };
    const next = comments.map((c) =>
      c.id === pinId ? { ...c, replies: [...(c.replies || []), newReply] } : c
    );
    saveComments(next);
    if (selectedPin?.id === pinId) {
      setSelectedPin((prev) =>
        prev ? { ...prev, replies: [...(prev.replies || []), newReply] } : null
      );
    }
    showToast('Đã phản hồi bình luận!');
  };

  const handleSwitchBoard = (targetBoardId: string) => {
    setBoardSwitcherOpen(false);
    setCurrentBoardId(targetBoardId);
    router.push(`/whiteboard?board=${targetBoardId}`);
    showToast(`Đã chuyển sang bảng vẽ: ${WHITEBOARD_BOARDS.find(b => b.id === targetBoardId)?.title || targetBoardId}`);
  };

  // Active Tool & Style State
  const [currentTool, setCurrentTool] = useState<WhiteboardTool>('select');
  const [primaryColor, setPrimaryColor] = useState<string>('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState<string>('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [isFilledShape, setIsFilledShape] = useState<boolean>(false);
  const [autoShapeEnabled, setAutoShapeEnabled] = useState<boolean>(false);
  const [shapeMenuOpen, setShapeMenuOpen] = useState<boolean>(false);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);

  // Infinite Canvas Pan & Zoom State
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 120, y: 80 });
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Floating text tool state
  const [textInputState, setTextInputState] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Canvas elements state and single-source-of-truth ref
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const elementsRef = useRef<WhiteboardElement[]>([]);

  // Selected element ID
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Peer awareness state
  const [peerCursors, setPeerCursors] = useState<
    { id: string; name: string; color: string; x: number; y: number }[]
  >([]);

  // Undo / Redo history stacks
  const undoStackRef = useRef<WhiteboardElement[][]>([]);
  const redoStackRef = useRef<WhiteboardElement[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Canvas interaction refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const isDrawingRef = useRef(false);
  const startPointRef = useRef<WhiteboardPoint | null>(null);
  const activePathRef = useRef<WhiteboardPoint[]>([]);
  const activePreviewRef = useRef<WhiteboardElement | null>(null);

  // Sticky note dragging state
  const [draggingStickyId, setDraggingStickyId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Yjs CRDT refs
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<ResilientWebSocketProvider | null>(null);
  const elementsArrayRef = useRef<Y.Array<WhiteboardElement> | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Brainstorm Workshop Roadmap & Timer State
  const [workshopModalOpen, setWorkshopModalOpen] = useState(false);
  const [currentStepId, setCurrentStepId] = useState(1);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 mins
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Voting Session State
  const [votingModalOpen, setVotingModalOpen] = useState(false);
  const [votingSession, setVotingSession] = useState<VotingSession | null>(null);

  // Bulk Sticky Modal State
  const [bulkStickyModalOpen, setBulkStickyModalOpen] = useState(false);

  // AI Brainstorm Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Templates Modal State
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  // Presentation Mode State
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  // Live Floating Reactions
  const [liveReactions, setLiveReactions] = useState<LiveReactionItem[]>([]);

  // Sound Chime Notification for Timer Completion
  const playTimerChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }, []);

  // Timer Countdown Effect
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          playTimerChime();
          showToast('⏰ Đã hết giờ thảo luận theo quy trình Workshop!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, playTimerChime]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Exit handler: Return to Home
  const handleExit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      router.push('/');
    } catch {
      window.location.href = '/';
    }
  };

  // Convert screen coordinates to world canvas coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): WhiteboardPoint => {
      return {
        x: (screenX - panOffset.x) / zoom,
        y: (screenY - panOffset.y) / zoom,
      };
    },
    [panOffset, zoom]
  );

  // Convert pointer event to canvas world coordinates
  const getCanvasPos = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): WhiteboardPoint => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      return screenToWorld(screenX, screenY);
    },
    [screenToWorld]
  );

  // Push new state to history stack
  const commitToHistory = useCallback((newElements: WhiteboardElement[]) => {
    undoStackRef.current.push([...newElements]);
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);

    try {
      localStorage.setItem(storageKey, JSON.stringify(newElements));
    } catch {}
  }, [storageKey]);

  // Synchronize update to Yjs and elementsRef
  const updateElementsAndSync = useCallback(
    (updated: WhiteboardElement[]) => {
      elementsRef.current = updated;
      setElements(updated);
      commitToHistory(updated);

      if (elementsArrayRef.current && ydocRef.current) {
        ydocRef.current.transact(() => {
          const arr = elementsArrayRef.current!;
          arr.delete(0, arr.length);
          if (updated.length > 0) {
            arr.push(updated);
          }
        });
      }
    },
    [commitToHistory]
  );

  // Filter out any legacy invalid elements
  const sanitizeElements = (arr: any[]): WhiteboardElement[] => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (el) =>
        el &&
        el.id &&
        el.type !== 'fill' &&
        !(el.type === 'rectangle' && el.width > 4000)
    );
  };

  // Center Content Function
  const centerCanvasContent = useCallback(() => {
    if (typeof window === 'undefined') return;
    const w = window.innerWidth || 1200;
    const h = window.innerHeight || 800;
    // Symmetrical 3 columns are 1020px wide, 520px high
    const targetPanX = Math.max(40, (w - 1020) / 2);
    const targetPanY = Math.max(40, (h - 520) / 2 - 20);
    setPanOffset({ x: targetPanX, y: targetPanY });
    setZoom(1.0);
  }, []);

  // Redraw Canvas function: Guarantees pure white background and smooth pan & zoom
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // 1. ALWAYS FILL PURE WHITE BACKGROUND FIRST
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Apply Pan & Zoom transformation
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // 2. Draw subtle infinite dot grid pattern
    const gridSize = 32;
    const viewW = canvas.width / (dpr * zoom);
    const viewH = canvas.height / (dpr * zoom);
    const startX = Math.floor(-panOffset.x / zoom / gridSize) * gridSize - gridSize * 2;
    const startY = Math.floor(-panOffset.y / zoom / gridSize) * gridSize - gridSize * 2;
    const endX = startX + viewW + gridSize * 4;
    const endY = startY + viewH + gridSize * 4;

    ctx.fillStyle = '#cbd5e1';
    for (let x = startX; x < endX; x += gridSize) {
      for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2 / Math.max(1, zoom), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Element rendering function
    const drawItem = (el: WhiteboardElement) => {
      if (el.type === ('fill' as any)) return;

      ctx.save();
      ctx.strokeStyle = el.color || '#000000';
      ctx.fillStyle = el.isFilled ? el.fillColor || el.color : el.color;
      ctx.lineWidth = el.strokeWidth || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (el.opacity !== undefined) {
        ctx.globalAlpha = el.opacity;
      }

      // Frame
      if (el.type === 'frame' && el.width && el.height) {
        ctx.fillStyle = el.fillColor || '#f8fafc';
        ctx.fillRect(el.x, el.y, el.width, el.height);
        ctx.strokeStyle = el.color || '#94a3b8';
        ctx.lineWidth = el.strokeWidth || 2;
        ctx.setLineDash([8, 5]);
        ctx.strokeRect(el.x, el.y, el.width, el.height);
        ctx.setLineDash([]);

        // Frame Title Banner
        if (el.frameTitle) {
          ctx.font = 'bold 13px sans-serif';
          ctx.fillStyle = '#334155';
          ctx.fillText(el.frameTitle, el.x + 12, el.y - 8);
        }
      }

      // Image
      else if (el.type === 'image' && el.imageUrl) {
        let img = imageCacheRef.current.get(el.imageUrl);
        if (!img) {
          img = new Image();
          img.src = el.imageUrl;
          img.onload = () => redrawCanvas();
          imageCacheRef.current.set(el.imageUrl, img);
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, el.x, el.y, el.width || 240, el.height || 180);
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.strokeRect(el.x, el.y, el.width || 240, el.height || 180);
        }
      }

      // Freehand Path & Highlighter
      else if (el.type === 'path' && el.points && el.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      }

      // Straight Line
      else if (el.type === 'line' && el.width !== undefined && el.height !== undefined) {
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + el.width, el.y + el.height);
        ctx.stroke();
      }

      // Arrow & Smart Connector
      else if (
        (el.type === 'arrow' || el.type === 'connector') &&
        el.width !== undefined &&
        el.height !== undefined
      ) {
        let fromX = el.x;
        let fromY = el.y;
        let toX = el.x + el.width;
        let toY = el.y + el.height;

        // Dynamic Smart Connector Attachment
        if (el.type === 'connector' && el.startElementId && el.endElementId) {
          const startEl = elementsRef.current.find((e) => e.id === el.startElementId);
          const endEl = elementsRef.current.find((e) => e.id === el.endElementId);
          if (startEl && endEl) {
            fromX = startEl.x + (startEl.width || 120) / 2;
            fromY = startEl.y + (startEl.height || 60) / 2;
            toX = endEl.x + (endEl.width || 120) / 2;
            toY = endEl.y + (endEl.height || 60) / 2;
          }
        }

        const headlen = 14;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = el.color || '#64748b';
        ctx.fill();
      }

      // Rectangle
      else if (el.type === 'rectangle' && el.width !== undefined && el.height !== undefined) {
        ctx.beginPath();
        if (el.isFilled) {
          ctx.fillRect(el.x, el.y, el.width, el.height);
        }
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      }

      // Rounded Rectangle
      else if (el.type === 'rounded_rect' && el.width !== undefined && el.height !== undefined) {
        ctx.beginPath();
        const rx = 10;
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(el.x, el.y, el.width, el.height, rx);
        } else {
          ctx.rect(el.x, el.y, el.width, el.height);
        }
        if (el.isFilled) ctx.fill();
        ctx.stroke();
      }

      // Circle / Ellipse
      else if (el.type === 'circle' && el.width !== undefined && el.height !== undefined) {
        ctx.beginPath();
        const rx = Math.abs(el.width) / 2;
        const ry = Math.abs(el.height) / 2;
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        if (el.isFilled) ctx.fill();
        ctx.stroke();
      }

      // Triangle
      else if (el.type === 'triangle' && el.width !== undefined && el.height !== undefined) {
        ctx.beginPath();
        const topX = el.x + el.width / 2;
        const topY = el.y;
        const rightX = el.x + el.width;
        const rightY = el.y + el.height;
        const leftX = el.x;
        const leftY = el.y + el.height;

        ctx.moveTo(topX, topY);
        ctx.lineTo(rightX, rightY);
        ctx.lineTo(leftX, leftY);
        ctx.closePath();
        if (el.isFilled) ctx.fill();
        ctx.stroke();
      }

      // Diamond (Decision)
      else if (el.type === 'diamond' && el.width !== undefined && el.height !== undefined) {
        ctx.beginPath();
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        ctx.moveTo(cx, el.y);
        ctx.lineTo(el.x + el.width, cy);
        ctx.lineTo(cx, el.y + el.height);
        ctx.lineTo(el.x, cy);
        ctx.closePath();
        if (el.isFilled) ctx.fill();
        ctx.stroke();
      }

      // Star
      else if (el.type === 'star' && el.width !== undefined && el.height !== undefined) {
        ctx.beginPath();
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const outerR = Math.min(Math.abs(el.width), Math.abs(el.height)) / 2;
        const innerR = outerR * 0.45;
        const spikes = 5;
        let rot = (Math.PI / 2) * 3;
        let step = Math.PI / spikes;

        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
          let x = cx + Math.cos(rot) * outerR;
          let y = cy + Math.sin(rot) * outerR;
          ctx.lineTo(x, y);
          rot += step;
          x = cx + Math.cos(rot) * innerR;
          y = cy + Math.sin(rot) * innerR;
          ctx.lineTo(x, y);
          rot += step;
        }
        ctx.lineTo(cx, cy - outerR);
        ctx.closePath();
        if (el.isFilled) ctx.fill();
        ctx.stroke();
      }

      // Text Tool Item
      else if (el.type === 'text' && el.text) {
        ctx.font = `${el.fontSize || 16}px sans-serif`;
        ctx.fillStyle = el.color;
        ctx.fillText(el.text, el.x, el.y);
      }

      // Text label inside shapes
      if (el.text && el.type !== 'text' && el.type !== 'sticky' && el.width && el.height) {
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.text, el.x + el.width / 2, el.y + el.height / 2);
      }

      ctx.restore();
    };

    // Draw all elements
    const frames = elementsRef.current.filter((e) => e.type === 'frame');
    const others = elementsRef.current.filter((e) => e.type !== 'frame' && e.type !== 'sticky');

    frames.forEach(drawItem);
    others.forEach(drawItem);

    // Draw active drawing shape preview
    if (activePreviewRef.current) {
      drawItem(activePreviewRef.current);
    }

    ctx.restore();
  }, [panOffset, zoom]);

  // Initial Load & Automatic Centering
  useEffect(() => {
    if (typeof window === 'undefined') return;
    centerCanvasContent();

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const cleaned = sanitizeElements(parsed);
        if (cleaned.length > 0) {
          elementsRef.current = cleaned;
          setElements(cleaned);
          undoStackRef.current = [[...cleaned]];
          setCanUndo(true);
          return;
        }
      }

      // Load template according to activeBoard
      const starterTemplate = activeBoard || 'open_brainstorm';
      const starter = generateTemplateElements(starterTemplate, currentUser, { x: 0, y: 0 });
      elementsRef.current = starter;
      setElements(starter);
      undoStackRef.current = [[...starter]];
      setCanUndo(true);
    } catch (e) {
      console.warn('Failed to load local drawing cache:', e);
    }
  }, [currentUser, centerCanvasContent, storageKey, activeBoard]);

  // Connect to Yjs Room for live sync & awareness
  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:8080/ws`;

    const awareness = new awarenessProtocol.Awareness(ydoc);
    awareness.setLocalState({
      user: {
        id: currentUser.id,
        name: currentUser.name,
        color: currentUser.color,
      },
      cursor: null,
    });

    const yjsArrayKey = `paint_whiteboard_${activeBoard}`;
    const elementsArray = ydoc.getArray<WhiteboardElement>(yjsArrayKey);
    elementsArrayRef.current = elementsArray;

    const provider = new ResilientWebSocketProvider({
      url: wsUrl,
      docId,
      doc: ydoc,
      awareness,
      userId: currentUser.id,
      name: currentUser.name,
      color: currentUser.color,
      onSynced: () => {
        const serverElements = elementsArray.toArray();
        const cleaned = sanitizeElements(serverElements);
        if (cleaned.length > 0) {
          elementsRef.current = cleaned;
          setElements(cleaned);
          redrawCanvas();
        } else if (elementsRef.current.length > 0) {
          ydoc.transact(() => {
            elementsArray.push(elementsRef.current);
          });
        }
      },
    });
    providerRef.current = provider;

    const syncElements = () => {
      const arr = elementsArray.toArray();
      const cleaned = sanitizeElements(arr);
      if (cleaned.length > 0) {
        elementsRef.current = cleaned;
        setElements(cleaned);
        redrawCanvas();
      }
    };

    elementsArray.observe(syncElements);

    // Track peer cursors & broadcast viewport
    const handleAwareness = () => {
      const states = provider.awareness.getStates();
      const cursorMap = new Map<
        string,
        { id: string; name: string; color: string; x: number; y: number }
      >();
      states.forEach((s: any) => {
        if (
          s.user &&
          s.user.id !== currentUser.id &&
          s.cursor &&
          s.cursor.x !== undefined &&
          s.cursor.y !== undefined
        ) {
          cursorMap.set(s.user.id, {
            id: s.user.id,
            name: s.user.name,
            color: s.user.color,
            x: s.cursor.x,
            y: s.cursor.y,
          });
        }

        // Handle "Bring everyone to me" broadcast
        if (s.broadcastViewport && s.user && s.user.id !== currentUser.id) {
          const bp = s.broadcastViewport;
          setPanOffset({ x: bp.x, y: bp.y });
          setZoom(bp.zoom);
          showToast(`👀 Bạn đang theo dõi màn hình của ${s.user.name}`);
        }
      });
      setPeerCursors(Array.from(cursorMap.values()));
    };

    provider.awareness.on('change', handleAwareness);

    return () => {
      elementsArray.unobserve(syncElements);
      provider.awareness.off('change', handleAwareness);
      provider.destroy();
      ydoc.destroy();
    };
  }, [currentUser.id, currentUser.name, currentUser.color, redrawCanvas]);

  // Window Resize & Canvas Setup
  useEffect(() => {
    const handleCanvasResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        redrawCanvas();
      }
    };

    handleCanvasResize();
    window.addEventListener('resize', handleCanvasResize);
    return () => window.removeEventListener('resize', handleCanvasResize);
  }, [redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Mouse Wheel Zoom & Pan
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || currentTool === 'hand') {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => {
        const next = Math.min(2.5, Math.max(0.25, prev * zoomFactor));
        return parseFloat(next.toFixed(2));
      });
    } else {
      setPanOffset((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length <= 1) {
      if (undoStackRef.current.length === 1) {
        redoStackRef.current.push([...elementsRef.current]);
        undoStackRef.current = [];
        elementsRef.current = [];
        setElements([]);
        setCanUndo(false);
        setCanRedo(true);
        redrawCanvas();
        if (elementsArrayRef.current && ydocRef.current) {
          ydocRef.current.transact(() => {
            elementsArrayRef.current!.delete(0, elementsArrayRef.current!.length);
          });
        }
      }
      return;
    }

    const current = undoStackRef.current.pop()!;
    redoStackRef.current.push(current);
    const previous = undoStackRef.current[undoStackRef.current.length - 1] || [];

    elementsRef.current = [...previous];
    setElements([...previous]);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    redrawCanvas();

    if (elementsArrayRef.current && ydocRef.current) {
      ydocRef.current.transact(() => {
        const arr = elementsArrayRef.current!;
        arr.delete(0, arr.length);
        if (previous.length > 0) arr.push(previous);
      });
    }
  }, [redrawCanvas]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;

    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(next);

    elementsRef.current = [...next];
    setElements([...next]);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    redrawCanvas();

    if (elementsArrayRef.current && ydocRef.current) {
      ydocRef.current.transact(() => {
        const arr = elementsArrayRef.current!;
        arr.delete(0, arr.length);
        if (next.length > 0) arr.push(next);
      });
    }
  }, [redrawCanvas]);

  // Duplicate Selected Element
  const handleDuplicate = () => {
    if (!selectedElementId) {
      showToast('Vui lòng click chọn một thẻ hoặc đối tượng để nhân bản!');
      return;
    }
    const target = elementsRef.current.find((e) => e.id === selectedElementId);
    if (!target) return;

    const copy: WhiteboardElement = {
      ...target,
      id: `copy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: target.x + 30,
      y: target.y + 30,
      createdAt: Date.now(),
    };
    updateElementsAndSync([...elementsRef.current, copy]);
    setSelectedElementId(copy.id);
    showToast('Đã nhân bản phần tử thành công (Duplicate)!');
  };

  // Delete Selected Element
  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    const updated = elementsRef.current.filter((e) => e.id !== selectedElementId);
    updateElementsAndSync(updated);
    setSelectedElementId(null);
    showToast('Đã xóa phần tử được chọn!');
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey)
      ) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicate();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          handleDeleteSelected();
        }
      } else if (e.key === ' ' && currentTool !== 'hand') {
        setCurrentTool('hand');
      } else if (
        (e.key === 'c' || e.key === 'C') &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        setCurrentTool('comment');
        showToast('Đã chọn công cụ Bình luận. Hãy nhấp chuột vào bất kỳ vị trí nào trên canvas để để lại bình luận.');
      } else if (e.key === 'Escape') {
        setSelectedPin(null);
        setNewCommentCoord(null);
        setBoardSwitcherOpen(false);
        if (currentTool === 'comment') setCurrentTool('select');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && currentTool === 'hand') {
        setCurrentTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, currentTool, selectedElementId]);

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    if (currentTool === 'hand' || e.button === 1) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      return;
    }

    const pos = getCanvasPos(e);

    // Comment Tool Handler
    if (currentTool === 'comment') {
      setNewCommentCoord({ x: pos.x, y: pos.y });
      setSelectedPin(null);
      return;
    }

    if (currentTool === 'text') {
      setTextInputState({ x: pos.x, y: pos.y, text: '' });
      return;
    }

    if (currentTool === 'select') {
      const hit = [...elementsRef.current].reverse().find((el) => {
        if (el.width && el.height) {
          return (
            pos.x >= el.x &&
            pos.x <= el.x + el.width &&
            pos.y >= el.y &&
            pos.y <= el.y + el.height
          );
        }
        return false;
      });
      setSelectedElementId(hit ? hit.id : null);
      if (!hit) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      }
      return;
    }

    // Drawing Tools
    isDrawingRef.current = true;
    startPointRef.current = pos;
    activePathRef.current = [pos];

    if (
      currentTool === 'pencil' ||
      currentTool === 'brush' ||
      currentTool === 'highlighter' ||
      currentTool === 'eraser'
    ) {
      const isEraser = currentTool === 'eraser';
      const isHighlighter = currentTool === 'highlighter';
      const actualWidth = isEraser
        ? Math.max(16, strokeWidth * 3)
        : isHighlighter
        ? Math.max(20, strokeWidth * 3.5)
        : currentTool === 'pencil'
        ? Math.min(2, strokeWidth)
        : strokeWidth;
      const actualColor = isEraser ? '#ffffff' : isHighlighter ? '#facc15' : primaryColor;

      activePreviewRef.current = {
        id: 'temp_stroke',
        type: 'path',
        points: [pos],
        x: pos.x,
        y: pos.y,
        color: actualColor,
        strokeWidth: actualWidth,
        opacity: isHighlighter ? 0.35 : 1,
        authorId: currentUser.id,
        authorName: currentUser.name,
        createdAt: Date.now(),
      };
      redrawCanvas();
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (isPanningRef.current) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    const pos = getCanvasPos(e);

    if (providerRef.current) {
      providerRef.current.awareness.setLocalStateField('cursor', {
        x: pos.x * zoom + panOffset.x,
        y: pos.y * zoom + panOffset.y,
      });
    }

    if (!isDrawingRef.current || !startPointRef.current) return;

    if (
      currentTool === 'pencil' ||
      currentTool === 'brush' ||
      currentTool === 'highlighter' ||
      currentTool === 'eraser'
    ) {
      activePathRef.current.push(pos);
      if (activePreviewRef.current) {
        activePreviewRef.current.points = [...activePathRef.current];
      }
      redrawCanvas();
    } else if (currentTool !== 'select' && currentTool !== 'hand' && currentTool !== 'sticky') {
      const width = pos.x - startPointRef.current.x;
      const height = pos.y - startPointRef.current.y;

      activePreviewRef.current = {
        id: 'temp_shape',
        type: currentTool as any,
        x: startPointRef.current.x,
        y: startPointRef.current.y,
        width,
        height,
        color: primaryColor,
        fillColor: secondaryColor,
        isFilled: isFilledShape,
        strokeWidth,
        frameTitle: currentTool === 'frame' ? 'Khung nội dung' : undefined,
        authorId: currentUser.id,
        authorName: currentUser.name,
        createdAt: Date.now(),
      };
      redrawCanvas();
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (!isDrawingRef.current || !startPointRef.current) return;
    const endPos = getCanvasPos(e);
    isDrawingRef.current = false;

    let newElement: WhiteboardElement | null = null;

    if (
      currentTool === 'pencil' ||
      currentTool === 'brush' ||
      currentTool === 'highlighter' ||
      currentTool === 'eraser'
    ) {
      if (activePathRef.current.length > 0) {
        const isEraser = currentTool === 'eraser';
        const isHighlighter = currentTool === 'highlighter';
        const actualWidth = isEraser
          ? Math.max(16, strokeWidth * 3)
          : isHighlighter
          ? Math.max(20, strokeWidth * 3.5)
          : currentTool === 'pencil'
          ? Math.min(2, strokeWidth)
          : strokeWidth;
        const actualColor = isEraser ? '#ffffff' : isHighlighter ? '#facc15' : primaryColor;

        if (autoShapeEnabled && activePathRef.current.length > 15) {
          const pts = activePathRef.current;
          const first = pts[0];
          const last = pts[pts.length - 1];
          const dist = Math.hypot(first.x - last.x, first.y - last.y);
          const minX = Math.min(...pts.map((p) => p.x));
          const maxX = Math.max(...pts.map((p) => p.x));
          const minY = Math.min(...pts.map((p) => p.y));
          const maxY = Math.max(...pts.map((p) => p.y));
          const w = maxX - minX;
          const h = maxY - minY;

          if (dist < 40 && Math.abs(w - h) < Math.max(w, h) * 0.4) {
            newElement = {
              id: 'circle_' + Date.now(),
              type: 'circle',
              x: minX,
              y: minY,
              width: w,
              height: h,
              color: actualColor,
              strokeWidth: actualWidth,
              authorId: currentUser.id,
              authorName: currentUser.name,
              createdAt: Date.now(),
            };
          }
        }

        if (!newElement) {
          newElement = {
            id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            type: 'path',
            points: [...activePathRef.current],
            x: startPointRef.current.x,
            y: startPointRef.current.y,
            color: actualColor,
            strokeWidth: actualWidth,
            opacity: isHighlighter ? 0.35 : 1,
            authorId: currentUser.id,
            authorName: currentUser.name,
            createdAt: Date.now(),
          };
        }
      }
    } else if (currentTool !== 'select' && currentTool !== 'hand' && currentTool !== 'sticky') {
      const width = endPos.x - startPointRef.current.x;
      const height = endPos.y - startPointRef.current.y;

      if (Math.abs(width) > 4 || Math.abs(height) > 4) {
        newElement = {
          id: 'shape_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          type: currentTool as any,
          x: startPointRef.current.x,
          y: startPointRef.current.y,
          width,
          height,
          color: primaryColor,
          fillColor: secondaryColor,
          isFilled: isFilledShape,
          strokeWidth,
          frameTitle: currentTool === 'frame' ? 'Khung nội dung' : undefined,
          authorId: currentUser.id,
          authorName: currentUser.name,
          createdAt: Date.now(),
        };
      }
    }

    activePreviewRef.current = null;
    activePathRef.current = [];
    startPointRef.current = null;

    if (newElement) {
      updateElementsAndSync([...elementsRef.current, newElement]);
    }
    redrawCanvas();
  };

  // Commit text input to canvas
  const handleCommitText = () => {
    if (!textInputState || !textInputState.text.trim()) {
      setTextInputState(null);
      return;
    }

    const newTextEl: WhiteboardElement = {
      id: 'text_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: 'text',
      x: textInputState.x,
      y: textInputState.y,
      color: primaryColor,
      strokeWidth: 1,
      text: textInputState.text,
      fontSize: 16,
      authorId: currentUser.id,
      authorName: currentUser.name,
      createdAt: Date.now(),
    };

    updateElementsAndSync([...elementsRef.current, newTextEl]);
    setTextInputState(null);
    redrawCanvas();
  };

  // Add individual Sticky Note
  const handleAddStickyNote = (color: StickyColor = 'yellow') => {
    const centerWorld = screenToWorld(
      (window.innerWidth || 800) / 2 - 140,
      (window.innerHeight || 600) / 2 - 80
    );

    const newSticky: WhiteboardElement = {
      id: 'sticky_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: 'sticky',
      x: centerWorld.x,
      y: centerWorld.y,
      width: 280,
      stickyColor: color,
      color: '#eab308',
      strokeWidth: 1,
      text: 'Ý tưởng mới...',
      authorId: currentUser.id,
      authorName: currentUser.name,
      votes: {},
      createdAt: Date.now(),
    };

    updateElementsAndSync([...elementsRef.current, newSticky]);
    setSelectedElementId(newSticky.id);
    showToast('Đã dán thẻ ghi chú lên bảng trắng!');
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const center = screenToWorld(200, 200);

      const newImgEl: WhiteboardElement = {
        id: 'img_' + Date.now(),
        type: 'image',
        imageUrl: dataUrl,
        x: center.x,
        y: center.y,
        width: 320,
        height: 240,
        color: '#94a3b8',
        strokeWidth: 1,
        authorId: currentUser.id,
        authorName: currentUser.name,
        createdAt: Date.now(),
      };
      updateElementsAndSync([...elementsRef.current, newImgEl]);
      showToast('Đã chèn ảnh lên bảng trắng thành công!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add Bulk Sticky Notes
  const handleAddBulkStickies = (
    items: string[],
    color: StickyColor,
    layout: 'grid' | 'row',
    tag?: string
  ) => {
    const center = screenToWorld(150, 150);
    const newStickies: WhiteboardElement[] = items.map((text, idx) => {
      let x = center.x;
      let y = center.y;
      if (layout === 'grid') {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        x += col * 300;
        y += row * 190;
      } else {
        x += idx * 300;
      }

      return {
        id: `bulk_st_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'sticky',
        x,
        y,
        width: 280,
        stickyColor: color,
        color: '#eab308',
        strokeWidth: 1,
        text,
        tags: tag ? [tag] : undefined,
        authorId: currentUser.id,
        authorName: currentUser.name,
        votes: {},
        createdAt: Date.now() + idx,
      };
    });

    updateElementsAndSync([...elementsRef.current, ...newStickies]);
    showToast(`Đã tạo hàng loạt ${items.length} thẻ ghi chú thành công!`);
  };

  // Add AI Generated Ideas
  const handleInsertAIIdeas = (ideas: string[]) => {
    handleAddBulkStickies(ideas, 'purple', 'grid', 'Gemini AI');
  };

  // Apply Template
  const handleSelectTemplate = (templateId: string) => {
    const center = screenToWorld(60, 60);
    const newElements = generateTemplateElements(templateId, currentUser, {
      x: center.x,
      y: center.y,
    });
    updateElementsAndSync([...elementsRef.current, ...newElements]);
    showToast(`Đã áp dụng mẫu thành công vào bảng trắng!`);
  };

  // Voting Session Controls
  const handleStartVoting = (
    topic: string,
    votesPerPerson: number,
    durationMinutes: number,
    isSecret: boolean
  ) => {
    const newSession: VotingSession = {
      id: 'vote_' + Date.now(),
      isActive: true,
      topic,
      votesPerPerson,
      durationSeconds: durationMinutes * 60,
      remainingSeconds: durationMinutes * 60,
      isSecret,
      isFinished: false,
      startedAt: Date.now(),
      userVotes: {},
    };
    setVotingSession(newSession);
    showToast(`Đã mở phiên bình chọn: "${topic}"!`);
  };

  const handleEndVoting = () => {
    if (!votingSession) return;
    setVotingSession({
      ...votingSession,
      isActive: false,
      isFinished: true,
    });
    showToast('Phiên bình chọn đã kết thúc! Đang hiển thị kết quả.');
  };

  // Toggle Sticky Vote
  const handleToggleVote = (stickyId: string) => {
    const currentSticky = elementsRef.current.find((el) => el.id === stickyId);
    if (!currentSticky) return;

    const currentVote = (currentSticky.votes?.[currentUser.id] || 0) > 0 ? 0 : 1;
    const newVotes = { ...(currentSticky.votes || {}), [currentUser.id]: currentVote };

    const updated = elementsRef.current.map((el) =>
      el.id === stickyId ? { ...el, votes: newVotes } : el
    );
    updateElementsAndSync(updated);
  };

  const getStickyVoteCount = (sticky: WhiteboardElement) => {
    if (!sticky.votes) return 0;
    return Object.values(sticky.votes).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
  };

  // Convert Sticky to Kanban Task (Cross-Module M5 -> M3)
  const handleConvertToTask = (sticky: WhiteboardElement) => {
    const boardTitle = WHITEBOARD_BOARDS.find((b) => b.id === activeBoard)?.title || 'Bảng Trắng Brainstorm';
    const taskKey = `WB-${Math.floor(10 + Math.random() * 89)}`;
    const deadline = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
    const voteCount = getStickyVoteCount(sticky);

    const updated = elementsRef.current.map((el) =>
      el.id === sticky.id ? { ...el, convertedToTaskId: taskKey } : el
    );
    updateElementsAndSync(updated);

    try {
      const stored = localStorage.getItem('collab_kanban_external_tasks');
      const tasks = stored ? JSON.parse(stored) : [];
      const newTask = {
        id: `task_from_board_${Date.now()}`,
        key: taskKey,
        title: `[Whiteboard: ${boardTitle}] ${sticky.text?.substring(0, 45) || 'Ý tưởng đột phá'}...`,
        description: `Ý tưởng chốt hành động từ bảng trắng "${boardTitle}":\n"${sticky.text || ''}"\n(Số phiếu biểu quyết: ${voteCount})`,
        column: 'todo' as const,
        priority: voteCount >= 2 ? ('high' as const) : ('normal' as const),
        assigneeName: currentUser.name,
        assigneeColor: currentUser.color,
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: deadline,
        labels: ['Brainstorm', 'Whiteboard', 'Sprint'],
        checklist: [
          { id: 'c1', text: `Nghiên cứu & hiện thực hóa: ${sticky.text?.substring(0, 40) || ''}`, completed: false },
          { id: 'c2', text: 'Báo cáo kết quả thử nghiệm trong buổi Retro tiếp theo', completed: false },
        ],
        source_ref: {
          type: 'whiteboard' as const,
          id: sticky.id,
          title: boardTitle,
          url: `/whiteboard?board=${activeBoard}#sticky=${sticky.id}`,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      tasks.push(newTask);
      localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('collab_task_created'));

      // Record to audit logs
      try {
        const storedLogs = localStorage.getItem('collab_audit_logs');
        const logs = storedLogs ? JSON.parse(storedLogs) : [];
        logs.unshift({
          id: 'aud_' + Date.now(),
          action: `Chuyển thẻ ghi chú Whiteboard "${sticky.text?.substring(0, 30)}..." thành nhiệm vụ ${taskKey}`,
          userName: currentUser.name,
          userRole: 'Facilitator',
          module: 'Bảng trắng & Brainstorm (M5)',
          timestamp: Date.now(),
          status: 'success',
        });
        localStorage.setItem('collab_audit_logs', JSON.stringify(logs.slice(0, 50)));
      } catch {}

      showToast(`Đã tạo nhiệm vụ ${taskKey} trên Bảng Kanban (M3) giao cho @${currentUser.name}!`);
    } catch (err) {
      console.warn('Failed to convert sticky to task', err);
    }
  };

  // Batch Convert Top Voted Stickies to Kanban Tasks (Step 6 of Workshop)
  const handleBatchCreateTasksFromTopStickies = () => {
    const boardTitle = WHITEBOARD_BOARDS.find((b) => b.id === activeBoard)?.title || 'Bảng Trắng Brainstorm';
    const stickies = elementsRef.current.filter((el) => el.type === 'sticky' && el.text?.trim());
    if (stickies.length === 0) {
      showToast('Chưa có thẻ ghi chú nào trên bảng trắng để tạo nhiệm vụ!');
      return;
    }

    const sorted = [...stickies].sort((a, b) => getStickyVoteCount(b) - getStickyVoteCount(a)).slice(0, 4);
    try {
      const stored = localStorage.getItem('collab_kanban_external_tasks');
      const tasks = stored ? JSON.parse(stored) : [];
      const newTasks: any[] = [];
      const deadline = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

      sorted.forEach((sticky, idx) => {
        const voteCount = getStickyVoteCount(sticky);
        const taskKey = `WB-${Math.floor(10 + Math.random() * 89)}`;
        const newTask = {
          id: `task_from_board_${Date.now()}_${idx}`,
          key: taskKey,
          title: `[Top #${idx + 1} Whiteboard] ${sticky.text?.substring(0, 45) || 'Ý tưởng đột phá'}...`,
          description: `Ý tưởng đạt top bình chọn (${voteCount} phiếu) trong buổi họp động não "${boardTitle}":\n"${sticky.text || ''}"`,
          column: 'todo' as const,
          priority: idx === 0 ? ('urgent' as const) : ('high' as const),
          assigneeName: currentUser.name,
          assigneeColor: currentUser.color,
          startDate: new Date().toISOString().slice(0, 10),
          dueDate: deadline,
          labels: ['Top-Idea', 'Brainstorm', 'Sprint'],
          checklist: [
            { id: 'c1', text: `Lên phương án chi tiết cho: ${sticky.text?.substring(0, 35)}...`, completed: false },
            { id: 'c2', text: 'Triển khai POC (Proof of Concept) kiểm chứng', completed: false },
          ],
          source_ref: {
            type: 'whiteboard' as const,
            id: sticky.id,
            title: boardTitle,
            url: `/whiteboard?board=${activeBoard}#sticky=${sticky.id}`,
          },
          createdAt: Date.now() + idx,
          updatedAt: Date.now() + idx,
        };
        newTasks.push(newTask);
      });

      localStorage.setItem('collab_kanban_external_tasks', JSON.stringify([...tasks, ...newTasks]));
      window.dispatchEvent(new CustomEvent('collab_task_created'));

      // Mark stickies as converted
      const topIds = new Set(sorted.map((s) => s.id));
      const updated = elementsRef.current.map((el) =>
        topIds.has(el.id) ? { ...el, convertedToTaskId: 'WB-Task' } : el
      );
      updateElementsAndSync(updated);

      // Trigger Cross-Module Announcement & Notification (Flow D)
      try {
        emitDomainEvent('whiteboard.exported', {
          workshopTitle: boardTitle,
          boardId: activeBoard,
          createdTasksCount: newTasks.length,
          wikiPageId: null,
        });
      } catch (err) {
        console.warn('Failed to emit whiteboard.exported event', err);
      }

      showToast(`Đã chốt và tạo ${newTasks.length} nhiệm vụ trên Bảng Kanban (M3) thành công!`);
    } catch (err) {
      console.warn('Failed to batch convert stickies', err);
    }
  };

  // Export Retrospective / Brainstorm Workshop Summary to Wiki (Cross-Module M5 -> M6)
  const handleExportWorkshopToWiki = () => {
    const boardTitle = WHITEBOARD_BOARDS.find((b) => b.id === activeBoard)?.title || 'Bảng Trắng Brainstorm';
    const stickies = elementsRef.current.filter((el) => el.type === 'sticky' && el.text?.trim());
    const sortedStickies = [...stickies].sort((a, b) => getStickyVoteCount(b) - getStickyVoteCount(a));

    const totalVotes = stickies.reduce((sum, s) => sum + getStickyVoteCount(s), 0);
    const dateFormatted = new Date().toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const wikiContent = `## 📝 BIÊN BẢN BUỔI HỌP ĐỘNG NÃO & CHỐT KẾ HOẠCH (WORKSHOP RETROSPECTIVE)

### 📌 Thông tin tổng quan
- **Chủ đề buổi họp**: ${boardTitle}
- **Thời gian tổ chức**: ${dateFormatted}
- **Người điều phối (Facilitator)**: ${currentUser.name}
- **Tổng số ghi chú ý tưởng đóng góp**: ${stickies.length} ý tưởng
- **Tổng số lượt bình chọn (Dot-voting)**: ${totalVotes} lượt

---

### 🏆 Các Ý Tưởng Đạt Điểm Bình Chọn Cao Nhất
${
  sortedStickies.length > 0
    ? sortedStickies
        .slice(0, 5)
        .map(
          (s, idx) =>
            `${idx + 1}. **[${getStickyVoteCount(s)} phiếu]** ${s.text}\n   - *Màu ghi chú: ${s.stickyColor || 'yellow'}* | *Vị trí trên bảng: (${Math.round(s.x)}, ${Math.round(s.y)})*`
        )
        .join('\n')
    : '_Chưa có ghi chú nào được ghi lại._'
}

---

### 📋 Toàn Bộ Ý Tưởng Theo Danh Sách
${
  stickies.length > 0
    ? stickies
        .map(
          (s, idx) =>
            `- [${getStickyVoteCount(s)} vote] ${s.text} ${s.tags && s.tags.length ? `(${s.tags.map((t) => '#' + t).join(' ')})` : ''}`
        )
        .join('\n')
    : '_Không có ghi chú nào._'
}

---

### 🎯 Kế Hoạch Hành Động (Action Items Chuyển Sang Kanban M3)
1. [ ] **Thực hiện POC cho ý tưởng top 1**: Triển khai giải pháp kỹ thuật và đo lường độ phản hồi.
2. [ ] **Phân công trách nhiệm sprint**: Người điều phối ${currentUser.name} theo dõi tiến độ trên bảng Kanban (\`/tasks\`).
3. [ ] **Rà soát định kỳ**: Đánh giá kết quả vào buổi họp Retrospective tuần tới.

> 💡 *Biên bản này được tự động trích xuất và đồng bộ từ Bảng trắng Brainstorm M5 sang Wiki Tri thức M6.*`;

    try {
      const stored = localStorage.getItem('collab_custom_wiki_pages');
      const customPages = stored ? JSON.parse(stored) : [];

      const newWikiPage = {
        id: `wiki-board-${activeBoard}-${Date.now()}`,
        title: `Biên bản Brainstorm: ${boardTitle} (${dateFormatted})`,
        areaId: 'decisions',
        areaName: '📝 Họp & Quyết định',
        topic: 'Biên bản họp động não',
        type: 'Biên bản',
        owner: currentUser.name,
        status: 'Đã duyệt',
        lastReviewed: new Date().toISOString().split('T')[0],
        tags: ['#brainstorm', '#bien-ban-hop', '#quyet-dinh', '#retro'],
        summary: `Biên bản tổng kết buổi họp động não và biểu quyết ý tưởng từ bảng trắng "${boardTitle}". Gồm ${stickies.length} ý tưởng và kế hoạch hành động chốt sang Kanban.`,
        content: wikiContent,
      };

      customPages.unshift(newWikiPage);
      localStorage.setItem('collab_custom_wiki_pages', JSON.stringify(customPages));
      window.dispatchEvent(new CustomEvent('collab_wiki_updated'));

      // Trigger Cross-Module Announcement & Notification (Flow D)
      try {
        emitDomainEvent('whiteboard.exported', {
          workshopTitle: boardTitle,
          boardId: activeBoard,
          createdTasksCount: stickies.length,
          wikiPageId: newWikiPage.id,
        });
      } catch (err) {
        console.warn('Failed to emit whiteboard.exported event', err);
      }

      showToast(`Đã xuất biên bản sang Wiki (M6) thành công! Xem tại mục "📝 Họp & Quyết định".`);
    } catch (err) {
      console.warn('Failed to export to wiki', err);
    }
  };

  // Bring Everyone To Me
  const handleBringEveryoneToMe = () => {
    if (providerRef.current) {
      providerRef.current.awareness.setLocalStateField('broadcastViewport', {
        x: panOffset.x,
        y: panOffset.y,
        zoom,
      });
      showToast('Đã phát tín hiệu đưa toàn bộ thành viên về góc nhìn của bạn!');
    }
  };

  // Live Floating Reaction Emojis
  const triggerReaction = (emoji: string) => {
    const reaction: LiveReactionItem = {
      id: 'react_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      emoji,
      x: window.innerWidth / 2 + (Math.random() * 200 - 100),
      y: window.innerHeight / 2 + 100,
      authorName: currentUser.name,
      createdAt: Date.now(),
    };
    setLiveReactions((prev) => [...prev, reaction]);
    setTimeout(() => {
      setLiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 2500);
  };

  // Presentation Mode Frame Jumper
  const frames = elements.filter((el) => el.type === 'frame');
  const jumpToFrame = (idx: number) => {
    if (frames.length === 0) return;
    const targetIdx = (idx + frames.length) % frames.length;
    setCurrentFrameIndex(targetIdx);
    const target = frames[targetIdx];
    if (target && target.width && target.height) {
      const targetZoom = 1.0;
      const targetPanX = window.innerWidth / 2 - (target.x + target.width / 2) * targetZoom;
      const targetPanY = window.innerHeight / 2 - (target.y + target.height / 2) * targetZoom;
      setZoom(targetZoom);
      setPanOffset({ x: targetPanX, y: targetPanY });
    }
  };

  // Export as PNG
  const handleExportPNG = () => {
    setExportMenuOpen(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `whiteboard_brainstorm_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    showToast('Đã tải xuống ảnh bảng trắng PNG chất lượng cao!');
  };

  // Export as PDF / Vector Print
  const handleExportPDF = () => {
    setExportMenuOpen(false);
    window.print();
  };

  // Clear Canvas & Reset to Clean Starter Board
  const handleClearCanvas = () => {
    setExportMenuOpen(false);
    if (confirm('Bạn có chắc chắn muốn đặt lại bảng trắng với mẫu Brainstorming chuẩn không?')) {
      const starter = generateTemplateElements('open_brainstorm', currentUser, { x: 0, y: 0 });
      updateElementsAndSync(starter);
      centerCanvasContent();
      redrawCanvas();
      showToast('Đã đặt lại bảng trắng với bố cục cân đối.');
    }
  };

  // Check if active tool is a drawing or shape tool to show contextual mini-bar
  const isContextualTool =
    currentTool === 'pencil' ||
    currentTool === 'brush' ||
    currentTool === 'highlighter' ||
    currentTool === 'rectangle' ||
    currentTool === 'circle' ||
    currentTool === 'diamond' ||
    currentTool === 'arrow' ||
    currentTool === 'connector';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white select-none font-sans text-zinc-800">
      {/* Hidden File Input for Image Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* ============================================================== */}
      {/* 1. TOP HEADER & COLLABORATION BAR (Clean, Symmetrical, Balanced)*/}
      {/* ============================================================== */}
      <header className="h-14 bg-white border-b border-zinc-200/90 px-4 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        {/* Left: Brand, Back & Collaborators */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleExit}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            title="Quay lại Trang chủ"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </button>

          <div className="h-4 w-px bg-zinc-200" />

          <div className="relative">
            <button
              type="button"
              onClick={() => setBoardSwitcherOpen(!boardSwitcherOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-zinc-100 transition-colors text-left"
              title="Chuyển bảng trắng làm việc"
            >
              <h1 className="text-xs sm:text-sm font-bold text-zinc-900 truncate max-w-[200px] sm:max-w-none">
                {WHITEBOARD_BOARDS.find((b) => b.id === activeBoard)?.title || 'Bảng Trắng Brainstorm'}
              </h1>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            </button>

            {/* Board Switcher Dropdown */}
            {boardSwitcherOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-80 bg-white rounded-2xl shadow-xl border border-zinc-200/90 p-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Chuyển Mẫu Bảng Trắng
                </div>
                <div className="space-y-0.5">
                  {WHITEBOARD_BOARDS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSwitchBoard(b.id)}
                      className={`w-full flex items-start gap-2 p-2 rounded-xl text-left transition-colors ${
                        activeBoard === b.id
                          ? 'bg-purple-50 text-purple-900 font-semibold'
                          : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <span className="text-sm mt-0.5">{b.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{b.title}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{b.desc}</div>
                      </div>
                      {activeBoard === b.id && (
                        <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Yjs</span>
          </span>

          {/* Collaborator Avatars */}
          <div className="hidden md:flex items-center -space-x-1.5 pl-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white shadow-2xs"
              style={{ backgroundColor: currentUser.color }}
              title={`Bạn: ${currentUser.name}`}
            >
              {currentUser.name[0]}
            </div>
            {peerCursors.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white shadow-2xs"
                style={{ backgroundColor: p.color }}
                title={`Đang xem: ${p.name}`}
              >
                {p.name[0]}
              </div>
            ))}
            {peerCursors.length > 3 && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold bg-zinc-200 text-zinc-700 border-2 border-white">
                +{peerCursors.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Center: Unified Facilitation Hub Pill (Roadmap, Timer, Vote) */}
        <div className="flex items-center">
          <div className="flex items-center bg-zinc-50 border border-zinc-200/90 rounded-2xl px-2.5 py-1 gap-2 shadow-2xs">
            {/* Workshop Step Badge */}
            <button
              type="button"
              onClick={() => setWorkshopModalOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold text-zinc-700 hover:text-blue-700 hover:bg-white transition-all"
              title="Mở cẩm nang quy trình 6 bước Workshop"
            >
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Bước {currentStepId}/6</span>
            </button>

            <div className="h-3.5 w-px bg-zinc-200" />

            {/* Sync Timer Bar */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`p-1 rounded-lg transition-colors ${
                  isTimerRunning
                    ? 'bg-amber-500 text-white'
                    : 'text-zinc-600 hover:bg-zinc-200'
                }`}
                title={isTimerRunning ? 'Tạm dừng đồng hồ' : 'Chạy đồng hồ đếm ngược'}
              >
                {isTimerRunning ? (
                  <Pause className="w-3 h-3 fill-current" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
              </button>
              <span className="font-mono text-xs font-bold text-zinc-800 px-1">
                {formatTimer(timerSeconds)}
              </span>
              <button
                type="button"
                onClick={() => setTimerSeconds(300)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700"
                title="Đặt lại 5 phút"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="h-3.5 w-px bg-zinc-200" />

            {/* Voting Session Trigger */}
            <button
              type="button"
              onClick={() => setVotingModalOpen(true)}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold transition-all ${
                votingSession?.isActive
                  ? 'bg-amber-500 text-white shadow-xs animate-pulse'
                  : 'text-zinc-700 hover:text-amber-800 hover:bg-amber-50'
              }`}
              title="Mở phiên biểu quyết Dot Voting"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>{votingSession?.isActive ? 'Bỏ phiếu...' : 'Vote'}</span>
            </button>
          </div>
        </div>

        {/* Right: Actions (AI, Templates, Present, Export) */}
        <div className="flex items-center gap-1.5">
          {/* Comments Drawer Toggle */}
          <button
            type="button"
            onClick={() => setCommentsDrawerOpen(!commentsDrawerOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              commentsDrawerOpen
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80'
            }`}
            title="Mở danh sách bình luận trên bảng trắng (C)"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Bình luận</span>
            {comments.filter((c) => !c.resolved).length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  commentsDrawerOpen ? 'bg-white text-purple-700' : 'bg-purple-600 text-white'
                }`}
              >
                {comments.filter((c) => !c.resolved).length}
              </span>
            )}
          </button>

          {/* AI Assistant Button */}
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200/80 transition-colors"
            title="Trợ lý AI tóm tắt buổi họp"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden md:inline">AI Tóm tắt</span>
          </button>

          {/* Export to Wiki M6 Button */}
          <button
            type="button"
            onClick={handleExportWorkshopToWiki}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200/80 transition-colors"
            title="Lưu biên bản và ý tưởng sang Cơ sở Tri thức & Wiki (M6)"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden lg:inline">Lưu Wiki (M6)</span>
          </button>

          {/* Templates Library */}
          <button
            type="button"
            onClick={() => setTemplatesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors"
            title="Mở kho 15 mẫu dựng sẵn"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">15 Mẫu</span>
          </button>

          {/* Bring everyone to me */}
          <button
            type="button"
            onClick={handleBringEveryoneToMe}
            className="p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 transition-colors"
            title="Đưa mọi người về góc nhìn của tôi"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Presentation Mode */}
          <button
            type="button"
            onClick={() => {
              if (frames.length === 0) {
                showToast('Chưa có Khung (Frame) nào. Hãy tạo khung trước để trình chiếu!');
              } else {
                setIsPresentationMode(!isPresentationMode);
                jumpToFrame(0);
              }
            }}
            className={`p-2 rounded-xl transition-colors ${
              isPresentationMode ? 'bg-indigo-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Chế độ thuyết trình (Presentation)"
          >
            <Tv className="w-4 h-4" />
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-1 p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 transition-colors"
              title="Xuất file hoặc đặt lại"
            >
              <Download className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-zinc-200 p-1.5 z-50 text-xs font-medium space-y-1">
                <button
                  type="button"
                  onClick={handleExportWorkshopToWiki}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 transition-colors text-left font-semibold"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Lưu biên bản vào Wiki (M6)</span>
                </button>
                <div className="h-px bg-zinc-100 my-1" />
                <button
                  type="button"
                  onClick={handleExportPNG}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-700 hover:bg-zinc-100 transition-colors text-left"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Xuất ảnh PNG</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-700 hover:bg-zinc-100 transition-colors text-left"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>In / Xuất PDF</span>
                </button>
                <div className="h-px bg-zinc-100 my-1" />
                <button
                  type="button"
                  onClick={handleClearCanvas}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Đặt lại bảng mẫu</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. FLOATING CONTEXTUAL STYLE BAR (Shows when drawing or shape) */}
      {/* ============================================================== */}
      {isContextualTool && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-20 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-zinc-200/90 px-3 py-1.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {['#2563eb', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#000000'].map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setPrimaryColor(col)}
                className={`w-5 h-5 rounded-full transition-transform ${
                  primaryColor === col ? 'ring-2 ring-blue-600 ring-offset-1 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-zinc-200" />

          {/* Stroke Width */}
          <div className="flex items-center gap-1">
            {STROKE_WIDTHS.map((sw) => (
              <button
                key={sw.value}
                type="button"
                onClick={() => setStrokeWidth(sw.value)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  strokeWidth === sw.value ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {sw.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-zinc-200" />

          {/* Fill Toggle */}
          <button
            type="button"
            onClick={() => setIsFilledShape(!isFilledShape)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
              isFilledShape ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
            }`}
            title="Tô đặc màu bên trong"
          >
            {isFilledShape ? 'Đặc màu' : 'Viền rỗng'}
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MODERN FIGJAM DOCK (Sleek, Compact, Centered Tool Dock)    */}
      {/* ============================================================== */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-5 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-zinc-200/90 p-1.5 flex items-center gap-1.5">
        {/* Group 1: Navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentTool('select')}
            className={`p-2 rounded-xl transition-all ${
              currentTool === 'select'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Con trỏ chọn (V)"
          >
            <MousePointer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentTool('hand')}
            className={`p-2 rounded-xl transition-all ${
              currentTool === 'hand'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Bàn tay di chuyển canvas (H / Spacebar)"
          >
            <Hand className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-zinc-200" />

        {/* Group 2: Content Creation */}
        <div className="flex items-center gap-1">
          {/* Sticky Note Button */}
          <button
            type="button"
            onClick={() => handleAddStickyNote('yellow')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 text-xs font-bold shadow-2xs transition-colors"
            title="Dán thẻ ghi chú (S)"
          >
            <StickyNote className="w-4 h-4 text-amber-600" />
            <span>Note</span>
          </button>

          {/* Text Tool */}
          <button
            type="button"
            onClick={() => setCurrentTool('text')}
            className={`p-2 rounded-xl transition-all ${
              currentTool === 'text'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Văn bản (T)"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Comment Tool */}
          <button
            type="button"
            onClick={() => setCurrentTool('comment')}
            className={`p-2 rounded-xl transition-all ${
              currentTool === 'comment'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Bình luận & Góp ý trên bảng vẽ (C)"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Shapes Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShapeMenuOpen(!shapeMenuOpen)}
              className={`p-2 rounded-xl flex items-center gap-0.5 transition-all ${
                currentTool === 'rectangle' ||
                currentTool === 'circle' ||
                currentTool === 'diamond' ||
                currentTool === 'frame'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
              title="Hình khối & Khung"
            >
              <Square className="w-4 h-4" />
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {shapeMenuOpen && (
              <div className="absolute left-0 bottom-full mb-2 bg-white rounded-2xl shadow-xl border border-zinc-200 p-1.5 grid grid-cols-4 gap-1 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTool('rectangle');
                    setShapeMenuOpen(false);
                  }}
                  className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-700"
                  title="Hình chữ nhật"
                >
                  <Square className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTool('circle');
                    setShapeMenuOpen(false);
                  }}
                  className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-700"
                  title="Hình tròn / Elip"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTool('diamond');
                    setShapeMenuOpen(false);
                  }}
                  className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-700"
                  title="Hình thoi điều kiện (Flowchart)"
                >
                  <Diamond className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTool('frame');
                    setShapeMenuOpen(false);
                  }}
                  className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-700"
                  title="Khung phân vùng (Frame)"
                >
                  <Frame className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Smart Connector */}
          <button
            type="button"
            onClick={() => setCurrentTool('connector')}
            className={`p-2 rounded-xl transition-all ${
              currentTool === 'connector'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Mũi tên thông minh kết nối (Connector / C)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-zinc-200" />

        {/* Group 3: Freehand Drawing */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentTool('pencil')}
            className={`p-2 rounded-xl transition-all ${
              currentTool === 'pencil'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Bút vẽ tự do (P)"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentTool('highlighter')}
            className={`p-2 rounded-xl transition-all ${
              currentTool === 'highlighter'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Bút dạ quang (Highlighter)"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentTool('eraser')}
            className={`p-2 rounded-xl transition-all ${
              currentTool === 'eraser'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Tẩy xóa (E)"
          >
            <Eraser className="w-4 h-4" />
          </button>

          {/* Auto-Shape Recognition */}
          <button
            type="button"
            onClick={() => {
              setAutoShapeEnabled(!autoShapeEnabled);
              showToast(
                !autoShapeEnabled
                  ? 'Đã bật Tự nắn nét vẽ thành hình học chuẩn!'
                  : 'Đã tắt Tự nắn nét vẽ.'
              );
            }}
            className={`p-2 rounded-xl transition-all ${
              autoShapeEnabled
                ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-400'
                : 'text-zinc-500 hover:bg-zinc-100'
            }`}
            title="Tự nắn nét vẽ tay thành hình chuẩn (Auto-Shape)"
          >
            <Wand2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-zinc-200" />

        {/* Group 4: Media & Bulk */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl text-zinc-600 hover:bg-zinc-100"
            title="Chèn ảnh từ máy tính"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setBulkStickyModalOpen(true)}
            className="p-2 rounded-xl text-zinc-600 hover:bg-zinc-100"
            title="Thêm hàng loạt ghi chú (Bulk)"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleDuplicate}
            className="p-2 rounded-xl text-zinc-600 hover:bg-zinc-100"
            title="Nhân bản phần tử đang chọn (Ctrl+D)"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-zinc-200" />

        {/* Group 5: Reactions */}
        <div className="flex items-center gap-0.5">
          {['❤️', '👏', '🎉', '💡', '🔥'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => triggerReaction(emoji)}
              className="text-sm p-1.5 hover:scale-125 transition-transform"
              title={`Thả reaction ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-zinc-200" />

        {/* Group 6: History Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
            title="Hoàn tác (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
            title="Làm lại (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. ZOOM DOCK & RESET VIEW (Bottom Right)                       */}
      {/* ============================================================== */}
      <div className="absolute right-5 bottom-5 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-zinc-200 px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-700">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.25, parseFloat((z - 0.1).toFixed(2))))}
          className="p-1 rounded-lg hover:bg-zinc-100"
          title="Thu nhỏ"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span
          onClick={centerCanvasContent}
          className="w-12 text-center font-mono cursor-pointer hover:underline"
          title="Click để căn giữa toàn bộ bảng"
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.5, parseFloat((z + 0.1).toFixed(2))))}
          className="p-1 rounded-lg hover:bg-zinc-100"
          title="Phóng to"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={centerCanvasContent}
          className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
          title="Căn giữa nội dung"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ============================================================== */}
      {/* 5. SHORTCUTS TIP (Bottom Left)                                 */}
      {/* ============================================================== */}
      <div className="hidden lg:flex absolute left-5 bottom-5 z-30 bg-white/90 backdrop-blur-xs rounded-xl shadow-xs border border-zinc-200/80 px-3 py-1.5 text-[11px] text-zinc-500 font-medium items-center gap-3">
        <span>Phím cách: Kéo bảng</span>
        <span>•</span>
        <span>Ctrl+D: Nhân bản</span>
        <span>•</span>
        <span>Cuộn chuột: Phóng to/Thu nhỏ</span>
      </div>

      {/* ============================================================== */}
      {/* 6. PRESENTATION MODE FLOATING DOCK                             */}
      {/* ============================================================== */}
      {isPresentationMode && frames.length > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white rounded-2xl shadow-2xl px-5 py-2.5 flex items-center gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold">
              Trình chiếu: Khung {currentFrameIndex + 1} / {frames.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => jumpToFrame(currentFrameIndex - 1)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold"
            >
              ◀ Trước
            </button>
            <button
              type="button"
              onClick={() => jumpToFrame(currentFrameIndex + 1)}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold"
            >
              Tiếp theo ▶
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPresentationMode(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. MAIN INFINITE CANVAS DESK                                   */}
      {/* ============================================================== */}
      <main
        ref={containerRef}
        onWheel={handleWheel}
        className="flex-1 relative overflow-hidden bg-white touch-none"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
          className={`w-full h-full ${
            currentTool === 'hand'
              ? 'cursor-grab active:cursor-grabbing'
              : currentTool === 'eraser'
              ? 'cursor-cell'
              : currentTool === 'text'
              ? 'cursor-text'
              : currentTool === 'select'
              ? 'cursor-default'
              : 'cursor-crosshair'
          }`}
        />

        {/* Floating Text Input Box */}
        {textInputState && (
          <div
            style={{
              position: 'absolute',
              left: `${textInputState.x * zoom + panOffset.x}px`,
              top: `${textInputState.y * zoom + panOffset.y}px`,
              zIndex: 30,
            }}
            className="bg-white/95 backdrop-blur-xs p-1.5 rounded-xl shadow-lg border border-blue-400 flex items-center gap-1"
          >
            <input
              autoFocus
              type="text"
              value={textInputState.text}
              onChange={(e) => setTextInputState({ ...textInputState, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitText();
                if (e.key === 'Escape') setTextInputState(null);
              }}
              placeholder="Nhập chữ rồi nhấn Enter..."
              style={{ color: primaryColor }}
              className="text-sm font-sans bg-transparent border-0 outline-none px-2 py-1 w-52 text-zinc-900"
            />
            <button
              type="button"
              onClick={handleCommitText}
              className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sticky Notes HTML Overlay (Symmetrical, Crisp, Scaled with Zoom) */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {elements
            .filter((el) => el.type === 'sticky')
            .map((sticky) => {
              const colorConfig = STICKY_COLOR_MAP[sticky.stickyColor || 'yellow'];
              const isDragging = draggingStickyId === sticky.id;
              const isSelected = selectedElementId === sticky.id;
              const totalVotes = Object.values(sticky.votes || {}).reduce((a, b) => a + b, 0);

              return (
                <div
                  key={sticky.id}
                  onClick={() => setSelectedElementId(sticky.id)}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: `${sticky.width || 280}px`,
                    transform: `translate(${sticky.x * zoom + panOffset.x}px, ${
                      sticky.y * zoom + panOffset.y
                    }px) scale(${zoom})`,
                    transformOrigin: 'top left',
                    zIndex: isDragging ? 50 : isSelected ? 30 : 20,
                  }}
                  className={`pointer-events-auto rounded-2xl shadow-md border ${colorConfig.bg} ${
                    colorConfig.border
                  } overflow-hidden group transition-all ${
                    isDragging
                      ? 'shadow-2xl ring-2 ring-blue-500 scale-105'
                      : isSelected
                      ? 'ring-2 ring-blue-500 shadow-lg'
                      : 'hover:shadow-lg'
                  }`}
                >
                  {/* Sticky Header & Drag Handle */}
                  <div
                    onPointerDown={(e) => {
                      if (sticky.isLocked) return;
                      e.stopPropagation();
                      setSelectedElementId(sticky.id);
                      setDraggingStickyId(sticky.id);
                      dragOffsetRef.current = {
                        x: (e.clientX - panOffset.x) / zoom - sticky.x,
                        y: (e.clientY - panOffset.y) / zoom - sticky.y,
                      };
                    }}
                    className={`px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold ${
                      colorConfig.headerBg
                    } ${colorConfig.text} border-b ${
                      colorConfig.border
                    } select-none ${sticky.isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                      {sticky.isLocked && <Lock className="w-3 h-3 text-zinc-500 shrink-0" />}
                      <span className="truncate">
                        {sticky.isAnonymous ? 'Ẩn danh' : sticky.authorName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Dot Voting Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVote(sticky.id);
                        }}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold shadow-2xs transition-colors ${
                          (sticky.votes?.[currentUser.id] || 0) > 0
                            ? 'bg-amber-400 text-amber-950 ring-1 ring-amber-500'
                            : 'bg-white/80 hover:bg-white text-zinc-700'
                        }`}
                        title="Bình chọn cho ý tưởng này"
                      >
                        <span>👍</span>
                        <span>
                          {votingSession?.isSecret && !votingSession.isFinished
                            ? '?'
                            : totalVotes}
                        </span>
                      </button>

                      {/* Lock Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = elementsRef.current.map((el) =>
                            el.id === sticky.id ? { ...el, isLocked: !el.isLocked } : el
                          );
                          updateElementsAndSync(updated);
                        }}
                        className="p-0.5 rounded text-zinc-400 hover:text-zinc-700"
                        title={sticky.isLocked ? 'Mở khóa' : 'Khóa thẻ ghi chú'}
                      >
                        {sticky.isLocked ? (
                          <Lock className="w-3 h-3 text-amber-600" />
                        ) : (
                          <Unlock className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        )}
                      </button>

                      {/* Convert to Kanban Task */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConvertToTask(sticky);
                        }}
                        className={`p-0.5 rounded transition-colors ${
                          sticky.convertedToTaskId
                            ? 'text-emerald-600 font-bold'
                            : 'text-zinc-400 hover:text-blue-600'
                        }`}
                        title={sticky.convertedToTaskId ? `Đã tạo task: ${sticky.convertedToTaskId}` : 'Tạo việc Kanban (M3)'}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Sticky */}
                      {!sticky.isLocked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = elementsRef.current.filter((el) => el.id !== sticky.id);
                            updateElementsAndSync(updated);
                          }}
                          className="p-0.5 rounded text-zinc-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Xóa ghi chú"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sticky Content */}
                  <div className="p-3">
                    <textarea
                      value={sticky.text || ''}
                      disabled={sticky.isLocked}
                      onChange={(e) => {
                        const newText = e.target.value;
                        const updated = elementsRef.current.map((el) =>
                          el.id === sticky.id ? { ...el, text: newText } : el
                        );
                        elementsRef.current = updated;
                        setElements(updated);

                        if (elementsArrayRef.current && ydocRef.current) {
                          ydocRef.current.transact(() => {
                            const arr = elementsArrayRef.current!;
                            const list = arr.toArray();
                            const idx = list.findIndex((el) => el.id === sticky.id);
                            if (idx > -1) {
                              const target = { ...list[idx], text: newText };
                              arr.delete(idx, 1);
                              arr.insert(idx, [target]);
                            }
                          });
                        }
                      }}
                      rows={3}
                      className={`w-full bg-transparent border-0 resize-none text-xs font-sans leading-relaxed focus:outline-none ${colorConfig.text}`}
                    />

                    {/* Tags Badge */}
                    {sticky.tags && sticky.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-black/5">
                        {sticky.tags.map((t) => (
                          <span
                            key={t}
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${colorConfig.badgeBg}`}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Converted To Task Badge */}
                    {sticky.convertedToTaskId && (
                      <div className="mt-1 pt-1 border-t border-black/5 flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          <Check className="w-2.5 h-2.5" />
                          <span>Task: {sticky.convertedToTaskId}</span>
                        </span>
                        <Link
                          href="/tasks"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[9px] text-blue-600 hover:underline font-semibold shrink-0"
                        >
                          Mở việc ↗
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Live Peer Cursors */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {peerCursors.map((c) => (
            <div
              key={c.id}
              style={{
                position: 'absolute',
                left: `${c.x}px`,
                top: `${c.y}px`,
                transition: 'all 0.05s ease-out',
              }}
              className="flex items-center gap-1"
            >
              <MousePointer
                className="w-4 h-4 filter drop-shadow-sm -rotate-45"
                style={{ color: c.color, fill: c.color }}
              />
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
                style={{ backgroundColor: c.color }}
              >
                {c.name}
              </span>
            </div>
          ))}
        </div>

        {/* Live Floating Reaction Emojis */}
        <div className="absolute inset-0 pointer-events-none z-30">
          {liveReactions.map((r) => (
            <div
              key={r.id}
              style={{
                position: 'absolute',
                left: `${r.x}px`,
                top: `${r.y}px`,
              }}
              className="flex flex-col items-center animate-bounce duration-1000"
            >
              <span className="text-4xl filter drop-shadow-md">{r.emoji}</span>
              <span className="px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold mt-1">
                {r.authorName}
              </span>
            </div>
          ))}
        </div>

        {/* Interactive In-Canvas Comment Pins Layer */}
        <div className="absolute inset-0 pointer-events-none z-30">
          {comments.map((pin, index) => {
            const screenX = pin.x * zoom + panOffset.x;
            const screenY = pin.y * zoom + panOffset.y;
            const isSelected = selectedPin?.id === pin.id;
            return (
              <div
                key={pin.id}
                style={{
                  position: 'absolute',
                  left: `${screenX}px`,
                  top: `${screenY}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPin(pin);
                  setNewCommentCoord(null);
                }}
                className="pointer-events-auto cursor-pointer group animate-in zoom-in-75 duration-200"
              >
                <div
                  className={`relative flex items-center gap-1 px-2.5 py-1 rounded-full shadow-lg border-2 transition-all ${
                    pin.resolved
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 opacity-80'
                      : isSelected
                      ? 'bg-purple-600 border-white text-white scale-110 ring-4 ring-purple-300'
                      : 'bg-white border-purple-500 text-purple-900 hover:scale-105'
                  }`}
                  title={`${pin.authorName}: ${pin.content.slice(0, 40)}...`}
                >
                  <span className="text-xs">💬</span>
                  <span className="text-[10px] font-bold font-mono">
                    {pin.resolved ? '✓' : index + 1}
                  </span>
                  {!pin.resolved && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Comment Card / Popover */}
        {(selectedPin || newCommentCoord) && (
          <WhiteboardCommentCard
            pin={selectedPin}
            newPinCoord={newCommentCoord}
            screenPos={
              selectedPin
                ? {
                    x: selectedPin.x * zoom + panOffset.x,
                    y: selectedPin.y * zoom + panOffset.y,
                  }
                : newCommentCoord
                ? {
                    x: newCommentCoord.x * zoom + panOffset.x,
                    y: newCommentCoord.y * zoom + panOffset.y,
                  }
                : { x: 200, y: 200 }
            }
            onClose={() => {
              setSelectedPin(null);
              setNewCommentCoord(null);
            }}
            onSubmitNewComment={handleCreateComment}
            onToggleResolve={handleToggleResolveComment}
            onAddReply={handleAddReplyToComment}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Global Window Dragging Handler for Sticky Notes */}
      {draggingStickyId && (
        <div
          onPointerMove={(e) => {
            const worldPos = screenToWorld(e.clientX, e.clientY);
            const newX = Math.round(worldPos.x - dragOffsetRef.current.x);
            const newY = Math.round(worldPos.y - dragOffsetRef.current.y);

            const updated = elementsRef.current.map((el) =>
              el.id === draggingStickyId ? { ...el, x: newX, y: newY } : el
            );
            elementsRef.current = updated;
            setElements(updated);
          }}
          onPointerUp={() => {
            setDraggingStickyId(null);
            commitToHistory(elementsRef.current);
            if (elementsArrayRef.current && ydocRef.current) {
              ydocRef.current.transact(() => {
                const arr = elementsArrayRef.current!;
                arr.delete(0, arr.length);
                arr.push(elementsRef.current);
              });
            }
          }}
          className="fixed inset-0 z-50 cursor-grabbing"
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODALS */}
      <BrainstormWorkshopModal
        isOpen={workshopModalOpen}
        onClose={() => setWorkshopModalOpen(false)}
        currentStepId={currentStepId}
        setCurrentStepId={setCurrentStepId}
        timerSeconds={timerSeconds}
        setTimerSeconds={setTimerSeconds}
        isTimerRunning={isTimerRunning}
        setIsTimerRunning={setIsTimerRunning}
        onStartVotingShortcut={() => setVotingModalOpen(true)}
        onBatchCreateTasks={handleBatchCreateTasksFromTopStickies}
        onExportToWiki={handleExportWorkshopToWiki}
      />

      <VotingSessionModal
        isOpen={votingModalOpen}
        onClose={() => setVotingModalOpen(false)}
        session={votingSession}
        onStartSession={handleStartVoting}
        onEndSession={handleEndVoting}
        elements={elements}
        currentUserId={currentUser.id}
        onConvertToTask={handleConvertToTask}
      />

      <BulkStickyModal
        isOpen={bulkStickyModalOpen}
        onClose={() => setBulkStickyModalOpen(false)}
        onAddBulkStickies={handleAddBulkStickies}
      />

      <AIBrainstormModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        elements={elements}
        onInsertAIIdeas={handleInsertAIIdeas}
      />

      <TemplatesModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Real In-Canvas Comments Drawer */}
      <WhiteboardCommentsDrawer
        isOpen={commentsDrawerOpen}
        onClose={() => setCommentsDrawerOpen(false)}
        comments={comments}
        activePinId={selectedPin?.id || null}
        onSelectPin={(pinId) => {
          const pin = comments.find((c) => c.id === pinId);
          if (pin) {
            setSelectedPin(pin);
            setPanOffset({
              x: window.innerWidth / 2 - pin.x * zoom,
              y: window.innerHeight / 2 - pin.y * zoom,
            });
          }
        }}
        onToggleResolve={handleToggleResolveComment}
        onAddReply={handleAddReplyToComment}
        onDeleteComment={(pinId) => {
          const next = comments.filter((c) => c.id !== pinId);
          saveComments(next);
          if (selectedPin?.id === pinId) setSelectedPin(null);
          showToast('Đã xóa bình luận khỏi bảng vẽ!');
        }}
        currentUser={currentUser}
        boardTitle={WHITEBOARD_BOARDS.find((b) => b.id === activeBoard)?.title || 'Bảng Trắng Brainstorm'}
      />
    </div>
  );
}
