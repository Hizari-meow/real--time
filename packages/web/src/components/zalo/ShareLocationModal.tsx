'use client';

import React, { useState } from 'react';
import { X, MapPin, Navigation, Send } from 'lucide-react';

interface ShareLocationModalProps {
  isOpen: boolean;
  onShare: (locationName: string, lat: number, lng: number) => void;
  onClose: () => void;
}

const PRESET_LOCATIONS = [
  { name: 'Landmark 81, Vinhomes Central Park, TP. Hồ Chí Minh', lat: 10.795, lng: 106.7218 },
  { name: 'Bitexco Financial Tower, Quận 1, TP. Hồ Chí Minh', lat: 10.7716, lng: 106.7044 },
  { name: 'Hồ Hoàn Kiếm, Quận Hoàn Kiếm, Hà Nội', lat: 21.0285, lng: 105.8542 },
  { name: 'Khu Công Nghệ Cao (SHTP), TP. Thủ Đức', lat: 10.8522, lng: 106.7865 },
];

export function ShareLocationModal({ isOpen, onShare, onClose }: ShareLocationModalProps) {
  const [selected, setSelected] = useState(PRESET_LOCATIONS[0]);
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  const handleSend = () => {
    if (customName.trim()) {
      onShare(customName.trim(), selected.lat, selected.lng);
    } else {
      onShare(selected.name, selected.lat, selected.lng);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="h-16 px-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Gửi vị trí thời gian thực</h3>
              <p className="text-[11px] text-zinc-500">Chia sẻ tọa độ bản đồ vào hội thoại</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-2">
              Chọn địa điểm phổ biến
            </label>
            <div className="space-y-1.5">
              {PRESET_LOCATIONS.map((loc) => {
                const isSelected = selected.name === loc.name;
                return (
                  <div
                    key={loc.name}
                    onClick={() => {
                      setSelected(loc);
                      setCustomName('');
                    }}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-rose-50/60 border-rose-200 text-rose-950 shadow-xs'
                        : 'bg-zinc-50 border-zinc-200/60 hover:bg-zinc-100/70 text-zinc-700'
                    }`}
                  >
                    <Navigation className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-rose-600' : 'text-zinc-400'}`} />
                    <div className="text-xs">
                      <p className="font-semibold">{loc.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        Tọa độ: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Hoặc nhập tên địa điểm tùy chỉnh
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="VD: Quán Cafe The Coffee House, Đường Nguyễn Huệ..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-rose-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-200/70 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSend}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-transform active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi vị trí này</span>
          </button>
        </div>
      </div>
    </div>
  );
}
