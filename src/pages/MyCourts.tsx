import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import {
  fetchMyCourts,
  deleteCourt,
  updateCourt,
  fetchCourtBookings,
  cancelCourtBooking,
  resolveCourtImageUrl,
  formatCourtPrice,
  fetchOwnerBookings,
  type ApiCourt,
  type ApiCourtBooking,
} from '@/lib/courtApi';
import { getUpcomingDateKeys } from '@/lib/courtCalendar';
import { getCourtSportLabel } from '@/constants/courtSports';
import { Calendar, LayoutGrid, AlertTriangle, Eye, EyeOff, Edit, Trash2, Loader2, RefreshCw, Phone, User, Clock, Trash, Plus, MapPin, BarChart, Trophy } from 'lucide-react';

const DATE_OPTIONS = getUpcomingDateKeys(7);

export default function MyCourts() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { alert, confirm } = useModal();

  // Navigation state: 'courts' | 'bookings' | 'stats'
  const [activeTab, setActiveTab] = useState<'courts' | 'bookings' | 'stats'>('courts');

  // Courts state
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [courtsError, setCourtsError] = useState<string | null>(null);

  // Bookings state
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0]);
  const [bookings, setBookings] = useState<ApiCourtBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  // Stats state
  const [ownerBookings, setOwnerBookings] = useState<ApiCourtBooking[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadCourts = useCallback(async () => {
    if (!user?.id) return;
    setCourtsLoading(true);
    setCourtsError(null);
    try {
      const data = await fetchMyCourts(user.id);
      setCourts(data);
    } catch (err) {
      setCourtsError('Không tải được danh sách sân bãi của bạn.');
    } finally {
      setCourtsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCourts();
  }, [loadCourts]);

  // Load Bookings for all owner's courts
  const loadBookings = useCallback(async () => {
    if (!user?.id || courts.length === 0) {
      setBookings([]);
      return;
    }
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const allBookings: ApiCourtBooking[] = [];
      for (const court of courts) {
        try {
          const res = await fetchCourtBookings(court.id, user.id, selectedDate);
          // Attach court info to booking
          const bookingsWithCourt = (res.bookings || []).map((b) => ({
            ...b,
            courtName: court.name,
          }));
          allBookings.push(...bookingsWithCourt);
        } catch (err) {
          console.warn(`Failed to fetch bookings for court ${court.id}`);
        }
      }
      // Sort bookings chronologically
      allBookings.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setBookings(allBookings);
    } catch (err) {
      setBookingsError('Có lỗi xảy ra khi tải danh sách lịch đặt.');
    } finally {
      setBookingsLoading(false);
    }
  }, [courts, user?.id, selectedDate]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadBookings();
    }
  }, [activeTab, selectedDate, loadBookings]);

  // Load statistics history
  const loadStats = useCallback(async () => {
    if (!user?.id) return;
    setStatsLoading(true);
    try {
      const data = await fetchOwnerBookings(user.id);
      setOwnerBookings(data);
    } catch (err) {
      console.error('Failed to load owner bookings for stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab, loadStats]);

  // Actions
  const handleToggleVisibility = async (court: ApiCourt) => {
    if (!user?.id) return;
    const newStatus = court.visibilityStatus === 'active' ? 'hidden' : 'active';
    try {
      await updateCourt(court.id, user.id, { visibilityStatus: newStatus });
      setCourts((prev) =>
        prev.map((c) => (c.id === court.id ? { ...c, visibilityStatus: newStatus } : c))
      );
    } catch (err) {
      await alert('Không cập nhật được trạng thái hiển thị sân.', 'Lỗi', 'error');
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    if (!user?.id) return;
    if (await confirm('Bạn có chắc chắn muốn xóa sân này khỏi hệ thống không? Hành động này không thể hoàn tác.', 'Xóa Sân Bãi', 'warning')) {
      try {
        await deleteCourt(courtId, user.id);
        setCourts((prev) => prev.filter((c) => c.id !== courtId));
        await alert('Xóa sân thành công!', 'Thành công', 'success');
      } catch (err) {
        await alert(err instanceof Error ? err.message : 'Không xóa được sân bãi.', 'Lỗi', 'error');
      }
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!user?.id) return;
    if (await confirm('Bạn có chắc chắn muốn hủy đơn đặt sân này không? Người thuê sân sẽ nhận được thông báo.', 'Hủy Đặt Sân', 'warning')) {
      try {
        await cancelCourtBooking(bookingId, user.id);
        await alert('Đã hủy lịch đặt sân thành công.', 'Thành công', 'success');
        if (activeTab === 'bookings') {
          await loadBookings();
        } else if (activeTab === 'stats') {
          await loadStats();
        }
      } catch (err) {
        await alert(err instanceof Error ? err.message : 'Hủy lịch đặt sân thất bại.', 'Lỗi', 'error');
      }
    }
  };

  // Computations for stats
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let successfulBookings = 0;
    let cancelledBookings = 0;

    ownerBookings.forEach((booking) => {
      if (booking.status === 'booked') {
        successfulBookings++;
        const durationHours = (booking.durationMinutes || 60) / 60;
        totalRevenue += (booking.priceSnapshot || 0) * durationHours;
      } else {
        cancelledBookings++;
      }
    });

    const activeCourtsCount = courts.filter((c) => c.approvalStatus === 'active').length;

    return {
      totalRevenue,
      successfulBookings,
      cancelledBookings,
      activeCourtsCount,
    };
  }, [ownerBookings, courts]);

  const courtStats = useMemo(() => {
    const list = courts.map((court) => {
      const cBookings = ownerBookings.filter((b) => b.courtId === court.id && b.status === 'booked');
      const revenue = cBookings.reduce(
        (sum, b) => sum + (b.priceSnapshot || 0) * ((b.durationMinutes || 60) / 60),
        0,
      );
      const count = cBookings.length;
      return {
        ...court,
        revenue,
        count,
      };
    });
    return list.sort((a, b) => b.revenue - a.revenue);
  }, [courts, ownerBookings]);

  const maxCourtRevenue = useMemo(() => {
    return Math.max(...courtStats.map((c) => c.revenue), 0) || 1;
  }, [courtStats]);

  const sportStats = useMemo(() => {
    const map: Record<string, { label: string; count: number; revenue: number }> = {};
    ownerBookings.forEach((b) => {
      if (b.status !== 'booked') return;
      const court = courts.find((c) => c.id === b.courtId);
      const sportKey = court?.sportKey || b.court?.sportKey || 'other';
      const sportLabel = court?.sportLabel || b.court?.sportLabel || getCourtSportLabel(sportKey);
      if (!map[sportKey]) {
        map[sportKey] = { label: sportLabel, count: 0, revenue: 0 };
      }
      map[sportKey].count += 1;
      map[sportKey].revenue += (b.priceSnapshot || 0) * ((b.durationMinutes || 60) / 60);
    });
    return Object.entries(map)
      .map(([key, value]) => ({
        key,
        ...value,
      }))
      .sort((a, b) => b.count - a.count);
  }, [ownerBookings, courts]);

  if (role !== 'owner') {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <AlertTriangle className="h-12 w-12 text-primary mx-auto" />
        <h3 className="text-lg font-bold text-white">Quyền truy cập bị từ chối</h3>
        <p className="text-sm text-gray-500">Khu vực này chỉ dành cho chủ sân (partner/owner) đã đăng ký với SportMate.</p>
        <button
          onClick={() => navigate('/courts')}
          className="bg-primary hover:bg-primary-hover font-bold text-white px-6 py-2.5 rounded-2xl transition-colors duration-300"
        >
          Trở lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">QUẢN LÝ SÂN BÃI & LỊCH ĐẶT</h1>
          <p className="text-gray-400 text-xs mt-0.5">Bảng điều khiển dành riêng cho Chủ sân SportMate</p>
        </div>

        <div className="flex gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => {
              if (activeTab === 'courts') loadCourts();
              else if (activeTab === 'bookings') loadBookings();
              else if (activeTab === 'stats') loadStats();
            }}
            className="p-3 bg-darkCard border border-darkBorder hover:border-gray-700 text-gray-400 hover:text-white rounded-2xl transition-colors duration-300"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/courts/create')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover px-5 py-3 rounded-2xl text-xs font-bold text-white transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            Đăng sân đấu mới
          </button>
        </div>
      </div>

      {/* Tabs */}
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
          Danh sách sân của tôi
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300 ${
            activeTab === 'bookings'
              ? 'border-primary text-white'
              : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Quản lý đơn đặt sân
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300 ${
            activeTab === 'stats'
              ? 'border-primary text-white'
              : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          <BarChart className="h-4 w-4" />
          Thống kê & Báo cáo
        </button>
      </div>

      {/* TABS CONTENT */}

      {activeTab === 'courts' && (
        <div className="space-y-4">
          {courtsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-darkCard border border-darkBorder rounded-3xl gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm">Đang tải danh sách sân...</span>
            </div>
          ) : courtsError ? (
            <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-3xl text-red-400 text-sm">
              {courtsError}
            </div>
          ) : courts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-darkCard border border-darkBorder rounded-3xl p-6 text-center space-y-4 shadow-lg">
              <span className="text-4xl">🏟️</span>
              <h3 className="text-base font-bold text-white">Bạn chưa đăng sân nào</h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Đăng ký sân bãi của bạn để tiếp cận hàng nghìn người chơi thể thao trên SportMate.
              </p>
              <button
                onClick={() => navigate('/courts/create')}
                className="bg-primary hover:bg-primary-hover px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-colors duration-300"
              >
                + Đăng ký sân đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courts.map((court) => {
                const imgUrl = resolveCourtImageUrl(court.images[0] || court.imageUrl);
                return (
                  <div
                    key={court.id}
                    className="bg-darkCard border border-darkBorder rounded-3xl overflow-hidden p-5 flex flex-col justify-between gap-5 relative group shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      {/* Image Thumb */}
                      <div className="h-20 w-20 rounded-2xl bg-darkBg border border-darkBorder flex items-center justify-center overflow-hidden shrink-0">
                        {imgUrl ? (
                          <img src={imgUrl} alt="Sân" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl text-primary font-bold">🏟️</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded-full bg-primary/10 border border-primary/20 text-primary uppercase">
                            {getCourtSportLabel(court.sportKey)}
                          </span>
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase ${
                            court.approvalStatus === 'active'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : court.approvalStatus === 'pending'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {court.approvalStatus === 'active' && 'Đang hoạt động'}
                            {court.approvalStatus === 'pending' && 'Chờ duyệt'}
                            {court.approvalStatus === 'rejected' && 'Từ chối'}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-white text-base truncate">{court.name}</h4>
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-600 shrink-0" />
                          <span className="truncate">{court.address}</span>
                        </p>
                      </div>
                    </div>

                    {court.approvalStatus === 'rejected' && court.rejectReason && (
                      <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-2xl text-[11px] text-red-400 space-y-0.5">
                        <span className="font-bold">Lý do từ chối:</span>
                        <p className="leading-relaxed">{court.rejectReason}</p>
                      </div>
                    )}

                    {/* Actions bar */}
                    <div className="border-t border-darkBorder/60 pt-4 flex justify-between items-center text-xs">
                      <span className="font-bold text-white text-sm">
                        {formatCourtPrice(court.pricePerHour)}
                      </span>

                      <div className="flex gap-2.5">
                        {/* Visibility toggle button */}
                        <button
                          onClick={() => handleToggleVisibility(court)}
                          className={`p-2 border rounded-xl transition-all duration-300 ${
                            court.visibilityStatus === 'active'
                              ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5'
                              : 'border-darkBorder text-gray-500 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {court.visibilityStatus === 'active' ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => navigate(`/courts/create?editId=${court.id}`)}
                          className="p-2 border border-darkBorder hover:border-gray-700 text-gray-400 hover:text-white rounded-xl transition-all duration-300"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteCourt(court.id)}
                          className="p-2 border border-red-500/10 hover:border-red-500/30 text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-6">
          {/* Horizontal Date Bar */}
          <div className="bg-darkCard border border-darkBorder rounded-3xl p-5 shadow-inner space-y-3">
            <span className="block text-xs font-bold text-gray-400">Xem lịch đặt sân theo ngày:</span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {DATE_OPTIONS.map((dateKey) => {
                const active = selectedDate === dateKey;
                const dateObj = new Date(dateKey);
                const dayLabel = dateObj.getDate();
                const weekday = dateObj.toLocaleDateString('vi-VN', { weekday: 'short' });
                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border shrink-0 text-center w-14 transition-all duration-300 ${
                      active
                        ? 'bg-primary border-primary text-white shadow-md'
                        : 'bg-darkBg border-darkBorder text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-bold tracking-tight opacity-75">{weekday}</span>
                    <span className="text-xs font-black mt-0.5">{dayLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bookings List */}
          {bookingsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-darkCard border border-darkBorder rounded-3xl gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm">Đang kiểm tra đơn đặt sân...</span>
            </div>
          ) : bookingsError ? (
            <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-3xl text-red-400 text-sm">
              {bookingsError}
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-10 text-center bg-darkCard border border-darkBorder rounded-3xl text-gray-500 text-xs">
              Chưa có đơn đặt sân nào cho ngày {selectedDate}.
            </div>
          ) : (
            <div className="bg-darkCard border border-darkBorder rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-darkBorder bg-[#161618] text-gray-400 font-bold uppercase tracking-wider">
                      <th className="py-4 px-5">Khung giờ</th>
                      <th className="py-4 px-5">Sân đấu</th>
                      <th className="py-4 px-5">Khách hàng</th>
                      <th className="py-4 px-5">Tổng tiền</th>
                      <th className="py-4 px-5 text-center">Trạng thái</th>
                      <th className="py-4 px-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-darkBorder/60">
                    {bookings.map((b) => {
                      const custName = b.user?.name || b.contactName || 'Người đặt';
                      const custPhone = b.user?.phone || b.contactPhone || '—';
                      const active = b.status === 'booked';
                      const isPast = (() => {
                        const [yr, mn, dy] = b.bookingDate.split('-').map(Number);
                        const [hr, min] = b.startTime.split(':').map(Number);
                        const slotDate = new Date(yr, mn - 1, dy, hr, min, 0);
                        return new Date() > slotDate;
                      })();

                      return (
                        <tr key={b.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-4 px-5 whitespace-nowrap font-bold text-white flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{b.startTime} - {b.endTime}</span>
                          </td>
                          <td className="py-4 px-5 font-semibold text-white whitespace-nowrap">
                            {(b as any).courtName || 'Sân bãi'}
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-semibold text-white">{custName}</span>
                              <span className="text-[10px] text-gray-500">{custPhone}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap text-white font-semibold">
                            {formatCourtPrice(b.priceSnapshot)}
                          </td>
                          <td className="py-4 px-5 text-center whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                              active
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                              {active ? 'Đã giữ chỗ' : 'Đã hủy'}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            {active ? (
                              !isPast ? (
                                <button
                                  onClick={() => handleCancelBooking(b.id)}
                                  className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-xl transition-all duration-300 flex items-center gap-1 ml-auto"
                                >
                                  <Trash className="h-3 w-3" />
                                  Hủy lịch đặt
                                </button>
                              ) : (
                                <span className="text-[10px] text-gray-500 font-medium">Đã quá giờ</span>
                              )
                            ) : (
                              <span className="text-[10px] text-gray-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-darkCard border border-darkBorder rounded-3xl gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm">Đang tính toán thống kê...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue */}
                <div className="bg-darkCard border border-darkBorder p-5 rounded-3xl flex flex-col justify-between gap-3 shadow-md">
                  <div className="flex justify-between items-center text-gray-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Doanh thu dự kiến</span>
                    <span className="text-emerald-400 bg-emerald-500/10 p-1.5 rounded-xl">💵</span>
                  </div>
                  <span className="text-xl font-black text-white">{stats.totalRevenue.toLocaleString('vi-VN')}đ</span>
                </div>

                {/* Successful Bookings */}
                <div className="bg-darkCard border border-darkBorder p-5 rounded-3xl flex flex-col justify-between gap-3 shadow-md">
                  <div className="flex justify-between items-center text-gray-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Đơn thành công</span>
                    <span className="text-blue-400 bg-blue-500/10 p-1.5 rounded-xl">📅</span>
                  </div>
                  <span className="text-xl font-black text-white">{stats.successfulBookings} lượt đặt</span>
                </div>

                {/* Active courts */}
                <div className="bg-darkCard border border-darkBorder p-5 rounded-3xl flex flex-col justify-between gap-3 shadow-md">
                  <div className="flex justify-between items-center text-gray-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Sân hoạt động</span>
                    <span className="text-amber-400 bg-amber-500/10 p-1.5 rounded-xl">🏟️</span>
                  </div>
                  <span className="text-xl font-black text-white">{stats.activeCourtsCount} sân</span>
                </div>

                {/* Cancelled Bookings */}
                <div className="bg-darkCard border border-darkBorder p-5 rounded-3xl flex flex-col justify-between gap-3 shadow-md">
                  <div className="flex justify-between items-center text-gray-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Đơn đã hủy</span>
                    <span className="text-red-400 bg-red-500/10 p-1.5 rounded-xl">❌</span>
                  </div>
                  <span className="text-xl font-black text-white">{stats.cancelledBookings} đơn</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Court Revenue Bars */}
                <div className="bg-darkCard border border-darkBorder rounded-3xl p-5 shadow-lg space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Doanh thu theo sân</h3>
                  {courts.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-6">Chưa có thông tin sân.</p>
                  ) : (
                    <div className="space-y-4">
                      {courtStats.map((court) => {
                        const percentage = (court.revenue / maxCourtRevenue) * 100;
                        return (
                          <div key={court.id} className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-white truncate">{court.name}</span>
                              <span className="text-gray-400 shrink-0">{court.revenue.toLocaleString('vi-VN')}đ ({court.count} lượt)</span>
                            </div>
                            <div className="w-full bg-[#1b1b1f] h-2 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${percentage}%` }}
                                className="bg-primary h-full rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sport breakdown */}
                <div className="bg-darkCard border border-darkBorder rounded-3xl p-5 shadow-lg space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lượt đặt theo bộ môn</h3>
                  {sportStats.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-6">Chưa có lượt đặt nào thành công.</p>
                  ) : (
                    <div className="divide-y divide-darkBorder/60">
                      {sportStats.map((item) => (
                        <div key={item.key} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-2 text-xs font-semibold text-white">
                            <Trophy className="h-4 w-4 text-primary" />
                            <span>{item.label}</span>
                          </div>
                          <div className="text-right flex flex-col text-xs">
                            <span className="font-bold text-white">{item.count} lượt đặt</span>
                            <span className="text-[10px] text-gray-500">{item.revenue.toLocaleString('vi-VN')}đ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Centralized Bookings Log */}
              <div className="bg-darkCard border border-darkBorder rounded-3xl p-5 shadow-lg space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lịch sử đặt sân gần đây (Tất cả sân)</h3>
                {ownerBookings.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">Chưa có lịch sử đặt sân nào.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-darkBorder bg-[#161618] text-gray-400 font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">Ngày đặt</th>
                          <th className="py-3 px-4">Giờ đặt</th>
                          <th className="py-3 px-4">Sân đấu</th>
                          <th className="py-3 px-4">Khách hàng</th>
                          <th className="py-3 px-4">Chi phí</th>
                          <th className="py-3 px-4 text-center">Trạng thái</th>
                          <th className="py-3 px-4 text-right">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-darkBorder/60">
                        {ownerBookings.map((b) => {
                          const dateFormatted = b.bookingDate.split('-').reverse().join('/');
                          const durationHours = b.durationMinutes / 60;
                          const totalBookingPrice = b.priceSnapshot * durationHours;
                          const custName = b.user?.name || b.contactName || 'Người đặt';
                          const custPhone = b.user?.phone || b.contactPhone || '—';
                          const active = b.status === 'booked';
                          const isPast = (() => {
                            const [yr, mn, dy] = b.bookingDate.split('-').map(Number);
                            const [hr, min] = b.startTime.split(':').map(Number);
                            const slotDate = new Date(yr, mn - 1, dy, hr, min, 0);
                            return new Date() > slotDate;
                          })();

                          return (
                            <tr key={b.id} className="hover:bg-white/2 transition-colors">
                              <td className="py-3 px-4 whitespace-nowrap text-white font-medium">{dateFormatted}</td>
                              <td className="py-3 px-4 whitespace-nowrap text-white font-medium">{b.startTime} - {b.endTime}</td>
                              <td className="py-3 px-4 whitespace-nowrap text-gray-300">
                                {courts.find((c) => c.id === b.courtId)?.name || b.court?.name || 'Sân bãi'}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap text-gray-300">
                                <div className="flex flex-col">
                                  <span>{custName}</span>
                                  <span className="text-[10px] text-gray-500">{custPhone}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap text-white font-semibold">
                                {totalBookingPrice.toLocaleString('vi-VN')}đ
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                                  active
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                  {active ? 'Thành công' : 'Đã hủy'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                {active ? (
                                  !isPast ? (
                                    <button
                                      onClick={() => handleCancelBooking(b.id)}
                                      className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-xl transition-all duration-300 flex items-center gap-1 ml-auto"
                                    >
                                      <Trash className="h-3 w-3" />
                                      Hủy đặt sân
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-gray-500 font-medium">Đã quá giờ</span>
                                  )
                                ) : (
                                  <span className="text-[10px] text-gray-500">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
