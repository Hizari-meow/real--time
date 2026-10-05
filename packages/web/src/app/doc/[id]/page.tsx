'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CollaborativeEditor } from '../../../components/editor/CollaborativeEditor';
import { getCollaboratorColor } from '@collab/shared';

export default function DocumentEditorPage() {
  const params = useParams();
  const documentId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const [documentTitle, setDocumentTitle] = useState<string>('Loading document...');
  const [user, setUser] = useState<{ id: string; name: string; color: string } | null>(null);

  // Initialize client user profile
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let storedId = localStorage.getItem('collab_user_id');
    let storedName = localStorage.getItem('collab_user_name');

    if (!storedId) {
      storedId = 'usr_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('collab_user_id', storedId);
    }

    if (!storedName) {
      storedName = 'User ' + storedId.slice(-4);
      localStorage.setItem('collab_user_name', storedName);
    }

    const color = getCollaboratorColor(storedId);
    setUser({ id: storedId, name: storedName, color });
  }, []);

  // Fetch document metadata
  useEffect(() => {
    if (!documentId) return;

    if (documentId === 'doc_rfc_consensus') {
      setDocumentTitle('Báo Cáo Kiến Trúc Đồng Thuận Phân Tán CRDT v4');
      return;
    }

    if (typeof window !== 'undefined') {
      const customTitle = localStorage.getItem(`collab_doc_title_${documentId}`);
      if (customTitle) {
        setDocumentTitle(customTitle);
        return;
      }
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    fetch(`${apiUrl}/documents/${documentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data && data.data.title) {
          setDocumentTitle(data.data.title);
        } else {
          setDocumentTitle(`Tài Liệu ${documentId.slice(0, 8)}`);
        }
      })
      .catch(() => {
        setDocumentTitle(`Tài Liệu ${documentId.slice(0, 8)}`);
      });
  }, [documentId]);

  if (!documentId || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-gray-500">
        Initializing collaborative session...
      </div>
    );
  }

  return (
    <CollaborativeEditor
      documentId={documentId}
      documentTitle={documentTitle}
      user={user}
    />
  );
}
