import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { fetchMatchById, updateMatch, type ApiMatch, type ApiMatchParticipant } from '@/lib/matchApi';
import { getApiBaseUrl } from '@/lib/apiBase';
import {
  fetchCourts,
  fetchCourtAvailability,
  createCourtBooking,
  formatCourtPrice,
  type ApiCourt,
} from '@/lib/courtApi';
import { ChevronLeft, Info, Calendar, MapPin, Users, Trophy, BookOpen, AlertTriangle, Check, Loader2 } from 'lucide-react';

const SPORTS = [
  'Bóng Đá',
  'Bóng Rổ',
  'Cầu Lông',
  'Quần Vợt',
  'Bóng Chuyền',
  'Chạy Bộ',
  'Bơi Lội',
  'Khác',
] as const;

const PLAYER_COUNTS = ['2', '4', '6', '8', '10', 'Khác'] as const;

const SKILL_LEVELS = [
  'Tất Cả',
  'Sơ Cấp',
  'Trung Bình',
  'Cao',
  'Chuyên Nghiệp',
  'Khác',
] as const;

export default function CreateMatch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { alert } = useModal();

  const editId = searchParams.get('editId');
  const isEditMode = Boolean(editId);

  // States
  const [loadingMatch, setLoadingMatch] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState('Bóng Đá');
  const [sportOther, setSportOther] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [timeStart, setTimeStart] = useState('17:00');
  const [timeEnd, setTimeEnd] = useState('19:00');
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [maxPlayersOther, setMaxPlayersOther] = useState('');
  const [minSkillLevel, setMinSkillLevel] = useState('Tất Cả');
  const [skillOther, setSkillOther] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');

  // Results updating states (in edit mode)
  const [matchStatus, setMatchStatus] = useState<'active' | 'finished' | 'cancelled'>('active');
  const [participants, setParticipants] = useState<ApiMatchParticipant[]>([]);
  const [winnerIds, setWinnerIds] = useState<string[]>([]);
  const [cancelReason, setCancelReason] = useState('');
  const [resultSubmitting, setResultSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<'finish' | 'cancel' | null>(null);

  // Court browser states
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [showCourtBrowser, setShowCourtBrowser] = useState(false);
  const [expandedCourtId, setExpandedCourtId] = useState<string | null>(null);
  const [courtSlots, setCourtSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Load Match for editing
  useEffect(() => {
    const userId = user?.id;
    if (!editId || !userId) {
      setLoadingMatch(false);
      return;
    }
    async function load() {
      if (!editId || !userId) return;
      setLoadingMatch(true);
      setError(null);
      try {
        const raw = await fetchMatchById(editId);
        if (raw.hostId && raw.hostId !== userId) {
          setError('Bạn không có quyền chỉnh sửa trận đấu này.');
          setLoadingMatch(false);
          return;
        }

        // Map values back to form fields
        setTitle(raw.title);
        setLocation(raw.location);
        setDate(raw.date);

        // Parse time range e.g. "17:00 - 19:00"
        const timeParts = raw.time.split('-');
        if (timeParts.length === 2) {
          setTimeStart(timeParts[0].trim());
          setTimeEnd(timeParts[1].trim());
        } else {
          setTimeStart(raw.time);
        }

        // Parse Sport
        if (SPORTS.includes(raw.sport as any)) {
          setSport(raw.sport);
        } else {
          setSport('Khác');
          setSportOther(raw.sport);
        }

        // Parse Player count
        const mpStr = String(raw.maxPlayers);
        if (PLAYER_COUNTS.includes(mpStr as any)) {
          setMaxPlayers(mpStr);
        } else {
          setMaxPlayers('Khác');
          setMaxPlayersOther(mpStr);
        }

        // Parse Skill level
        if (SKILL_LEVELS.includes(raw.minSkillLevel as any)) {
          setMinSkillLevel(raw.minSkillLevel);
        } else {
          setMinSkillLevel('Khác');
          setSkillOther(raw.minSkillLevel);
        }

        setDescription(raw.description || '');
        setRules(raw.rules || '');
        setMatchStatus(raw.status ?? 'active');
        setParticipants(raw.participants ?? []);
        setWinnerIds(raw.winners ?? []);
        setCancelReason(raw.cancelReason ?? '');
      } catch (err) {
        setError('Không tải được thông tin trận đấu.');
      } finally {
        setLoadingMatch(false);
      }
    }
    load();
  }, [editId, user?.id]);

  // Load courts matching the selected sport
  const loadSystemCourts = async () => {
    setLoadingCourts(true);
    try {
      let sportKey: any = 'football';
      if (sport.toLowerCase().includes('cầu lông')) sportKey = 'badminton';
      else if (sport.toLowerCase().includes('bóng rổ')) sportKey = 'basketball';
      else if (sport.toLowerCase().includes('tennis') || sport.toLowerCase().includes('quần vợt')) sportKey = 'tennis';
      else if (sport.toLowerCase().includes('bóng chuyền')) sportKey = 'volleyball';
      else if (sport.toLowerCase().includes('pickleball')) sportKey = 'pickleball';

      const data = await fetchCourts({ sportKey });
      // Filter only active/approved courts
      setCourts(data.filter((c) => c.approvalStatus === 'active'));
    } catch (err) {
      console.error('Failed to load courts:', err);
    } finally {
      setLoadingCourts(false);
    }
  };

  useEffect(() => {
    if (showCourtBrowser) {
      loadSystemCourts();
    }
  }, [showCourtBrowser, sport]);

  const handleExpandCourt = async (courtId: string) => {
    if (expandedCourtId === courtId) {
      setExpandedCourtId(null);
      setCourtSlots([]);
      return;
    }
    setExpandedCourtId(courtId);
    if (!date || !timeStart || !timeEnd) {
      setCourtSlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const res = await fetchCourtAvailability(courtId, date);
      setCourtSlots(res.slots || []);
    } catch (err) {
      console.error('Failed to load slots:', err);
      setCourtSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Trigger reloading slots if date or time changes while expanded
  useEffect(() => {
    if (expandedCourtId && date) {
      setLoadingSlots(true);
      fetchCourtAvailability(expandedCourtId, date)
        .then((res) => setCourtSlots(res.slots || []))
        .catch(() => setCourtSlots([]))
        .finally(() => setLoadingSlots(false));
    }
  }, [date, expandedCourtId]);

  const parseTimeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Overlap calculation
  const targetSlots = useMemo(() => {
    if (!timeStart || !timeEnd || courtSlots.length === 0) return [];
    const startM = parseTimeToMinutes(timeStart);
    const endM = parseTimeToMinutes(timeEnd);
    return courtSlots.filter((s) => startM < s.endMinutes && s.startMinutes < endM);
  }, [timeStart, timeEnd, courtSlots]);

  const overlapStatus = useMemo(() => {
    if (!date || !timeStart || !timeEnd) {
      return { ok: false, message: 'Vui lòng chọn Ngày và Giờ chơi để kiểm tra lịch trống.' };
    }
    if (courtSlots.length === 0) {
      return { ok: false, message: 'Không lấy được lịch trống của sân.' };
    }
    if (targetSlots.length === 0) {
      return { ok: false, message: 'Khung giờ bạn chọn nằm ngoài giờ mở cửa của sân.' };
    }
    const hasBooked = targetSlots.some((s) => !s.available);
    if (hasBooked) {
      return { ok: false, message: 'Đã có slot bị đặt trong khung giờ bạn chọn.' };
    }
    return { ok: true, message: `Trống ${targetSlots.length} slot (Có thể đặt)` };
  }, [date, timeStart, timeEnd, courtSlots, targetSlots]);

  const handleBookAndSelect = async (court: ApiCourt) => {
    if (!user?.id || !date) return;
    setBookingLoading(true);
    try {
      // Concurrently book all target slots
      await Promise.all(
        targetSlots.map((slot) =>
          createCourtBooking(court.id, {
            userId: user.id,
            bookingDate: date,
            startTime: slot.startTime,
            contactName: user.name || user.username || 'Người thuê sân',
            contactPhone: user.phone || '',
          })
        )
      );
      // Auto-fill form values
      setLocation(`${court.name} - ${court.address}`);
      setShowCourtBrowser(false);
      setExpandedCourtId(null);
      await alert('Đã đặt sân thành công và tự động điền địa chỉ!', 'Đặt Sân Bãi', 'success');
    } catch (err: any) {
      await alert(err instanceof Error ? err.message : 'Đặt sân thất bại, vui lòng thử lại.', 'Lỗi', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(null);

    const sportResolved = sport === 'Khác' ? sportOther.trim() : sport;
    const skillResolved = minSkillLevel === 'Khác' ? skillOther.trim() : minSkillLevel;
    const maxPlayersResolved = maxPlayers === 'Khác' ? maxPlayersOther.trim() : maxPlayers;

    if (sport === 'Khác' && !sportResolved) {
      setError('Vui lòng nhập tên môn thể thao.');
      return;
    }
    if (minSkillLevel === 'Khác' && !skillResolved) {
      setError('Vui lòng nhập mức kỹ năng.');
      return;
    }
    if (!title.trim() || title.trim().length < 2) {
      setError('Tiêu đề trận đấu cần ít nhất 2 ký tự.');
      return;
    }
    if (!location.trim()) {
      setError('Vui lòng nhập địa điểm diễn ra.');
      return;
    }
    if (!date) {
      setError('Vui lòng chọn ngày.');
      return;
    }

    const startM = parseTimeToMinutes(timeStart);
    const endM = parseTimeToMinutes(timeEnd);
    if (endM <= startM) {
      setError('Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }

    const maxN = parseInt(maxPlayersResolved, 10);
    if (!Number.isFinite(maxN) || maxN < 1) {
      setError('Số người chơi tối đa không hợp lệ.');
      return;
    }

    const timeString = `${timeStart} - ${timeEnd}`;

    setSubmitting(true);
    try {
      if (isEditMode && editId) {
        await updateMatch(editId, user.id, {
          sport: sportResolved,
          title: title.trim(),
          location: location.trim(),
          date: date.trim(),
          time: timeString,
          maxPlayers: maxN,
          minSkillLevel: skillResolved,
          description: description.trim(),
          rules: rules.trim(),
        });
        await alert('Cập nhật trận đấu thành công!', 'Thành công', 'success');
        navigate(`/matches/${editId}`);
      } else {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}/api/matches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hostId: user.id,
            sport: sportResolved,
            title: title.trim(),
            location: location.trim(),
            date: date.trim(),
            time: timeString,
            maxPlayers: maxN,
            minSkillLevel: skillResolved,
            description: description.trim(),
            rules: rules.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || 'Không thể tạo trận đấu lúc này.');
          setSubmitting(false);
          return;
        }
        await alert('Tạo trận đấu thành công!', 'Thành công', 'success');
        navigate('/matches');
      }
    } catch (err) {
      setError('Lỗi kết nối tới máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishMatch = async () => {
    if (!editId || !user?.id) return;
    if (winnerIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 người thắng.');
      return;
    }

    setResultSubmitting(true);
    try {
      await updateMatch(editId, user.id, {
        status: 'finished',
        winners: winnerIds,
      });
      await alert('Đã kết thúc trận đấu và ghi nhận kết quả.', 'Kết Thúc Trận Đấu', 'success');
      navigate(`/matches/${editId}`);
    } catch (err) {
      setError('Không thể cập nhật kết quả.');
    } finally {
      setResultSubmitting(false);
    }
  };

  const handleCancelMatch = async () => {
    if (!editId || !user?.id) return;
    if (cancelReason.trim().length < 5) {
      setError('Vui lòng nhập lý do hủy tối thiểu 5 ký tự.');
      return;
    }

    setResultSubmitting(true);
    try {
      await updateMatch(editId, user.id, {
        status: 'cancelled',
        cancelReason: cancelReason.trim(),
      });
      await alert('Đã hủy trận đấu thành công.', 'Hủy Trận Đấu', 'info');
      navigate(`/matches/${editId}`);
    } catch (err) {
      setError('Không thể hủy trận đấu.');
    } finally {
      setResultSubmitting(false);
    }
  };

  const toggleWinner = (pid: string) => {
    setWinnerIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  if (loadingMatch) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-semibold">Đang tải thông tin trận đấu...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Header and Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center h-10 w-10 bg-darkCard border border-darkBorder hover:border-gray-700 text-white rounded-2xl transition-colors duration-300"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide uppercase">
            {isEditMode ? 'Chỉnh sửa trận đấu' : 'Tạo trận đấu mới'}
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {isEditMode ? 'Cập nhật lại các thông tin trận đấu của bạn' : 'Cung cấp thông tin để mọi người cùng chơi'}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-2xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Admin/Result updates (Edit Mode only) */}
      {isEditMode && (matchStatus === 'active' || matchStatus === 'finished') && (
        <div className="bg-darkCard border border-primary/20 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-md font-bold text-white flex items-center gap-2">
            🏆 Cập nhật kết quả / Hủy trận
          </h3>
          <p className="text-xs text-gray-400">
            {matchStatus === 'finished'
              ? 'Trận đấu đã kết thúc. Bạn vẫn có thể cập nhật hoặc thay đổi người thắng cuộc dưới đây:'
              : 'Bạn có thể đóng trận đấu và lựa chọn người thắng cuộc hoặc hủy trận đấu nếu có sự cố.'}
          </p>

          {matchStatus === 'active' && (
            <div className="flex gap-4">
              <button
                onClick={() => setActiveAction('finish')}
                className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all duration-300 ${
                  activeAction === 'finish' ? 'bg-primary text-white' : 'border border-darkBorder text-gray-400 hover:text-white'
                }`}
              >
                Kết thúc trận đấu
              </button>
              <button
                onClick={() => setActiveAction('cancel')}
                className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all duration-300 ${
                  activeAction === 'cancel' ? 'bg-red-500 text-white' : 'border border-darkBorder text-gray-400 hover:text-white'
                }`}
              >
                Hủy trận đấu
              </button>
            </div>
          )}

          {(activeAction === 'finish' || matchStatus === 'finished') && (
            <div className="border-t border-darkBorder pt-4 space-y-4">
              <span className="block text-xs font-bold text-white">Chọn người thắng cuộc:</span>
              {participants.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">Chưa có ai tham gia trận đấu này.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {participants.map((p) => {
                    const selected = winnerIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleWinner(p.id)}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-semibold border transition-all duration-300 ${
                          selected
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-darkBg border-darkBorder text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ${
                          selected ? 'bg-primary border-primary text-white' : 'border-gray-600'
                        }`}>
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                        <span className="truncate">{p.name || p.username}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                onClick={handleFinishMatch}
                disabled={resultSubmitting}
                className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors duration-300 disabled:opacity-50"
              >
                {resultSubmitting ? 'Đang cập nhật...' : (matchStatus === 'finished' ? 'Cập nhật người thắng' : 'Xác nhận kết quả')}
              </button>
            </div>
          )}

          {matchStatus === 'active' && activeAction === 'cancel' && (
            <div className="border-t border-darkBorder pt-4 space-y-4">
              <span className="block text-xs font-bold text-white">Lý do hủy trận:</span>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy trận đấu (ít nhất 5 ký tự)..."
                className="w-full h-24 bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
              />
              <button
                onClick={handleCancelMatch}
                disabled={resultSubmitting}
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors duration-300 disabled:opacity-50"
              >
                {resultSubmitting ? 'Đang xử lý...' : 'Xác nhận hủy trận'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Creation Form */}
      <form onSubmit={handleSubmit} className="bg-darkCard border border-darkBorder rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
        {/* Sport selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-white flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Môn thể thao
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SPORTS.map((s) => {
              const selected = sport === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSport(s);
                    if (s !== 'Khác') setSportOther('');
                  }}
                  className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all duration-300 border ${
                    selected
                      ? 'bg-primary border-primary text-white shadow-md shadow-primary/15'
                      : 'bg-darkBg border-darkBorder text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {sport === 'Khác' && (
            <input
              type="text"
              placeholder="Nhập tên môn thể thao của bạn..."
              value={sportOther}
              onChange={(e) => setSportOther(e.target.value)}
              className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
            />
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-white flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" /> Tiêu đề trận đấu
          </label>
          <input
            type="text"
            placeholder="VD: Giao lưu bóng đá sân K33, Tìm đôi cứng cầu lông..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Địa điểm diễn ra
            </label>
            <button
              type="button"
              onClick={() => setShowCourtBrowser(!showCourtBrowser)}
              className="text-xs font-bold text-primary hover:underline"
            >
              {showCourtBrowser ? 'Đóng bộ lọc sân' : 'Chọn sân từ hệ thống'}
            </button>
          </div>
          <input
            type="text"
            placeholder="Số nhà, tên đường, quận/huyện, thành phố..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
          />
        </div>

        {/* Court Browser */}
        {showCourtBrowser && (
          <div className="bg-darkBg border border-darkBorder rounded-2xl p-5 space-y-4 shadow-inner">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Chọn sân từ danh sách hệ thống</h4>
            {loadingCourts ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Đang tải danh sách sân bãi...</span>
              </div>
            ) : courts.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">Không tìm thấy sân {sport} hoạt động nào.</p>
            ) : (
              <div className="space-y-3">
                {courts.map((court) => {
                  const isExpanded = expandedCourtId === court.id;
                  return (
                    <div key={court.id} className="border border-darkBorder/60 bg-darkCard rounded-xl overflow-hidden transition-all">
                      <div
                        onClick={() => handleExpandCourt(court.id)}
                        className="p-3 flex justify-between items-center cursor-pointer hover:bg-white/2"
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-white truncate">{court.name}</h5>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">{court.address} • {formatCourtPrice(court.pricePerHour)}</p>
                        </div>
                        <span className="text-xs text-primary shrink-0 ml-2 font-bold uppercase">
                          {isExpanded ? 'Thu gọn' : 'Xem lịch'}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="p-3 border-t border-darkBorder/40 bg-darkBg/30 space-y-3">
                          {loadingSlots ? (
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 justify-center py-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              <span>Đang tải lịch sân...</span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Overlap Status Label */}
                              <div className={`p-2.5 rounded-lg text-[10px] font-bold border ${
                                overlapStatus.ok
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              }`}>
                                {overlapStatus.message}
                              </div>

                              {/* Target slots visual */}
                              {overlapStatus.ok && (
                                <div className="space-y-2">
                                  <span className="block text-[10px] text-gray-400 font-bold">Các slot đặt sân:</span>
                                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                    {targetSlots.map((slot, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-lg text-[10px] text-primary font-bold shrink-0 text-center"
                                      >
                                        {slot.startTime}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Booking actions */}
                              {overlapStatus.ok && (
                                <button
                                  type="button"
                                  disabled={bookingLoading}
                                  onClick={() => handleBookAndSelect(court)}
                                  className="w-full bg-primary hover:bg-primary-hover font-bold text-[11px] text-white rounded-xl py-2 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                                >
                                  {bookingLoading ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      <span>Đang đặt sân...</span>
                                    </>
                                  ) : (
                                    <span>Đặt sân & Chọn địa chỉ này</span>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Ngày diễn ra
            </label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-sm text-white focus:outline-none transition-all duration-300 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-white">Giờ bắt đầu</label>
            <input
              type="time"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-sm text-white focus:outline-none transition-all duration-300 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-white">Giờ kết thúc</label>
            <input
              type="time"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-sm text-white focus:outline-none transition-all duration-300 cursor-pointer"
            />
          </div>
        </div>

        {/* Player Counts */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Số người chơi tối đa
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {PLAYER_COUNTS.map((n) => {
              const selected = maxPlayers === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setMaxPlayers(n);
                    if (n !== 'Khác') setMaxPlayersOther('');
                  }}
                  className={`py-3 rounded-2xl text-xs font-bold transition-all duration-300 border ${
                    selected
                      ? 'bg-primary border-primary text-white shadow-md shadow-primary/15'
                      : 'bg-darkBg border-darkBorder text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {n} {n !== 'Khác' && 'người'}
                </button>
              );
            })}
          </div>
          {maxPlayers === 'Khác' && (
            <input
              type="number"
              placeholder="Nhập số lượng người chơi tối đa..."
              value={maxPlayersOther}
              min={1}
              onChange={(e) => setMaxPlayersOther(e.target.value)}
              className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
            />
          )}
        </div>

        {/* Skill Levels */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-white flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Trình độ người chơi
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SKILL_LEVELS.map((lvl) => {
              const selected = minSkillLevel === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setMinSkillLevel(lvl);
                    if (lvl !== 'Khác') setSkillOther('');
                  }}
                  className={`py-3 rounded-2xl text-xs font-bold transition-all duration-300 border ${
                    selected
                      ? 'bg-primary border-primary text-white shadow-md shadow-primary/15'
                      : 'bg-darkBg border-darkBorder text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
          {minSkillLevel === 'Khác' && (
            <input
              type="text"
              placeholder="VD: Chỉ tuyển thành viên phong trào, Cấp câu lạc bộ..."
              value={skillOther}
              onChange={(e) => setSkillOther(e.target.value)}
              className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
            />
          )}
        </div>

        {/* Description & Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Mô tả trận đấu
            </label>
            <textarea
              placeholder="Thông tin thêm về trận đấu, chi phí, chia team..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-32 bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-300 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" /> Nội quy, quy tắc
            </label>
            <textarea
              placeholder="VD: Ra sân trước 15p, Chơi đẹp không cay cú, Mặc trang phục thể thao..."
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              className="w-full h-32 bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-300 resize-none"
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary-hover font-bold text-white rounded-2xl py-4 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-primary/15 hover:scale-102 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <span>{isEditMode ? 'Cập nhật trận đấu' : 'Tạo trận đấu'}</span>
          )}
        </button>
      </form>
    </div>
  );
}
