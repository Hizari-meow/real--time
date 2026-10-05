'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, User, Building, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export function AuthModal() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        const res = await register(email, password, name, orgName);
        if (!res.success) {
          setError(res.error || 'Đăng ký thất bại');
        }
      } else {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'Đăng nhập thất bại');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill helper for development testers
  const handleQuickLogin = (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword('Password123!');
    setIsRegister(false);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200 font-sans">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-100 bg-gradient-to-b from-zinc-50 to-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">
            {isRegister ? 'Tạo Tài Khoản Doanh Nghiệp' : 'Đăng Nhập Nền Tảng'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {isRegister
              ? 'Khởi tạo không gian làm việc an toàn với kiểm soát phân quyền RBAC'
              : 'Xác thực định danh thực tế để truy cập không gian cộng tác'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Họ và tên</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn Nam"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-zinc-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Tên tổ chức / Không gian làm việc (tùy chọn)</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Tập đoàn Sáng Tạo (để trống nếu tham gia mặc định)"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-zinc-900 font-medium"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Email công việc</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nam@collab.local"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-zinc-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Mật khẩu bảo mật</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-zinc-900 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>{isSubmitting ? 'Đang xác thực...' : isRegister ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Development Quick Role Switcher */}
        {!isRegister && (
          <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center mb-2">
              Tài khoản Seed thử nghiệm (Mật khẩu: Password123!)
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('owner@collab.local')}
                className="p-1.5 bg-white border border-zinc-200 hover:border-blue-400 rounded-lg text-[10px] font-semibold text-zinc-700 transition-all text-center"
              >
                👑 Owner
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@collab.local')}
                className="p-1.5 bg-white border border-zinc-200 hover:border-emerald-400 rounded-lg text-[10px] font-semibold text-zinc-700 transition-all text-center"
              >
                🛡️ Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('member@collab.local')}
                className="p-1.5 bg-white border border-zinc-200 hover:border-purple-400 rounded-lg text-[10px] font-semibold text-zinc-700 transition-all text-center"
              >
                👤 Member
              </button>
            </div>
          </div>
        )}

        {/* Toggle footer */}
        <div className="p-4 text-center border-t border-zinc-100 bg-white">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            {isRegister
              ? 'Đã có tài khoản? Đăng nhập ngay'
              : 'Chưa có tài khoản? Đăng ký tổ chức mới'}
          </button>
        </div>
      </div>
    </div>
  );
}
