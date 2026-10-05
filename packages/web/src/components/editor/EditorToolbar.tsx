'use client';

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  RemoveFormatting,
  RotateCcw,
  RotateCw,
  MessageSquarePlus,
  ShieldCheck,
  Edit3,
  Eye,
  Lightbulb,
} from 'lucide-react';

export type EditorMode = 'editing' | 'suggesting' | 'viewing';

export interface EditorToolbarProps {
  editor: Editor | null;
  mode?: EditorMode;
  onModeChange?: (mode: EditorMode) => void;
  onToggleComments?: () => void;
  onOpenConflictModal?: () => void;
  commentsCount?: number;
}

export function EditorToolbar({
  editor,
  mode = 'editing',
  onModeChange,
  onToggleComments,
  onOpenConflictModal,
  commentsCount = 0,
}: EditorToolbarProps) {
  if (!editor) return null;

  const isViewing = mode === 'viewing';

  const btnClass = (isActive: boolean, disabled: boolean = false) =>
    `p-1.5 rounded-lg transition-all text-xs flex items-center justify-center ${
      disabled
        ? 'opacity-30 cursor-not-allowed text-zinc-400'
        : isActive
        ? 'bg-zinc-900 text-white font-semibold shadow-xs'
        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
    }`;

  const handleUndo = () => {
    if (!isViewing && editor) {
      editor.commands.undo();
    }
  };

  const handleRedo = () => {
    if (!isViewing && editor) {
      editor.commands.redo();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-zinc-200/80 bg-white sticky top-14 z-20 font-sans shadow-2xs">
      <div className="flex flex-wrap items-center gap-0.5">
        {/* Per-user Undo & Redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={isViewing}
            className={btnClass(false, isViewing)}
            title="Hoàn tác riêng của bạn (Per-user Undo: Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={isViewing}
            className={btnClass(false, isViewing)}
            title="Làm lại riêng của bạn (Per-user Redo: Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-zinc-200 mx-1.5" />

        {/* Text Styles */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={isViewing}
            className={btnClass(editor.isActive('bold'), isViewing)}
            title="In đậm (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={isViewing}
            className={btnClass(editor.isActive('italic'), isViewing)}
            title="In nghiêng (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={isViewing}
            className={btnClass(editor.isActive('strike'), isViewing)}
            title="Gạch ngang (Ctrl+Shift+X)"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={isViewing}
            className={btnClass(editor.isActive('code'), isViewing)}
            title="Mã nội dòng (Ctrl+E)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-zinc-200 mx-1.5" />

        {/* Headings */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            disabled={isViewing}
            className={btnClass(editor.isActive('heading', { level: 1 }), isViewing)}
            title="Tiêu đề 1 (/h1)"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={isViewing}
            className={btnClass(editor.isActive('heading', { level: 2 }), isViewing)}
            title="Tiêu đề 2 (/h2)"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={isViewing}
            className={btnClass(editor.isActive('heading', { level: 3 }), isViewing)}
            title="Tiêu đề 3 (/h3)"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-zinc-200 mx-1.5" />

        {/* Lists & Blocks */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={isViewing}
            className={btnClass(editor.isActive('bulletList'), isViewing)}
            title="Danh sách gạch đầu dòng (/bullet)"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={isViewing}
            className={btnClass(editor.isActive('orderedList'), isViewing)}
            title="Danh sách số (/num)"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={isViewing}
            className={btnClass(editor.isActive('blockquote'), isViewing)}
            title="Khối trích dẫn (/quote)"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            disabled={isViewing}
            className={btnClass(false, isViewing)}
            title="Đường phân cách (/divider)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-zinc-200 mx-1.5" />

        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          disabled={isViewing}
          className={btnClass(false, isViewing)}
          title="Xóa định dạng"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Tools: Mode Switcher, Comments & Conflict Explainer */}
      <div className="flex items-center gap-2">
        {/* Document Mode Selector (Google Docs style) */}
        <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200">
          <button
            type="button"
            onClick={() => onModeChange?.('editing')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === 'editing'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
            title="Chế độ Chỉnh sửa trực tiếp"
          >
            <Edit3 className="w-3 h-3 text-blue-600" />
            <span className="hidden sm:inline">Chỉnh sửa</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange?.('suggesting')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === 'suggesting'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
            title="Chế độ Gợi ý sửa đổi"
          >
            <Lightbulb className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">Gợi ý</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange?.('viewing')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === 'viewing'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
            title="Chế độ Chỉ xem (Không chỉnh sửa)"
          >
            <Eye className="w-3 h-3 text-zinc-600" />
            <span className="hidden sm:inline">Chỉ xem</span>
          </button>
        </div>

        {/* Comments & Tasks Button */}
        {onToggleComments && (
          <button
            type="button"
            onClick={onToggleComments}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-700 transition-colors"
            title="Bình luận & Giao việc trong tài liệu"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Bình luận</span>
            {commentsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                {commentsCount}
              </span>
            )}
          </button>
        )}

        {/* CRDT Conflict Resolution Info Button */}
        {onOpenConflictModal && (
          <button
            type="button"
            onClick={onOpenConflictModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-colors"
            title="Xem cơ chế xử lý xung đột tự động CRDT (Không mất dữ liệu)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden lg:inline">Chống xung đột CRDT</span>
          </button>
        )}
      </div>
    </div>
  );
}
