'use client';

import React from 'react';
import { X, Send } from 'lucide-react';
import {
  WorkplaceMessage,
  ThreadReply,
} from '@/components/collaboration/types';

interface ThreadDrawerProps {
  activeThreadMessage: WorkplaceMessage;
  onClose: () => void;
  channelName: string;
  replies: ThreadReply[];
  threadInput: string;
  setThreadInput: (s: string) => void;
  handleSendThreadReply: (e: React.FormEvent) => void;
}

export function ThreadDrawer({
  activeThreadMessage,
  onClose,
  channelName,
  replies,
  threadInput,
  setThreadInput,
  handleSendThreadReply,
}: ThreadDrawerProps) {
  return (
    <div className="w-full md:w-80 border-l border-zinc-200/80 bg-zinc-50/40 flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-200">
      <div className="h-16 px-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
        <div>
          <h3 className="text-xs font-bold text-zinc-900">Chuỗi Trả Lời (Thread)</h3>
          <span className="text-[10px] text-zinc-400 font-mono">#{channelName}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="p-3 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-900">{activeThreadMessage.senderName}</span>
            <span className="text-[10px] text-zinc-400 font-mono">Gốc</span>
          </div>
          <p className="text-xs text-zinc-700">{activeThreadMessage.content}</p>
        </div>

        <div className="relative flex items-center justify-center py-1">
          <div className="border-t border-zinc-200 w-full" />
          <span className="bg-zinc-100 px-2 text-[10px] font-bold text-zinc-400 absolute">
            {replies.length} phản hồi
          </span>
        </div>

        <div className="space-y-2">
          {replies.map((rep) => (
            <div key={rep.id} className="p-2.5 bg-white rounded-xl border border-zinc-200/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800">{rep.senderName}</span>
                <span className="text-[9px] text-zinc-400 font-mono">
                  {new Date(rep.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-zinc-700">{rep.content}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSendThreadReply} className="p-3 border-t border-zinc-200 bg-white">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={threadInput}
            onChange={(e) => setThreadInput(e.target.value)}
            placeholder="Trả lời trong thread..."
            className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            disabled={!threadInput.trim()}
            className="p-1.5 bg-blue-600 text-white rounded-xl disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
