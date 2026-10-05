'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FigmaDesignCanvas } from '../../../components/design/FigmaDesignCanvas';
import { getCollaboratorColor } from '@collab/shared';

export default function DesignPage() {
  const params = useParams();
  const designId = Array.isArray(params.id) ? params.id[0] : (params.id as string) || 'design_ui_workspace';

  const [user, setUser] = useState<{ id: string; name: string; color: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let storedId = localStorage.getItem('collab_user_id');
    let storedName = localStorage.getItem('collab_user_name');

    if (!storedId) {
      storedId = 'usr_nam';
      localStorage.setItem('collab_user_id', storedId);
    }

    if (!storedName) {
      storedName = 'Nguyễn Văn Nam';
      localStorage.setItem('collab_user_name', storedName);
    }

    const color = getCollaboratorColor(storedId);
    setUser({ id: storedId, name: storedName, color });
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e] text-sm text-zinc-400 font-mono">
        Khởi tạo môi trường thiết kế Figma Design Canvas...
      </div>
    );
  }

  const getDesignTitle = (id: string) => {
    if (typeof window !== 'undefined') {
      const customTitle = localStorage.getItem(`collab_design_title_${id}`);
      if (customTitle) return customTitle;
    }
    if (id === 'design_ui_workspace' || id === 'mockup_ui_canvas') {
      return 'Bản Thiết Kế Trực Quan UI Workspace & Slide Giới Thiệu';
    }
    return `Bản Vẽ Thiết Kế ${id.replace(/_/g, ' ')}`;
  };

  return (
    <FigmaDesignCanvas
      designId={designId}
      designTitle={getDesignTitle(designId)}
      currentUser={user}
    />
  );
}
