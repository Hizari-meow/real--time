'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  CheckCircle2,
  FileText,
  ListTodo,
  HelpCircle,
  Copy,
  Check,
  Bot,
  ArrowRight,
} from 'lucide-react';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertText?: (text: string) => void;
  onCreateTask?: (taskTitle: string, assigneeName?: string) => void;
}

interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  suggestedTasks?: { title: string; assignee: string }[];
  templateSnippet?: string;
  timestamp: number;
}

export function AICopilotDrawer({
  isOpen,
  onClose,
  onInsertText,
  onCreateTask,
}: AICopilotDrawerProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content:
        'Xin chào! Tôi là Trợ lý AI Đồng hành (Copilot) cho Nền tảng Cộng tác & Chat. Bạn cần hỗ trợ tóm tắt thảo luận, trích xuất việc cần làm hay soạn thảo tài liệu?',
      timestamp: Date.now(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickAction = (type: 'summary' | 'extract_tasks' | 'prd_template' | 'meeting_notes') => {
    setIsProcessing(true);

    setTimeout(() => {
      let responseMsg: CopilotMessage;

      if (type === 'summary') {
        responseMsg = {
          id: 'res_' + Date.now(),
          sender: 'assistant',
          content:
            '📌 **Tóm tắt thảo luận cốt lõi**:\n\n1. **Kiến trúc hệ thống**: Cụm 2 node WebSocket Gateway kết hợp Redis Pub/Sub đã sẵn sàng chịu tải hàng chục nghìn kết nối với độ trễ < 50ms.\n2. **Giao diện & Trải nghiệm**: Giao diện Chat đã được chuẩn hóa theo bảng màu Zinc & White SaaS thanh lịch, hoàn toàn hài hòa với Document Editor.\n3. **Gọi thời gian thực**: Đã tích hợp đầy đủ tính năng chuông reo Web Audio, media stream webcam/mic, chia sẻ màn hình và chế độ thu nhỏ PiP.\n4. **Nền tảng 2 trong 1**: Bảng công việc Kanban và Bảng trắng sáng tạo đã được liên kết trực tiếp với phòng chat.',
          timestamp: Date.now(),
        };
      } else if (type === 'extract_tasks') {
        responseMsg = {
          id: 'res_' + Date.now(),
          sender: 'assistant',
          content:
            '📋 **Đã trích xuất 3 công việc (Action Items) từ thảo luận gần nhất**:\n\nBạn có thể nhấp để thêm ngay vào Bảng Kanban:',
          suggestedTasks: [
            { title: 'Tối ưu hóa băng thông truyền luồng video khi gọi nhóm', assignee: 'Nguyễn Văn Nam' },
            { title: 'Thêm bộ lọc nhãn và xuất báo cáo tiến độ Sprint', assignee: 'Trần Thị Mai' },
            { title: 'Cấu hình cảnh báo tự động khi Redis cluster đạt ngưỡng 80% RAM', assignee: 'Alice (Kiến trúc sư)' },
          ],
          timestamp: Date.now(),
        };
      } else if (type === 'prd_template') {
        const template = `# TÀI LIỆU YÊU CẦU SẢN PHẨM (PRD)

## 1. Tổng quan & Mục tiêu
- **Tên dự án**: Nền tảng Cộng tác Thời gian thực & Chat Doanh nghiệp Quy mô lớn.
- **Mục tiêu**: Hợp nhất soạn thảo văn bản, quản lý công việc và trao đổi tức thời vào một không gian duy nhất.

## 2. Các tính năng cốt lõi (Core Features)
- Soạn thảo đồng thời không xung đột với CRDT Yjs.
- Bảng Kanban trực quan đồng bộ tức thì.
- Bảng trắng động não sáng tạo với Sticky notes & Live cursors.
- Gọi thoại & video thời gian thực hỗ trợ PiP.

## 3. Tiêu chí nghiệm thu (Acceptance Criteria)
- Độ trễ đồng bộ < 100ms.
- Chịu lỗi phân tán (Fault tolerant) không có điểm chết duy nhất.`;

        responseMsg = {
          id: 'res_' + Date.now(),
          sender: 'assistant',
          content: '✍️ **Đã soạn thảo khung Tài liệu PRD chuẩn doanh nghiệp**:',
          templateSnippet: template,
          timestamp: Date.now(),
        };
      } else {
        const notes = `# BIÊN BẢN CUỘC HỌP DỰ ÁN (MEETING NOTES)

- **Thời gian**: ${new Date().toLocaleDateString('vi-VN')}
- **Thành phần tham gia**: Nguyễn Văn Nam, Trần Thị Mai, Alice, Bob
- **Chủ đề**: Tích hợp nền tảng 2 trong 1

### 1. Nội dung đã trao đổi
- Đánh giá khả năng kết hợp giữa Chat và Workspace.
- Thử nghiệm gọi video và chia sẻ màn hình.

### 2. Quyết định đã thống nhất
- Cho phép chuyển đổi tin nhắn thành task chỉ với 1 click.
- Thêm widget chat trực tiếp vào trang soạn thảo tài liệu.`;

        responseMsg = {
          id: 'res_' + Date.now(),
          sender: 'assistant',
          content: '✍️ **Đã tạo mẫu Biên bản cuộc họp (Meeting Notes)**:',
          templateSnippet: notes,
          timestamp: Date.now(),
        };
      }

      setMessages((prev) => [...prev, responseMsg]);
      setIsProcessing(false);
    }, 400);
  };

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isProcessing) return;

    const userMsg: CopilotMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      content: inputPrompt.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsProcessing(true);

    setTimeout(() => {
      const replyMsg: CopilotMessage = {
        id: 'rep_' + Date.now(),
        sender: 'assistant',
        content: `🤖 **Phản hồi từ Copilot**:\n\nĐã tiếp nhận yêu cầu: "${userMsg.content}". Hệ thống hỗ trợ tự động đồng bộ thay đổi qua mạng CRDT phân tán và liên kết dữ liệu giữa phòng chat, tài liệu văn bản và bảng Kanban.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, replyMsg]);
      setIsProcessing(false);
    }, 500);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-zinc-200/80 shadow-2xl z-50 flex flex-col font-sans animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 px-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
              <span>Trợ Lý AI Đồng Hành (Copilot)</span>
            </h3>
            <p className="text-[10px] text-zinc-400">Tối ưu hóa quy trình cộng tác & chat</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Action Badges */}
      <div className="px-4 py-3 border-b border-zinc-100 bg-white grid grid-cols-2 gap-2">
        <button
          onClick={() => handleQuickAction('summary')}
          className="flex items-center gap-1.5 p-2 rounded-xl bg-blue-50/60 hover:bg-blue-100/70 text-blue-800 text-[11px] font-semibold border border-blue-200/60 transition-colors text-left"
        >
          <Bot className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">Tóm tắt thảo luận</span>
        </button>

        <button
          onClick={() => handleQuickAction('extract_tasks')}
          className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50/60 hover:bg-amber-100/70 text-amber-800 text-[11px] font-semibold border border-amber-200/60 transition-colors text-left"
        >
          <ListTodo className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="truncate">Trích xuất Task</span>
        </button>

        <button
          onClick={() => handleQuickAction('prd_template')}
          className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 text-[11px] font-semibold border border-emerald-200/60 transition-colors text-left"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">Mẫu PRD sản phẩm</span>
        </button>

        <button
          onClick={() => handleQuickAction('meeting_notes')}
          className="flex items-center gap-1.5 p-2 rounded-xl bg-purple-50/60 hover:bg-purple-100/70 text-purple-800 text-[11px] font-semibold border border-purple-200/60 transition-colors text-left"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span className="truncate">Mẫu biên bản họp</span>
        </button>
      </div>

      {/* Messages stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-50/50">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Suggested Action Items list */}
                {msg.suggestedTasks && (
                  <div className="mt-2.5 space-y-1.5">
                    {msg.suggestedTasks.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 truncate">{t.title}</p>
                          <p className="text-[10px] text-zinc-500">Phụ trách: {t.assignee}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (onCreateTask) onCreateTask(t.title, t.assignee);
                            alert(`Đã thêm vào Kanban: "${t.title}"`);
                          }}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shrink-0 transition-colors"
                        >
                          + Thêm task
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Code / Markdown Template snippet */}
                {msg.templateSnippet && (
                  <div className="mt-2.5 p-2.5 bg-zinc-900 text-zinc-100 rounded-xl font-mono text-[10px] relative overflow-x-auto">
                    <button
                      onClick={() => handleCopy(msg.templateSnippet!, msg.id)}
                      className="absolute right-2 top-2 p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors"
                      title="Sao chép"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <pre className="pr-6 whitespace-pre-wrap">{msg.templateSnippet}</pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-blue-600 italic animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Copilot đang phân tích và xử lý...</span>
          </div>
        )}
      </div>

      {/* Input footer */}
      <form onSubmit={handleSendPrompt} className="p-3 bg-white border-t border-zinc-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Hỏi hoặc yêu cầu Copilot..."
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isProcessing}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
