'use client';

import { useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { ResilientWebSocketProvider } from '../lib/yjs-provider';

export interface UseCollaborativeEditorProps {
  ydoc: Y.Doc;
  provider: ResilientWebSocketProvider | null;
  user: {
    id: string;
    name: string;
    color: string;
  };
  editable?: boolean;
}

export function useCollaborativeEditor({
  ydoc,
  provider,
  user,
  editable = true,
}: UseCollaborativeEditorProps): Editor | null {
  const editor = useEditor(
    {
      editable,
      extensions: [
        StarterKit.configure({
          // Disable native browser history since Collaboration extension handles multi-user conflict-free convergence and undo/redo
          history: false,
        }),
        Collaboration.configure({
          document: ydoc,
        }),
        ...(provider
          ? [
              CollaborationCursor.configure({
                provider,
                user: {
                  name: user.name,
                  color: user.color,
                },
              }),
            ]
          : []),
      ],
      editorProps: {
        attributes: {
          class:
            'prose prose-zinc prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:my-2.5 prose-p:leading-relaxed prose-blockquote:border-l-2 prose-blockquote:border-zinc-900 prose-blockquote:italic prose-blockquote:text-zinc-700 prose-code:bg-zinc-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-xs prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:rounded-xl max-w-none focus:outline-none min-h-[550px] text-zinc-800 font-sans',
        },
      },
    },
    [ydoc, provider, user.name, user.color, editable]
  );

  return editor;
}
