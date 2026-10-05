'use client';

import React from 'react';
import {
  Video,
  ChevronDown,
  Share2,
  Calendar,
  Monitor,
  Headphones,
  CalendarDays,
  Plus,
  Download,
  MessageSquare,
  Sparkles,
  FileText,
} from 'lucide-react';

interface MeetingsTabProps {
  newMeetingDropdownOpen: boolean;
  setNewMeetingDropdownOpen: (b: boolean | ((prev: boolean) => boolean)) => void;
  handleStartMeeting: (title: string, code?: string, isAudioOnly?: boolean) => void;
  setScheduleModalOpen: (b: boolean) => void;
  meetInputCode: string;
  setMeetInputCode: (s: string) => void;
  isHuddleActive: boolean;
  setIsHuddleActive: (b: boolean | ((prev: boolean) => boolean)) => void;
  showToast: (msg: string) => void;
}

export function MeetingsTab({
  newMeetingDropdownOpen,
  setNewMeetingDropdownOpen,
  handleStartMeeting,
  setScheduleModalOpen,
  meetInputCode,
  setMeetInputCode,
  isHuddleActive,
  setIsHuddleActive,
  showToast,
}: MeetingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Hero Google Meet Action Center */}
      <div className="bg-gradient-to-br from-white via-blue-50/20 to-white rounded-3xl border border-zinc-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 border border-blue-200 text-blue-700 text-xs font-semibold">
              <Video className="w-3.5 h-3.5 text-blue-600" />
              <span>Google Meet &amp; WebRTC HD Engine</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">
              Họp Video / Gọi Thoại &amp; Chia Sẻ Màn Hình
            </h2>
            <p className="text-xs md:text-sm text-zinc-600 leading-relaxed">
              Khi chat chữ không đủ rõ hoặc cần thảo luận nhanh, bắt đầu ngay cuộc họp video 1-1 hoặc cả nhóm. Hệ thống tích hợp chia sẻ màn hình 1080p, phụ đề dịch trực tiếp, bảng trắng chung, tóm tắt AI tự động và cơ chế thích ứng WebRTC.
            </p>

            {/* Primary Actions: New Meeting & Join by Code */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              {/* New Meeting Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setNewMeetingDropdownOpen((prev) => !prev)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Cuộc họp mới</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {newMeetingDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-zinc-200 p-1.5 z-50 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        setNewMeetingDropdownOpen(false);
                        handleStartMeeting('Cuộc họp tức thì (Instant Meeting)', undefined, false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 text-xs text-zinc-800 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Video className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-semibold block">Bắt đầu cuộc họp tức thì</span>
                        <span className="text-[10px] text-zinc-400">Vào phòng Google Meet ngay</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setNewMeetingDropdownOpen(false);
                        const meetLink = `https://meet.collab.io/sync-${Date.now().toString().slice(-4)}`;
                        navigator.clipboard?.writeText(meetLink);
                        showToast(`Đã tạo liên kết cuộc họp và sao chép vào bộ nhớ tạm: ${meetLink}`);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 text-xs text-zinc-800 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-semibold block">Tạo liên kết cuộc họp</span>
                        <span className="text-[10px] text-zinc-400">Sao chép link gửi cho đồng nghiệp</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setNewMeetingDropdownOpen(false);
                        setScheduleModalOpen(true);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 text-xs text-zinc-800 hover:text-blue-700 flex items-center gap-2.5 transition-colors border-t border-zinc-100 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-semibold block">Lên lịch cuộc họp</span>
                        <span className="text-[10px] text-zinc-400">Tích hợp Google Calendar / Outlook</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Join by Code / Link */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={meetInputCode}
                    onChange={(e) => setMeetInputCode(e.target.value)}
                    placeholder="Nhập mã hoặc đường link..."
                    className="w-48 sm:w-56 pl-8 pr-3 py-2 bg-white border border-zinc-200/90 rounded-2xl text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <Monitor className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                </div>
                <button
                  onClick={() => {
                    const code = meetInputCode.trim() || 'meet.collab.io/sprint-102';
                    handleStartMeeting('Cuộc họp theo mã phòng', code, false);
                  }}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-black text-white rounded-2xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Tham gia
                </button>
              </div>
            </div>
          </div>

          {/* Instant Audio Huddle Card */}
          <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs lg:w-80 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <Headphones className="w-4 h-4 text-emerald-600" />
                <span>Họp ngay (Audio Huddle)</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                2 đang nói
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Phòng thoại nhẹ không cần lên lịch, bấm vào là nói chuyện như đứng cạnh nhau ở văn phòng.
            </p>
            <div className="flex items-center justify-between pt-1">
              <div className="flex -space-x-1.5">
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">A</div>
                <div className="w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">L</div>
              </div>
              <button
                onClick={() => {
                  setIsHuddleActive((prev) => !prev);
                  showToast(!isHuddleActive ? 'Đã tham gia phòng thoại Huddle!' : 'Đã rời phòng thoại Huddle.');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isHuddleActive ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isHuddleActive ? 'Rời Huddle' : 'Vào đàm thoại'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Scheduled Meetings List */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-zinc-900">Cuộc Họp Sắp Diễn Ra Hôm Nay</h3>
          </div>
          <button
            onClick={() => setScheduleModalOpen(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lên lịch mới (.ics)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Meeting 1: Ready to join */}
          <div className="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/20 space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                10:00 - 11:00 (Đang diễn ra)
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-900">Sprint Review &amp; Rà Soát Kiến Trúc CRDT</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">Phòng 102 • 4 thành viên đang họp</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-emerald-100">
              <span className="text-[10px] font-mono text-zinc-400">meet.collab.io/crdt-sync</span>
              <button
                onClick={() => handleStartMeeting('Sprint Review & Rà Soát Kiến Trúc CRDT', 'meet.collab.io/crdt-sync', false)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Tham gia ngay
              </button>
            </div>
          </div>

          {/* Meeting 2 */}
          <div className="p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-700 text-[10px] font-mono font-semibold">
                14:30 - 15:15
              </span>
              <span className="text-[10px] text-zinc-400">Chiều nay</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-900">Tối ưu hóa WebRTC Adaptive Bitrate</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">Kênh #team-backend • Alice Tech, Lê Hoàng</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60">
              <span className="text-[10px] font-mono text-zinc-400">meet.collab.io/webrtc-opt</span>
              <button
                onClick={() => handleStartMeeting('Tối ưu hóa WebRTC Adaptive Bitrate', 'meet.collab.io/webrtc-opt', false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Tham gia
              </button>
            </div>
          </div>

          {/* Meeting 3 */}
          <div className="p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-700 text-[10px] font-mono font-semibold">
                16:00 - 16:30
              </span>
              <span className="text-[10px] text-zinc-400">Cuối ngày</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-900">1-1 Trao đổi Tiến độ Sprint (Lead &amp; PM)</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">Trần Thị Linh &amp; Nguyễn Văn Nam</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60">
              <span className="text-[10px] font-mono text-zinc-400">meet.collab.io/1on1-lead</span>
              <button
                onClick={() => handleStartMeeting('1-1 Trao đổi Tiến độ Sprint (Lead & PM)', 'meet.collab.io/1on1-lead', false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Tham gia
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recordings Archive & Past AI Summaries */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Kho Lưu Trữ Bản Ghi &amp; Biên Bản AI</h3>
            <p className="text-xs text-zinc-500">Xem lại video ghi hình và các hành động đã được trích xuất tự động vào bảng Kanban.</p>
          </div>
          <span className="px-2.5 py-1 bg-zinc-100 rounded-full text-xs font-mono text-zinc-600">
            2 bản ghi video
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 transition-colors flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="text-xs font-bold text-zinc-900">Bản ghi Sprint Planning #24.webm</span>
              </div>
              <p className="text-[11px] text-zinc-500">Hôm qua • Thời lượng 54:12 • 480 MB • WebRTC HD</p>
            </div>
            <button
              onClick={() => {
                const sampleBlob = new Blob(['Collab Workspace Meeting Recording WebM Stream'], { type: 'video/webm' });
                const url = URL.createObjectURL(sampleBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'recording_sprint_24.webm';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Đang tải tệp recording_sprint_24.webm về máy!');
              }}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải video</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 transition-colors flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <span className="text-xs font-bold text-zinc-900">Bản ghi Kiến Trúc RFC Consensus.webm</span>
              </div>
              <p className="text-[11px] text-zinc-500">3 ngày trước • Thời lượng 32:40 • 290 MB • WebRTC HD</p>
            </div>
            <button
              onClick={() => {
                const sampleBlob = new Blob(['Collab Workspace Meeting Recording WebM Stream'], { type: 'video/webm' });
                const url = URL.createObjectURL(sampleBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'recording_rfc_consensus.webm';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Đang tải tệp recording_rfc_consensus.webm về máy!');
              }}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải video</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guideline Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              Hướng Dẫn Lựa Chọn Hình Thức Giao Tiếp Phù Hợp
            </h3>
            <p className="text-xs text-zinc-500">
              Chuẩn quy ước giúp nhóm cộng tác hiệu quả, không bị quá tải họp hay chậm trễ công việc.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-zinc-100 rounded-full text-xs font-mono text-zinc-600">
            Quy ước nhóm
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <th className="py-2.5 px-4">Tình huống công việc</th>
                <th className="py-2.5 px-4">Hình thức nên dùng</th>
                <th className="py-2.5 px-4">Lợi ích cốt lõi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <tr className="hover:bg-zinc-50/50">
                <td className="py-3 px-4 font-semibold text-zinc-900">Hỏi một câu ngắn, không gấp</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <MessageSquare className="w-3 h-3" /> Nhắn tin trong kênh hoặc thread
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-600">Không ngắt quãng sự tập trung của đồng nghiệp (bất đồng bộ)</td>
              </tr>
              <tr className="hover:bg-zinc-50/50">
                <td className="py-3 px-4 font-semibold text-zinc-900">Cần bàn nhanh 5 đến 10 phút</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Headphones className="w-3 h-3" /> Huddle hoặc gọi thoại nhẹ
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-600">Giải quyết tức thì như đứng cạnh nhau, không cần link họp</td>
              </tr>
              <tr className="hover:bg-zinc-50/50">
                <td className="py-3 px-4 font-semibold text-zinc-900">Họp có nhiều người, có trình bày slide</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    <Video className="w-3 h-3" /> Họp video có chia sẻ màn hình
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-600">Trực quan, thấy biểu cảm và nội dung slide rõ ràng</td>
              </tr>
              <tr className="hover:bg-zinc-50/50">
                <td className="py-3 px-4 font-semibold text-zinc-900">Cần lưu lại để người vắng mặt xem</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <Sparkles className="w-3 h-3" /> Họp có ghi hình và biên bản AI
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-600">Không ai bị bỏ rơi thông tin, tự động xuất việc vào Kanban</td>
              </tr>
              <tr className="hover:bg-zinc-50/50">
                <td className="py-3 px-4 font-semibold text-zinc-900">Góp ý cho tài liệu, văn bản</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <FileText className="w-3 h-3" /> Bình luận &amp; Gợi ý sửa trực tiếp
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-600">Giữ nguyên ngữ cảnh đoạn văn, có nút Chấp nhận/Từ chối</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
