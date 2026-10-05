import React, { useState, useEffect } from 'react';
import { ContextualComment } from '@/components/collaboration/types';
import { SEED_CONTEXTUAL_COMMENTS, SEED_USERS } from '@/components/collaboration/seed-data';

export function useCommentsState(showToast: (msg: string) => void) {
  const [comments, setComments] = useState<ContextualComment[]>(SEED_CONTEXTUAL_COMMENTS);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>('cmt_ctx_1');
  const [commentViewFilter, setCommentViewFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [commentMediaView, setCommentMediaView] = useState<'document' | 'spreadsheet' | 'design'>('document');
  const [selectedCellCoord, setSelectedCellCoord] = useState<string>('C12');
  const [selectedCellData, setSelectedCellData] = useState({
    title: 'Doanh thu SaaS thực tế Q3',
    value: '$128,400',
    formula: '=SUM(C2:C11)',
  });
  const [selectedDesignZone, setSelectedDesignZone] = useState<string>('CTA_BUTTON');
  const [isDocumentWatched, setIsDocumentWatched] = useState<boolean>(true);
  const [replyInputCommentId, setReplyInputCommentId] = useState<string | null>(null);
  const [replyInputText, setReplyInputText] = useState<string>('');
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [hasAudioAttached, setHasAudioAttached] = useState<boolean>(false);
  const [hasVideoAttached, setHasVideoAttached] = useState<boolean>(false);
  const [playingVideoCommentId, setPlayingVideoCommentId] = useState<string | null>(null);
  const [isTaskAssignmentOpen, setIsTaskAssignmentOpen] = useState<boolean>(false);
  const [taskAssigneeTarget, setTaskAssigneeTarget] = useState<string>('usr_linh');
  const [taskDeadlineTarget, setTaskDeadlineTarget] = useState<string>('2026-10-05');
  const [docSnippetText, setDocSnippetText] = useState(
    `Hệ thống cộng tác thời gian thực sử dụng thuật toán Yjs CRDT để đảm bảo tính nhất quán cuối cùng (Eventual Consistency). Trong các thử nghiệm tải cao, cụm 2 máy chủ WebSocket (ws-node-1 và ws-node-2) đã duy trì thành công 5,000 kết nối đồng thời với độ trễ hội tụ dưới 5ms. Số liệu ghi nhận tổng cộng 2,450 người dùng hoạt động cùng lúc mà không xảy ra bất kỳ xung đột dữ liệu hay mất mát ký tự nào.`
  );
  const [docSelectedRange, setDocSelectedRange] = useState<string>('2,450 người dùng hoạt động');
  const [docCommentInput, setDocCommentInput] = useState('');
  const [docSuggestInput, setDocSuggestInput] = useState('');
  const [docInputMode, setDocInputMode] = useState<'comment' | 'suggest'>('comment');
  const [mentionPopupOpen, setMentionPopupOpen] = useState(false);
  const [mentionFilterText, setMentionFilterText] = useState('');
  const [docPermissionPromptUser, setDocPermissionPromptUser] = useState<string | null>(null);
  const [playingDocVoiceId, setPlayingDocVoiceId] = useState<string | null>(null);

  // Sync from Figma Design comments & Spreadsheet comments
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const figmaStored = localStorage.getItem('collab_figma_comments_design_ui_workspace');
      if (figmaStored) {
        const figmaPins: any[] = JSON.parse(figmaStored);
        if (figmaPins.length > 0) {
          setComments((prev) => {
            const updated = [...prev];
            figmaPins.forEach((pin) => {
              const existingIdx = updated.findIndex((c) => c.id === pin.id || (c.mediaType === 'design' && c.id === 'cmt_ctx_6'));
              if (existingIdx >= 0) {
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  resolved: pin.resolved,
                  replies: pin.replies || updated[existingIdx].replies,
                  content: pin.content || updated[existingIdx].content,
                };
              }
            });
            return updated;
          });
        }
      }

      const sheetStored = localStorage.getItem('collab_sheet_comments_sheet_fin_q4');
      if (sheetStored) {
        const sheetCmts: any[] = JSON.parse(sheetStored);
        if (sheetCmts.length > 0) {
          setComments((prev) => {
            const updated = [...prev];
            sheetCmts.forEach((sc) => {
              const existingIdx = updated.findIndex((c) => c.id === sc.id || (c.mediaType === 'spreadsheet' && c.cellLocation === sc.cellCoord));
              if (existingIdx >= 0) {
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  resolved: sc.resolved,
                  replies: sc.replies || updated[existingIdx].replies,
                  content: sc.content || updated[existingIdx].content,
                };
              }
            });
            return updated;
          });
        }
      }
    } catch {}
  }, []);

  // Sync comments changes back to Figma Design & Spreadsheet storage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const designCmts = comments.filter((c) => c.mediaType === 'design');
      if (designCmts.length > 0) {
        const pins = designCmts.map((c, idx) => ({
          id: c.id,
          designId: 'design_ui_workspace',
          pinNumber: idx + 1,
          x: 580 + idx * 30,
          y: 356 + idx * 20,
          authorName: c.authorName,
          authorColor: c.authorColor,
          authorRole: c.authorRole,
          content: c.content,
          targetElementName: c.selectedText || c.targetText || 'Nút CTA: [Bắt đầu Phiên Làm Việc Mới]',
          timestamp: c.timestamp,
          resolved: c.resolved,
          replies: c.replies || [],
        }));
        localStorage.setItem('collab_figma_comments_design_ui_workspace', JSON.stringify(pins));
      }

      const sheetCmts = comments.filter((c) => c.mediaType === 'spreadsheet');
      if (sheetCmts.length > 0) {
        const list = sheetCmts.map((c) => ({
          id: c.id,
          cellCoord: c.cellLocation || 'C12',
          authorName: c.authorName,
          authorColor: c.authorColor,
          authorRole: c.authorRole,
          content: c.content,
          timestamp: c.timestamp,
          resolved: c.resolved,
          isSuggestion: c.isSuggestion,
          suggestedValue: c.suggestedReplacement,
          replies: c.replies || [],
        }));
        localStorage.setItem('collab_sheet_comments_sheet_fin_q4', JSON.stringify(list));
      }
    } catch {}
  }, [comments]);

  const handleToggleWatchDoc = () => {
    const next = !isDocumentWatched;
    setIsDocumentWatched(next);
    showToast(
      next
        ? '🔔 Đã bật theo dõi tài liệu! Bạn sẽ nhận thông báo khi có bất kỳ ai chỉnh sửa.'
        : '🔕 Đã hủy theo dõi tài liệu.'
    );
  };

  const handleAcceptSuggestionInDoc = (comment: ContextualComment) => {
    if (!comment.suggestedReplacement || !comment.selectedText) return;

    if (comment.mediaType === 'spreadsheet') {
      setSelectedCellData((prev) => ({ ...prev, value: comment.suggestedReplacement! }));
    } else {
      setDocSnippetText((prev) => prev.replace(comment.selectedText!, comment.suggestedReplacement!));
    }

    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id ? { ...c, suggestionStatus: 'accepted' as const, resolved: true } : c
      )
    );
    showToast(`Đã chấp nhận đề xuất! Nội dung đã được tự động cập nhật vào tài liệu.`);
  };

  const handleRejectSuggestionInDoc = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, suggestionStatus: 'rejected' as const } : c
      )
    );
    showToast('Đã từ chối đề xuất chỉnh sửa.');
  };

  const handleAddDocComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docCommentInput.trim() && !docSuggestInput.trim() && !hasAudioAttached && !hasVideoAttached) return;

    const assignedUser = taskAssigneeTarget ? SEED_USERS.find((u) => u.id === taskAssigneeTarget) : null;

    const newCmt: ContextualComment = {
      id: `cmt_ctx_${Date.now()}`,
      documentId: 'doc_rfc_consensus',
      documentTitle:
        commentMediaView === 'spreadsheet'
          ? 'Bảng Tính Dự Báo Tài Chính Q4-2026'
          : commentMediaView === 'design'
          ? 'Bản Thiết Kế Trực Quan UI Workspace'
          : 'Báo Cáo Kiến Trúc Đồng Thuận CRDT v4',
      mediaType: commentMediaView,
      cellLocation: commentMediaView === 'spreadsheet' ? selectedCellCoord : undefined,
      authorName: 'Nguyễn Văn Nam',
      authorColor: '#2563eb',
      authorRole: 'Trưởng nhóm Kỹ thuật (Lead)',
      selectedText: docSelectedRange || (commentMediaView === 'spreadsheet' ? `Ô ${selectedCellCoord}: ${selectedCellData.value}` : 'Vùng đã chọn'),
      content: docCommentInput.trim() || (docInputMode === 'suggest' ? 'Đề xuất chỉnh sửa nội dung:' : 'Ghi chú thảo luận'),
      isSuggestion: docInputMode === 'suggest',
      suggestedReplacement: docInputMode === 'suggest' ? docSuggestInput.trim() : undefined,
      suggestionStatus: docInputMode === 'suggest' ? 'pending' : undefined,
      isVoiceComment: hasAudioAttached,
      voiceDurationSec: hasAudioAttached ? 18 : undefined,
      isVideoComment: hasVideoAttached,
      videoDurationSec: hasVideoAttached ? 42 : undefined,
      resolved: false,
      timestamp: Date.now(),
      reactions: [{ emoji: '👍', count: 1, users: ['usr_nam'] }],
      replies: [],
      mentions: docCommentInput.includes('@') ? [docCommentInput.slice(docCommentInput.indexOf('@')).split(' ')[0]] : [],
      assignedTask: isTaskAssignmentOpen && assignedUser ? {
        taskId: `task_from_cmt_${Date.now()}`,
        assignee: assignedUser.name,
        deadline: taskDeadlineTarget,
      } : undefined,
    };

    if (isTaskAssignmentOpen && assignedUser) {
      try {
        const stored = localStorage.getItem('collab_kanban_external_tasks');
        const tasks = stored ? JSON.parse(stored) : [];
        tasks.push({
          id: `task_from_cmt_${Date.now()}`,
          title: `[Tài liệu] ${docCommentInput.trim().slice(0, 50) || 'Nhiệm vụ từ bình luận'}...`,
          description: `Giao việc từ bình luận: "${docCommentInput.trim()}"\nVị trí: "${docSelectedRange}"`,
          column: 'todo',
          priority: 'high',
          assigneeName: assignedUser.name,
          assigneeColor: assignedUser.avatarColor,
          dueDate: taskDeadlineTarget,
          createdAt: Date.now(),
          labels: ['Tài liệu', 'Review'],
        });
        localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(tasks));
        window.dispatchEvent(new CustomEvent('collab_task_created'));
      } catch {}
    }

    setComments((prev) => [newCmt, ...prev]);
    setSelectedCommentId(newCmt.id);
    setDocCommentInput('');
    setDocSuggestInput('');
    setHasAudioAttached(false);
    setHasVideoAttached(false);
    setIsTaskAssignmentOpen(false);
    showToast('Đã thêm bình luận trực tiếp đúng vị trí ngữ cảnh!');
  };

  const handleAddDocCommentReply = (commentId: string) => {
    if (!replyInputText.trim()) return;

    const newReply = {
      id: `rep_ctx_${Date.now()}`,
      authorName: 'Nguyễn Văn Nam',
      authorColor: '#2563eb',
      content: replyInputText.trim(),
      timestamp: Date.now(),
    };

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, replies: [...(c.replies || []), newReply] } : c
      )
    );
    setReplyInputText('');
    setReplyInputCommentId(null);
    showToast('Đã gửi câu trả lời vào chuỗi bình luận!');
  };

  const handleToggleDocCommentReaction = (commentId: string, emoji: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const reactions = c.reactions || [];
        const found = reactions.find((r) => r.emoji === emoji);
        let updated;
        if (found) {
          if (found.users.includes('usr_nam')) {
            updated = reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== 'usr_nam') }
                  : r
              )
              .filter((r) => r.count > 0);
          } else {
            updated = reactions.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, 'usr_nam'] } : r
            );
          }
        } else {
          updated = [...reactions, { emoji, count: 1, users: ['usr_nam'] }];
        }
        return { ...c, reactions: updated };
      })
    );
  };

  const handleConvertCommentToTask = (comment: ContextualComment) => {
    try {
      const stored = localStorage.getItem('collab_kanban_external_tasks');
      const tasks = stored ? JSON.parse(stored) : [];
      const assignee = comment.mentions?.[0]?.replace('@', '') || 'Trần Thị Linh';
      const deadline = '2026-10-05';
      const newTask = {
        id: `task_from_cmt_${Date.now()}`,
        title: `[Xử lý bình luận] ${comment.content.slice(0, 50)}...`,
        description: `Giao việc từ bình luận: "${comment.content}"\nNgữ cảnh: "${comment.targetText || comment.selectedText || ''}"`,
        column: 'todo',
        priority: 'high',
        assigneeName: assignee,
        assigneeColor: '#ec4899',
        dueDate: deadline,
        createdAt: Date.now(),
        labels: ['Bình luận', 'Tài liệu'],
      };
      tasks.push(newTask);
      localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('collab_task_created'));

      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? {
                ...c,
                assignedTask: {
                  taskId: newTask.id,
                  assignee: assignee,
                  deadline: deadline,
                },
              }
            : c
        )
      );
      showToast(`Đã tạo task trên Kanban giao cho @${assignee} (Hạn: ${deadline})!`);
    } catch {
      showToast('Đã chuyển phản hồi thành nhiệm vụ!');
    }
  };

  const handleStartVoiceRecording = () => {
    if (!isRecordingAudio) {
      setIsRecordingAudio(true);
      setTimeout(() => {
        setIsRecordingAudio(false);
        setHasAudioAttached(true);
        showToast('Đã ghi âm ghi chú thoại (0:18) đính kèm vào bình luận!');
      }, 2000);
    }
  };

  const handleAttachLoomVideo = () => {
    setHasVideoAttached(true);
    showToast('Đã đính kèm video clip Loom (0:42) vào đề xuất!');
  };

  const handleResolveComment = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const nextResolved = !c.resolved;
          showToast(nextResolved ? 'Đã giải quyết bình luận!' : 'Đã mở lại bình luận.');
          return { ...c, resolved: nextResolved };
        }
        return c;
      })
    );
  };

  return {
    comments,
    setComments,
    selectedCommentId,
    setSelectedCommentId,
    commentViewFilter,
    setCommentViewFilter,
    commentMediaView,
    setCommentMediaView,
    selectedCellCoord,
    setSelectedCellCoord,
    selectedCellData,
    setSelectedCellData,
    selectedDesignZone,
    setSelectedDesignZone,
    isDocumentWatched,
    setIsDocumentWatched,
    replyInputCommentId,
    setReplyInputCommentId,
    replyInputText,
    setReplyInputText,
    isRecordingAudio,
    setIsRecordingAudio,
    hasAudioAttached,
    setHasAudioAttached,
    hasVideoAttached,
    setHasVideoAttached,
    playingVideoCommentId,
    setPlayingVideoCommentId,
    isTaskAssignmentOpen,
    setIsTaskAssignmentOpen,
    taskAssigneeTarget,
    setTaskAssigneeTarget,
    taskDeadlineTarget,
    setTaskDeadlineTarget,
    docSnippetText,
    setDocSnippetText,
    docSelectedRange,
    setDocSelectedRange,
    docCommentInput,
    setDocCommentInput,
    docSuggestInput,
    setDocSuggestInput,
    docInputMode,
    setDocInputMode,
    mentionPopupOpen,
    setMentionPopupOpen,
    mentionFilterText,
    setMentionFilterText,
    docPermissionPromptUser,
    setDocPermissionPromptUser,
    playingDocVoiceId,
    setPlayingDocVoiceId,
    handleToggleWatchDoc,
    handleAcceptSuggestionInDoc,
    handleRejectSuggestionInDoc,
    handleAddDocComment,
    handleAddDocCommentReply,
    handleToggleDocCommentReaction,
    handleConvertCommentToTask,
    handleStartVoiceRecording,
    handleAttachLoomVideo,
    handleResolveComment,
  };
}
