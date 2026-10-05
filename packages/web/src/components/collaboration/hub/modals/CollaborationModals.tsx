'use client';

import React from 'react';
import {
  X,
  Hash,
  Download,
  Bell,
} from 'lucide-react';
import {
  WorkplaceChannel,
  WorkplaceMessage,
} from '@/components/collaboration/types';
import { SEED_USERS } from '@/components/collaboration/seed-data';

interface CollaborationModalsProps {
  createChannelModalOpen: boolean;
  setCreateChannelModalOpen: (b: boolean) => void;
  newChannelName: string;
  setNewChannelName: (s: string) => void;
  newChannelCategory: 'project' | 'team' | 'topic' | 'external';
  setNewChannelCategory: (c: 'project' | 'team' | 'topic' | 'external') => void;
  newChannelDesc: string;
  setNewChannelDesc: (s: string) => void;
  newChannelPrivate: boolean;
  setNewChannelPrivate: (b: boolean) => void;
  handleCreateChannelSubmit: (e: React.FormEvent) => void;

  scheduleModalOpen: boolean;
  setScheduleModalOpen: (b: boolean) => void;
  scheduleTitle: string;
  setScheduleTitle: (s: string) => void;
  scheduleDate: string;
  setScheduleDate: (s: string) => void;
  scheduleTime: string;
  setScheduleTime: (s: string) => void;
  handleGenerateCalendarFile: () => void;

  breakoutModalOpen: boolean;
  setBreakoutModalOpen: (b: boolean) => void;
  activeBreakoutRoomId: string | null;
  setActiveBreakoutRoomId: (id: string | null) => void;

  forwardModalMessage: WorkplaceMessage | null;
  setForwardModalMessage: (m: WorkplaceMessage | null) => void;
  forwardTargetChannelId: string;
  setForwardTargetChannelId: (id: string) => void;
  handleForwardMessageSubmit: () => void;
  channels: WorkplaceChannel[];

  taskModalMessage: WorkplaceMessage | null;
  setTaskModalMessage: (m: WorkplaceMessage | null) => void;
  taskAssignee: string;
  setTaskAssignee: (s: string) => void;
  taskDeadline: string;
  setTaskDeadline: (s: string) => void;
  taskPriority: 'low' | 'medium' | 'high' | 'urgent';
  setTaskPriority: (p: 'low' | 'medium' | 'high' | 'urgent') => void;
  handleCreateTaskFromMessage: () => void;

  inviteGuestModalOpen: boolean;
  setInviteGuestModalOpen: (b: boolean) => void;
  guestEmail: string;
  setGuestEmail: (s: string) => void;

  mobilePushPreviewOpen: boolean;
  setMobilePushPreviewOpen: (b: boolean) => void;
  setActiveTab: (t: 'channels' | 'meetings' | 'comments' | 'notifications') => void;
  setCommentMediaView: (v: 'document' | 'spreadsheet' | 'design') => void;

  channelPrefModalOpen: boolean;
  setChannelPrefModalOpen: (b: boolean) => void;
  channelNotificationPrefs: Record<string, 'all' | 'mention' | 'mute'>;
  setChannelNotificationPrefs: React.Dispatch<React.SetStateAction<Record<string, 'all' | 'mention' | 'mute'>>>;

  showToast: (msg: string) => void;
}

