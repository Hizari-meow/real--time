'use client';

import React from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageViewerModalProps {
  imageUrl: string | null;
  caption?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  imageUrl,
  caption,
  onClose,
}) => {
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  if (!imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = caption || 'zalo_image.png';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-between p-4 animate-in fade-in duration-200">
      {/* Top Header controls */}
      <div className="w-full flex items-center justify-between text-white/90 px-4 py-2">
        <div className="text-sm font-medium truncate max-w-md">
          {caption || 'Xem hình ảnh'}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Phóng to"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Xoay ảnh"
          >
            <RotateCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Tải về máy"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Image container */}
      <div className="flex-1 flex items-center justify-center overflow-hidden max-h-[85vh] max-w-[90vw]">
        <img
          src={imageUrl}
          alt={caption || 'Preview'}
          className="max-h-[80vh] max-w-[85vw] object-contain rounded-lg shadow-2xl transition-transform duration-200 select-none cursor-grab active:cursor-grabbing"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        />
      </div>

      {/* Bottom footer caption */}
      {caption && (
        <div className="text-white/80 text-xs py-2 px-4 bg-black/40 rounded-full backdrop-blur-md">
          {caption}
        </div>
      )}
    </div>
  );
};
