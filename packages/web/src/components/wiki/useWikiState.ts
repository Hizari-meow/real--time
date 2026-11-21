import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { WikiPage } from './types';

export function useWikiState() {
  const { user, workspace, token } = useAuth();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [tree, setTree] = useState<any[]>([]);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [backlinks, setBacklinks] = useState<any[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<WikiPage | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const getHeaders = useCallback(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    if (workspace?.orgId) h['x-workspace-id'] = workspace.orgId;
    return h;
  }, [token, workspace]);

  // Load all wiki pages, tree and tags
  const loadWikiData = useCallback(async () => {
    if (!token && !workspace) return;
    setLoading(true);
    setError(null);
    try {
      const headers = getHeaders();
      const [pagesRes, treeRes, tagsRes] = await Promise.all([
        fetch(`${apiUrl}/wiki`, { headers }),
        fetch(`${apiUrl}/wiki/tree`, { headers }),
        fetch(`${apiUrl}/wiki/tags`, { headers }),
      ]);

      const [pagesData, treeData, tagsData] = await Promise.all([
        pagesRes.json(),
        treeRes.json(),
        tagsRes.json(),
      ]);

      if (pagesData.success) {
        setPages(pagesData.data || []);
        if (pagesData.data && pagesData.data.length > 0 && !activePageId) {
          setActivePageId(pagesData.data[0].id);
        }
      }
      if (treeData.success) {
        setTree(treeData.data || []);
      }
      if (tagsData.success) {
        setTags(tagsData.data || []);
      }
    } catch (err: any) {
      console.error('[useWikiState] Failed to load wiki data:', err);
      setError('Không thể tải kho tri thức từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [getHeaders, token, workspace, activePageId, apiUrl]);

  useEffect(() => {
    loadWikiData();
  }, [loadWikiData]);

  // Load backlinks when active page changes
  useEffect(() => {
    if (!activePageId || !token) return;
    fetch(`${apiUrl}/wiki/${activePageId}/backlinks`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setBacklinks(d.data || []);
      })
      .catch(() => setBacklinks([]));
  }, [activePageId, getHeaders, token, apiUrl]);

  const activePage = useMemo(() => {
    return pages.find((p) => p.id === activePageId) || pages[0] || null;
  }, [pages, activePageId]);

  // Filtered pages
  const displayedPages = useMemo(() => {
    return pages.filter((page) => {
      if (selectedArea === 'archive') {
        if (!page.isArchived) return false;
      } else {
        if (page.isArchived) return false;
        if (selectedArea !== 'all' && page.areaId !== selectedArea) return false;
      }

      if (selectedTag && !page.tags.includes(selectedTag)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = page.title.toLowerCase().includes(q);
        const matchSummary = (page.summary || '').toLowerCase().includes(q);
        const matchContent = (page.content || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchContent) return false;
      }

      return true;
    });
  }, [pages, selectedArea, selectedTag, searchQuery]);

  // Actions
  const handleCreateOrUpdatePage = async (pageData: Partial<WikiPage>) => {
    try {
      const headers = getHeaders();
      let res;
      if (editingPage) {
        res = await fetch(`${apiUrl}/wiki/${editingPage.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(pageData),
        });
      } else {
        res = await fetch(`${apiUrl}/wiki`, {
          method: 'POST',
          headers,
          body: JSON.stringify(pageData),
        });
      }

      const data = await res.json();
      if (data.success && data.data) {
        setIsModalOpen(false);
        setEditingPage(null);
        setActivePageId(data.data.id);
        showToast(editingPage ? 'Đã cập nhật trang thành công!' : 'Đã tạo trang mới thành công!');
        loadWikiData();
      } else {
        showToast(data.error || 'Thao tác thất bại');
      }
    } catch {
      showToast('Lỗi kết nối tới máy chủ khi lưu trang');
    }
  };

  const handleUpdateStatus = async (id: string, status: 'draft' | 'pending_approval' | 'approved') => {
    try {
      const res = await fetch(`${apiUrl}/wiki/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPages((prev) => prev.map((p) => (p.id === id ? data.data : p)));
        showToast(`Đã chuyển trạng thái sang "${status === 'approved' ? 'Đã duyệt' : status === 'pending_approval' ? 'Chờ duyệt' : 'Bản nháp'}".`);
      }
    } catch {
      showToast('Cập nhật trạng thái thất bại');
    }
  };

  const handleArchivePage = async (id: string, isArchived: boolean = true) => {
    try {
      const res = await fetch(`${apiUrl}/wiki/${id}/archive`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ isArchived }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(isArchived ? 'Đã lưu trữ trang' : 'Đã khôi phục trang từ kho lưu trữ');
        loadWikiData();
      }
    } catch {
      showToast('Thao tác lưu trữ thất bại');
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa vĩnh viễn trang này?')) return;
    try {
      const res = await fetch(`${apiUrl}/wiki/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa trang thành công');
        if (activePageId === id) setActivePageId(null);
        loadWikiData();
      }
    } catch {
      showToast('Xóa trang thất bại');
    }
  };

  return {
    pages,
    tree,
    tags,
    activePage,
    activePageId,
    setActivePageId,
    backlinks,
    selectedArea,
    setSelectedArea,
    selectedTag,
    setSelectedTag,
    searchQuery,
    setSearchQuery,
    displayedPages,
    loading,
    error,
    isModalOpen,
    setIsModalOpen,
    editingPage,
    setEditingPage,
    toastMessage,
    showToast,
    handleCreateOrUpdatePage,
    handleUpdateStatus,
    handleArchivePage,
    handleDeletePage,
    reload: loadWikiData,
  };
}
