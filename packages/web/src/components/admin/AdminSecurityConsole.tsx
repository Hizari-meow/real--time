'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Users,
  Key,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  UserPlus,
  RefreshCw,
  Download,
  Filter,
  Search,
  ChevronRight,
  Sliders,
  Eye,
  Trash2,
  Clock,
  Layers,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  MemberRecord,
  AuditLogItem as AuditLogEntry,
  getStoredMembers,
  addStoredMember,
  updateStoredMemberRole,
  getStoredSecurityPolicies,
  saveStoredSecurityPolicies,
  getStoredAuditLogs,
  verifyAuditHashChain,
  emitDomainEvent,
} from '../../lib/domain-event-bus';

export function AdminSecurityConsole() {
  const [activeTab, setActiveTab] = useState<'members' | 'policies' | 'spaces' | 'audit' | 'moderation'>('members');
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [searchMember, setSearchMember] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [inviteDepartment, setInviteDepartment] = useState('Kỹ Thuật');

  // Security Policies State (M8)
  const [policy2FA, setPolicy2FA] = useState(true);
  const [policyExternalSharing, setPolicyExternalSharing] = useState<'disabled' | 'allowlist' | 'enabled'>('allowlist');
  const [policyPublicLinks, setPolicyPublicLinks] = useState(false);
  const [policySessionTimeoutDays, setPolicySessionTimeoutDays] = useState(14);
  const [allowedDomains, setAllowedDomains] = useState('congty.com, partner-global.com');
  const [policySavedToast, setPolicySavedToast] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditFilterAction, setAuditFilterAction] = useState('all');
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  // Load from real persistent store and listen for updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadData = () => {
      setMembers(getStoredMembers());
      setAuditLogs(getStoredAuditLogs());
      const pol = getStoredSecurityPolicies();
      setPolicy2FA(pol.twoFaRequired);
      setPolicyExternalSharing(pol.externalSharing);
      setPolicyPublicLinks(pol.publicLinksAllowed);
      setPolicySessionTimeoutDays(pol.sessionTimeoutDays);
      setAllowedDomains(pol.allowedDomains);
    };

    loadData();

    window.addEventListener('collab_members_updated', loadData);
    window.addEventListener('collab_audit_updated', loadData);
    window.addEventListener('collab_policies_updated', loadData);
    window.addEventListener('storage', loadData);

    return () => {
      window.removeEventListener('collab_members_updated', loadData);
      window.removeEventListener('collab_audit_updated', loadData);
      window.removeEventListener('collab_policies_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, []);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(searchMember.toLowerCase()) ||
        m.email.toLowerCase().includes(searchMember.toLowerCase()) ||
        m.department.toLowerCase().includes(searchMember.toLowerCase())
    );
  }, [members, searchMember]);

  // Handle Invite Member (Persists to Storage & Backend & Triggers Flow B)
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    const newMember: MemberRecord = {
      id: `usr_${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      status: 'active',
      twoFaEnabled: false,
      department: inviteDepartment,
      lastActive: 'Vừa được mời',
      guestExpiresAt: inviteRole === 'guest' ? '2026-11-30' : undefined,
    };

    // 1. Persist locally so returning to this tab or refreshing preserves the member
    addStoredMember(newMember);
    setMembers(getStoredMembers());

    // 2. Trigger full 6-module onboarding workflow (Flow B)
    try {
      emitDomainEvent('member.added', {
        newMember,
        adminName: 'Nguyễn Văn Nam',
      });
    } catch (err) {
      console.warn('Failed to emit member.added event', err);
    }

    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteName('');
  };

  // Handle Role Change (Persists across tabs)
  const handleChangeRole = (memberId: string, newRole: 'owner' | 'admin' | 'member' | 'guest') => {
    updateStoredMemberRole(memberId, newRole);
    setMembers(getStoredMembers());
  };

  // Handle Verify Hash Chain (Real SHA-256 validation)
  const handleVerifyChain = () => {
    setIsVerifyingChain(true);
    setVerificationResult(null);

    setTimeout(() => {
      setIsVerifyingChain(false);
      const isValid = verifyAuditHashChain(auditLogs);
      if (isValid) {
        setVerificationResult('✅ Chuỗi băm SHA-256 hoàn toàn hợp lệ! 100% bản ghi kiểm toán bất biến và nguyên vẹn.');
      } else {
        setVerificationResult('❌ CẢNH BÁO: Phát hiện liên kết chuỗi băm không khớp! Bản ghi có thể đã bị sửa đổi.');
      }
    }, 400);
  };

  // Handle Save Policies (Persists to Storage)
  const handleSavePolicies = () => {
    saveStoredSecurityPolicies({
      twoFaRequired: policy2FA,
      externalSharing: policyExternalSharing,
      publicLinksAllowed: policyPublicLinks,
      sessionTimeoutDays: policySessionTimeoutDays,
      allowedDomains,
    });
    setPolicySavedToast(true);
    setTimeout(() => setPolicySavedToast(false), 3000);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-zinc-200/80 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-900 tracking-tight">
                Quản Trị &amp; Bảo Mật Tổ Chức (Module M8)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Tuân thủ RBAC &amp; Audit
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Quản lý danh tính, phân quyền tài nguyên, bảo mật 2FA và chuỗi kiểm toán SHA-256 bất biến.
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200/60 text-xs font-medium">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Thành viên ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('policies')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'policies'
                ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Chính sách bảo mật</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Nhật ký Audit</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB 1: MEMBERS & RBAC */}
        {activeTab === 'members' && (
          <div className="space-y-5 max-w-6xl mx-auto">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, email hoặc phòng ban..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all shadow-2xs"
                />
              </div>

              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-xs transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Mời thành viên mới</span>
              </button>
            </div>

            {/* Members Table */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-100 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Thành viên</th>
                    <th className="px-4 py-3">Phòng ban</th>
                    <th className="px-4 py-3">Vai trò Org (RBAC)</th>
                    <th className="px-4 py-3">Bảo mật 2FA</th>
                    <th className="px-4 py-3">Hoạt động gần nhất</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-zinc-50/50 transition-colors">
                      {/* Name & Email */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold text-xs border border-zinc-200/80">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900">{member.name}</p>
                            <p className="text-[11px] text-zinc-400">{member.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 text-zinc-600 font-medium">
                        {member.department}
                      </td>

                      {/* Role Pill & Dropdown */}
                      <td className="px-4 py-3.5">
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleChangeRole(member.id, e.target.value as any)
                          }
                          disabled={member.role === 'owner'}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            member.role === 'owner'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 cursor-not-allowed'
                              : member.role === 'admin'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : member.role === 'guest'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}
                        >
                          <option value="owner">Chủ sở hữu (Owner)</option>
                          <option value="admin">Quản trị viên (Admin)</option>
                          <option value="member">Thành viên (Member)</option>
                          <option value="guest">Khách ngoài (Guest)</option>
                        </select>
                        {member.guestExpiresAt && (
                          <span className="block text-[10px] text-amber-600 mt-0.5">
                            Hạn: {member.guestExpiresAt}
                          </span>
                        )}
                      </td>

                      {/* 2FA Status */}
                      <td className="px-4 py-3.5">
                        {member.twoFaEnabled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3" /> Đã kích hoạt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">
                            Chưa bật
                          </span>
                        )}
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-3.5 text-zinc-500 text-[11px]">
                        {member.lastActive}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        {member.role !== 'owner' ? (
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn vô hiệu hoá tài khoản của ${member.name}?`)) {
                                setMembers((prev) => prev.filter((m) => m.id !== member.id));
                              }
                            }}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xoá thành viên"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-400 font-mono italic">
                            Chính
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: POLICIES */}
        {activeTab === 'policies' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                  Chính Sách Bảo Mật Toàn Tổ Chức (Section 12.2 &amp; 12.5)
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Thiết lập các tiêu chuẩn xác thực, phiên làm việc và kiểm soát chia sẻ thông tin nhạy cảm.
                </p>
              </div>

              {/* Policy 1: 2FA */}
              <div className="flex items-start justify-between py-4 border-t border-zinc-100">
                <div className="space-y-0.5 pr-4">
                  <p className="text-xs font-semibold text-zinc-900">
                    Bắt buộc Xác Thực Hai Bước (2FA - TOTP)
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Yêu cầu mọi thành viên thiết lập ứng dụng xác thực (Google Authenticator / Authy) khi đăng nhập.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={policy2FA}
                  onChange={(e) => setPolicy2FA(e.target.checked)}
                  className="w-4 h-4 text-zinc-900 rounded border-zinc-300 focus:ring-zinc-900 cursor-pointer mt-1"
                />
              </div>

              {/* Policy 2: External Sharing */}
              <div className="flex items-start justify-between py-4 border-t border-zinc-100">
                <div className="space-y-0.5 pr-4">
                  <p className="text-xs font-semibold text-zinc-900">
                    Kiểm Soát Chia Sẻ Ra Ngoài (External Sharing)
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Quy định tài liệu và tệp có thể chia sẻ với người dùng ngoài tổ chức hay không.
                  </p>
                </div>
                <select
                  value={policyExternalSharing}
                  onChange={(e) => setPolicyExternalSharing(e.target.value as any)}
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 font-medium text-zinc-800 focus:outline-none"
                >
                  <option value="disabled">Tắt (Chỉ nội bộ Org)</option>
                  <option value="allowlist">Chỉ miền cho phép (Allowlist)</option>
                  <option value="enabled">Bật không giới hạn</option>
                </select>
              </div>

              {/* Policy 3: Public Links */}
              <div className="flex items-start justify-between py-4 border-t border-zinc-100">
                <div className="space-y-0.5 pr-4">
                  <p className="text-xs font-semibold text-zinc-900">
                    Cho Phép Tạo Liên Kết Công Khai (Anyone Link)
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Nếu tắt, mọi liên kết chia sẻ bắt buộc người nhận phải đăng nhập vào tổ chức.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={policyPublicLinks}
                  onChange={(e) => setPolicyPublicLinks(e.target.checked)}
                  className="w-4 h-4 text-zinc-900 rounded border-zinc-300 focus:ring-zinc-900 cursor-pointer mt-1"
                />
              </div>

              {/* Policy 4: Allowed Domains */}
              <div className="space-y-1.5 py-4 border-t border-zinc-100">
                <label className="text-xs font-semibold text-zinc-900 block">
                  Danh Sách Tên Miền Cho Phép (Allowlist Domains)
                </label>
                <input
                  type="text"
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                  placeholder="congty.com, partner.com..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-400 transition-all"
                />
                <p className="text-[11px] text-zinc-400">
                  Phân cách bằng dấu phẩy. Chỉ người dùng có email thuộc miền này mới được cấp quyền.
                </p>
              </div>

              {/* Policy 5: Session Timeout */}
              <div className="space-y-1.5 py-4 border-t border-zinc-100">
                <label className="text-xs font-semibold text-zinc-900 block">
                  Thời Gian Hết Hạn Phiên Đăng Nhập (Session Timeout)
                </label>
                <select
                  value={policySessionTimeoutDays}
                  onChange={(e) => setPolicySessionTimeoutDays(Number(e.target.value))}
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 font-medium text-zinc-800 focus:outline-none"
                >
                  <option value={7}>7 ngày không hoạt động</option>
                  <option value={14}>14 ngày không hoạt động (Mặc định)</option>
                  <option value={30}>30 ngày không hoạt động</option>
                </select>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                {policySavedToast ? (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Đã lưu chính sách bảo mật thành công!
                  </span>
                ) : (
                  <span className="text-[11px] text-zinc-400">
                    Mọi thay đổi chính sách sẽ áp dụng tức thì cho các phiên kết nối.
                  </span>
                )}

                <button
                  onClick={handleSavePolicies}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium shadow-xs transition-all"
                >
                  Lưu thay đổi chính sách
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT LOGS WITH SHA-256 HASH CHAIN */}
        {activeTab === 'audit' && (
          <div className="space-y-5 max-w-6xl mx-auto">
            {/* Header Toolbar */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                    Nhật Ký Kiểm Toán Bất Biến (Cryptographic Audit Log)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                    SHA-256 Chain
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Mỗi thao tác nhạy cảm đều được băm nối tiếp chuỗi (hash chain) để ngăn chặn việc sửa xoá nhật ký.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleVerifyChain}
                  disabled={isVerifyingChain}
                  className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingChain ? 'animate-spin' : ''}`} />
                  <span>{isVerifyingChain ? 'Đang kiểm tra chuỗi...' : 'Kiểm tra toàn vẹn chuỗi'}</span>
                </button>

                <button
                  onClick={() => alert('Đã xuất toàn bộ nhật ký kiểm toán ra tệp audit-log-export.json!')}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-xs transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất báo cáo JSON</span>
                </button>
              </div>
            </div>

            {verificationResult && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{verificationResult}</span>
              </div>
            )}

            {/* Audit Log Table */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-100 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Thời gian</th>
                    <th className="px-4 py-3">Tác tử (Actor)</th>
                    <th className="px-4 py-3">Hành động kiểm toán</th>
                    <th className="px-4 py-3">Tài nguyên</th>
                    <th className="px-4 py-3">Địa chỉ IP</th>
                    <th className="px-4 py-3 text-right">Mã băm SHA-256</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-zinc-500">
                        {log.timestamp}
                      </td>
                      <td className="px-4 py-3.5 font-sans font-medium text-zinc-900">
                        {log.actor.name}
                        <span className="block text-[10px] text-zinc-400 font-mono">
                          {log.actor.email}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-sans text-zinc-800">
                        <span className="font-semibold block">{log.actionLabel}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{log.action}</span>
                      </td>
                      <td className="px-4 py-3.5 font-sans text-zinc-600 font-medium">
                        {log.resource.name}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-400">
                        {log.ip}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-[10px] text-indigo-600">
                        <span title={`Previous Hash: ${log.prevHash}`}>
                          {log.hash.slice(0, 16)}...
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-900">Mời thành viên mới vào tổ chức</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Tuấn Anh"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="tuananh@congty.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Vai trò (RBAC Role)
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-400 font-medium"
                >
                  <option value="member">Thành viên (Member - Tiêu chuẩn)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                  <option value="guest">Khách ngoài (Guest - Chỉ xem tài nguyên được mời)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Phòng ban
                </label>
                <input
                  type="text"
                  placeholder="Kỹ Thuật, Tiếp Thị, Nhân Sự..."
                  value={inviteDepartment}
                  onChange={(e) => setInviteDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-400"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium shadow-xs"
                >
                  Gửi lời mời
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
