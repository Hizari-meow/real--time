'use client';

import React, { useState } from 'react';
import { Smile, Heart, Flame, Sparkles, X } from 'lucide-react';

interface StickerPickerProps {
  onSelectSticker: (stickerEmoji: string, label: string) => void;
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

export const STICKER_PACKS = [
  {
    id: 'emotions',
    name: 'Cảm xúc',
    icon: Smile,
    items: [
      { emoji: '🤣', label: 'Cười vỡ bụng' },
      { emoji: '🥰', label: 'Yêu thương' },
      { emoji: '🥳', label: 'Ăn mừng' },
      { emoji: '😎', label: 'Ngầu đét' },
      { emoji: '🤩', label: 'Mắt sao' },
      { emoji: '😴', label: 'Buồn ngủ' },
      { emoji: '😭', label: 'Khóc to' },
      { emoji: '😱', label: 'Hốt hoảng' },
      { emoji: '🤔', label: 'Suy tư' },
      { emoji: '🤗', label: 'Ôm ấm áp' },
      { emoji: '😇', label: 'Thiên thần' },
      { emoji: '🤑', label: 'Tiền tài' },
    ],
  },
  {
    id: 'work',
    name: 'Công việc & IT',
    icon: Flame,
    items: [
      { emoji: '🚀', label: 'Deploy Production' },
      { emoji: '💻', label: 'Đang code miệt mài' },
      { emoji: '🔥', label: 'Cháy deadline' },
      { emoji: '💯', label: 'Chuẩn 100 điểm' },
      { emoji: '👍', label: 'Đồng ý / OK' },
      { emoji: '🤝', label: 'Bắt tay chốt đơn' },
      { emoji: '☕', label: 'Nghỉ giải lao làm ly cà phê' },
      { emoji: '🎯', label: 'Đạt mục tiêu Sprint' },
      { emoji: '⚡', label: 'Tốc độ tia chớp' },
      { emoji: '🛠️', label: 'Fixing bug' },
      { emoji: '📈', label: 'Tăng trưởng vượt bậc' },
      { emoji: '🏆', label: 'Vô địch' },
    ],
  },
  {
    id: 'cute',
    name: 'Dễ thương',
    icon: Heart,
    items: [
      { emoji: '🐱', label: 'Mèo con meo meo' },
      { emoji: '🐰', label: 'Thỏ tăng động' },
      { emoji: '🐶', label: 'Cún con trung thành' },
      { emoji: '🐼', label: 'Gấu trúc lười biếng' },
      { emoji: '💖', label: 'Bắn tim nè' },
      { emoji: '✨', label: 'Lấp lánh' },
      { emoji: '💐', label: 'Tặng hoa' },
      { emoji: '🎂', label: 'Chúc mừng sinh nhật' },
      { emoji: '🍻', label: 'Cụng ly cuối tuần' },
      { emoji: '🎁', label: 'Món quà bất ngờ' },
    ],
  },
];

export const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞',
  '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '🔥', '⭐', '✨', '⚡', '💥', '🎉', '🎊', '🎈', '🎁', '🏆'
];

export const StickerPicker: React.FC<StickerPickerProps> = ({
  onSelectSticker,
  onSelectEmoji,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'stickers' | 'emojis'>('stickers');
  const [selectedPack, setSelectedPack] = useState(0);

  return (
    <div className="absolute bottom-14 left-4 z-40 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col font-sans animate-in slide-in-from-bottom-2 duration-150">
      {/* Top tabs */}
      <div className="h-10 px-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('stickers')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'stickers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Nhãn dán (Sticker)
          </button>
          <button
            onClick={() => setActiveTab('emojis')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'emojis'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Biểu cảm (Emoji)
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content area */}
      <div className="h-64 overflow-y-auto p-3">
        {activeTab === 'stickers' ? (
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              {STICKER_PACKS[selectedPack].name}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {STICKER_PACKS[selectedPack].items.map((stk, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSticker(stk.emoji, stk.label)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-blue-50/70 hover:scale-110 transition-all group"
                  title={stk.label}
                >
                  <span className="text-3xl filter drop-shadow-xs">{stk.emoji}</span>
                  <span className="text-[10px] text-zinc-500 truncate max-w-full mt-1 group-hover:text-blue-600">
                    {stk.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1.5">
            {COMMON_EMOJIS.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => onSelectEmoji(emoji)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xl hover:bg-zinc-100 hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sticker pack selector footer */}
      {activeTab === 'stickers' && (
        <div className="h-10 px-3 bg-zinc-50 border-t border-zinc-100 flex items-center gap-1 overflow-x-auto">
          {STICKER_PACKS.map((pack, idx) => {
            const Icon = pack.icon;
            const isSelected = selectedPack === idx;
            return (
              <button
                key={pack.id}
                onClick={() => setSelectedPack(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-white text-blue-600 shadow-xs border border-zinc-200/80 font-bold'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{pack.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
