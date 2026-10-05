'use client';

import React from 'react';
import { TaskPriority, TaskColumn } from './types';

export const getPriorityBadge = (priority: TaskPriority) => {
  switch (priority) {
    case 'urgent':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Khẩn cấp
        </span>
      );
    case 'high':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Ưu tiên cao
        </span>
      );
    case 'normal':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
          Bình thường
        </span>
      );
    case 'low':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 text-zinc-600">
          Thấp
        </span>
      );
  }
};
