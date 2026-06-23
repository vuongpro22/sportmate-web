import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import {
  fetchAdminStats,
  fetchAdminUsers,
  setAdminUserBan,
  updateAdminUserRole,
  fetchAdminReports,
  sendAdminReportWarning,
  banUserByAdminReport,
  type AdminStats,
  type AdminUser,
  type AdminReport,
} from '@/lib/adminApi';
import {
  fetchAllCourtsAdmin,
  approveCourtAdmin,
  rejectCourtAdmin,
  formatCourtPrice,
  resolveCourtImageUrl,
  type ApiCourt,
} from '@/lib/courtApi';
import { resolveAvatarUrl } from '@/lib/userApi';
import { LayoutGrid, Users, Trophy, Shield, ShieldAlert, Check, X, Ban, Loader2, BookOpen, Clock, Phone, MapPin, Eye } from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { alert, confirm } = useModal();

  // Active admin sub-tab: 'courts' | 'users' | 'reports'
  const [activeTab, setActiveTab] = useState<'courts' | 'users' | 'reports'>('courts');

  // Stats State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Courts State
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [courtsLoading, setCourtsLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectBusy, setRejectBusy] = useState(false);

  // Users State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Reports State
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadCourts = useCallback(async () => {
    setCourtsLoading(true);
    try {
      const data = await fetchAllCourtsAdmin();
      // Keep only pending ones or sort so pending is at the top
      setCourts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCourtsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const data = await fetchAdminReports();
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role !== 'admin') return;
    loadStats();
  }, [role, loadStats]);

  useEffect(() => {
    if (role !== 'admin') return;
    if (activeTab === 'courts') loadCourts();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'reports') loadReports();
  }, [activeTab, role, loadCourts, loadUsers, loadReports]);

  // Court Review Actions
  const handleApproveCourt = async (courtId: string) => {
    if (await confirm('Bạn có chắc chắn duyệt sân này không? Trạng thái sẽ chuyển thành Hoạt động.', 'Duyệt Sân Bãi', 'warning')) {
      try {
        await approveCourtAdmin(courtId);
        await alert('Duyệt sân thành công!', 'Thành công', 'success');
        await loadCourts();
        await loadStats();
      } catch (err) {
        await alert('Duyệt sân thất bại.', 'Lỗi', 'error');
      }
    }
  };

  const handleOpenRejectModal = (courtId: string) => {
    setRejectTargetId(courtId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleRejectCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTargetId) return;
    const reasonTrim = rejectReason.trim();
    if (reasonTrim.length < 5) {
      await alert('Vui lòng nhập lý do từ chối tối thiểu 5 ký tự.', 'Lưu ý', 'warning');
      return;
    }

    setRejectBusy(true);
    try {
      await rejectCourtAdmin(rejectTargetId, reasonTrim);
      await alert('Đã từ chối duyệt sân bãi.', 'Đã từ chối', 'info');
      setRejectModalOpen(false);
      setRejectTargetId(null);
      await loadCourts();
      await loadStats();
    } catch (err) {
      await alert('Từ chối duyệt sân thất bại.', 'Lỗi', 'error');
    } finally {
      setRejectBusy(false);
    }
  };

  // User Administration Actions
  const handleToggleBanUser = async (u: AdminUser) => {
    const isBanned = !u.isBanned;
    if (await confirm(`Bạn có chắc chắn muốn ${isBanned ? 'BAN' : 'UNBAN'} người dùng ${u.name}?`, 'Xác nhận', 'warning')) {
      try {
        await setAdminUserBan(u.id, isBanned);
        setUsers((prev) =>
          prev.map((usr) => (usr.id === u.id ? { ...usr, isBanned } : usr))
        );
        await alert(`${isBanned ? 'Đã khóa' : 'Đã mở khóa'} tài khoản thành công!`, 'Thành công', 'success');
      } catch (err) {
        await alert('Cập nhật trạng thái Ban thất bại.', 'Lỗi', 'error');
      }
    }
  };

  const handleToggleUserRole = async (u: AdminUser) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    if (await confirm(`Bạn có chắc chắn muốn chuyển vai trò ${u.name} thành ${newRole.toUpperCase()}?`, 'Xác nhận thay đổi', 'warning')) {
      try {
        await updateAdminUserRole(u.id, newRole);
        setUsers((prev) =>
          prev.map((usr) => (usr.id === u.id ? { ...usr, role: newRole } : usr))
        );
        await alert('Cập nhật vai trò thành công!', 'Thành công', 'success');
      } catch (err) {
        await alert('Cập nhật vai trò thất bại.', 'Lỗi', 'error');
      }
    }
  };

  // User Report Actions
  const handleWarnReport = async (reportId: string) => {
    if (await confirm('Gửi cảnh báo tới người dùng này?', 'Xác nhận gửi', 'warning')) {
      try {
        await sendAdminReportWarning(reportId);
        await alert('Cảnh báo đã được gửi.', 'Thành công', 'success');
        await loadReports();
      } catch (err) {
        await alert('Gửi cảnh báo thất bại.', 'Lỗi', 'error');
      }
    }
  };

  const handleBanReport = async (reportId: string) => {
    if (await confirm('Bạn có chắc muốn BAN người dùng bị cáo buộc thông qua report này?', 'Xác nhận khóa tài khoản', 'warning')) {
      try {
        await banUserByAdminReport(reportId);
        await alert('Đã BAN tài khoản thành công.', 'Thành công', 'success');
        await loadReports();
      } catch (err) {
        await alert('Thao tác BAN thất bại.', 'Lỗi', 'error');
      }
    }
  };

  if (role !== 'admin') {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <ShieldAlert className="h-12 w-12 text-primary mx-auto animate-bounce" />
        <h3 className="text-lg font-bold text-white">Quyền hạn Admin cần thiết</h3>
        <p className="text-sm text-gray-500">Chỉ quản trị viên hệ thống mới có thể truy cập trang cài đặt quản trị.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary hover:bg-primary-hover font-bold text-white px-6 py-2.5 rounded-2xl transition-colors duration-300"
        >
          Trở về Trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Admin Title */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" /> Bảng điều khiển quản trị viên
        </h1>
        <p className="text-gray-400 text-xs mt-1">Duyệt sân bãi đối tác, quản lý thành viên và xử lý báo cáo người dùng</p>
      </div>

      {/* Summary statistics grid */}
      {statsLoading ? (
        <div className="h-24 bg-darkCard border border-darkBorder rounded-3xl flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-darkCard border border-darkBorder rounded-2xl p-4">
            <span className="block text-[10px] text-gray-500 font-bold uppercase">Tổng Thành Viên</span>
            <span className="text-xl font-black text-white mt-1 block">{stats.usersCount}</span>
          </div>
          <div className="bg-darkCard border border-darkBorder rounded-2xl p-4">
            <span className="block text-[10px] text-gray-500 font-bold uppercase">Tổng Trận đấu</span>
            <span className="text-xl font-black text-white mt-1 block">{stats.matchesCount}</span>
          </div>
          <div className="bg-darkCard border border-darkBorder rounded-2xl p-4">
            <span className="block text-[10px] text-gray-500 font-bold uppercase">Sân chờ duyệt</span>
            <span className="text-xl font-black text-amber-500 mt-1 block">{stats.courts?.pending || 0}</span>
          </div>
          <div className="bg-darkCard border border-darkBorder rounded-2xl p-4">
            <span className="block text-[10px] text-gray-500 font-bold uppercase">Sân hoạt động</span>
            <span className="text-xl font-black text-emerald-400 mt-1 block">{stats.courts?.active || 0}</span>
          </div>
        </div>
      ) : null}

      {/* Tab Selectors */}
      <div className="flex border-b border-darkBorder">
        <button
          onClick={() => setActiveTab('courts')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300 ${
            activeTab === 'courts'
              ? 'border-primary text-white'
              : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Duyệt sân bãi {stats?.courts?.pending && stats.courts.pending > 0 ? `(${stats.courts.pending})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300 ${
            activeTab === 'users'
              ? 'border-primary text-white'
              : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          Quản lý người dùng
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300 ${
            activeTab === 'reports'
              ? 'border-primary text-white'
              : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Báo cáo vi phạm
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}

      {/* Tab 1: Approve Courts */}
      {activeTab === 'courts' && (
        <div className="space-y-4">
          {courtsLoading ? (
            <div className="flex justify-center items-center py-20 bg-darkCard border border-darkBorder rounded-3xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : courts.length === 0 ? (
            <div className="p-10 text-center bg-darkCard border border-darkBorder rounded-3xl text-gray-500 text-xs">
              Không có sân bãi nào trong danh sách.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courts.map((court) => {
                const img = resolveCourtImageUrl(court.images[0] || court.imageUrl);
                const isPending = court.approvalStatus === 'pending';
                const isRejected = court.approvalStatus === 'rejected';

                return (
                  <div
                    key={court.id}
                    className="bg-darkCard border border-darkBorder rounded-3xl overflow-hidden p-5 flex flex-col justify-between gap-4 relative shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      {/* Image */}
                      <div className="h-20 w-20 bg-darkBg border border-darkBorder rounded-2xl overflow-hidden shrink-0 flex items-center justify-center">
                        {img ? (
                          <img src={img} alt="sân" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl">🏟️</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary rounded-lg uppercase">
                            {court.sportKey}
                          </span>
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-bold border rounded-lg uppercase ${
                            court.approvalStatus === 'active'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : isPending
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {court.approvalStatus === 'active' && 'Hoạt động'}
                            {isPending && 'Chờ duyệt'}
                            {isRejected && 'Từ chối'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-white text-sm truncate">{court.name}</h4>
                        <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                          <MapPin className="h-3.5 w-3.5 text-gray-600 shrink-0" />
                          <span className="truncate">{court.address}</span>
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Chủ sân: <span className="text-white font-medium">{court.owner?.name || court.owner?.username}</span>
                        </p>
                      </div>
                    </div>

                    {/* Metadata details */}
                    <div className="text-xs grid grid-cols-2 gap-2 bg-darkBg/50 border border-darkBorder rounded-xl p-3">
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gray-600" /> {court.openTime} - {court.closeTime}</span>
                      <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-600" /> {court.contactPhone || '—'}</span>
                    </div>

                    {isRejected && court.rejectReason && (
                      <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl text-[10px] text-red-400 space-y-0.5">
                        <span className="font-bold">Lý do từ chối:</span>
                        <p className="leading-relaxed">{court.rejectReason}</p>
                      </div>
                    )}

                    {/* Approve/Reject Controls (only if pending) */}
                    {isPending ? (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleOpenRejectModal(court.id)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold border border-red-500/20 text-red-400 hover:bg-red-500/5 transition-colors flex items-center justify-center gap-1"
                        >
                          <X className="h-3.5 w-3.5" /> Từ chối
                        </button>
                        <button
                          onClick={() => handleApproveCourt(court.id)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" /> Duyệt sân
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-gray-500 text-right pt-2">
                        Đơn giá: {formatCourtPrice(court.pricePerHour)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: User Moderation */}
      {activeTab === 'users' && (
        <div className="bg-darkCard border border-darkBorder rounded-3xl overflow-hidden shadow-lg">
          {usersLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-darkBorder bg-[#161618] text-gray-400 font-bold uppercase tracking-wider">
                    <th className="py-4 px-5">Thành viên</th>
                    <th className="py-4 px-5">Thông tin liên hệ</th>
                    <th className="py-4 px-5">Vai trò</th>
                    <th className="py-4 px-5 text-center">Trạng thái</th>
                    <th className="py-4 px-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-darkBorder/60">
                  {users.map((u) => {
                    const avatar = resolveAvatarUrl(u.avatar);
                    const init = u.name?.charAt(0).toUpperCase() || '?';

                    return (
                      <tr key={u.id} className="hover:bg-white/2 transition-colors">
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
                              {avatar ? (
                                <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-primary">{init}</span>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-xs sm:text-sm">{u.name}</span>
                              <span className="text-[10px] text-gray-500">@{u.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{u.email || '—'}</span>
                            <span className="text-[10px] text-gray-500">{u.phone || '—'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap text-white font-semibold capitalize">
                          {u.role}
                        </td>
                        <td className="py-4 px-5 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                            u.isBanned
                              ? 'bg-red-500/10 border-red-500/20 text-red-400'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {u.isBanned ? 'Đang Khóa' : 'Hoạt động'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleToggleUserRole(u)}
                              className="text-[10px] font-bold text-primary border border-primary/10 hover:border-primary/30 bg-primary/5 px-2.5 py-1.5 rounded-xl transition-all duration-300"
                            >
                              Đổi vai trò
                            </button>
                            <button
                              onClick={() => handleToggleBanUser(u)}
                              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all duration-300 flex items-center gap-1 ${
                                u.isBanned
                                  ? 'border border-emerald-500/10 text-emerald-400 hover:bg-emerald-500/5'
                                  : 'border border-red-500/10 text-red-400 hover:bg-red-500/5'
                              }`}
                            >
                              <Ban className="h-3 w-3" />
                              {u.isBanned ? 'Unban' : 'Ban'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Reports Moderation */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reportsLoading ? (
            <div className="flex justify-center items-center py-20 bg-darkCard border border-darkBorder rounded-3xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="p-10 text-center bg-darkCard border border-darkBorder rounded-3xl text-gray-500 text-xs">
              Chưa có báo cáo vi phạm nào được gửi lên.
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((rep) => {
                const isPending = rep.status === 'pending';
                const reporterName = rep.reporter?.name || rep.reporter?.username || 'Reporter';
                const reportedName = rep.reportedUser?.name || rep.reportedUser?.username || 'Reported';

                return (
                  <div
                    key={rep.id}
                    className="bg-darkCard border border-darkBorder rounded-3xl p-5 sm:p-6 shadow-md space-y-4 relative"
                  >
                    {/* Upper Line */}
                    <div className="flex justify-between items-start gap-4 border-b border-darkBorder/60 pb-3.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 font-semibold">
                            Report ID: {rep.id.slice(-6).toUpperCase()}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                            rep.status === 'resolved'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : isPending
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          }`}>
                            {rep.status === 'resolved' && 'Đã xử lý'}
                            {isPending && 'Chờ duyệt'}
                            {rep.status === 'reviewed' && 'Đang xem xét'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-white text-sm mt-1">
                          Trận đấu: <span className="text-primary">{rep.match?.title || '—'}</span>
                        </h4>
                      </div>

                      {/* Display warning timestamp if sent */}
                      {rep.warningSentAt && (
                        <span className="text-[10px] text-yellow-400 bg-yellow-500/5 border border-yellow-500/10 px-2 py-1 rounded-xl">
                          Đã cảnh cáo
                        </span>
                      )}
                    </div>

                    {/* Parties involved */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-darkBg/40 border border-darkBorder/30 rounded-2xl p-3">
                        <span className="block text-[9px] text-gray-500 font-bold uppercase">Người báo cáo</span>
                        <span className="font-bold text-white block mt-0.5">{reporterName}</span>
                        <span className="text-[10px] text-gray-500 block truncate">{rep.reporter?.email || '—'}</span>
                      </div>
                      <div className="bg-darkBg/40 border border-darkBorder/30 rounded-2xl p-3">
                        <span className="block text-[9px] text-gray-500 font-bold uppercase">Người bị báo cáo</span>
                        <span className="font-bold text-red-400 block mt-0.5">{reportedName}</span>
                        <span className="text-[10px] text-gray-500 block truncate">{rep.reportedUser?.email || '—'}</span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-1.5">
                      <span className="block text-[10px] text-gray-500 font-bold uppercase">Lý do báo cáo</span>
                      <p className="text-xs text-gray-300 leading-relaxed bg-darkBg/30 border border-darkBorder/40 p-3.5 rounded-2xl whitespace-pre-line">
                        {rep.reason}
                      </p>
                    </div>

                    {/* Action buttons (only if report is pending) */}
                    {isPending && (
                      <div className="flex gap-3 pt-2 justify-end border-t border-darkBorder/60 pt-4">
                        <button
                          onClick={() => handleWarnReport(rep.id)}
                          className="px-5 py-2 bg-[#1b1912] border border-amber-500/20 text-amber-400 hover:bg-amber-500/5 text-xs font-bold rounded-xl transition-colors"
                        >
                          Cảnh cáo thành viên
                        </button>
                        <button
                          onClick={() => handleBanReport(rep.id)}
                          className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          <Ban className="h-3.5 w-3.5" /> Khóa tài khoản bị cáo cáo
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* REJECT COURT REASON MODAL */}
      {rejectModalOpen && rejectTargetId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-darkCard border border-darkBorder rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <div>
              <h3 className="text-lg font-bold text-white">Từ chối duyệt sân bãi</h3>
              <p className="text-xs text-gray-500 mt-1">
                Nhập lý do phản hồi cho chủ sân để họ biết thông tin cần sửa đổi
              </p>
            </div>

            <form onSubmit={handleRejectCourt} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs text-gray-400 font-medium">Lý do từ chối</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Ảnh chụp sân bãi không rõ ràng, Giá thuê sân quá cao, thông tin địa điểm không chính xác..."
                  className="w-full h-32 bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={rejectBusy}
                  onClick={() => {
                    setRejectModalOpen(false);
                    setRejectTargetId(null);
                  }}
                  className="flex-1 bg-darkBg border border-darkBorder hover:border-gray-700 text-gray-400 hover:text-white py-3 rounded-2xl text-xs font-bold transition-all duration-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={rejectBusy}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl text-xs font-bold transition-all duration-300 shadow-md shadow-primary/10"
                >
                  {rejectBusy ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