export function CollaborationModals({
  createChannelModalOpen,
  setCreateChannelModalOpen,
  newChannelName,
  setNewChannelName,
  newChannelCategory,
  setNewChannelCategory,
  newChannelDesc,
  setNewChannelDesc,
  newChannelPrivate,
  setNewChannelPrivate,
  handleCreateChannelSubmit,
  scheduleModalOpen,
  setScheduleModalOpen,
  scheduleTitle,
  setScheduleTitle,
  scheduleDate,
  setScheduleDate,
  scheduleTime,
  setScheduleTime,
  handleGenerateCalendarFile,
  breakoutModalOpen,
  setBreakoutModalOpen,
  activeBreakoutRoomId,
  setActiveBreakoutRoomId,
  forwardModalMessage,
  setForwardModalMessage,
  forwardTargetChannelId,
  setForwardTargetChannelId,
  handleForwardMessageSubmit,
  channels,
  taskModalMessage,
  setTaskModalMessage,
  taskAssignee,
  setTaskAssignee,
  taskDeadline,
  setTaskDeadline,
  taskPriority,
  setTaskPriority,
  handleCreateTaskFromMessage,
  inviteGuestModalOpen,
  setInviteGuestModalOpen,
  guestEmail,
  setGuestEmail,
  mobilePushPreviewOpen,
  setMobilePushPreviewOpen,
  setActiveTab,
  setCommentMediaView,
  channelPrefModalOpen,
  setChannelPrefModalOpen,
  channelNotificationPrefs,
  setChannelNotificationPrefs,
  showToast,
}: CollaborationModalsProps) {
  return (
    <>
      {/* 1. Modal Tạo Kênh Mới */}
      {createChannelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900">Tạo Kênh Trao Đổi Mới</h3>
              <button onClick={() => setCreateChannelModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateChannelSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Tên kênh</label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: ra-mat-san-pham"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Loại kênh</label>
                <select
                  value={newChannelCategory}
                  onChange={(e) => setNewChannelCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800"
                >
                  <option value="project">Kênh Dự án (Project)</option>
                  <option value="team">Kênh Phòng ban / Nhóm (Team)</option>
                  <option value="topic">Kênh Theo chủ đề (Topic)</option>
                  <option value="external">Kênh Đối tác ngoài (External)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Mục đích / Mô tả kênh</label>
                <textarea
                  rows={2}
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="Mô tả ngắn gọn mục tiêu của kênh..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newChannelPrivate}
                  onChange={(e) => setNewChannelPrivate(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Kênh riêng tư (Chỉ thành viên được mời mới nhìn thấy)</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setCreateChannelModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black"
                >
                  Tạo kênh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Đặt Lịch Họp (Calendar) */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900">Đặt Lịch Họp Tích Hợp Lịch</h3>
              <button onClick={() => setScheduleModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Chủ đề cuộc họp</label>
                <input
                  type="text"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Ngày họp</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1">
                <span className="font-bold text-blue-900 block">Link phòng họp tự động:</span>
                <span className="font-mono text-blue-700 text-[11px]">https://meet.collab.vn/room-sprint</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Đóng
                </button>
                <button
                  onClick={handleGenerateCalendarFile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file lịch (.ics)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Quản Lý Breakout Rooms */}
      {breakoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900">Phòng Họp Nhóm Nhỏ (Breakout Rooms)</h3>
              <button onClick={() => setBreakoutModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-600">
                Chia nhỏ cuộc họp lớn thành các phòng thảo luận riêng biệt, sau đó tự động gộp lại phòng chính.
              </p>

              <div className="space-y-2">
                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-zinc-900 block">Phòng 1: Kỹ Thuật &amp; Backend</span>
                    <span className="text-[10px] text-zinc-500">2 thành viên: Nam, Hoàng</span>
                  </div>
                  <button
                    onClick={() => {
                      setActiveBreakoutRoomId('room_1');
                      setBreakoutModalOpen(false);
                      showToast('Đã tham gia Phòng Nhỏ 1 (Backend)!');
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                  >
                    Vào phòng
                  </button>
                </div>

                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-zinc-900 block">Phòng 2: UI/UX &amp; Sản Phẩm</span>
                    <span className="text-[10px] text-zinc-500">2 thành viên: Linh, Alice</span>
                  </div>
                  <button
                    onClick={() => {
                      setActiveBreakoutRoomId('room_2');
                      setBreakoutModalOpen(false);
                      showToast('Đã tham gia Phòng Nhỏ 2 (UI/UX)!');
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                  >
                    Vào phòng
                  </button>
                </div>
              </div>

              {activeBreakoutRoomId && (
                <button
                  onClick={() => {
                    setActiveBreakoutRoomId(null);
                    setBreakoutModalOpen(false);
                    showToast('Đã gộp tất cả thành viên về phòng chính!');
                  }}
                  className="w-full py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black"
                >
                  Gộp tất cả về Phòng Chính
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Chuyển Tiếp Tin Nhắn */}
      {forwardModalMessage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900">Chuyển Tiếp Tin Nhắn</h3>
              <button onClick={() => setForwardModalMessage(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs italic text-zinc-700">
                "{forwardModalMessage.content}"
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Chọn kênh nhận:</label>
                <select
                  value={forwardTargetChannelId}
                  onChange={(e) => setForwardTargetChannelId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name} ({c.categoryLabel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => setForwardModalMessage(null)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleForwardMessageSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
                >
                  Chuyển tiếp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Biến Tin Nhắn Thành Task */}
      {taskModalMessage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900">Biến Tin Nhắn Thành Thẻ Việc (Task)</h3>
              <button onClick={() => setTaskModalMessage(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200 text-xs italic text-blue-900">
                "{taskModalMessage.content}"
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Người nhận việc</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold"
                >
                  {SEED_USERS.map((u) => (
                    <option key={u.id} value={u.name}>
                      @{u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Hạn chót</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Mức độ ưu tiên</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => setTaskModalMessage(null)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateTaskFromMessage}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black"
                >
                  Tạo thẻ trên Kanban
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Mời Đối Tác Ngoài */}
      {inviteGuestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900">Mời Khách / Đối Tác Ngoài</h3>
              <button onClick={() => setInviteGuestModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-600">
                Mời đối tác vào kênh dùng chung riêng biệt mà không để lộ các tài liệu nội bộ khác.
              </p>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Email đối tác</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="contact@techcorp.vn"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Kênh chia sẻ</label>
                <div className="px-3 py-2 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-800">
                  #external-techcorp-vietnam
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => setInviteGuestModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    setInviteGuestModalOpen(false);
                    showToast(`Đã gửi liên kết mời tham gia kênh cho ${guestEmail || 'đối tác'}!`);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
                >
                  Gửi lời mời
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Mô Phỏng Thông Báo Trên Điện Thoại (Mobile Push Simulator) */}
      {mobilePushPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-xs rounded-[3rem] p-4 shadow-2xl space-y-4 animate-in zoom-in-95 text-white">
            <div className="w-24 h-4 bg-black rounded-full mx-auto" />

            <div className="text-center pt-2">
              <span className="text-3xl font-light font-mono block">09:41</span>
              <span className="text-[11px] text-zinc-400">Thứ Sáu, 3 tháng 10</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 space-y-1.5 shadow-lg">
              <div className="flex items-center justify-between text-[11px] text-zinc-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-[9px] text-white">
                    C
                  </div>
                  <span>Collab Workspace</span>
                </div>
                <span className="text-[10px] text-zinc-400">Vừa xong</span>
              </div>

              <div className="space-y-0.5">
                <span className="font-bold text-xs text-white block">Trần Thị Linh (@Linh)</span>
                <p className="text-[11px] text-zinc-200 leading-snug">
                  "@Nam ơi xem giúp mình bảng dự báo tài chính ô C12 trước buổi họp sprint 10:00 nhé!"
                </p>
              </div>

              <div className="flex gap-2 pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setMobilePushPreviewOpen(false);
                    setActiveTab('comments');
                    setCommentMediaView('spreadsheet');
                    showToast('Đã mở trực tiếp ô C12 từ thông báo Push di động!');
                  }}
                  className="flex-1 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Xem ngay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobilePushPreviewOpen(false);
                    showToast('Đã đóng thông báo điện thoại.');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 text-zinc-300 text-[10px] hover:bg-white/20 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="pt-4 pb-2 text-center">
              <button
                type="button"
                onClick={() => setMobilePushPreviewOpen(false)}
                className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
              >
                Đóng màn hình điện thoại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal Tùy Chỉnh Thông Báo Theo Từng Kênh */}
      {channelPrefModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-zinc-900">Tùy Chỉnh Thông Báo Từng Kênh</h3>
              </div>
              <button onClick={() => setChannelPrefModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-zinc-600 text-[11px]">
                Chọn mức độ nhận thông báo phù hợp cho từng kênh trao đổi để tránh ngắt quãng công việc.
              </p>

              <div className="space-y-2.5 divide-y divide-zinc-100">
                {channels.slice(0, 5).map((chan) => (
                  <div key={chan.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-900 block">#{chan.name}</span>
                      <span className="text-[10px] text-zinc-400">{chan.categoryLabel}</span>
                    </div>

                    <select
                      value={channelNotificationPrefs[chan.id] || 'all'}
                      onChange={(e) => {
                        const val = e.target.value as 'all' | 'mention' | 'mute';
                        setChannelNotificationPrefs((prev) => ({ ...prev, [chan.id]: val }));
                        showToast(`Kênh #${chan.name}: Đã đặt thành "${val === 'all' ? 'Tất cả tin' : val === 'mention' ? 'Chỉ khi @nhắc' : 'Tắt tiếng'}"`);
                      }}
                      className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs text-zinc-800 font-semibold focus:outline-none"
                    >
                      <option value="all">Tất cả tin nhắn</option>
                      <option value="mention">Chỉ khi @nhắc tên</option>
                      <option value="mute">Tắt thông báo (Mute)</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-zinc-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setChannelPrefModalOpen(false);
                    showToast('Đã lưu tùy chọn thông báo các kênh!');
                  }}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black cursor-pointer"
                >
                  Xong
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
