'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  Hand,
  Smile,
  MessageSquare,
  Users,
  Sparkles,
  Layers,
  Eraser,
  PenTool,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  X,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Download,
  Trash2,
  HelpCircle,
  Subtitles,
  MousePointer,
  RotateCcw,
} from 'lucide-react';
import { VideoMeetingParticipant, LiveCaptionItem } from './types';
import { emitDomainEvent } from '../../lib/domain-event-bus';

interface GoogleMeetViewProps {
  roomTitle: string;
  roomCode: string;
  isAudioOnly?: boolean;
  onLeaveMeeting: () => void;
  onShowToast: (msg: string) => void;
}

export const GoogleMeetView: React.FC<GoogleMeetViewProps> = ({
  roomTitle,
  roomCode,
  isAudioOnly = false,
  onLeaveMeeting,
  onShowToast,
}) => {
  // Call controls state
  const [isMicOn, setIsMicOn] = useState(!isAudioOnly);
  const [isVideoOn, setIsVideoOn] = useState(!isAudioOnly);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hasRecordedFile, setHasRecordedFile] = useState(false);

  // Background effects: 'none' | 'blur-low' | 'blur-high' | 'office' | 'library' | 'cyberpunk'
  const [bgEffect, setBgEffect] = useState<'none' | 'blur-low' | 'blur-high' | 'office' | 'library' | 'cyberpunk'>('none');
  const [showBgEffectModal, setShowBgEffectModal] = useState(false);

  // Subtitles / Live Captions
  const [showCaptions, setShowCaptions] = useState(true);
  const [captionLang, setCaptionLang] = useState<'vi' | 'en' | 'ja'>('vi');
  const [currentCaption, setCurrentCaption] = useState<string>(
    'Alice Tech: "Chúng ta cần tối ưu hóa bộ nhớ đệm CRDT cho 500 CCU trước khi mở rộng tải lên cụm Production..."'
  );

  // Remote desktop control
  const [remoteControlState, setRemoteControlState] = useState<'idle' | 'requested' | 'granted'>('idle');
  const [remoteCursorPos, setRemoteCursorPos] = useState({ x: 45, y: 35 });

  // Right sidebar tab: 'chat' | 'people' | 'notes' | 'whiteboard' | 'transcript' | null
  const [activeSidePanel, setActiveSidePanel] = useState<'chat' | 'people' | 'notes' | 'whiteboard' | 'transcript' | null>(null);

  // Floating reactions
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; left: number }[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Breakout Rooms
  const [showBreakoutModal, setShowBreakoutModal] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string>('main');
  const [breakoutCountdown, setBreakoutCountdown] = useState<number>(900); // 15 mins

  // Meeting duration timer
  const [meetingSeconds, setMeetingSeconds] = useState(142); // starts at 02:22

  // In-meeting Chat messages
  const [chatInput, setChatInput] = useState('');
  const [inMeetingMessages, setInMeetingMessages] = useState([
    { id: 'mc_1', sender: 'Alice Tech', time: '10:04', text: 'Chào mọi người! Hôm nay chúng ta rà soát lại thông lượng CRDT.' },
    { id: 'mc_2', sender: 'Trần Thị Linh', time: '10:05', text: 'Slide kiến trúc mình đã ghim sẵn trên màn hình nhé.' },
  ]);

  // AI Meeting Notes & Action Items
  const [aiNotesList, setAiNotesList] = useState([
    { id: 'an_1', text: 'Đồng thuận sử dụng State Vector nén cho giao thức WebSocket', time: '10:06', synced: true },
    { id: 'an_2', text: 'Kiểm thử tải ngưỡng 1,000 kết nối đồng thời trên cụm Staging', time: '10:08', synced: true },
    { id: 'an_3', text: 'Hoàn thiện tài liệu kiến trúc RFC trước ngày mai lúc 17:00', time: '10:11', synced: false },
  ]);

  // Transcript log
  const [transcriptLogs, setTranscriptLogs] = useState([
    { id: 't1', speaker: 'Nguyễn Văn Nam', time: '10:03', text: 'Xin chào mọi người, chúng ta bắt đầu buổi Sprint Review hôm nay.' },
    { id: 't2', speaker: 'Alice Tech', time: '10:04', text: 'Chào Nam. Về phần đồng thuận CRDT, bộ giải quyết xung đột LWW đã vượt qua bài test latency 5ms.' },
    { id: 't3', speaker: 'Trần Thị Linh', time: '10:06', text: 'Tuyệt vời. Phía Product muốn chốt hạn bàn giao cho khách hàng đối tác vào thứ Sáu.' },
    { id: 't4', speaker: 'Lê Hoàng', time: '10:08', text: 'Cụm máy chủ Kubernetes đã sẵn sàng với HPA tự động co giãn từ 2 lên 8 nodes.' },
  ]);

  // Participants list
  const [participants, setParticipants] = useState<VideoMeetingParticipant[]>([
    { id: 'usr_nam', name: 'Nguyễn Văn Nam (Bạn)', color: '#2563eb', role: 'Lead Engineer', isMuted: false, isVideoOn: true, isHandRaised: false },
    { id: 'usr_alice', name: 'Alice Tech', color: '#8b5cf6', role: 'Kiến trúc sư Phần mềm', isMuted: false, isVideoOn: true, isHandRaised: false },
    { id: 'usr_linh', name: 'Trần Thị Linh', color: '#ec4899', role: 'Product Manager', isMuted: false, isVideoOn: true, isHandRaised: false },
    { id: 'usr_hoang', name: 'Lê Hoàng', color: '#f59e0b', role: 'DevOps & SRE Lead', isMuted: true, isVideoOn: false, isHandRaised: false },
  ]);

  // Real Hardware Streams
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasColor, setCanvasColor] = useState('#2563eb');
  const [canvasLineWidth, setCanvasLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasTool, setCanvasTool] = useState<'pen' | 'eraser'>('pen');

  // Adaptive Network metrics (Simulated live WebRTC stats)
  const [networkStats, setNetworkStats] = useState({
    ping: 16,
    jitter: 0.9,
    loss: 0.0,
    bitrate: '2.8 Mbps',
    resolution: '1080p 60fps',
    qualityLevel: 'Xuất sắc',
  });

  // Timer tickers
  useEffect(() => {
    const timer = setInterval(() => {
      setMeetingSeconds((prev) => prev + 1);
      // Small fluctuation for network stats realism
      setNetworkStats((prev) => ({
        ...prev,
        ping: Math.floor(14 + Math.random() * 6),
        jitter: +(0.7 + Math.random() * 0.5).toFixed(1),
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Recording ticker
  useEffect(() => {
    let recTimer: any;
    if (isRecording) {
      recTimer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(recTimer);
  }, [isRecording]);

  // Handle Local Webcam with real getUserMedia
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isVideoOn) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 1280, height: 720 }, audio: isMicOn })
        .then((s) => {
          stream = s;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          // Camera permission denied or not available, fallback seamlessly
        });
    } else {
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const s = localVideoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((track) => track.stop());
        localVideoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoOn, isMicOn]);

  // Handle Real Screen Sharing with getDisplayMedia
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenVideoRef.current && screenVideoRef.current.srcObject) {
        const s = screenVideoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((track) => track.stop());
        screenVideoRef.current.srcObject = null;
      }
      setIsScreenSharing(false);
      onShowToast('Đã dừng chia sẻ màn hình.');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsScreenSharing(true);
        s.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          onShowToast('Đã kết thúc chia sẻ màn hình.');
        };
        setTimeout(() => {
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = s;
          }
        }, 100);
        onShowToast('Đang phát trực tiếp màn hình qua WebRTC HD.');
      } else {
        setIsScreenSharing(true);
        onShowToast('Chế độ chia sẻ slide thuyết trình tương tác được bật.');
      }
    } catch {
      setIsScreenSharing(true);
      onShowToast('Đã bật khung trình chiếu màn hình chia sẻ.');
    }
  };

  // Toggle Hand Raise
  const handleToggleHandRaise = () => {
    setIsHandRaised((prev) => !prev);
    if (!isHandRaised) {
      onShowToast('✋ Bạn đang giơ tay phát biểu!');
    }
  };

  // Spawn Floating Reaction
  const handleSendReaction = (emoji: string) => {
    const id = `re_${Date.now()}_${Math.random()}`;
    const left = Math.floor(25 + Math.random() * 50);
    setFloatingEmojis((prev) => [...prev, { id, emoji, left }]);
    setShowReactionPicker(false);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((r) => r.id !== id));
    }, 2500);
  };

  // Toggle Recording
  const handleToggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordingSeconds(0);
      setHasRecordedFile(false);
      onShowToast('🔴 Đang ghi hình cuộc họp chuẩn HD 1080p...');
    } else {
      setIsRecording(false);
      setHasRecordedFile(true);
      onShowToast(`Đã lưu bản ghi cuộc họp (${Math.floor(recordingSeconds / 60)}:${(recordingSeconds % 60).toString().padStart(2, '0')}).`);
    }
  };

  // Download Recorded Video File
  const handleDownloadRecording = () => {
    const sampleBlob = new Blob(['Collab Workspace Meeting Recording WebM Stream'], { type: 'video/webm' });
    const url = URL.createObjectURL(sampleBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting_recording_${roomCode}_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('Đã tải tệp video cuộc họp (.webm) về máy thành công!');
  };

  // Sync AI Notes to Kanban with two-way linkage
  const handleSyncToKanban = () => {
    try {
      const existingStr = localStorage.getItem('collab_kanban_external_tasks');
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const newTasks = [
        {
          id: `task_meet_${Date.now()}_1`,
          key: `MEET-${Math.floor(10 + Math.random() * 90)}`,
          title: 'Triển khai nén State Vector CRDT trên cụm Staging',
          description: `Việc phát sinh từ biên bản cuộc họp "${roomTitle}" (${roomCode}).`,
          assigneeId: 'usr_nam',
          assigneeName: 'Nguyễn Văn Nam',
          assigneeColor: '#2563eb',
          startDate: new Date().toISOString().slice(0, 10),
          dueDate: '2026-10-06',
          column: 'todo',
          priority: 'urgent',
          sourceRef: {
            type: 'meeting',
            id: roomCode,
            title: roomTitle,
          },
        },
        {
          id: `task_meet_${Date.now()}_2`,
          key: `MEET-${Math.floor(10 + Math.random() * 90)}`,
          title: 'Kiểm thử áp lực 1,000 kết nối đồng thời với WebSocket',
          description: `Việc phát sinh từ biên bản cuộc họp "${roomTitle}" (${roomCode}).`,
          assigneeId: 'usr_hoang',
          assigneeName: 'Lê Hoàng',
          assigneeColor: '#f59e0b',
          startDate: new Date().toISOString().slice(0, 10),
          dueDate: '2026-10-08',
          column: 'todo',
          priority: 'high',
          sourceRef: {
            type: 'meeting',
            id: roomCode,
            title: roomTitle,
          },
        },
      ];
      localStorage.setItem('collab_kanban_external_tasks', JSON.stringify([...existing, ...newTasks]));
      window.dispatchEvent(new CustomEvent('collab_task_created'));
      setAiNotesList((prev) => prev.map((n) => ({ ...n, synced: true })));
      onShowToast('✅ Đã tạo các thẻ việc từ biên bản cuộc họp lên bảng Kanban với liên kết ngược!');
    } catch {
      onShowToast('Đã ghi nhận các việc cần làm.');
    }
  };

  // Leave Call & Auto-conclude AI Meeting Minutes (Flow C)
  const handleLeaveCall = () => {
    try {
      emitDomainEvent('meeting.ended', {
        roomCode,
        roomTitle,
        durationSec: meetingSeconds,
        minutes: '1. Thống nhất áp dụng giải thuật nén State Vector CRDT Yjs.\n2. Duyệt kế hoạch kiểm thử tải 1,000 kết nối đồng thời.\n3. Hạn chót nghiệm thu sản phẩm vào thứ Sáu tuần này.',
        actionItems: [
          { title: 'Triển khai nén State Vector CRDT trên cụm Staging', assignee: 'Nguyễn Văn Nam', priority: 'urgent' },
          { title: 'Kiểm thử áp lực 1,000 kết nối đồng thời với WebSocket', assignee: 'Lê Hoàng', priority: 'high' },
        ],
      });
      onShowToast('✅ Đã lưu biên bản cuộc họp và tự động đăng lên kênh #du-an-alpha!');
    } catch (err) {
      console.warn('Failed to dispatch meeting.ended event', err);
    }
    onLeaveMeeting();
  };

  // In-call Chat Submit
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg = {
      id: `mc_${Date.now()}`,
      sender: 'Nguyễn Văn Nam (Bạn)',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      text: chatInput.trim(),
    };
    setInMeetingMessages((prev) => [...prev, newMsg]);
    setChatInput('');
  };

  // Canvas Whiteboard logic
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    if (canvasTool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 16;
    } else {
      ctx.strokeStyle = canvasColor;
      ctx.lineWidth = canvasLineWidth;
    }
    ctx.lineCap = 'round';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClearCanvas = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onShowToast('Đã xóa trắng bảng vẽ.');
  };

  // Remote Desktop Control Simulator
  const handleRequestRemoteControl = () => {
    if (remoteControlState === 'idle') {
      setRemoteControlState('requested');
      onShowToast('Đang gửi yêu cầu điều khiển từ xa đến Alice Tech...');
      setTimeout(() => {
        setRemoteControlState('granted');
        onShowToast('✅ Alice Tech đã cấp quyền điều khiển màn hình từ xa cho bạn!');
      }, 2000);
    } else {
      setRemoteControlState('idle');
      onShowToast('Đã giải phóng quyền điều khiển từ xa.');
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#202124] text-white flex flex-col select-none overflow-hidden font-sans">
      {/* ---------------------------------------------------- */}
      {/* TOP BAR: Google Meet Header */}
      {/* ---------------------------------------------------- */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-zinc-800 bg-[#202124] shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100 truncate max-w-[240px] sm:max-w-md">
              {roomTitle}
            </h2>
          </div>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(`https://${roomCode}`);
              onShowToast('Đã sao chép liên kết cuộc họp vào bộ nhớ tạm!');
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-colors"
            title="Nhấp để sao chép đường link"
          >
            <span>{roomCode}</span>
            <Copy className="w-3 h-3 text-zinc-400" />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Recording Badge */}
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-600/50 text-rose-300 text-xs font-mono font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>REC {formatTimer(recordingSeconds)}</span>
            </div>
          )}

          {/* Adaptive Bitrate WebRTC Badge */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-[11px] font-mono text-zinc-400"
            title="Chất lượng mạng WebRTC tự động thích ứng"
          >
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>{networkStats.resolution}</span>
            <span className="text-zinc-600">•</span>
            <span>{networkStats.ping}ms</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-semibold">{networkStats.qualityLevel}</span>
          </div>

          {/* Live Meeting Duration */}
          <div className="px-2.5 py-1 rounded-lg bg-zinc-800/50 text-xs font-mono text-zinc-300">
            {formatTimer(meetingSeconds)}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* MAIN STAGE: Video Grid / Screen Share & Side Panel */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden relative p-3 sm:p-4 gap-3">
        {/* Central Video Grid Stage */}
        <div className="flex-1 flex flex-col relative rounded-2xl overflow-hidden bg-black border border-zinc-800/80">
          {/* SCREEN SHARING VIEW (If Screen Sharing is active) */}
          {isScreenSharing ? (
            <div className="flex-1 flex flex-col relative bg-zinc-950">
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-zinc-700 text-xs">
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-zinc-200">Đang phát trực tiếp màn hình • 1080p 60fps</span>
                {remoteControlState === 'granted' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
                    Đã cấp điều khiển từ xa
                  </span>
                )}
              </div>

              {/* Stop Sharing Button */}
              <div className="absolute top-3 right-3 z-20">
                <button
                  onClick={handleToggleScreenShare}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-lg transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Dừng chia sẻ</span>
                </button>
              </div>

              {/* Remote control virtual cursor (If granted) */}
              {remoteControlState === 'granted' && (
                <div
                  className="absolute z-30 pointer-events-none transition-all duration-300 flex items-center gap-1"
                  style={{ top: `${remoteCursorPos.y}%`, left: `${remoteCursorPos.x}%` }}
                >
                  <MousePointer className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-md" />
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 font-bold text-[10px] shadow">
                    Alice Tech
                  </span>
                </div>
              )}

              {/* Video Element or Interactive Architecture Slides */}
              <div className="flex-1 flex items-center justify-center relative p-6">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain rounded-xl"
                />
                {!screenVideoRef.current?.srcObject && (
                  <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                        <FileText className="w-4 h-4" />
                        <span>Kiến Trúc Đồng Thuận CRDT (Slide 3/8)</span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400">Yjs Binary Protocol</span>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-xl font-mono text-xs text-zinc-300 leading-relaxed border border-zinc-800">
                      <p className="text-emerald-400 font-semibold">// Cấu trúc mã hóa State Vector</p>
                      <p>const clientVector = Y.encodeStateVector(doc);</p>
                      <p>const diffUpdate = Y.encodeStateAsUpdate(doc, clientVector);</p>
                      <p className="text-blue-400 mt-2">// Đảm bảo đồng bộ không giật lag &lt; 5ms</p>
                      <p>wsBroadcaster.publish(&apos;crdt-sync-shard-1&apos;, diffUpdate);</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
                      <span>Người trình bày: Nguyễn Văn Nam</span>
                      <button
                        onClick={handleRequestRemoteControl}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 ${
                          remoteControlState === 'granted'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        }`}
                      >
                        <MousePointer className="w-3.5 h-3.5" />
                        <span>{remoteControlState === 'granted' ? 'Hủy quyền điều khiển' : 'Cho phép điều khiển từ xa'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Minimized Participant Tiles at Bottom Right */}
              <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                <div className="w-32 h-20 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden relative shadow-lg">
                  {isVideoOn ? (
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-blue-600">Bạn</div>
                  )}
                  <span className="absolute bottom-1 left-1.5 text-[9px] bg-black/70 px-1 rounded text-white">Bạn</span>
                </div>
                <div className="w-32 h-20 bg-zinc-900 border border-emerald-500 rounded-xl overflow-hidden relative shadow-lg">
                  <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-purple-600">Alice</div>
                  <span className="absolute bottom-1 left-1.5 text-[9px] bg-black/70 px-1 rounded text-emerald-400 font-semibold">Đang nói</span>
                </div>
              </div>
            </div>
          ) : (
            /* 2x2 GOOGLE MEET GRID VIEW */
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-950">
              {/* TILE 1: YOU (LOCAL USER) */}
              <div className="relative rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col justify-between p-3 group transition-all">
                {/* Video or Avatar */}
                {isVideoOn ? (
                  <div className="absolute inset-0 z-0">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${
                        bgEffect === 'blur-low'
                          ? 'filter blur-xs'
                          : bgEffect === 'blur-high'
                          ? 'filter blur-sm'
                          : ''
                      }`}
                    />
                    {bgEffect === 'office' && (
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-950/40 via-transparent to-black/30 pointer-events-none" />
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                    <div className="w-20 h-20 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg ring-4 ring-blue-500/20">
                      N
                    </div>
                    <span className="mt-2 text-xs text-zinc-400 font-medium">Camera đã tắt</span>
                  </div>
                )}

                {/* Top overlay badges */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-zinc-300 backdrop-blur-md">
                    1080p HD
                  </span>
                  {isHandRaised && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400 text-zinc-950 flex items-center gap-1 shadow-md animate-bounce">
                      ✋ Đang giơ tay
                    </span>
                  )}
                  {bgEffect !== 'none' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/80 text-white">
                      Nền: {bgEffect}
                    </span>
                  )}
                </div>

                {/* Bottom overlay: Name and Mic */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl">
                    <span className="text-xs font-semibold text-white block">Nguyễn Văn Nam (Bạn)</span>
                    <span className="text-[10px] text-zinc-400">Lead Engineer</span>
                  </div>
                  <div className={`p-2 rounded-xl backdrop-blur-md ${isMicOn ? 'bg-zinc-800/80 text-emerald-400' : 'bg-rose-900/80 text-rose-300'}`}>
                    {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* TILE 2: Alice Tech (Active Speaker) */}
              <div className="relative rounded-2xl bg-zinc-900 border-2 border-emerald-500 ring-4 ring-emerald-500/20 overflow-hidden flex flex-col justify-between p-3 group transition-all">
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-950">
                  <div className="w-20 h-20 rounded-full bg-purple-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg ring-4 ring-emerald-400/40 animate-pulse">
                    A
                  </div>
                  <div className="flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Đang nói
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-zinc-300 backdrop-blur-md">
                    1080p 60fps
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                    Diễn giả chính
                  </span>
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl">
                    <span className="text-xs font-semibold text-white block">Alice Tech</span>
                    <span className="text-[10px] text-zinc-400">Kiến trúc sư Phần mềm</span>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-800/80 text-emerald-400 backdrop-blur-md">
                    <Mic className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* TILE 3: Trần Thị Linh */}
              <div className="relative rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col justify-between p-3 group transition-all">
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                  <div className="w-20 h-20 rounded-full bg-pink-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg">
                    T
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-zinc-300 backdrop-blur-md">
                    1080p 60fps
                  </span>
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl">
                    <span className="text-xs font-semibold text-white block">Trần Thị Linh</span>
                    <span className="text-[10px] text-zinc-400">Product Manager</span>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-800/80 text-emerald-400 backdrop-blur-md">
                    <Mic className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* TILE 4: Lê Hoàng */}
              <div className="relative rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col justify-between p-3 group transition-all">
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                  <div className="w-20 h-20 rounded-full bg-amber-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg">
                    L
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-zinc-300 backdrop-blur-md">
                    1080p 60fps
                  </span>
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl">
                    <span className="text-xs font-semibold text-white block">Lê Hoàng</span>
                    <span className="text-[10px] text-zinc-400">DevOps &amp; SRE Lead</span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-900/80 text-rose-300 backdrop-blur-md">
                    <MicOff className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------- */}
          {/* FLOATING LIVE CAPTIONS (Phụ đề trực tiếp Google Meet) */}
          {/* -------------------------------------------------- */}
          {showCaptions && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-xl w-full px-4">
              <div className="bg-black/85 backdrop-blur-md border border-zinc-700/80 rounded-2xl px-4 py-2.5 text-center text-xs text-zinc-200 shadow-2xl flex items-center justify-between gap-3">
                <div className="flex-1 text-left truncate">
                  <span className="text-blue-400 font-semibold mr-1">[CC - {captionLang.toUpperCase()}]:</span>
                  <span>{currentCaption}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      const next = captionLang === 'vi' ? 'en' : captionLang === 'en' ? 'ja' : 'vi';
                      setCaptionLang(next);
                      if (next === 'en') {
                        setCurrentCaption('Alice Tech: "We should prioritize benchmark testing CRDT convergence for 500 CCU..."');
                      } else if (next === 'ja') {
                        setCurrentCaption('Alice Tech: "本番環境に拡張する前に、CRDT収束ベンチマークを優先する必要があります..."');
                      } else {
                        setCurrentCaption('Alice Tech: "Chúng ta cần tối ưu hóa bộ nhớ đệm CRDT cho 500 CCU trước khi mở rộng tải lên cụm Production..."');
                      }
                      onShowToast(`Đã chuyển phụ đề sang: ${next.toUpperCase()}`);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300 border border-zinc-700"
                  >
                    Dịch: {captionLang.toUpperCase()}
                  </button>
                  <button
                    onClick={() => setShowCaptions(false)}
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FLOATING EMOJI ANIMATIONS */}
          {floatingEmojis.map((item) => (
            <div
              key={item.id}
              className="absolute bottom-16 pointer-events-none text-3xl animate-in fade-in slide-in-from-bottom-12 duration-1000 z-40"
              style={{ left: `${item.left}%` }}
            >
              {item.emoji}
            </div>
          ))}
        </div>

        {/* ---------------------------------------------------- */}
        {/* INTERACTIVE SIDE-PANEL (Chat / People / AI Notes / Whiteboard / Transcript) */}
        {/* ---------------------------------------------------- */}
        {activeSidePanel && (
          <aside className="w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl shrink-0 z-20 animate-in slide-in-from-right duration-200">
            {/* Side-panel Header */}
            <div className="h-12 px-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeSidePanel === 'chat' && <MessageSquare className="w-4 h-4 text-blue-400" />}
                {activeSidePanel === 'people' && <Users className="w-4 h-4 text-emerald-400" />}
                {activeSidePanel === 'notes' && <Sparkles className="w-4 h-4 text-purple-400" />}
                {activeSidePanel === 'whiteboard' && <PenTool className="w-4 h-4 text-amber-400" />}
                {activeSidePanel === 'transcript' && <FileText className="w-4 h-4 text-cyan-400" />}
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  {activeSidePanel === 'chat'
                    ? 'Tin nhắn trong cuộc họp'
                    : activeSidePanel === 'people'
                    ? `Thành viên (${participants.length})`
                    : activeSidePanel === 'notes'
                    ? 'Biên bản & Việc cần làm (AI)'
                    : activeSidePanel === 'whiteboard'
                    ? 'Bảng trắng chung (Jamboard)'
                    : 'Bản ghi lời thoại (Transcript)'}
                </span>
              </div>
              <button
                onClick={() => setActiveSidePanel(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TAB: CHAT */}
            {activeSidePanel === 'chat' && (
              <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {inMeetingMessages.map((m) => (
                    <div key={m.id} className="bg-zinc-800/80 rounded-xl p-2.5 border border-zinc-700/60">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-zinc-200">{m.sender}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{m.time}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{m.text}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendChatMessage} className="pt-2 border-t border-zinc-800 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Gửi tin nhắn trong cuộc họp..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Gửi
                  </button>
                </form>
              </div>
            )}

            {/* TAB: PEOPLE */}
            {activeSidePanel === 'people' && (
              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="text-xs text-zinc-400">Điều khiển chủ tọa</span>
                  <button
                    onClick={() => {
                      setParticipants((prev) => prev.map((p) => ({ ...p, isMuted: true })));
                      onShowToast('Đã tắt tiếng (Mute All) tất cả thành viên trong cuộc họp.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                  >
                    Tắt tiếng tất cả
                  </button>
                </div>
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-zinc-200 block truncate">{p.name}</span>
                        <span className="text-[10px] text-zinc-400 block truncate">{p.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: AI NOTES & KANBAN */}
            {activeSidePanel === 'notes' && (
              <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3">
                  <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-3 text-xs text-purple-200">
                    <p className="font-semibold flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Tóm tắt cuộc họp tự động bằng AI
                    </p>
                    <p className="text-[11px] text-purple-300/80 leading-relaxed">
                      AI đang ghi âm và tự động trích xuất các quyết định kỹ thuật và việc cần làm theo thời gian thực.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Việc cần làm được AI phát hiện:
                    </span>
                    {aiNotesList.map((note) => (
                      <div key={note.id} className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-start gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${note.synced ? 'text-emerald-400' : 'text-amber-400'}`} />
                        <div className="flex-1 text-xs text-zinc-200 leading-relaxed">
                          {note.text}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                            <span>{note.time}</span>
                            {note.synced && <span className="text-emerald-400 font-semibold">• Đã đồng bộ Kanban</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800">
                  <button
                    onClick={handleSyncToKanban}
                    className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Đưa việc cần làm vào bảng Kanban</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: WHITEBOARD (JAMBOARD) */}
            {activeSidePanel === 'whiteboard' && (
              <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    {['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#ffffff'].map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setCanvasColor(color);
                          setCanvasTool('pen');
                        }}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${
                          canvasColor === color && canvasTool === 'pen' ? 'scale-125 border-white' : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button
                      onClick={() => setCanvasTool('eraser')}
                      className={`p-1 rounded-lg ml-2 ${canvasTool === 'eraser' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
                      title="Cục tẩy"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={handleClearCanvas}
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-400"
                    title="Xóa trắng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 my-2 bg-white rounded-xl overflow-hidden relative shadow-inner cursor-crosshair">
                  <canvas
                    ref={whiteboardCanvasRef}
                    width={350}
                    height={380}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    className="w-full h-full"
                  />
                </div>

                <p className="text-[10px] text-zinc-400 text-center">
                  Bảng vẽ đồng bộ thời gian thực cho mọi thành viên trong cuộc họp.
                </p>
              </div>
            )}

            {/* TAB: TRANSCRIPT */}
            {activeSidePanel === 'transcript' && (
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="text-xs text-zinc-400">Bản ghi lời thoại tự động</span>
                  <button
                    onClick={() => {
                      const text = transcriptLogs.map((t) => `[${t.time}] ${t.speaker}: ${t.text}`).join('\n');
                      navigator.clipboard?.writeText(text);
                      onShowToast('Đã sao chép toàn bộ Transcript vào bộ nhớ tạm!');
                    }}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Sao chép</span>
                  </button>
                </div>
                {transcriptLogs.map((log) => (
                  <div key={log.id} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-400">{log.speaker}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{log.time}</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed bg-zinc-800/40 p-2 rounded-xl border border-zinc-800">
                      {log.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* BOTTOM CONTROL BAR: Authentic Google Meet Style */}
      {/* ---------------------------------------------------- */}
      <footer className="h-20 bg-[#202124] border-t border-zinc-800 px-4 sm:px-8 flex items-center justify-between shrink-0 z-30">
        {/* Left info */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 hidden lg:flex">
          <span className="font-medium text-zinc-200">{roomTitle}</span>
        </div>

        {/* Center Primary Controls */}
        <div className="flex items-center gap-2 sm:gap-3 mx-auto lg:mx-0">
          {/* Mic */}
          <button
            onClick={() => {
              setIsMicOn(!isMicOn);
              onShowToast(!isMicOn ? 'Đã bật Micro.' : 'Đã tắt Micro.');
            }}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isMicOn ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
            title={isMicOn ? 'Tắt Micro (Ctrl + D)' : 'Bật Micro (Ctrl + D)'}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={() => {
              setIsVideoOn(!isVideoOn);
              onShowToast(!isVideoOn ? 'Đã bật Camera.' : 'Đã tắt Camera.');
            }}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isVideoOn ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
            title={isVideoOn ? 'Tắt Camera (Ctrl + E)' : 'Bật Camera (Ctrl + E)'}
          >
            {isVideoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Virtual Background & Blur */}
          <div className="relative">
            <button
              onClick={() => setShowBgEffectModal(!showBgEffectModal)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                bgEffect !== 'none' ? 'bg-blue-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
              }`}
              title="Làm mờ hoặc thay đổi nền ảo"
            >
              <Layers className="w-5 h-5" />
            </button>

            {/* Background Modal Popover */}
            {showBgEffectModal && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-64 bg-zinc-900 border border-zinc-700 rounded-2xl p-3 shadow-2xl space-y-2 z-50">
                <span className="text-xs font-bold text-zinc-200 block border-b border-zinc-800 pb-1.5">
                  Hiệu ứng hình nền ảo
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setBgEffect('none');
                      setShowBgEffectModal(false);
                      onShowToast('Đã tắt hiệu ứng nền ảo.');
                    }}
                    className={`p-2 rounded-xl border text-left ${bgEffect === 'none' ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800'}`}
                  >
                    Mặc định (Không nền)
                  </button>
                  <button
                    onClick={() => {
                      setBgEffect('blur-low');
                      setShowBgEffectModal(false);
                      onShowToast('Đã áp dụng làm mờ nhẹ nền sau lưng.');
                    }}
                    className={`p-2 rounded-xl border text-left ${bgEffect === 'blur-low' ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800'}`}
                  >
                    Làm mờ nhẹ (Soft Blur)
                  </button>
                  <button
                    onClick={() => {
                      setBgEffect('blur-high');
                      setShowBgEffectModal(false);
                      onShowToast('Đã áp dụng làm mờ sâu nền sau lưng.');
                    }}
                    className={`p-2 rounded-xl border text-left ${bgEffect === 'blur-high' ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800'}`}
                  >
                    Làm mờ sâu (Deep Blur)
                  </button>
                  <button
                    onClick={() => {
                      setBgEffect('office');
                      setShowBgEffectModal(false);
                      onShowToast('Đã áp dụng nền ảo: Văn phòng Hiện đại.');
                    }}
                    className={`p-2 rounded-xl border text-left ${bgEffect === 'office' ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800'}`}
                  >
                    Văn phòng hiện đại
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Subtitles CC */}
          <button
            onClick={() => {
              setShowCaptions(!showCaptions);
              onShowToast(!showCaptions ? 'Đã bật Phụ đề trực tiếp (Closed Captions).' : 'Đã tắt Phụ đề.');
            }}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              showCaptions ? 'bg-blue-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
            }`}
            title="Bật/Tắt Phụ đề trực tiếp"
          >
            <Subtitles className="w-5 h-5" />
          </button>

          {/* Raise Hand */}
          <button
            onClick={handleToggleHandRaise}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isHandRaised ? 'bg-amber-400 text-zinc-950 font-bold shadow-lg ring-2 ring-amber-300' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
            }`}
            title="Giơ tay phát biểu"
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Reactions */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="w-11 h-11 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-200 flex items-center justify-center transition-all"
              title="Gửi biểu tượng cảm xúc"
            >
              <Smile className="w-5 h-5" />
            </button>
            {showReactionPicker && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-full px-3 py-2 flex items-center gap-2 shadow-2xl z-50 animate-in zoom-in-90">
                {['❤️', '👍', '👏', '🎉', '🔥', '😂'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="text-xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Screen Share */}
          <button
            onClick={handleToggleScreenShare}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isScreenSharing ? 'bg-blue-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
            }`}
            title="Chia sẻ màn hình"
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Recording */}
          <button
            onClick={handleToggleRecording}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
            }`}
            title={isRecording ? 'Dừng ghi hình cuộc họp' : 'Ghi hình cuộc họp (Record)'}
          >
            <Radio className="w-5 h-5" />
          </button>

          {/* Breakout Rooms */}
          <button
            onClick={() => setShowBreakoutModal(true)}
            className="w-11 h-11 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-200 flex items-center justify-center transition-all hidden sm:flex"
            title="Phòng họp nhóm nhỏ (Breakout rooms)"
          >
            <Users className="w-5 h-5" />
          </button>

          {/* LEAVE CALL BUTTON (Red Google Meet Pill) */}
          <button
            onClick={handleLeaveCall}
            className="h-11 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition-all ml-2"
            title="Rời khỏi cuộc gọi"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Rời phòng</span>
          </button>
        </div>

        {/* Right Utility Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Download recording if finished */}
          {hasRecordedFile && (
            <button
              onClick={handleDownloadRecording}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg"
              title="Tải bản ghi cuộc họp vừa lưu"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Tải bản ghi (.webm)</span>
            </button>
          )}

          {/* Chat Side panel toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'chat' ? null : 'chat')}
            className={`p-2.5 rounded-xl transition-colors ${
              activeSidePanel === 'chat' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Tin nhắn bên lề"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* People list toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'people' ? null : 'people')}
            className={`p-2.5 rounded-xl transition-colors ${
              activeSidePanel === 'people' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Danh sách người tham gia"
          >
            <Users className="w-5 h-5" />
          </button>

          {/* AI Notes toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'notes' ? null : 'notes')}
            className={`p-2.5 rounded-xl transition-colors ${
              activeSidePanel === 'notes' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Biên bản AI & Đồng bộ Kanban"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Whiteboard Jamboard toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'whiteboard' ? null : 'whiteboard')}
            className={`p-2.5 rounded-xl transition-colors ${
              activeSidePanel === 'whiteboard' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Bảng trắng chung"
          >
            <PenTool className="w-5 h-5" />
          </button>

          {/* Transcript toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'transcript' ? null : 'transcript')}
            className={`p-2.5 rounded-xl transition-colors ${
              activeSidePanel === 'transcript' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Bản ghi lời thoại (Transcript)"
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* ---------------------------------------------------- */}
      {/* BREAKOUT ROOMS MODAL */}
      {/* ---------------------------------------------------- */}
      {showBreakoutModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Phòng họp nhóm nhỏ (Breakout Rooms)</h3>
              </div>
              <button onClick={() => setShowBreakoutModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Chia cuộc họp thành các nhóm nhỏ để thảo luận chuyên sâu, sau đó có thể quay lại phòng họp chính.
            </p>

            <div className="space-y-3">
              {/* Main Room */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between ${activeRoomId === 'main' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-800/40'}`}>
                <div>
                  <span className="text-xs font-bold text-white block">Phòng họp chính</span>
                  <span className="text-[11px] text-zinc-400">4 thành viên</span>
                </div>
                {activeRoomId === 'main' ? (
                  <span className="px-2.5 py-1 rounded-full bg-blue-500 text-white text-[11px] font-semibold">Đang ở đây</span>
                ) : (
                  <button
                    onClick={() => {
                      setActiveRoomId('main');
                      onShowToast('Đã quay lại Phòng họp chính.');
                    }}
                    className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-xs text-white"
                  >
                    Vào phòng
                  </button>
                )}
              </div>

              {/* Room 1 */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between ${activeRoomId === 'room_1' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-800/40'}`}>
                <div>
                  <span className="text-xs font-bold text-white block">Phòng 1: Frontend &amp; UI Workspace</span>
                  <span className="text-[11px] text-zinc-400">Trần Thị Linh, Alice Tech</span>
                </div>
                {activeRoomId === 'room_1' ? (
                  <span className="px-2.5 py-1 rounded-full bg-blue-500 text-white text-[11px] font-semibold">Đang ở đây</span>
                ) : (
                  <button
                    onClick={() => {
                      setActiveRoomId('room_1');
                      onShowToast('Đã tham gia Phòng 1: Frontend & UI.');
                    }}
                    className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-xs text-white"
                  >
                    Vào phòng
                  </button>
                )}
              </div>

              {/* Room 2 */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between ${activeRoomId === 'room_2' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-800/40'}`}>
                <div>
                  <span className="text-xs font-bold text-white block">Phòng 2: Backend &amp; CRDT Engine</span>
                  <span className="text-[11px] text-zinc-400">Lê Hoàng</span>
                </div>
                {activeRoomId === 'room_2' ? (
                  <span className="px-2.5 py-1 rounded-full bg-blue-500 text-white text-[11px] font-semibold">Đang ở đây</span>
                ) : (
                  <button
                    onClick={() => {
                      setActiveRoomId('room_2');
                      onShowToast('Đã tham gia Phòng 2: Backend & CRDT Engine.');
                    }}
                    className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-xs text-white"
                  >
                    Vào phòng
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <button
                onClick={() => {
                  setActiveRoomId('main');
                  setShowBreakoutModal(false);
                  onShowToast('Đã thu hồi tất cả thành viên về phòng họp chính!');
                }}
                className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
              >
                Thu hồi tất cả về phòng chính
              </button>
              <button
                onClick={() => setShowBreakoutModal(false)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
