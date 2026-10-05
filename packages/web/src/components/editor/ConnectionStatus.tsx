'use client';

import React from 'react';
import { ConnectionStatus } from '@collab/shared';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
  isSynced: boolean;
}

export function ConnectionStatusBadge({ status, isSynced }: ConnectionStatusBadgeProps) {
  let badgeColor = 'bg-gray-100 text-gray-700 border-gray-300';
  let dotColor = 'bg-gray-400';
  let label = 'Offline (IndexedDB Active)';
  let icon = <WifiOff className="w-3.5 h-3.5 text-gray-500" />;

  if (status === 'CONNECTED') {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
    label = isSynced ? 'Live Sync' : 'Synchronizing...';
    icon = <Wifi className="w-3.5 h-3.5 text-emerald-600" />;
  } else if (status === 'RECONNECTING') {
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500 animate-pulse';
    label = 'Reconnecting (Backoff Jitter)';
    icon = <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />;
  } else if (status === 'CONNECTING') {
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500 animate-pulse';
    label = 'Connecting...';
    icon = <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeColor}`}
      title={`Connection state: ${status}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {icon}
      <span>{label}</span>
    </div>
  );
}
