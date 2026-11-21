'use client';

import React, { useState, useEffect } from 'react';
import { X, BookOpen, Layers } from 'lucide-react';
import { WikiPage, WIKI_AREAS } from './types';

interface WikiPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pageData: Partial<WikiPage>) => void;
  editingPage: WikiPage | null;
  existingPages: WikiPage[];
}

export function WikiPageModal({
  isOpen,
  onClose,
  onSave,
  editingPage,
  existingPages,
}: WikiPageModalProps) {
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState('sop');
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('SOP');
  const [parentId, setParentId] = useState<string>('');
  const [tags, setTags] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [icon, setIcon] = useState('📄');

  useEffect(() => {
    if (editingPage) {
      setTitle(editingPage.title || '');
      setAreaId(editingPage.areaId || 'sop');
      setTopic(editingPage.topic || '');
      setType(editingPage.type || 'SOP');
      setParentId(editingPage.parentId || '');
      setTags(Array.isArray(editingPage.tags) ? editingPage.tags.join(', ') : '');
      setSummary(editingPage.summary || '');
      setContent(editingPage.content || '');
      setIcon(editingPage.icon || '📄');
    } else {
      setTitle('');
      setAreaId('sop');
      setTopic('Quy trình chuẩn');
      setType('SOP');
      setParentId('');
      setTags('#sop, #quy-trinh');
      setSummary('');
      setContent(
        `## 📌 1. Mục đích\n[Mô tả mục đích và phạm vi áp dụng]\n\n## ⚙️ 2. Các bước thực hiện\n1. Bước 1...\n2. Bước 2...\n\n## ⚠️ 3. Lưu ý & Ngoại lệ\n- Điểm cần chú ý khi vận hành.`
      );
      setIcon('📋');
    }
  }, [editingPage, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));

    const selectedAreaMeta = WIKI_AREAS.find((a) => a.id === areaId);

    onSave({
      title: title.trim(),
      areaId,
      areaName: selectedAreaMeta?.name,
      topic: topic.trim(),
      type,
      parentId: parentId || null,
      tags: parsedTags,
      summary: summary.trim(),
      content: content.trim(),
      icon: icon.trim() || '📄',
    });
  };

  const eligibleParents = existingPages.filter(
    (p) => !editingPage || p.id !== editingPage.id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/10 text-blue-400 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {editingPage ? 'Chỉnh sửa tài liệu Wiki' : 'Tạo tài liệu Tri thức / SOP mới'}
              </h3>
              <p className="text-xs text-slate-400">
                Lưu vào hệ thống cơ sở dữ liệu PostgreSQL của doanh nghiệp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* Row 1: Icon & Title */}
          <div className="flex items-center gap-3">
            <div className="w-16">
              <label className="block text-xs font-medium text-slate-400 mb-1">Icon</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-2 text-center text-lg text-white focus:outline-none focus:border-blue-500"
                maxLength={4}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Tiêu đề tài liệu <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Quy trình On-call Xử lý sự cố máy chủ..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Row 2: Area & Parent Node */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Khu vực tri thức</label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {WIKI_AREAS.filter((a) => a.id !== 'all' && a.id !== 'archive').map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Trang cha (Phân cấp cây thư mục)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Cấp cao nhất (Gốc) --</option>
                {eligibleParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Topic & Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Chủ đề chi tiết</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="VD: Hạ tầng, Tuyển dụng..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Loại tài liệu</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="SOP">SOP (Quy trình chuẩn)</option>
                <option value="Hướng dẫn">Hướng dẫn kỹ thuật</option>
                <option value="Biên bản">Biên bản họp / Quyết định</option>
                <option value="Mẫu">Mẫu & Biểu mẫu</option>
                <option value="FAQ">Câu hỏi thường gặp (FAQ)</option>
                <option value="Dự án">Tài liệu dự án</option>
              </select>
            </div>
          </div>

          {/* Row 4: Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Thẻ phân loại (ngăn cách bởi dấu phẩy)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="VD: #sop, #infra, #redis"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Row 5: Summary */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tóm tắt ngắn</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="Tóm tắt 1-2 câu để đồng nghiệp nắm nhanh nội dung chính..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Row 6: Content */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Nội dung chi tiết (Markdown hỗ trợ)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={9}
              placeholder="Viết nội dung tài liệu ở đây..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              {editingPage ? 'Lưu thay đổi' : 'Tạo và xuất bản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
