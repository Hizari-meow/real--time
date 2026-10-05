'use client';

import React from 'react';

export function TelemetryTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>WebSocket Node 1</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xl font-black text-zinc-900">ws-node-1:4001</p>
          <p className="text-[11px] text-zinc-400 font-mono">24 Kết nối • 0% Lỗi</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>WebSocket Node 2</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xl font-black text-zinc-900">ws-node-2:4002</p>
          <p className="text-[11px] text-zinc-400 font-mono">19 Kết nối • 0% Lỗi</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Redis 7.2 Pub/Sub</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xl font-black text-zinc-900">Port 6380</p>
          <p className="text-[11px] text-zinc-400 font-mono">Hội tụ CRDT &lt;5ms</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>NGINX Load Balancer</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xl font-black text-zinc-900">Port 8080</p>
          <p className="text-[11px] text-zinc-400 font-mono">Round-Robin Active</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-zinc-900">
          Đặc tính Kỹ thuật Kiến trúc Quy mô lớn (Scalability &amp; High Availability)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-600">
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-1">
            <h5 className="font-bold text-zinc-900">Khả năng mở rộng ngang (Horizontal Scaling)</h5>
            <p className="text-zinc-500">
              Kiến trúc Stateless WebSocket kết hợp phân tải NGINX cho phép tăng số lượng máy chủ dễ dàng khi người dùng tăng đột biến.
            </p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-1">
            <h5 className="font-bold text-zinc-900">Chịu lỗi cao (Fault Tolerance)</h5>
            <p className="text-zinc-500">
              Khi một node gặp sự cố, NGINX tự động định tuyến lại người dùng sang node còn lại mà không làm gián đoạn phiên làm việc.
            </p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-1">
            <h5 className="font-bold text-zinc-900">Nhất quán dữ liệu (CRDT Consistency)</h5>
            <p className="text-zinc-500">
              Sử dụng Yjs CRDT đảm bảo mọi thao tác gõ chữ, tính toán bảng tính, kéo task và vẽ bảng trắng đều hội tụ chính xác 100%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
