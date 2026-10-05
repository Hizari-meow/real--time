'use client';

import React from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Clock,
  Sparkles,
  HelpCircle,
  Volume2,
  CheckSquare,
  BookOpen,
} from 'lucide-react';
import { STANDARD_WORKSHOP_STEPS, WorkshopStep } from './types';

interface BrainstormWorkshopModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStepId: number;
  setCurrentStepId: (stepId: number) => void;
  timerSeconds: number;
  setTimerSeconds: React.Dispatch<React.SetStateAction<number>>;
  isTimerRunning: boolean;
  setIsTimerRunning: (running: boolean) => void;
  onStartVotingShortcut: () => void;
  onBatchCreateTasks?: () => void;
  onExportToWiki?: () => void;
}

export function BrainstormWorkshopModal({
  isOpen,
  onClose,
  currentStepId,
  setCurrentStepId,
  timerSeconds,
  setTimerSeconds,
  isTimerRunning,
  setIsTimerRunning,
  onStartVotingShortcut,
  onBatchCreateTasks,
  onExportToWiki,
}: BrainstormWorkshopModalProps) {
  if (!isOpen) return null;

  const currentStep =
    STANDARD_WORKSHOP_STEPS.find((s) => s.id === currentStepId) || STANDARD_WORKSHOP_STEPS[0];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const setDuration = (mins: number) => {
    setIsTimerRunning(false);
    setTimerSeconds(mins * 60);
  };

  const handleNextStep = () => {
    if (currentStepId < STANDARD_WORKSHOP_STEPS.length) {
      const next = currentStepId + 1;
      setCurrentStepId(next);
      const nextStepObj = STANDARD_WORKSHOP_STEPS.find((s) => s.id === next);
      if (nextStepObj) {
        setDuration(nextStepObj.durationMinutes);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Lộ Trình Buổi Họp Động Não (Workshop 6 Bước)
              </h3>
              <p className="text-xs text-zinc-500">
                Quy trình chuẩn giúp cả nhóm bứt phá ý tưởng và chốt hành động đúng giờ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Active Step Highlight Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 pointer-events-none">
              <Sparkles className="w-48 h-48" />
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
                Giai đoạn {currentStep.id} / 6
              </span>
              <div className="text-2xl font-mono font-extrabold tracking-tight bg-black/20 px-3 py-1 rounded-xl">
                {formatTime(timerSeconds)}
              </div>
            </div>

            <h4 className="text-lg font-bold mb-1">{currentStep.title}</h4>
            <p className="text-sm text-blue-100 mb-4">{currentStep.description}</p>

            <div className="p-3 bg-white/10 rounded-xl border border-white/15 text-xs text-white/95 leading-relaxed flex items-start gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-200" />
              <span>
                <strong>Hướng dẫn người điều phối:</strong> {currentStep.instruction}
              </span>
            </div>

            {/* Timer Controls Bar */}
            <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isTimerRunning
                      ? 'bg-amber-400 hover:bg-amber-500 text-amber-950'
                      : 'bg-white hover:bg-blue-50 text-blue-900'
                  }`}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" /> Tạm dừng
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" /> Bắt đầu đếm
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDuration(currentStep.durationMinutes)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                  title="Đặt lại đồng hồ"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-blue-200 mr-1 text-[11px]">Đổi thời gian:</span>
                {[3, 5, 10, 15].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDuration(m)}
                    className="px-2 py-1 rounded-lg bg-white/15 hover:bg-white/30 text-white font-semibold text-[11px]"
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Box for Step 6: Chốt kế hoạch & Chuyển giao */}
          {currentStepId === 6 && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Hành Động Chốt Buổi Họp (Liên kết Module M3 &amp; M6)</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Biến các ý tưởng đột phá thành hành động thực tế: Giao việc tự động sang <strong>Bảng Kanban (M3)</strong> kèm liên kết 2 chiều, hoặc lưu trữ toàn bộ biên bản thảo luận vào <strong>Wiki Tri thức (M6)</strong>.
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {onBatchCreateTasks && (
                  <button
                    type="button"
                    onClick={onBatchCreateTasks}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-transform active:scale-95"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Tạo Task Kanban từ các ghi chú top vote (M3)</span>
                  </button>
                )}
                {onExportToWiki && (
                  <button
                    type="button"
                    onClick={onExportToWiki}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-transform active:scale-95"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Lưu biên bản vào Wiki (M6)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Steps Timeline Checklist */}
          <div>
            <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
              Danh Sách Các Bước Trong Buổi Họp
            </h5>
            <div className="space-y-2">
              {STANDARD_WORKSHOP_STEPS.map((step) => {
                const isActive = step.id === currentStepId;
                const isPassed = step.id < currentStepId;

                return (
                  <div
                    key={step.id}
                    onClick={() => {
                      setCurrentStepId(step.id);
                      setDuration(step.durationMinutes);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500'
                        : isPassed
                        ? 'border-zinc-200 bg-zinc-50/70 text-zinc-600 hover:bg-zinc-100'
                        : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isPassed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {step.id}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                          <span>{step.title}</span>
                          {step.id === 5 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                              Có bình chọn
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 line-clamp-1">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-zinc-400">
                        {step.durationMinutes} phút
                      </span>
                      {isActive && <ChevronRight className="w-4 h-4 text-blue-600" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-zinc-400" />
            <span>Âm thanh chuông báo tự động kích hoạt khi hết giờ.</span>
          </div>

          <div className="flex items-center gap-2">
            {currentStepId === 5 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartVotingShortcut();
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
              >
                Mở phiên bình chọn ngay ⭐
              </button>
            )}

            {currentStepId < 6 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                <span>Sang bước tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                Hoàn tất buổi Brainstorm 🎉
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
