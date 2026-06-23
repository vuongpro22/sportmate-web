import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { fetchUserById, toggleFavorite, resolveAvatarUrl, type ApiUser } from '@/lib/userApi';
import { getApiBaseUrl } from '@/lib/apiBase';
import {
  fetchUserBookings,
  cancelCourtBooking,
  type ApiCourtBooking,
} from '@/lib/courtApi';
import { MapPin, Mail, Phone, Trophy, Calendar, Sparkles, MessageSquare, Heart, Edit, Check, Camera, Plus, Trash2, Loader2, AlertCircle, Clock, ArrowLeft, Share2, TrendingUp, ChevronRight, Users, LogOut } from 'lucide-react';

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser, setUserFromServer, logout } = useAuth();
  const { alert, confirm } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMe = currentUser?.id === id;

  // View States
  const [profileUser, setProfileUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [sports, setSports] = useState<{ name: string; level: string }[]>([]);
  const [schedule, setSchedule] = useState<{ day: string; time?: string; activity: string }[]>([]);

  // Follow/Favorite state
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isFavoritedByMe, setIsFavoritedByMe] = useState(false);
  const [favBusy, setFavBusy] = useState(false);

  // Booking history state
  const [userBookings, setUserBookings] = useState<ApiCourtBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const loadProfile = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserById(id, { viewerId: currentUser?.id });
      setProfileUser(data);

      // Initialize edit fields
      setName(data.name || '');
      setLocation(data.location || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setBio(data.bio || '');
      setSports(data.sports ?? []);
      setSchedule(data.schedule ?? []);
      setFavoritesCount(data.favoritesCount ?? 0);
      setIsFavoritedByMe(data.isFavoritedByMe ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const loadUserBookings = async () => {
    if (!id || !isMe) return;
    setLoadingBookings(true);
    try {
      const data = await fetchUserBookings(id);
      setUserBookings(data);
    } catch (err) {
      console.error('Failed to load user bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [id, currentUser?.id]);

  useEffect(() => {
    if (isMe && profileUser) {
      loadUserBookings();
    }
  }, [isMe, profileUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          location,
          email,
          phone,
          bio,
          sports,
          schedule,
        }),
      });

      if (!res.ok) {
        throw new Error('Không thể lưu thông tin hồ sơ.');
      }

      const updated = await res.json();
      setUserFromServer(updated);
      setIsEditing(false);
      await loadProfile();
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Lưu thất bại', 'Lỗi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentUser?.id) return;
    const file = e.target.files[0];

    setLoading(true);
    try {
      const base = getApiBaseUrl();
      const form = new FormData();
      form.append('avatar', file);

      const res = await fetch(`${base}/api/users/${currentUser.id}/avatar`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        throw new Error('Tải ảnh đại diện lên thất bại.');
      }

      const updated = await res.json();
      setUserFromServer(updated);
      await loadProfile();
      await alert('Thay đổi ảnh đại diện thành công!', 'Thành công', 'success');
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Tải ảnh thất bại', 'Lỗi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentUser?.id) {
      await alert('Vui lòng đăng nhập để thực hiện tính năng này.', 'Yêu cầu đăng nhập', 'info');
      navigate('/auth');
      return;
    }
    if (!profileUser || favBusy) return;
    setFavBusy(true);
    try {
      const res = await toggleFavorite(profileUser.id, currentUser.id);
      setIsFavoritedByMe(res.favorited);
      setFavoritesCount(res.favoritesCount);
    } catch (err) {
      console.error(err);
    } finally {
      setFavBusy(false);
    }
  };

  const handleAddSport = () => {
    setSports((prev) => [...prev, { name: '', level: 'Trung Bình' }]);
  };

  const handleRemoveSport = (index: number) => {
    setSports((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSportChange = (index: number, key: 'name' | 'level', value: string) => {
    setSports((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleAddSchedule = () => {
    setSchedule((prev) => [...prev, { day: 'Thứ 2', time: '17:00 - 19:00', activity: '' }]);
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  const handleScheduleChange = (index: number, key: 'day' | 'time' | 'activity', value: string) => {
    setSchedule((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  if (loading && !profileUser) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-semibold">Đang tải hồ sơ cá nhân...</span>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <AlertCircle className="h-12 w-12 text-primary mx-auto" />
        <h3 className="text-lg font-bold text-white">Lỗi tải dữ liệu</h3>
        <p className="text-sm text-gray-500">{error || 'Không tìm thấy hồ sơ cá nhân.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-primary hover:bg-primary-hover font-bold text-white px-6 py-2.5 rounded-2xl transition-colors duration-300"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const avatar = resolveAvatarUrl(profileUser.avatar);

  function getSportIcon(sportName: string) {
    const name = (sportName || '').toLowerCase();
    if (name.includes('đá') || name.includes('soccer') || name.includes('football')) return '⚽';
    if (name.includes('chuyền') || name.includes('volley')) return '🏐';
    if (name.includes('lông') || name.includes('badminton')) return '🏸';
    if (name.includes('rổ') || name.includes('basket')) return '🏀';
    if (name.includes('vợt') || name.includes('tennis')) return '🎾';
    if (name.includes('chạy') || name.includes('run')) return '🏃';
    if (name.includes('bơi') || name.includes('swim')) return '🏊';
    return '🏆';
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 pt-4 px-4 animate-fade-in">
      {/* Back button and Actions */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 text-sm font-semibold bg-transparent border-0 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleFavorite}
            disabled={favBusy || isMe}
            className={`bg-[#121214] hover:bg-[#1a1a1c] border border-neutral-800 text-gray-400 hover:text-white p-2.5 rounded-full transition-colors ${
              isMe ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavoritedByMe ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
          <button
            onClick={async () => {
              const text = `${profileUser.name} - Profile on SportMate`;
              if (navigator.share) {
                navigator.share({ title: profileUser.name, text }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                await alert('Đã sao chép liên kết cá nhân!', 'Sao chép', 'success');
              }
            }}
            className="bg-[#121214] hover:bg-[#1a1a1c] border border-neutral-800 text-gray-400 hover:text-white p-2.5 rounded-full transition-colors cursor-pointer"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Profile Banner Card */}
      <section className="bg-[#121214] border border-[#242427] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-xl relative overflow-hidden">
        {/* Basic profile details */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left min-w-0 flex-1">
          {/* Avatar with Camera Overlay (only if isMe) */}
          <div className="relative group shrink-0">
            <div className="h-28 w-28 rounded-full bg-red-600 flex items-center justify-center shadow-lg relative overflow-hidden">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="h-full w-full object-cover rounded-full" />
              ) : (
                <span className="text-4xl font-bold text-white">
                  {profileUser.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {isMe && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </>
            )}
          </div>

          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 justify-center md:justify-start">
              <h2 className="text-2xl font-bold text-white tracking-wide truncate">{profileUser.name}</h2>
              <span className="inline-block px-2.5 py-0.5 bg-red-500/10 border border-red-500/20 text-[#ff4d4f] rounded-full text-[10px] font-bold uppercase tracking-wider w-fit shrink-0 mx-auto sm:mx-0">
                {profileUser.sport || 'Người chơi'}
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-lg whitespace-pre-wrap">
              {profileUser.bio || 'Chưa có lời giới thiệu.'}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-gray-500 pt-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-gray-600" />
                {profileUser.location || 'Không rõ khu vực'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-gray-600" />
                {profileUser.email || 'Ẩn email'}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons / Actions */}
        <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto">
          {isMe ? (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center justify-center gap-2 bg-[#ff4d4f] hover:bg-red-600 px-6 py-3 rounded-2xl text-xs font-bold text-white transition-all duration-300 shadow-md w-full cursor-pointer"
              >
                {isEditing ? <Check className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                {isEditing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
              </button>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/auth');
                  }}
                  className="flex items-center justify-center gap-2 bg-[#121214] hover:bg-red-500/10 border border-neutral-800 hover:border-red-500/20 text-red-400 hover:text-red-300 px-6 py-3 rounded-2xl text-xs font-bold transition-all duration-300 w-full cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => navigate(`/chats/${profileUser.id}`)}
                className="flex items-center justify-center gap-2 bg-[#ff4d4f] hover:bg-red-600 px-6 py-3.5 rounded-2xl text-xs font-bold text-white transition-all duration-300 shadow-md w-full cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                Nhắn tin
              </button>
              <button
                onClick={handleToggleFavorite}
                disabled={favBusy}
                className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-bold transition-all duration-300 border w-full cursor-pointer ${
                  isFavoritedByMe
                    ? 'border-[#ff4d4f] text-[#ff4d4f] hover:bg-[#ff4d4f]/5'
                    : 'border-neutral-800 text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavoritedByMe ? 'fill-[#ff4d4f]' : ''}`} />
                {isFavoritedByMe ? 'Đã yêu thích' : 'Yêu thích'} ({favoritesCount})
              </button>
            </>
          )}
        </div>
      </section>

      {/* Main Grid Stats & Layout */}
      {!isEditing ? (
        <div className="space-y-6">
          {/* Thống kê hoạt động */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#ff4d4f]" /> Thống kê hoạt động
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1 */}
              <div className="bg-[#121214] border border-[#242427] rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Trận đã đấu</span>
                  <Trophy className="h-4 w-4 text-[#ff4d4f]" />
                </div>
                <span className="text-2xl font-bold text-white block mt-2">{profileUser.matchesPlayed}</span>
              </div>

              {/* Card 2 */}
              <div className="bg-[#121214] border border-[#242427] rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tỉ lệ thắng</span>
                  <TrendingUp className="h-4 w-4 text-[#ff4d4f]" />
                </div>
                <span className="text-2xl font-bold text-white block mt-2">{profileUser.winRate}%</span>
              </div>

              {/* Card 3 */}
              <div className="bg-[#121214] border border-[#242427] rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Thời gian chơi</span>
                  <Clock className="h-4 w-4 text-[#ff4d4f]" />
                </div>
                <span className="text-2xl font-bold text-white block mt-2">{profileUser.hoursActive || 0}h</span>
              </div>

              {/* Card 4 */}
              <div className="bg-[#121214] border border-[#242427] rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Người theo dõi</span>
                  <Users className="h-4 w-4 text-[#ff4d4f]" />
                </div>
                <span className="text-2xl font-bold text-white block mt-2">{favoritesCount}</span>
              </div>
            </div>
          </div>

          {/* Môn thể thao */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Môn thể thao</h3>
            {(!profileUser.sports || profileUser.sports.length === 0) ? (
              <p className="text-xs text-gray-500">Người dùng chưa thêm môn thể thao nào.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {profileUser.sports.map((s, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 bg-[#121214] border border-[#242427] rounded-2xl"
                  >
                    <div className="h-9 w-9 rounded-full bg-[#242427] flex items-center justify-center text-lg shrink-0">
                      {getSportIcon(s.name)}
                    </div>
                    <span className="text-xs font-bold text-white">{s.name}</span>
                    <span className="ml-auto px-2 py-0.5 bg-red-500/10 text-red-400 rounded-lg text-[9px] font-bold uppercase border border-red-500/20">
                      {s.level}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lịch tập luyện hàng tuần */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#ff4d4f]" /> Lịch tập luyện hàng tuần
            </h3>

            {(!profileUser.schedule || profileUser.schedule.length === 0) ? (
              <p className="text-xs text-gray-500 py-6 text-center bg-[#121214] border border-[#242427] rounded-2xl">Người dùng chưa cập nhật lịch luyện tập.</p>
            ) : (
              <div className="space-y-3">
                {profileUser.schedule.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-[#121214] border border-[#242427] rounded-2xl hover:border-red-500/20 transition-all gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate">{item.activity}</h4>
                      
                      <div className="flex flex-wrap gap-x-4 mt-2">
                        <div className="flex gap-1.5 items-center text-xs text-[#ff4d4f] font-bold">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="uppercase">{item.day}</span>
                        </div>
                        {item.time && (
                          <div className="flex gap-1.5 items-center text-xs text-gray-400">
                            <Clock className="h-3.5 w-3.5 text-gray-600" />
                            <span>{item.time}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {item.matchId && (
                      <span
                        onClick={() => navigate(`/matches/${item.matchId}`)}
                        className="text-xs font-bold text-[#ff4d4f] hover:text-red-400 cursor-pointer shrink-0 uppercase tracking-wide"
                      >
                        Chi tiết
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lịch sử đặt sân (Chỉ hiển thị cho chính mình) */}
          {isMe && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#ff4d4f]" /> Lịch sử đặt sân của tôi
              </h3>

              {loadingBookings ? (
                <div className="flex items-center gap-2 text-xs text-gray-500 justify-center py-6 bg-[#121214] border border-[#242427] rounded-2xl">
                  <Loader2 className="h-4 w-4 animate-spin text-[#ff4d4f]" />
                  <span>Đang tải lịch sử đặt sân...</span>
                </div>
              ) : userBookings.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6 bg-[#121214] border border-[#242427] rounded-2xl">Bạn chưa đặt sân nào.</p>
              ) : (
                <div className="space-y-4">
                  {userBookings.map((b) => {
                    const dateFormatted = b.bookingDate.split('-').reverse().join('/');
                    const durationHours = b.durationMinutes / 60;
                    const totalBookingPrice = b.priceSnapshot * durationHours;
                    const active = b.status === 'booked';
                    const isPast = (() => {
                      const [yr, mn, dy] = b.bookingDate.split('-').map(Number);
                      const [hr, min] = b.startTime.split(':').map(Number);
                      const slotDate = new Date(yr, mn - 1, dy, hr, min, 0);
                      return new Date() > slotDate;
                    })();

                    return (
                      <div
                        key={b.id}
                        className="bg-[#121214] border border-[#242427] rounded-2xl p-5 flex justify-between items-stretch gap-4"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-sm font-bold text-white truncate">{b.court?.name || 'Sân đã đặt'}</h4>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase shrink-0 ${
                              active
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                              {active ? 'Thành công' : b.status === 'cancelled_by_user' ? 'Bạn hủy' : 'Chủ sân hủy'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{b.court?.address}</p>
                          
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Calendar className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              <span>{dateFormatted}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Clock className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              <span>{b.startTime} - {b.endTime} ({durationHours}h)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-between items-end shrink-0">
                          <span className="text-base font-bold text-white">{totalBookingPrice.toLocaleString('vi-VN')}đ</span>
                          {active && (
                            !isPast ? (
                              <span
                                onClick={async () => {
                                  if (!currentUser) return;
                                  if (await confirm('Bạn có chắc chắn muốn hủy lịch đặt sân này không?', 'Hủy đặt sân', 'warning')) {
                                    try {
                                      await cancelCourtBooking(b.id, currentUser.id);
                                      await alert('Đã hủy lịch đặt sân thành công.', 'Thành công', 'success');
                                      loadUserBookings();
                                    } catch (err) {
                                      await alert(err instanceof Error ? err.message : 'Hủy đặt sân thất bại', 'Lỗi', 'error');
                                    }
                                  }
                                }}
                                className="text-xs font-bold text-[#ff4d4f] hover:text-red-400 cursor-pointer"
                              >
                                Hủy đặt sân
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500 font-medium">Đã diễn ra</span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* EDIT FORM MODE */
        <form onSubmit={handleSave} className="bg-[#121214] border border-[#242427] rounded-3xl p-6 md:p-8 space-y-6 shadow-xl animate-fade-in">
          <h3 className="text-md font-bold text-white uppercase tracking-wider border-b border-[#242427] pb-3">
            Sửa thông tin cá nhân
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-semibold">Họ và Tên</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#18181b] border border-[#242427] hover:border-gray-700 focus:border-red-500 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none transition-all duration-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-semibold">Khu vực</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-[#18181b] border border-[#242427] hover:border-gray-700 focus:border-red-500 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none transition-all duration-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-semibold">Email công khai</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#18181b] border border-[#242427] hover:border-gray-700 focus:border-red-500 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none transition-all duration-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-semibold">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#18181b] border border-[#242427] hover:border-gray-700 focus:border-red-500 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none transition-all duration-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-semibold">Tiểu sử ngắn</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Chia sẻ một chút thông tin về bạn..."
              className="w-full h-24 bg-[#18181b] border border-[#242427] hover:border-gray-700 focus:border-red-500 rounded-2xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-300 resize-none"
            />
          </div>

          {/* Sports Editor */}
          <div className="space-y-4 border-t border-[#242427] pt-4">
            <div className="flex justify-between items-center">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Môn thể thao tham gia</label>
              <button
                type="button"
                onClick={handleAddSport}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#242427] hover:border-[#ff4d4f]/45 text-[#ff4d4f] rounded-xl text-[10px] font-bold transition-all duration-300 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Thêm môn
              </button>
            </div>

            <div className="space-y-3">
              {sports.map((s, idx) => (
                <div key={idx} className="flex gap-3 items-center bg-black/10 p-3 rounded-2xl border border-[#242427]/60">
                  <input
                    type="text"
                    placeholder="Tên môn (VD: Cầu lông, Bóng đá)"
                    value={s.name}
                    onChange={(e) => handleSportChange(idx, 'name', e.target.value)}
                    className="flex-1 bg-[#18181b] border border-[#242427] hover:border-gray-700 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-all duration-300"
                  />
                  <select
                    value={s.level}
                    onChange={(e) => handleSportChange(idx, 'level', e.target.value)}
                    className="w-40 bg-[#18181b] border border-[#242427] hover:border-gray-700 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none cursor-pointer appearance-none text-center"
                  >
                    <option value="Sơ Cấp" className="bg-[#121214]">Sơ cấp</option>
                    <option value="Trung Bình" className="bg-[#121214]">Trung bình</option>
                    <option value="Cao" className="bg-[#121214]">Cao cấp</option>
                    <option value="Chuyên Nghiệp" className="bg-[#121214]">Chuyên nghiệp</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveSport(idx)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all duration-300 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Editor */}
          <div className="space-y-4 border-t border-[#242427] pt-4">
            <div className="flex justify-between items-center">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Lịch hoạt động định kỳ</label>
              <button
                type="button"
                onClick={handleAddSchedule}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#242427] hover:border-[#ff4d4f]/45 text-[#ff4d4f] rounded-xl text-[10px] font-bold transition-all duration-300 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Thêm lịch
              </button>
            </div>

            <div className="space-y-3">
              {schedule.map((it, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-black/10 p-3 rounded-2xl border border-[#242427]/60">
                  <select
                    value={it.day}
                    onChange={(e) => handleScheduleChange(idx, 'day', e.target.value)}
                    className="w-full sm:w-28 bg-[#18181b] border border-[#242427] hover:border-gray-700 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none cursor-pointer appearance-none text-center"
                  >
                    <option value="Thứ 2" className="bg-[#121214]">Thứ 2</option>
                    <option value="Thứ 3" className="bg-[#121214]">Thứ 3</option>
                    <option value="Thứ 4" className="bg-[#121214]">Thứ 4</option>
                    <option value="Thứ 5" className="bg-[#121214]">Thứ 5</option>
                    <option value="Thứ 6" className="bg-[#121214]">Thứ 6</option>
                    <option value="Thứ 7" className="bg-[#121214]">Thứ 7</option>
                    <option value="Chủ Nhật" className="bg-[#121214]">Chủ Nhật</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Thời gian (VD: 17:00 - 19:00)"
                    value={it.time || ''}
                    onChange={(e) => handleScheduleChange(idx, 'time', e.target.value)}
                    className="w-full sm:w-44 bg-[#18181b] border border-[#242427] hover:border-gray-700 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-all duration-300"
                  />
                  <input
                    type="text"
                    placeholder="Hoạt động (VD: Đá bóng FC Hòa Lạc)"
                    value={it.activity}
                    onChange={(e) => handleScheduleChange(idx, 'activity', e.target.value)}
                    className="flex-1 bg-[#18181b] border border-[#242427] hover:border-gray-700 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSchedule(idx)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all duration-300 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-[#242427]">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 py-3.5 rounded-2xl text-xs font-bold border border-[#242427] text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#ff4d4f] hover:bg-red-600 text-white py-3.5 rounded-2xl text-xs font-bold transition-all duration-300 shadow-md cursor-pointer"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
