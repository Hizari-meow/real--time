'use client';

import React, { useEffect, useState } from 'react';
import { X, TrendingDown, Calendar, Award, AlertCircle } from 'lucide-react';
import { Sprint, BurndownPoint } from './types';

interface BurndownChartModalProps {
  sprint: Sprint;
  apiBase: string;
  token: string | null;
  orgId: string;
  onClose: () => void;
}

export function BurndownChartModal({
  sprint,
  apiBase,
  token,
  orgId,
  onClose,
}: BurndownChartModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [burndownData, setBurndownData] = useState<{
    sprint: Sprint;
    totalStoryPoints: number;
    completedStoryPoints: number;
    burndown: BurndownPoint[];
  } | null>(null);

  useEffect(() => {
    const fetchBurndown = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${apiBase}/sprints/${sprint.id}/burndown`, {
          credentials: 'include',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-workspace-id': orgId,
          },
        });
        const json = await res.json();
        if (json.success && json.data) {
          setBurndownData(json.data);
        } else {
          setError(json.error || 'Không thể tải biểu đồ burndown');
        }
      } catch (err: any) {
        setError(err.message || 'Lỗi kết nối máy chủ');
      } finally {
        setLoading(false);
      }
    };

    fetchBurndown();
  }, [sprint.id, apiBase, token, orgId]);

  const points = burndownData?.burndown || [];
  const totalSP = burndownData?.totalStoryPoints ?? (sprint.totalStoryPoints || 0);
  const completedSP = burndownData?.completedStoryPoints ?? (sprint.completedStoryPoints || 0);
  const remainingSP = Math.max(0, totalSP - completedSP);

  // SVG Chart dimensions
  const svgWidth = 600;
  const svgHeight = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  const maxVal = Math.max(totalSP, 1);
  const numDays = Math.max(points.length - 1, 1);

  const getX = (idx: number) => padding.left + (idx / numDays) * chartW;
  const getY = (val: number) => padding.top + (1 - Math.min(val, maxVal) / maxVal) * chartH;

  const idealPath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.ideal)}`).join(' ')
    : '';

  const actualPath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.actual)}`).join(' ')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base">
                Biểu đồ Burndown — {sprint.name}
              </h3>
              <p className="text-xs text-zinc-500">
                Tính toán thời gian thực từ Story Points & mốc hoàn thành trong CSDL PostgreSQL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl">
              <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-0.5">
                Tổng Story Points
              </div>
              <div className="text-xl font-bold text-zinc-900">{totalSP} SP</div>
            </div>
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl">
              <div className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider mb-0.5">
                Đã hoàn thành
              </div>
              <div className="text-xl font-bold text-emerald-700">{completedSP} SP</div>
            </div>
            <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl">
              <div className="text-[11px] font-medium text-blue-700 uppercase tracking-wider mb-0.5">
                Điểm còn lại
              </div>
              <div className="text-xl font-bold text-blue-700">{remainingSP} SP</div>
            </div>
          </div>

          {loading ? (
            <div className="h-60 flex items-center justify-center text-zinc-400 text-sm">
              Đang tính toán dữ liệu Burndown từ CSDL...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : points.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-zinc-400 text-sm">
              Chưa có dữ liệu tiến độ cho Sprint này.
            </div>
          ) : (
            <>
              {/* SVG Chart */}
              <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs mb-2 px-2">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-zinc-500">
                      <span className="w-3 h-0.5 bg-zinc-400 inline-block border-t border-dashed border-zinc-400" />
                      Đường lý tưởng (Ideal)
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                      <span className="w-3 h-1 bg-blue-600 rounded-full inline-block" />
                      Tiến độ thực tế (Actual)
                    </span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Trục Y: Story Points • Trục X: Ngày</span>
                </div>

                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-auto min-w-[500px]"
                  >
                    {/* Y-Axis Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                      const y = padding.top + ratio * chartH;
                      const val = Math.round(maxVal * (1 - ratio));
                      return (
                        <g key={ratio}>
                          <line
                            x1={padding.left}
                            y1={y}
                            x2={svgWidth - padding.right}
                            y2={y}
                            stroke="#f1f5f9"
                            strokeWidth="1"
                          />
                          <text
                            x={padding.left - 8}
                            y={y + 4}
                            textAnchor="end"
                            fontSize="10"
                            fill="#94a3b8"
                          >
                            {val}
                          </text>
                        </g>
                      );
                    })}

                    {/* Ideal Line */}
                    {idealPath && (
                      <path
                        d={idealPath}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* Actual Line */}
                    {actualPath && (
                      <path
                        d={actualPath}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Actual Data Points */}
                    {points.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={getX(idx)}
                        cy={getY(p.actual)}
                        r="4"
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    ))}

                    {/* X-Axis Labels */}
                    {points.map((p, idx) => (
                      <text
                        key={idx}
                        x={getX(idx)}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                      >
                        {p.date.slice(5)}
                      </text>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Ngày (UTC)</th>
                      <th className="py-2 px-3 text-right">Lý tưởng (SP)</th>
                      <th className="py-2 px-3 text-right">Thực tế còn lại (SP)</th>
                      <th className="py-2 px-3 text-right">Đã hoàn thành hôm đó</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {points.map((p) => (
                      <tr key={p.date} className="hover:bg-zinc-50/50">
                        <td className="py-2 px-3 font-mono text-zinc-700">{p.date}</td>
                        <td className="py-2 px-3 text-right text-zinc-500">{p.ideal}</td>
                        <td className="py-2 px-3 text-right font-semibold text-blue-600">
                          {p.actual}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-medium">
                          {p.completedCount > 0 ? `+${p.completedCount} việc` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-semibold rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
