import { useState, useEffect, useRef } from 'react';

export function useMeetingsState(showToast: (msg: string) => void, onInviteMsg?: (roomTitle: string, code: string) => void) {
  const [activeMeetSession, setActiveMeetSession] = useState<{
    roomTitle: string;
    roomCode: string;
    isAudioOnly?: boolean;
  } | null>(null);

  const [meetInputCode, setMeetInputCode] = useState('');
  const [newMeetingDropdownOpen, setNewMeetingDropdownOpen] = useState(false);

  const [meetingViewMode, setMeetingViewMode] = useState<'grid' | 'speaker' | 'screenshare' | 'whiteboard'>('grid');
  const [isHuddleActive, setIsHuddleActive] = useState(false);
  const [isHuddleMuted, setIsHuddleMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoMeetingActive, setIsVideoMeetingActive] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoCamOn, setIsVideoCamOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isLiveCaptionsOn, setIsLiveCaptionsOn] = useState(true);
  const [meetingSidePanel, setMeetingSidePanel] = useState<'none' | 'chat' | 'participants' | 'notes' | 'whiteboard'>('chat');
  const [inMeetingChatInput, setInMeetingChatInput] = useState('');
  const [inMeetingChatMessages, setInMeetingChatMessages] = useState<
    { sender: string; time: string; text: string; isSelf: boolean }[]
  >([
    { sender: 'Alice Tech', time: '10:04', text: 'Chào mọi người! Hôm nay chúng ta rà soát lại thông lượng CRDT.', isSelf: false },
    { sender: 'Trần Thị Linh', time: '10:05', text: 'Slide kiến trúc mình đã ghim trên bảng trắng nhé.', isSelf: false },
  ]);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const [breakoutModalOpen, setBreakoutModalOpen] = useState(false);
  const [activeBreakoutRoomId, setActiveBreakoutRoomId] = useState<string | null>(null);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('Họp Rà Soát Sprint & Kiến Trúc CRDT');
  const [scheduleDate, setScheduleDate] = useState('2026-10-04');
  const [scheduleTime, setScheduleTime] = useState('14:30');
  const [scheduleDuration, setScheduleDuration] = useState('45');

  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
  const [aiMeetingSummary, setAiMeetingSummary] = useState<{
    decisions: string[];
    actionItems: { task: string; owner: string; deadline: string }[];
  } | null>({
    decisions: [
      'Thống nhất giải pháp nén trạng thái Yjs State Vector Compaction để tối ưu tải WebSocket khi có 500 kết nối đồng thời.',
      'Đồng bộ toàn bộ tokens màu sắc từ Figma sang Tailwind CSS trước thứ Sáu tuần này.',
      'Kích hoạt cơ chế gom thông báo (Smart Digest) để bảo vệ sự tập trung cho đội ngũ kỹ thuật.',
    ],
    actionItems: [
      { task: 'Hoàn thiện bản kiểm thử hội tụ CRDT trên môi trường staging', owner: 'Lê Hoàng', deadline: '03/10/2026' },
      { task: 'Bổ sung bảng đo lường jitter mạng 4G di động trong RFC v4', owner: 'Alice Tech', deadline: '04/10/2026' },
      { task: 'Rà soát tài liệu hướng dẫn giao tiếp nhóm và chia sẻ cho đối tác TechCorp', owner: 'Trần Thị Linh', deadline: '05/10/2026' },
    ],
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#2563eb');
  const [drawLineWidth, setDrawLineWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  // Camera & Mic Media Stream Handler
  useEffect(() => {
    if (isVideoMeetingActive && isVideoCamOn) {
      if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: !isVideoMuted })
          .then((stream) => {
            localStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          })
          .catch((err) => {
            console.warn('Webcam permission not granted or available in this context:', err);
          });
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoMeetingActive, isVideoCamOn, isVideoMuted]);

  // Screen share handler
  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices?.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = stream;
          if (screenShareVideoRef.current) {
            screenShareVideoRef.current.srcObject = stream;
          }
          setIsScreenSharing(true);
          setMeetingViewMode('screenshare');
          showToast('Đang chia sẻ màn hình trực tiếp!');

          stream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            setMeetingViewMode('grid');
            screenStreamRef.current = null;
            showToast('Đã dừng chia sẻ màn hình.');
          };
        } else {
          setIsScreenSharing(true);
          setMeetingViewMode('screenshare');
          showToast('Bắt đầu chia sẻ màn hình sơ đồ kiến trúc!');
        }
      } catch {
        setIsScreenSharing(true);
        setMeetingViewMode('screenshare');
        showToast('Đang trình diễn màn hình slide kiến trúc hệ thống!');
      }
    } else {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      setMeetingViewMode('grid');
      showToast('Đã kết thúc chia sẻ màn hình.');
    }
  };

  // Recording Timer
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleStopRecording = () => {
    setIsRecording(false);
    setRecordedVideoUrl('#download_recording');
    showToast(`Đã lưu bản ghi cuộc họp (${Math.floor(recordingSeconds / 60)}:${recordingSeconds % 60}) vào Kho Đám Mây!`);
  };

  const handleStartMeeting = (roomTitle: string, roomCode?: string, isAudioOnly: boolean = false) => {
    const code = roomCode || `meet.collab.io/sync-${Date.now().toString().slice(-4)}`;
    setActiveMeetSession({
      roomTitle,
      roomCode: code,
      isAudioOnly,
    });
    if (onInviteMsg) {
      onInviteMsg(roomTitle, code);
    }
    showToast(`Đã mở phòng họp Google Meet: ${roomTitle}`);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = isEraser ? '#ffffff' : drawColor;
    ctx.lineWidth = isEraser ? drawLineWidth * 4 : drawLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showToast('Đã xóa trắng bảng vẽ.');
  };

  const handleSendInMeetingChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inMeetingChatInput.trim()) return;
    const newMsg = {
      sender: 'Nguyễn Văn Nam (Bạn)',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: inMeetingChatInput.trim(),
      isSelf: true,
    };
    setInMeetingChatMessages((prev) => [...prev, newMsg]);
    setInMeetingChatInput('');
  };

  return {
    activeMeetSession,
    setActiveMeetSession,
    meetInputCode,
    setMeetInputCode,
    newMeetingDropdownOpen,
    setNewMeetingDropdownOpen,
    meetingViewMode,
    setMeetingViewMode,
    isHuddleActive,
    setIsHuddleActive,
    isHuddleMuted,
    setIsHuddleMuted,
    isScreenSharing,
    handleToggleScreenShare,
    isVideoMeetingActive,
    setIsVideoMeetingActive,
    isVideoMuted,
    setIsVideoMuted,
    isVideoCamOn,
    setIsVideoCamOn,
    isHandRaised,
    setIsHandRaised,
    isRecording,
    setIsRecording,
    recordingSeconds,
    recordedVideoUrl,
    handleStopRecording,
    isLiveCaptionsOn,
    setIsLiveCaptionsOn,
    meetingSidePanel,
    setMeetingSidePanel,
    inMeetingChatInput,
    setInMeetingChatInput,
    inMeetingChatMessages,
    handleSendInMeetingChat,
    localVideoRef,
    screenShareVideoRef,
    breakoutModalOpen,
    setBreakoutModalOpen,
    activeBreakoutRoomId,
    setActiveBreakoutRoomId,
    scheduleModalOpen,
    setScheduleModalOpen,
    scheduleTitle,
    setScheduleTitle,
    scheduleDate,
    setScheduleDate,
    scheduleTime,
    setScheduleTime,
    scheduleDuration,
    setScheduleDuration,
    floatingReaction,
    setFloatingReaction,
    aiMeetingSummary,
    canvasRef,
    drawColor,
    setDrawColor,
    drawLineWidth,
    setDrawLineWidth,
    isEraser,
    setIsEraser,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    handleStartMeeting,
  };
}
