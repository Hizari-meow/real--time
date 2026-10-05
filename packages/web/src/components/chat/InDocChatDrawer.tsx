'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import {
  MessageSquare,
  X,
  Send,
  Phone,
  Video,
  ExternalLink,
  Users,
  CheckCheck,
} from 'lucide-react';
import { ZaloMessage, ZaloCallSession } from '../zalo/types';
import { ResilientWebSocketProvider } from '../../lib/yjs-provider';
import { RealtimeCallModal } from '../zalo/RealtimeCallModal';

interface InDocChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  currentUser: { id: string; name: string; color: string };
}

export function InDocChatDrawer({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  currentUser,
}: InDocChatDrawerProps) {
  const [messages, setMessages] = useState<ZaloMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [callSession, setCallSession] = useState<ZaloCallSession | null>(null);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<ResilientWebSocketProvider | null>(null);
  const chatArrayRef = useRef<Y.Array<ZaloMessage> | null>(null);
  const callMapRef = useRef<Y.Map<any> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:8080/ws`;
    const docId = `zalo_room_doc_${documentId}`;

    const awareness = new awarenessProtocol.Awareness(ydoc);
    awareness.setLocalState({
      user: {
        id: currentUser.id,
        name: currentUser.name,
        color: currentUser.color,
      },
    });

    const chatArray = ydoc.getArray<ZaloMessage>('zalo_messages');
    chatArrayRef.current = chatArray;

    const callMap = ydoc.getMap<any>('zalo_call_session');
    callMapRef.current = callMap;

    const provider = new ResilientWebSocketProvider({
      url: wsUrl,
      docId,
      doc: ydoc,
      awareness,
      userId: currentUser.id,
      name: currentUser.name,
      color: currentUser.color,
    });
    providerRef.current = provider;

    const syncMessages = () => {
      setMessages(chatArray.toArray());
    };
    chatArray.observe(syncMessages);
    syncMessages();

    const syncCall = () => {
      const currentCall = callMap.get('current_call') as ZaloCallSession | undefined;
      if (currentCall && (currentCall.status === 'ringing' || currentCall.status === 'connected')) {
        setCallSession(currentCall);
      } else {
        setCallSession(null);
      }
    };
    callMap.observe(syncCall);
    syncCall();

    return () => {
      chatArray.unobserve(syncMessages);
      callMap.unobserve(syncCall);
      provider.destroy();
      ydoc.destroy();
    };
  }, [isOpen, documentId, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputVal.trim();
    if (!text || !chatArrayRef.current) return;

    const msg: ZaloMessage = {
      id: 'zmsg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      roomId: `doc_${documentId}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderColor: currentUser.color,
      type: 'text',
      content: text,
      timestamp: Date.now(),
      reactions: {},
    };

    chatArrayRef.current.push([msg]);
    setInputVal('');
  };

  const handleStartCall = (type: 'audio' | 'video') => {
    if (!callMapRef.current) return;
    const newCall: ZaloCallSession = {
      id: 'call_' + Date.now(),
      roomId: `doc_${documentId}`,
      callerId: currentUser.id,
      callerName: currentUser.name,
      callerColor: currentUser.color,
      callType: type,
      status: 'ringing',
      startedAt: Date.now(),
    };
    callMapRef.current.set('current_call', newCall);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white border-l border-zinc-200/80 shadow-2xl z-40 flex flex-col font-sans animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="h-14 px-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
          <div className="flex items-center gap-2 truncate">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="text-xs font-bold text-zinc-900 truncate">Hội thoại tài liệu</h3>
              <p className="text-[10px] text-zinc-400 truncate">{documentTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleStartCall('audio')}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50 rounded-lg"
              title="Gọi thoại nhanh"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleStartCall('video')}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50 rounded-lg"
              title="Gọi video nhanh"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50 rounded-lg ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/40">
          {messages.length === 0 && (
            <div className="text-center py-8 text-xs text-zinc-400">
              <p className="font-semibold text-zinc-600 mb-1">Chưa có tin nhắn trong tài liệu này</p>
              <p className="text-[11px]">Hãy trao đổi với các đồng nghiệp đang cùng xem và sửa file!</p>
            </div>
          )}

          {messages.map((m) => {
            const isSelf = m.senderId === currentUser.id;
            return (
              <div
                key={m.id}
                className={`flex gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}
              >
                {!isSelf && (
                  <div
                    className="w-6 h-6 rounded-lg text-white font-bold text-[10px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: m.senderColor || '#3b82f6' }}
                  >
                    {m.senderName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div
                  className={`max-w-[78%] p-2.5 rounded-2xl text-xs shadow-xs leading-relaxed ${
                    isSelf
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-white border border-zinc-200 text-zinc-900 rounded-bl-xs'
                  }`}
                >
                  {!isSelf && (
                    <p className="text-[10px] font-semibold text-zinc-400 mb-0.5">
                      {m.senderName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Link to Full Zalo Chat */}
        <div className="px-3 py-1.5 bg-zinc-100/70 border-t border-zinc-200/60 flex items-center justify-between text-[11px] text-zinc-600">
          <span>Hệ thống chat quy mô lớn</span>
          <Link
            href="/chat"
            className="flex items-center gap-1 text-blue-600 hover:underline font-semibold"
          >
            <span>Mở Zalo Chat</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-zinc-200 flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Nhắn tin tới nhóm..."
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Realtime Call Modal inside Doc */}
      <RealtimeCallModal
        callSession={callSession}
        currentUser={currentUser}
        targetName={`Cuộc họp tài liệu: ${documentTitle}`}
        onAcceptCall={() => {
          if (callMapRef.current && callSession) {
            callMapRef.current.set('current_call', {
              ...callSession,
              status: 'connected',
              connectedAt: Date.now(),
            });
          }
        }}
        onDeclineCall={() => {
          if (callMapRef.current && callSession) {
            callMapRef.current.set('current_call', {
              ...callSession,
              status: 'declined',
            });
            setCallSession(null);
          }
        }}
        onEndCall={(secs) => {
          if (callMapRef.current && callSession) {
            callMapRef.current.set('current_call', {
              ...callSession,
              status: 'ended',
              duration: secs,
            });
            setCallSession(null);
          }
        }}
      />
    </>
  );
}
