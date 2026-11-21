import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CloudFileItem, CloudFolder, FileCategory, FileSortBy, DriveTab } from './types';

export function useDriveState() {
  const { user, workspace, token } = useAuth();
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
  const [files, setFiles] = useState<CloudFileItem[]>([]);
  const [folders, setFolders] = useState<CloudFolder[]>([]);
  const [serverStorageUsed, setServerStorageUsed] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation and Filter States
  const [driveTab, setDriveTab] = useState<DriveTab>('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<FileCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<FileSortBy>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [previewFile, setPreviewFile] = useState<CloudFileItem | null>(null);
  const [sharingFile, setSharingFile] = useState<CloudFileItem | null>(null);
  const [versioningFile, setVersioningFile] = useState<CloudFileItem | null>(null);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Load Folders & Files from Server
  const loadDriveData = useCallback(async () => {
    if (!token && !workspace) return;
    setLoading(true);
    setError(null);
    try {
      const headers = getHeaders();

      // Parallel fetch folders, files, and workspace quota stats
      const [foldersRes, filesRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}/folders`, { headers }).catch(() => null),
        fetch(`${apiUrl}/files`, { headers }).catch(() => null),
        fetch(`${apiUrl}/folders/stats`, { headers }).catch(() => null),
      ]);

      if (foldersRes && foldersRes.ok) {
        const foldersData = await foldersRes.json();
        if (foldersData.success) setFolders(foldersData.data || []);
      }
      if (filesRes && filesRes.ok) {
        const filesData = await filesRes.json();
        if (filesData.success) setFiles(filesData.data || []);
      }
      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.data) {
          setServerStorageUsed(statsData.data.totalSize ?? 0);
        }
      }
    } catch (err: any) {
      console.error('[useDriveState] Failed to load data:', err);
      setError('Không thể tải dữ liệu từ máy chủ đám mây MinIO.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getHeaders, token, workspace]);

  useEffect(() => {
    loadDriveData();
  }, [loadDriveData]);

  // File Actions
  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      let category: FileCategory = 'other';
      if (file.type.includes('pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        category = 'document';
      } else if (file.type.startsWith('image/')) {
        category = 'image';
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        category = 'spreadsheet';
      } else if (file.name.endsWith('.sql') || file.name.endsWith('.ts') || file.name.endsWith('.json')) {
        category = 'code';
      }

      // Upload binary file directly using multipart/form-data streaming
      const uploadHeaders: Record<string, string> = {};
      if (token) uploadHeaders['Authorization'] = `Bearer ${token}`;
      if (workspace?.orgId) uploadHeaders['x-workspace-id'] = workspace.orgId;

      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('category', category);
      if (currentFolderId) {
        formData.append('folderId', currentFolderId);
      }

      try {
        const res = await fetch(`${apiUrl}/files/upload`, {
          method: 'POST',
          headers: uploadHeaders,
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.data) {
          setFiles((prev) => [data.data, ...prev]);
        }
      } catch (err) {
        console.error('Failed to upload file:', file.name, err);
      }
    }

    showToast(`Đã tải lên thành công ${fileList.length} tệp vào đám mây MinIO S3!`);
    loadDriveData();
  };

  const handleDownloadFile = async (file: CloudFileItem) => {
    try {
      const res = await fetch(`${apiUrl}/files/${file.id}/download`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast(`Đang tải xuống tệp "${file.name}"...`);
    } catch {
      showToast('Tải xuống thất bại. Vui lòng thử lại.');
    }
  };

  const handleToggleStar = async (fileId: string, currentStarred: boolean) => {
    try {
      const res = await fetch(`${apiUrl}/files/${fileId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ isStarred: !currentStarred }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFiles((prev) => prev.map((f) => (f.id === fileId ? data.data : f)));
      }
    } catch {
      showToast('Thao tác gắn sao thất bại');
    }
  };

  const handleMoveToTrash = async (fileId: string, fileName: string) => {
    try {
      const res = await fetch(`${apiUrl}/files/${fileId}/trash`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, isDeleted: true } : f)));
        showToast(`Đã chuyển tệp "${fileName}" vào thùng rác.`);
      }
    } catch {
      showToast('Chuyển vào thùng rác thất bại');
    }
  };

  const handleRestoreFromTrash = async (fileId: string, fileName: string) => {
    try {
      const res = await fetch(`${apiUrl}/files/${fileId}/restore`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFiles((prev) => prev.map((f) => (f.id === fileId ? data.data : f)));
        showToast(`Đã khôi phục tệp "${fileName}".`);
      }
    } catch {
      showToast('Khôi phục thất bại');
    }
  };

  const handlePermanentDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn tệp "${fileName}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/files/${fileId}/purge`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        showToast(`Đã xóa vĩnh viễn tệp "${fileName}".`);
      } else {
        showToast(data.error || 'Xóa tệp thất bại');
      }
    } catch {
      showToast('Lỗi khi xóa tệp vĩnh viễn');
    }
  };

  const handleRenameFile = async (fileId: string, newName: string) => {
    try {
      const res = await fetch(`${apiUrl}/files/${fileId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFiles((prev) => prev.map((f) => (f.id === fileId ? data.data : f)));
        showToast(`Đã đổi tên tệp thành "${newName}".`);
      }
    } catch {
      showToast('Đổi tên tệp thất bại');
    }
  };

  const handleMoveFile = async (fileId: string, folderId: string | null) => {
    try {
      const res = await fetch(`${apiUrl}/files/${fileId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ folderId }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFiles((prev) => prev.map((f) => (f.id === fileId ? data.data : f)));
        showToast('Đã di chuyển tệp thành công.');
      }
    } catch {
      showToast('Di chuyển tệp thất bại');
    }
  };

  // Folder Actions
  const handleCreateFolder = async (name: string, category: 'team' | 'project' | 'personal' = 'project') => {
    try {
      const res = await fetch(`${apiUrl}/folders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name,
          category,
          parentId: currentFolderId,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFolders((prev) => [data.data, ...prev]);
        setIsNewFolderModalOpen(false);
        showToast(`Đã tạo thư mục "${name}".`);
      }
    } catch {
      showToast('Tạo thư mục thất bại');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Bạn có chắc muốn xóa thư mục này?')) return;
    try {
      const res = await fetch(`${apiUrl}/folders/${folderId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        if (currentFolderId === folderId) setCurrentFolderId(null);
        showToast('Đã xóa thư mục.');
      }
    } catch {
      showToast('Xóa thư mục thất bại');
    }
  };

  // Filtered files logic
  const displayedFiles = useMemo(() => {
    return files
      .filter((f) => {
        if (driveTab === 'trash') return f.isDeleted;
        if (f.isDeleted) return false;
        if (currentFolderId && f.folderId !== currentFolderId) return false;
        if (driveTab === 'starred' && !f.isStarred) return false;
        if (driveTab === 'my_drive' && f.ownerId !== user?.userId) return false;
        if (driveTab === 'shared' && f.ownerId === user?.userId) return false;
        if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return f.name.toLowerCase().includes(q) || f.ownerName.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'size') return b.size - a.size;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [files, driveTab, currentFolderId, categoryFilter, searchQuery, sortBy, user]);

  return {
    files,
    folders,
    loading,
    error,
    driveTab,
    setDriveTab,
    currentFolderId,
    setCurrentFolderId,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    displayedFiles,
    previewFile,
    setPreviewFile,
    sharingFile,
    setSharingFile,
    versioningFile,
    setVersioningFile,
    isNewFolderModalOpen,
    setIsNewFolderModalOpen,
    toastMessage,
    showToast,
    handleUploadFiles,
    handleDownloadFile,
    handleToggleStar,
    handleMoveToTrash,
    handleRestoreFromTrash,
    handlePermanentDelete,
    handleRenameFile,
    handleMoveFile,
    handleCreateFolder,
    handleDeleteFolder,
    serverStorageUsed,
    reload: loadDriveData,
  };
}
