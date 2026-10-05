'use client';

import React from 'react';
import { DocPreviewPane } from './DocPreviewPane';
import { CommentsFeedPane } from './CommentsFeedPane';
import { ContextualComment } from '@/components/collaboration/types';

interface CommentsTabProps {
  commentMediaView: 'document' | 'spreadsheet' | 'design';
  setCommentMediaView: (v: 'document' | 'spreadsheet' | 'design') => void;
  isDocumentWatched: boolean;
  handleToggleWatchDoc: () => void;
  selectedCellData: { title: string; value: string; formula: string };
  selectedCellCoord: string;
  selectedDesignZone: string;
  docSnippetText: string;
  docSelectedRange: string;
  setDocSelectedRange: (s: string) => void;
  docInputMode: 'comment' | 'suggest';
  setDocInputMode: (m: 'comment' | 'suggest') => void;
  comments: ContextualComment[];
  setComments: React.Dispatch<React.SetStateAction<ContextualComment[]>>;
  selectedCommentId: string | null;
  setSelectedCommentId: (id: string | null) => void;
  commentViewFilter: 'all' | 'open' | 'resolved';
  setCommentViewFilter: (f: 'all' | 'open' | 'resolved') => void;
  docSuggestInput: string;
  setDocSuggestInput: (s: string) => void;
  docCommentInput: string;
  setDocCommentInput: (s: string) => void;
  mentionPopupOpen: boolean;
  setMentionPopupOpen: (b: boolean) => void;
  docPermissionPromptUser: string | null;
  setDocPermissionPromptUser: (s: string | null) => void;
  hasAudioAttached: boolean;
  setHasAudioAttached: (b: boolean) => void;
  hasVideoAttached: boolean;
  setHasVideoAttached: (b: boolean) => void;
  isTaskAssignmentOpen: boolean;
  setIsTaskAssignmentOpen: (b: boolean) => void;
  taskAssigneeTarget: string;
  setTaskAssigneeTarget: (s: string) => void;
  taskDeadlineTarget: string;
  setTaskDeadlineTarget: (s: string) => void;
  isRecordingAudio: boolean;
  playingDocVoiceId: string | null;
  setPlayingDocVoiceId: (id: string | null) => void;
  replyInputCommentId: string | null;
  setReplyInputCommentId: (id: string | null) => void;
  replyInputText: string;
  setReplyInputText: (s: string) => void;
  handleAddDocComment: (e: React.FormEvent) => void;
  handleAcceptSuggestionInDoc: (c: ContextualComment) => void;
  handleRejectSuggestionInDoc: (id: string) => void;
  handleStartVoiceRecording: () => void;
  handleAttachLoomVideo: () => void;
  handleToggleDocCommentReaction: (id: string, emoji: string) => void;
  handleConvertCommentToTask: (c: ContextualComment) => void;
  handleAddDocCommentReply: (id: string) => void;
  showToast: (msg: string) => void;
}

export function CommentsTab(props: CommentsTabProps) {
  return (
    <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden flex flex-col lg:flex-row h-[780px]">
      <DocPreviewPane
        commentMediaView={props.commentMediaView}
        setCommentMediaView={props.setCommentMediaView}
        isDocumentWatched={props.isDocumentWatched}
        handleToggleWatchDoc={props.handleToggleWatchDoc}
        selectedCellData={props.selectedCellData}
        selectedCellCoord={props.selectedCellCoord}
        selectedDesignZone={props.selectedDesignZone}
        docSnippetText={props.docSnippetText}
        docSelectedRange={props.docSelectedRange}
        setDocSelectedRange={props.setDocSelectedRange}
        docInputMode={props.docInputMode}
        setDocInputMode={props.setDocInputMode}
        showToast={props.showToast}
      />
      <CommentsFeedPane
        comments={props.comments}
        setComments={props.setComments}
        selectedCommentId={props.selectedCommentId}
        setSelectedCommentId={props.setSelectedCommentId}
        commentViewFilter={props.commentViewFilter}
        setCommentViewFilter={props.setCommentViewFilter}
        docInputMode={props.docInputMode}
        docSuggestInput={props.docSuggestInput}
        setDocSuggestInput={props.setDocSuggestInput}
        docCommentInput={props.docCommentInput}
        setDocCommentInput={props.setDocCommentInput}
        mentionPopupOpen={props.mentionPopupOpen}
        setMentionPopupOpen={props.setMentionPopupOpen}
        docPermissionPromptUser={props.docPermissionPromptUser}
        setDocPermissionPromptUser={props.setDocPermissionPromptUser}
        hasAudioAttached={props.hasAudioAttached}
        setHasAudioAttached={props.setHasAudioAttached}
        hasVideoAttached={props.hasVideoAttached}
        setHasVideoAttached={props.setHasVideoAttached}
        isTaskAssignmentOpen={props.isTaskAssignmentOpen}
        setIsTaskAssignmentOpen={props.setIsTaskAssignmentOpen}
        taskAssigneeTarget={props.taskAssigneeTarget}
        setTaskAssigneeTarget={props.setTaskAssigneeTarget}
        taskDeadlineTarget={props.taskDeadlineTarget}
        setTaskDeadlineTarget={props.setTaskDeadlineTarget}
        isRecordingAudio={props.isRecordingAudio}
        playingDocVoiceId={props.playingDocVoiceId}
        setPlayingDocVoiceId={props.setPlayingDocVoiceId}
        replyInputCommentId={props.replyInputCommentId}
        setReplyInputCommentId={props.setReplyInputCommentId}
        replyInputText={props.replyInputText}
        setReplyInputText={props.setReplyInputText}
        handleAddDocComment={props.handleAddDocComment}
        handleAcceptSuggestionInDoc={props.handleAcceptSuggestionInDoc}
        handleRejectSuggestionInDoc={props.handleRejectSuggestionInDoc}
        handleStartVoiceRecording={props.handleStartVoiceRecording}
        handleAttachLoomVideo={props.handleAttachLoomVideo}
        handleToggleDocCommentReaction={props.handleToggleDocCommentReaction}
        handleConvertCommentToTask={props.handleConvertCommentToTask}
        handleAddDocCommentReply={props.handleAddDocCommentReply}
        showToast={props.showToast}
      />
    </div>
  );
}
