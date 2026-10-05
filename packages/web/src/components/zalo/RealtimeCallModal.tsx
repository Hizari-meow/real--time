'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Video,
  Mic,
  MicOff,
  VideoOff,
  ScreenShare,
  Minimize2,
  Maximize2,
  Users,
  Volume2,
  Sparkles,
  PhoneOff,
  X,
} from 'lucide-react';
import { ZaloCallSession, ZaloUser } from './types';

interface RealtimeCallModalProps {
  callSession: ZaloCallSession | null;
  currentUser: ZaloUser;
  targetName: string;
  onAcceptCall: () => void;
  onDeclineCall: () => void;
  onEndCall: (durationSecs: number) => void;
}

export const RealtimeCallModal: React.FC<RealtimeCallModalProps> = ({
  callSession,
  currentUser,
  targetName,
  onAcceptCall,
  onDeclineCall,
  onEndCall,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const isCaller = callSession?.callerId === currentUser.id;
  const isConnected = callSession?.status === 'connected';
  const isRinging = callSession?.status === 'ringing';

  // 1. Ringing sound simulation via Web Audio API
  useEffect(() => {
    let oscillator: OscillatorNode | null = null;
    let gainNode: GainNode | null = null;
    let ringInterval: NodeJS.Timeout | null = null;

    if (isRinging) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;

          const playBeep = () => {
            if (ctx.state === 'suspended') ctx.resume();
            oscillator = ctx.createOscillator();
            gainNode = ctx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(isCaller ? 440 : 480, ctx.currentTime);

            gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.6);
          };

          playBeep();
          ringInterval = setInterval(playBeep, 2000);
        }
      } catch (err) {
        console.warn('Web Audio ringing tone not supported or blocked:', err);
      }
    }

    return () => {
      if (ringInterval) clearInterval(ringInterval);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isRinging, isCaller]);

  // 2. Call duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnected) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isConnected]);

  // 3. User Media Stream (Webcam & Microphone)
  useEffect(() => {
    let active = true;

    async function initMedia() {
      if (isConnected && callSession?.callType === 'video') {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
            if (!active) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            streamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          }
        } catch (err) {
          console.warn('Camera/Microphone permission denied or not available:', err);
        }
      }
    }

    initMedia();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((t) => t.stop());
        displayStreamRef.current = null;
      }
    };
  }, [isConnected, callSession?.callType]);

  // Toggle Mute
  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  };

  // Toggle Video
  const handleToggleVideo = () => {
    setIsVideoOff((prev) => !prev);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  };

  // Toggle Screen Sharing
  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          displayStreamRef.current = displayStream;
          setIsScreenSharing(true);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = displayStream;
          }
          displayStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            if (localVideoRef.current && streamRef.current) {
              localVideoRef.current.srcObject = streamRef.current;
            }
          };
        }
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    } else {
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((t) => t.stop());
        displayStreamRef.current = null;
      }
      setIsScreenSharing(false);
      if (localVideoRef.current && streamRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
    }
  };

  const handleEnd = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    onEndCall(callDuration);
  };

  const formatSecs = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (!callSession || callSession.status === 'idle' || callSession.status === 'ended') {
    return null;
  }

  // ==============================================================
  // A. INCOMING CALL DIALOG (When someone is calling you)
  // ==============================================================
  if (isRinging && !isCaller) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl animate-pulse ring-4 ring-emerald-500/20"
              style={{ backgroundColor: callSession.callerColor || '#18181b' }}
            >
              {callSession.callerName.slice(0, 1).toUpperCase()}
            </div>
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-sm">
              {callSession.callType === 'video' ? (
                <Video className="w-3.5 h-3.5" />
              ) : (
                <Phone className="w-3.5 h-3.5" />
              )}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-zinc-900">{callSession.callerName}</h3>
            <p className="text-xs text-zinc-500 mt-1 font-mono">
              Cuộc gọi {callSession.callType === 'video' ? 'video' : 'thoại'} đến...
            </p>
          </div>

          {/* Accept / Decline Action Buttons */}
          <div className="flex items-center justify-center gap-8 pt-2">
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={onDeclineCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
                title="Từ chối cuộc gọi"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <span className="text-[11px] font-semibold text-zinc-500">Từ chối</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={onAcceptCall}
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 animate-bounce"
                title="Trả lời cuộc gọi"
              >
                <Phone className="w-6 h-6" />
              </button>
              <span className="text-[11px] font-semibold text-zinc-500">Trả lời</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // B. OUTGOING RINGING SCREEN (When you are calling someone)
  // ==============================================================
  if (isRinging && isCaller) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <div className="w-24 h-24 rounded-full bg-zinc-900 text-white flex items-center justify-center text-3xl font-bold shadow-xl animate-pulse ring-4 ring-zinc-900/10">
              {targetName.slice(0, 1).toUpperCase()}
            </div>
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white shadow-sm">
              {callSession.callType === 'video' ? (
                <Video className="w-3.5 h-3.5" />
              ) : (
                <Phone className="w-3.5 h-3.5" />
              )}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-zinc-900">{targetName}</h3>
            <p className="text-xs text-zinc-500 mt-1 font-mono">
              Đang đổ chuông trực tiếp...
            </p>
          </div>

          <div className="flex items-center justify-center pt-2">
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={handleEnd}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
                title="Hủy cuộc gọi"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <span className="text-[11px] font-semibold text-zinc-500">Hủy</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // C. MINIMIZED PICTURE-IN-PICTURE (PiP) CORNER WIDGET
  // ==============================================================
  if (isMinimized && isConnected) {
    return (
      <div className="fixed bottom-6 right-6 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col font-sans animate-in slide-in-from-bottom-4 text-white">
        <div className="h-10 px-3 bg-zinc-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold truncate">{targetName}</span>
            <span className="font-mono text-[10px] text-zinc-400">{formatSecs(callDuration)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700"
              title="Phóng to toàn màn hình"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleEnd}
              className="p-1 rounded-md text-rose-400 hover:text-white hover:bg-rose-600"
              title="Kết thúc"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="h-28 bg-black relative flex items-center justify-center">
          {callSession.callType === 'video' && !isVideoOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-zinc-400">
              <div className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center font-bold text-sm">
                {targetName.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-[10px] font-mono">Đang kết nối âm thanh</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==============================================================
  // D. FULL ACTIVE CONNECTED CALL SCREEN
  // ==============================================================
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in zoom-in-95 text-white font-sans">
      {/* Top Bar: Room Title, Timer, Minimize */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center font-bold text-sm">
            {targetName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <span>{targetName}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold">
                {callSession.callType === 'video' ? 'VIDEO HD' : 'VOICE HD'}
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Thời gian gọi: <span className="text-white font-bold">{formatSecs(callDuration)}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsMinimized(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
          title="Thu nhỏ thành cửa sổ nổi ở góc màn hình"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Thu nhỏ</span>
        </button>
      </div>

      {/* Center Video / Audio Grid Stage */}
      <div className="flex-1 my-4 flex items-center justify-center relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/40">
        {/* Remote participant main view */}
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-4">
            <div className="w-28 h-28 rounded-3xl bg-zinc-800 border-2 border-zinc-700 text-white flex items-center justify-center text-4xl font-bold shadow-2xl">
              {targetName.slice(0, 1).toUpperCase()}
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-zinc-900 flex items-center justify-center">
              <Volume2 className="w-3 h-3 text-white" />
            </span>
          </div>

          <h4 className="text-base font-bold text-white">{targetName}</h4>
          <p className="text-xs text-zinc-400 font-mono mt-1">Đang nói chuyện...</p>

          {/* Dynamic Audio Visualizer Waves */}
          <div className="flex items-center gap-1 h-8 mt-4">
            {[10, 18, 28, 14, 24, 32, 16, 26, 12, 20].map((h, idx) => (
              <span
                key={idx}
                className="w-1 bg-emerald-400 rounded-full animate-pulse"
                style={{
                  height: `${h}px`,
                  animationDuration: `${0.4 + (idx % 4) * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Local user self preview (Picture-in-Picture inside call) */}
        {callSession.callType === 'video' && (
          <div className="absolute top-4 right-4 w-40 sm:w-56 h-28 sm:h-36 rounded-2xl overflow-hidden border-2 border-zinc-700 shadow-2xl bg-black">
            {!isVideoOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900">
                <VideoOff className="w-6 h-6 mb-1" />
                <span className="text-[10px]">Camera đã tắt</span>
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[9px] font-semibold text-white">
              Bạn {isScreenSharing ? '(Đang chia sẻ)' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar (Mute, Camera, Screen Share, End) */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 py-2">
        {/* Mute Button */}
        <button
          onClick={handleToggleMute}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            isMuted
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
          }`}
          title={isMuted ? 'Bật Mic' : 'Tắt Mic'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video Toggle Button (for video calls) */}
        {callSession.callType === 'video' && (
          <button
            onClick={handleToggleVideo}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isVideoOff
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
            }`}
            title={isVideoOff ? 'Mở Camera' : 'Tắt Camera'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
        )}

        {/* Screen Share Button */}
        <button
          onClick={handleToggleScreenShare}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            isScreenSharing
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
          }`}
          title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
        >
          <ScreenShare className="w-5 h-5" />
        </button>

        {/* End Call Button */}
        <button
          onClick={handleEnd}
          className="w-14 h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 transition-transform active:scale-95"
          title="Kết thúc cuộc gọi"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
