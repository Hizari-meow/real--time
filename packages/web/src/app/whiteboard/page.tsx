'use client';

import React, { Suspense } from 'react';
import { CollaborativeWhiteboard } from '../../components/whiteboard/CollaborativeWhiteboard';

export default function WhiteboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-sm text-zinc-500 font-medium">
          Khởi tạo không gian bảng vẽ trực tuyến...
        </div>
      }
    >
      <CollaborativeWhiteboard />
    </Suspense>
  );
}

