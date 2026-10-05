'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CollaborativeSpreadsheet } from '../../../components/sheet/CollaborativeSpreadsheet';
import { getCollaboratorColor } from '@collab/shared';

export default function SheetPage() {
  const params = useParams();
  const sheetId = Array.isArray(params.id) ? params.id[0] : (params.id as string) || 'sheet_fin_q4';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-gray-500">
        Khởi tạo phiên làm việc bảng tính trực tuyến...
      </div>
    );
  }

  const getSheetTitle = (id: string) => {
    if (typeof window !== 'undefined') {
      const customTitle = localStorage.getItem(`collab_sheet_title_${id}`);
      if (customTitle) return customTitle;
    }
    if (id === 'sheet_budget_2027') return 'Bảng Kế Hoạch Phân Bổ Ngân Sách Dự Án Năm 2027';
    if (id === 'sheet_kpi_metrics') return 'Bảng Theo Dõi KPI & Hiệu Suất Cụm Máy Chủ Staging';
    if (id === 'sheet_fin_q4') return 'Bảng Tính Dự Báo Tài Chính & Doanh Thu Q4-2026';
    return `Bảng Tính ${id.replace(/_/g, ' ')}`;
  };

  return (
    <CollaborativeSpreadsheet
      sheetId={sheetId}
      sheetTitle={getSheetTitle(sheetId)}
      currentUser={user}
    />
  );
}
