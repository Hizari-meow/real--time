'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import {
  Send,
  Smile,
  X,
  MessageSquare,
  Sparkles,
  Check,
  CheckCheck,
  CornerDownRight,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { formatTime } from '../../lib/utils';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  } | null;
}

export interface CollaborativeChatProps {
  ydoc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  currentUser: {
    id: string;
    name: string;
    color: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

const EMOJI_PALETTE = ['👍', '❤️', '🎉', '🚀', '👀', '🔥'];

export function CollaborativeChat({
  ydoc,
  awareness,
  currentUser,
  isOpen,
  onClose,
  onUnreadChange,
}: CollaborativeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatArrayRef = useRef<Y.Array<any> | null>(null);

  // Initialize and observe Y.Array for chat messages
  useEffect(() => {
    const chatArray = ydoc.getArray('chat_messages');
    chatArrayRef.current = chatArray;

    const syncMessages = () => {
      const raw = chatArray.toArray() as ChatMessage[];
      setMessages(raw);
    };

    syncMessages();
    chatArray.observe(syncMessages);

    return () => {
      chatArray.unobserve(syncMessages);
    };
  }, [ydoc]);

  // Track unread messages when drawer is closed
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      onUnreadChange?.(0);
    }
  }, [isOpen, onUnreadChange]);

  // Handle new incoming messages
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.senderId !== currentUser.id) {
        setUnreadCount((prev) => {
          const next = prev + 1;
          onUnreadChange?.(next);
          return next;
        });
      }
    }
    // Auto-scroll when open
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isOpen, currentUser.id, onUnreadChange]);

  // Observe Awareness for live typing indicators
  useEffect(() => {
    const handleAwarenessChange = () => {
      const states = awareness.getStates();
      const typers: string[] = [];

      states.forEach((state, clientID) => {
        if (state.user && state.user.id !== currentUser.id && state.typing === true) {
          typers.push(state.user.name || 'Anonymous');
        }
      });

      setTypingUsers(Array.from(new Set(typers)));
    };

    awareness.on('change', handleAwarenessChange);
    return () => {
      awareness.off('change', handleAwarenessChange);
    };
  }, [awareness, currentUser.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Broadcast typing state over awareness
    awareness.setLocalStateField('typing', true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      awareness.setLocalStateField('typing', false);
    }, 1500);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !chatArrayRef.current) return;

    // Reset typing immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    awareness.setLocalStateField('typing', false);

    const newMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderColor: currentUser.color,
      text,
      timestamp: Date.now(),
      reactions: {},
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text.slice(0, 80),
          }
        : null,
    };

    chatArrayRef.current.push([newMessage]);
    setInputText('');
    setReplyingTo(null);
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!chatArrayRef.current) return;

    ydoc.transact(() => {
      const chatArray = chatArrayRef.current!;
      const items = chatArray.toArray() as ChatMessage[];
      const index = items.findIndex((m) => m.id === messageId);
      if (index === -1) return;

      const msg = { ...items[index] };
      const reactions = { ...(msg.reactions || {}) };
      const userList = reactions[emoji] ? [...reactions[emoji]] : [];

      const userIndex = userList.indexOf(currentUser.id);
      if (userIndex > -1) {
        userList.splice(userIndex, 1);
        if (userList.length === 0) {
          delete reactions[emoji];
        } else {
          reactions[emoji] = userList;
        }
      } else {
        userList.push(currentUser.id);
        reactions[emoji] = userList;
      }

      msg.reactions = reactions;
      chatArray.delete(index, 1);
      chatArray.insert(index, [msg]);
    });
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white border-l border-zinc-200/80 shadow-2xl z-40 flex flex-col font-sans transition-all animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 px-4 border-b border-zinc-200/80 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Discussion
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono">
              {messages.length} messages • Real-time CRDT
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-zinc-200/60 text-zinc-500 hover:text-zinc-800 transition-colors"
          title="Close chat (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/30">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3 text-zinc-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-zinc-700">No messages yet</p>
            <p className="text-[11px] text-zinc-400 max-w-[200px] mt-1">
              Start the discussion with collaborators on this document.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Reply preview */}
                {msg.replyTo && (
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400 mb-1 px-1">
                    <CornerDownRight className="w-3 h-3" />
                    <span>Replying to {msg.replyTo.senderName}:</span>
                    <span className="truncate max-w-[140px] italic">"{msg.replyTo.text}"</span>
                  </div>
                )}

                <div className="flex items-end gap-2 max-w-[88%]">
                  {!isMe && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: msg.senderColor }}
                      title={msg.senderName}
                    >
                      {msg.senderName.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="flex flex-col">
                    {!isMe && (
                      <span className="text-[10px] font-medium text-zinc-500 mb-1 px-1">
                        {msg.senderName}
                      </span>
                    )}

                    <div
                      className={`relative px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isMe
                          ? 'bg-zinc-900 text-white rounded-br-sm'
                          : 'bg-white border border-zinc-200/80 text-zinc-800 rounded-bl-sm'
                      }`}
                    >
                      <p className="break-words whitespace-pre-wrap">{msg.text}</p>

                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                          isMe ? 'text-zinc-400' : 'text-zinc-400'
                        }`}
                      >
                        <span>{formatTime(msg.timestamp)}</span>
                        {isMe && <CheckCheck className="w-3 h-3 text-blue-400" />}
                      </div>

                      {/* Quick Hover Emoji Bar */}
                      <div
                        className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white border border-zinc-200 shadow-md rounded-full px-1.5 py-0.5 z-10 ${
                          isMe ? 'right-0' : 'left-0'
                        }`}
                      >
                        {EMOJI_PALETTE.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="hover:scale-125 transition-transform text-xs p-0.5"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setReplyingTo(msg)}
                          className="hover:bg-zinc-100 rounded p-1 text-zinc-500 text-[10px] ml-1"
                          title="Reply"
                        >
                          <CornerDownRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Reactions display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 px-1">
                        {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                          const hasReacted = userIds.includes(currentUser.id);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                                hasReacted
                                  ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span>{userIds.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1.5 text-[11px] text-zinc-400 bg-zinc-50 flex items-center gap-1.5 border-t border-zinc-100">
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
          </span>
          <span>
            {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
          </span>
        </div>
      )}

      {/* Replying banner */}
      {replyingTo && (
        <div className="px-4 py-2 bg-zinc-100/80 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-600">
          <div className="flex items-center gap-2 truncate">
            <CornerDownRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="font-semibold text-zinc-800">{replyingTo.senderName}:</span>
            <span className="truncate italic">"{replyingTo.text}"</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-zinc-200 rounded text-zinc-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input box */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-200 bg-white">
        <div className="relative flex items-center bg-zinc-100 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:bg-white border border-transparent focus-within:border-zinc-300 transition-all">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type a message... (Enter to send)"
            className="flex-1 bg-transparent text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none py-1.5"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="ml-2 p-1.5 rounded-lg bg-zinc-900 text-white disabled:opacity-20 hover:bg-black transition-opacity shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
}
