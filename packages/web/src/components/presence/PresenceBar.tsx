'use client';

import React, { useState, useEffect } from 'react';
import * as awarenessProtocol from 'y-protocols/awareness';
import { Eye, EyeOff } from 'lucide-react';

export interface PresenceBarProps {
  awareness: awarenessProtocol.Awareness;
  currentUserId: string;
  onFollowUser?: (user: { id: string; name: string; color: string } | null) => void;
  followingUserId?: string | null;
}

interface CollaboratorInfo {
  id: string;
  name: string;
  color: string;
  typing?: boolean;
}

export function PresenceBar({
  awareness,
  currentUserId,
  onFollowUser,
  followingUserId,
}: PresenceBarProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);

  useEffect(() => {
    const updateCollaborators = () => {
      const states = awareness.getStates();
      const usersMap = new Map<string, CollaboratorInfo>();

      states.forEach((state) => {
        if (state.user && state.user.id) {
          usersMap.set(state.user.id, {
            id: state.user.id,
            name: state.user.name || 'Anonymous',
            color: state.user.color || '#2563eb',
            typing: state.typing || false,
          });
        }
      });

      setCollaborators(Array.from(usersMap.values()));
    };

    updateCollaborators();
    awareness.on('change', updateCollaborators);

    return () => {
      awareness.off('change', updateCollaborators);
    };
  }, [awareness]);

  if (collaborators.length === 0) return null;

  return (
    <div className="flex items-center gap-2 font-sans">
      <div className="flex items-center -space-x-1.5 overflow-hidden py-1">
        {collaborators.map((user) => {
          const isMe = user.id === currentUserId;
          const isFollowing = followingUserId === user.id;
          const initials = user.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                if (isMe) return;
                if (onFollowUser) {
                  onFollowUser(isFollowing ? null : user);
                }
              }}
              className={`relative inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold text-white transition-all cursor-pointer shadow-xs ${
                isFollowing
                  ? 'ring-2 ring-blue-500 scale-110 z-20 shadow-md ring-offset-2'
                  : 'ring-2 ring-white hover:scale-115 hover:z-20'
              }`}
              style={{ backgroundColor: user.color }}
              title={
                isMe
                  ? `${user.name} (Bạn)`
                  : `${user.name} - ${
                      isFollowing ? 'Đang theo dõi (Bấm để hủy)' : 'Bấm để theo dõi màn hình (Follow)'
                    }`
              }
            >
              {isFollowing ? <Eye className="w-3.5 h-3.5 text-white" /> : initials}
              {isMe ? (
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
              ) : user.typing ? (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 animate-ping ring-1 ring-white" />
              ) : null}
            </button>
          );
        })}
      </div>

      <span className="text-[11px] font-mono text-zinc-500 font-medium pl-1 hidden sm:inline">
        {collaborators.length} trực tuyến
      </span>
    </div>
  );
}
