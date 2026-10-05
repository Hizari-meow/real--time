'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Sparkles,
  Type,
} from 'lucide-react';

export interface SlashCommandMenuProps {
  editor: Editor | null;
}

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: (editor: Editor) => void;
}

export function SlashCommandMenu({ editor }: SlashCommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'text',
      title: 'Text',
      description: 'Start writing with plain paragraph text',
      icon: <Type className="w-4 h-4 text-zinc-600" />,
      action: (ed) => ed.chain().focus().setParagraph().run(),
    },
    {
      id: 'h1',
      title: 'Heading 1',
      description: 'Large section heading',
      icon: <Heading1 className="w-4 h-4 text-blue-600" />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'h2',
      title: 'Heading 2',
      description: 'Medium sub-section heading',
      icon: <Heading2 className="w-4 h-4 text-emerald-600" />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'h3',
      title: 'Heading 3',
      description: 'Small topic heading',
      icon: <Heading3 className="w-4 h-4 text-purple-600" />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'bullet-list',
      title: 'Bulleted List',
      description: 'Create an unorganized list of items',
      icon: <List className="w-4 h-4 text-amber-600" />,
      action: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ordered-list',
      title: 'Numbered List',
      description: 'Create a sequential step-by-step list',
      icon: <ListOrdered className="w-4 h-4 text-cyan-600" />,
      action: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'quote',
      title: 'Quote Block',
      description: 'Highlight a quotation or callout note',
      icon: <Quote className="w-4 h-4 text-rose-600" />,
      action: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'code-block',
      title: 'Code Block',
      description: 'Write code with preformatted monospace blocks',
      icon: <Code className="w-4 h-4 text-indigo-600" />,
      action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'divider',
      title: 'Divider',
      description: 'Visually divide blocks with a clean line',
      icon: <Minus className="w-4 h-4 text-zinc-400" />,
      action: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },
  ];

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (view: any, event: KeyboardEvent) => {
      if (!isOpen) return false;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % commands.length);
        return true;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + commands.length) % commands.length);
        return true;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        executeCommand(commands[selectedIndex]);
        return true;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        return true;
      }

      return false;
    };

    const handleUpdate = () => {
      const { state } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(Math.max(0, from - 1), from, '\n');

      if (textBefore === '/') {
        try {
          const coords = editor.view.coordsAtPos(from);
          const editorElement = editor.view.dom.closest('.editor-container') || document.body;
          const rect = editorElement.getBoundingClientRect();

          setPosition({
            top: coords.bottom - rect.top + 8,
            left: Math.min(coords.left - rect.left, rect.width - 280),
          });
          setIsOpen(true);
          setSelectedIndex(0);
        } catch {
          setIsOpen(false);
        }
      } else if (isOpen && textBefore !== '/') {
        setIsOpen(false);
      }
    };

    editor.on('update', handleUpdate);
    editor.view.dom.addEventListener('keydown', (e) => handleKeyDown(editor.view, e));

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, isOpen, selectedIndex, commands]);

  const executeCommand = (cmd: CommandItem) => {
    if (!editor) return;

    // Delete the trigger character '/'
    const { from } = editor.state.selection;
    editor.commands.deleteRange({ from: Math.max(0, from - 1), to: from });

    cmd.action(editor);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className="absolute z-50 w-64 bg-white rounded-xl shadow-2xl border border-zinc-200/90 py-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 flex items-center justify-between">
        <span>Insert Block</span>
        <span className="font-mono text-[9px]">ESC to cancel</span>
      </div>

      <div className="max-h-64 overflow-y-auto p-1 space-y-0.5">
        {commands.map((cmd, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={cmd.id}
              type="button"
              onClick={() => executeCommand(cmd)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                isSelected ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <div
                className={`p-1.5 rounded-md ${
                  isSelected ? 'bg-white shadow-xs' : 'bg-zinc-100/70'
                }`}
              >
                {cmd.icon}
              </div>
              <div className="flex-1 truncate">
                <p className="text-xs font-semibold leading-none mb-0.5">{cmd.title}</p>
                <p className="text-[10px] text-zinc-400 truncate">{cmd.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
