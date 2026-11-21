import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { emitDomainEvent } from '../../lib/domain-event-bus';

export interface CommentAnchor {
  selectedText?: string;
  isSuggestion?: boolean;
  suggestedReplacement?: string;
  isTask?: boolean;
  assignedToId?: string;
  assignedToName?: string;
  taskDeadline?: string;
  taskPriority?: 'low' | 'medium' | 'high' | 'urgent';
  reactions?: { emoji: string; count: number; users: string[] }[];
}

export interface CommentItem {
  id: string;
  documentId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  anchorJson?: string;
  anchor?: CommentAnchor;
  status: 'active' | 'resolved';
  parentId?: string | null;
  createdAt: string | number;
  updatedAt?: string | number;
  replies?: CommentItem[];
}

export function useDocComments(documentId: string, documentTitle: string) {
  const { user, workspace, token } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const getHeaders = useCallback(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    if (workspace?.orgId) h['x-workspace-id'] = workspace.orgId;
    return h;
  }, [token, workspace]);

  const loadComments = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/documents/${documentId}/comments`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const parsed = data.data.map((c: any) => {
          let anchor: CommentAnchor = {};
          if (c.anchorJson) {
            try {
              anchor = JSON.parse(c.anchorJson);
            } catch {}
          }
          const replies = (c.replies || []).map((r: any) => {
            let rAnchor: CommentAnchor = {};
            if (r.anchorJson) {
              try {
                rAnchor = JSON.parse(r.anchorJson);
              } catch {}
            }
            return { ...r, anchor: rAnchor };
          });
          return { ...c, anchor, replies };
        });
        setComments(parsed);
      }
    } catch (err) {
      console.error('[useDocComments] Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }, [documentId, getHeaders, apiUrl]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const addComment = async (
    content: string,
    anchorData?: CommentAnchor,
    parentId?: string
  ) => {
    try {
      const payload = {
        content,
        anchorJson: anchorData ? JSON.stringify(anchorData) : undefined,
        parentId: parentId || undefined,
        authorName: user?.name || 'Thành viên',
        authorAvatar: user?.avatarUrl || undefined,
      };

      const res = await fetch(`${apiUrl}/documents/${documentId}/comments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.data) {
        showToast(parentId ? 'Đã phản hồi bình luận!' : 'Đã đăng bình luận thành công!');
        try {
          emitDomainEvent('comment.created', {
            comment: data.data,
            documentTitle,
            targetUrl: `/doc/${documentId}#comment-${data.data.id}`,
          });
        } catch {}
        loadComments();
        return true;
      } else {
        showToast(data.error || 'Lỗi khi tạo bình luận');
      }
    } catch {
      showToast('Không thể kết nối đến máy chủ');
    }
    return false;
  };

  const resolveComment = async (commentId: string) => {
    try {
      const res = await fetch(`${apiUrl}/documents/${documentId}/comments/${commentId}/resolve`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã đánh dấu giải quyết bình luận!');
        loadComments();
      }
    } catch {
      showToast('Lỗi khi cập nhật trạng thái bình luận');
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
      const res = await fetch(`${apiUrl}/documents/${documentId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa bình luận');
        loadComments();
      }
    } catch {
      showToast('Lỗi khi xóa bình luận');
    }
  };

  return {
    comments,
    loading,
    toastMessage,
    showToast,
    addComment,
    resolveComment,
    deleteComment,
    reload: loadComments,
  };
}
