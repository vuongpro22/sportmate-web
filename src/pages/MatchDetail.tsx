import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchMatchById,
  mapApiMatchToDetail,
  joinMatch,
  leaveMatch,
  checkJoinMatch,
  reportParticipant,
  type MatchDetail,
} from '@/lib/matchApi';
import { computeDisplayStatus } from '@/lib/matchStatus';
import { ChevronLeft, Calendar, MapPin, Users, Trophy, Shield, User, Heart, Share2, Eye, Loader2, AlertTriangle, AlertCircle, Clock, ArrowLeft, ChevronRight } from 'lucide-react';

export default function MatchDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  // Page States
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [favorite, setFavorite] = useState(false);

  // Report Modal States
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Load Match Data
  useEffect(() => {
    async function loadMatch() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const raw = await fetchMatchById(id, { userId: user?.id });
        setMatch(mapApiMatchToDetail(raw));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được chi tiết trận đấu');
      } finally {
        setLoading(false);
      }
    }
    loadMatch();
  }, [id, user?.id]);

  const displayStatus = useMemo(() => {
    const fallback = {
      label: 'Đang tải...',
      key: 'upcoming' as const,
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.12)',
      border: 'rgba(96,165,250,0.4)',
      dot: '#60a5fa',
    };
    if (!match) return fallback;
    return computeDisplayStatus(match.status ?? 'active', match.date, match.timeRange);
  }, [match]);

  const spotsLeft = match ? Math.max(0, match.maxPlayers - match.currentPlayers) : 0;
  const isHost = match && user ? user.id === match.hostId : false;
  const isJoined = match ? Boolean(match.viewerJoined) : false;
  const matchStatus = match?.status ?? 'active';

  const handleToggleJoin = async () => {
    if (!user?.id || !match) {
      alert('Vui lòng đăng nhập để tham gia.');
      return;
    }

    if (matchStatus !== 'active' || displayStatus.key === 'finished') {
      alert('Trận đấu đã kết thúc hoặc đã bị hủy.');
      return;
    }

    setJoinBusy(true);
    try {
      if (isJoined) {
        if (window.confirm(`Bạn có chắc chắn muốn hủy tham gia trận đấu "${match.title}" không?`)) {
          const raw = await leaveMatch(match.id, user.id);
          setMatch(mapApiMatchToDetail(raw));
          void refreshUser();
        }
      } else {
        // Run scheduling overlap check
        const check = await checkJoinMatch(match.id, user.id);
        if (!check.allow && check.reason === 'overlap') {
          alert('Không thể tham gia! Bạn đã có trận đấu khác trùng khung giờ trong ngày này.');
          setJoinBusy(false);
          return;
        }

        let proceed = true;
        if (check.reason === 'hasOtherMatch') {
          proceed = window.confirm('Hôm nay bạn đang có một trận đấu khác (không trùng giờ). Bạn vẫn muốn đăng ký tham gia trận này chứ?');
        }

        if (proceed) {
          const raw = await joinMatch(match.id, user.id);
          setMatch(mapApiMatchToDetail(raw));
          void refreshUser();
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Thao tác tham gia/rời trận thất bại');
    } finally {
      setJoinBusy(false);
    }
  };

  const handleOpenReport = (p: { id: string; name: string }) => {
    if (!isHost || p.id === user?.id) return;
    setReportTarget(p);
    setReportReason('');
    setReportSuccess(false);
    setReportError(null);
    setReportModalOpen(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match || !user || !reportTarget) return;
    const reasonTrim = reportReason.trim();
    if (reasonTrim.length < 5) {
      setReportError('Vui lòng nhập lý do report từ 5 ký tự trở lên.');
      return;
    }

    setReportBusy(true);
    setReportError(null);
    try {
      await reportParticipant(match.id, user.id, reportTarget.id, reasonTrim);
      setReportSuccess(true);
      setTimeout(() => {
        setReportModalOpen(false);
        setReportTarget(null);
      }, 1500);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Gửi report thất bại');
    } finally {
      setReportBusy(false);
    }
  };

  const handleShare = () => {
    if (!match) return;
    const text = `${match.title}\nĐịa điểm: ${match.location}\nThời gian: ${match.time} ngày ${new Date(match.date).toLocaleDateString('vi-VN')}`;
    if (navigator.share) {
      navigator.share({ title: match.title, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Đã sao chép thông tin trận đấu vào clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-semibold">Đang tải chi tiết trận đấu...</span>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <AlertTriangle className="h-12 w-12 text-primary mx-auto" />
        <h3 className="text-lg font-bold text-white">Lỗi tải dữ liệu</h3>
        <p className="text-sm text-gray-500">{error || 'Không tìm thấy thông tin trận đấu.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-primary hover:bg-primary-hover font-bold text-white px-6 py-2.5 rounded-2xl transition-colors duration-300"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 pt-4 px-4 animate-fade-in">
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
          {isHost && (
            <button
              onClick={() => navigate(`/matches/create?editId=${match.id}`)}
              className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold px-4 py-2 rounded-2xl transition-colors duration-300 cursor-pointer"
            >
              Chỉnh sửa trận đấu
            </button>
          )}
          <button
            onClick={() => setFavorite(!favorite)}
            className="bg-[#121214] hover:bg-[#1a1a1c] border border-neutral-800 text-gray-400 hover:text-white p-2.5 rounded-full transition-colors cursor-pointer"
          >
            <Heart className={`h-4 w-4 ${favorite ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
          <button
            onClick={handleShare}
            className="bg-[#121214] hover:bg-[#1a1a1c] border border-neutral-800 text-gray-400 hover:text-white p-2.5 rounded-full transition-colors cursor-pointer"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Unified Box */}
      <div className="bg-[#121214] border border-[#242427] rounded-3xl overflow-hidden shadow-xl w-full">
        {/* Header segment with dark red tint background */}
        <div className="bg-[#241818]/60 p-6 md:p-8 space-y-3 border-b border-[#2a2424]">
          <span className="inline-block px-3 py-1 text-[10px] font-extrabold rounded-full bg-[#ff4d4f] text-white uppercase tracking-wider">
            {match.sport}
          </span>
          <h1 className="text-3xl font-bold text-white leading-tight">
            {match.title}
          </h1>
          <p className="text-gray-400 text-sm font-semibold">
            {match.priceLabel || 'Miễn phí'} / {match.maxPlayers}
          </p>
        </div>

        {/* Info & Requirements Body segment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
          {/* Left info column */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">THÔNG TIN TRẬN ĐẤU</h3>
            
            {/* Time */}
            <div className="flex gap-4 items-start">
              <Clock className="h-5 w-5 text-red-500 mt-1 shrink-0" />
              <div>
                <span className="block text-[11px] text-gray-500 font-bold uppercase tracking-wide">Thời gian</span>
                <span className="text-base font-extrabold text-white block mt-0.5">{match.timeRange}</span>
                <span className="block text-xs text-gray-400 mt-0.5">Ngày {new Date(match.date).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            {/* Location */}
            <div className="flex gap-4 items-start">
              <MapPin className="h-5 w-5 text-red-500 mt-1 shrink-0" />
              <div>
                <span className="block text-[11px] text-gray-500 font-bold uppercase tracking-wide">Địa điểm</span>
                <span className="text-base font-extrabold text-white block mt-0.5">{match.venueName}</span>
                <span className="block text-xs text-gray-400 mt-0.5">{match.venueCity || match.location}</span>
              </div>
            </div>

            {/* Players count */}
            <div className="flex gap-4 items-start">
              <Users className="h-5 w-5 text-red-500 mt-1 shrink-0" />
              <div>
                <span className="block text-[11px] text-gray-500 font-bold uppercase tracking-wide">Số lượng người chơi</span>
                <span className="text-base font-extrabold text-white block mt-0.5">{match.currentPlayers} / {match.maxPlayers}</span>
                <span className="block text-xs text-gray-400 mt-0.5">{spotsLeft > 0 ? `${spotsLeft} chỗ còn lại` : 'Đã đủ người chơi'}</span>
              </div>
            </div>
          </div>

          {/* Right requirement column */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">YÊU CẦU</h3>
            
            {/* Level Card */}
            <div className="bg-[#18181b] border border-[#242427]/60 rounded-2xl p-4">
              <span className="block text-xs text-gray-500 font-medium">Trình độ</span>
              <span className="text-sm font-extrabold text-white mt-1 block">{match.skillLevelVi || 'Tất cả'}</span>
            </div>

            {/* Gender Card */}
            <div className="bg-[#18181b] border border-[#242427]/60 rounded-2xl p-4">
              <span className="block text-xs text-gray-500 font-medium">Giới tính</span>
              <span className="text-sm font-extrabold text-white mt-1 block">Tất cả</span>
            </div>

            {/* Age Limit Card */}
            <div className="bg-[#18181b] border border-[#242427]/60 rounded-2xl p-4">
              <span className="block text-xs text-gray-500 font-medium">Giới hạn tuổi</span>
              <span className="text-sm font-extrabold text-white mt-1 block">Không có</span>
            </div>
          </div>
        </div>

        {/* Requirements & Rules segments */}
        <div className="p-6 md:p-8 space-y-6 border-t border-[#242427]">
          {/* Joining Requirements */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Yêu cầu tham gia</h3>
            {match.requirements.length > 0 ? (
              <ul className="space-y-1.5 text-xs text-gray-400">
                {match.requirements.map((r, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-[#ff4d4f] mr-1">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400 flex items-center gap-2">
                <span className="text-[#ff4d4f] mr-1">•</span>
                <span>Không có yêu cầu đặc biệt</span>
              </p>
            )}
          </div>

          <div className="border-t border-[#242427]/60 my-5" />

          {/* Rules */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Nội quy sân</h3>
            {match.rules.length > 0 ? (
              <ul className="space-y-1.5 text-xs text-gray-400">
                {match.rules.map((rule, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-[#ff4d4f] mr-1">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400 flex items-center gap-2">
                <span className="text-[#ff4d4f] mr-1">•</span>
                <span>Trạng phục phù hợp</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Organizer and Action Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Organizer */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Người tổ chức</h2>
          <div className="bg-[#121214] border border-[#242427] rounded-3xl p-5 shadow-xl flex flex-col justify-between min-h-[150px]">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-red-900 to-red-600 flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-md overflow-hidden">
                {match.organizer.avatarUrl ? (
                  <img src={match.organizer.avatarUrl} alt="Avatar" className="h-full w-full object-cover rounded-full" />
                ) : (
                  <span>{match.organizer.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="space-y-1">
                <span className="font-extrabold text-white text-sm block">{match.organizer.name}</span>
                <span className="text-xs text-gray-500 block">Đã tổ chức: {match.organizer.matchesPlayed} trận</span>
                
                {/* Rating stars colored red matching the mockup */}
                <div className="flex items-center gap-1 text-xs">
                  <div className="flex items-center text-[#ff4d4f]">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const active = i < Math.floor(match.organizer.rating);
                      return <span key={i} className="text-base leading-none">{active ? '★' : '☆'}</span>;
                    })}
                  </div>
                  <span className="text-gray-400 ml-1 text-xs">Độ uy tiên: {match.organizer.rating.toFixed(1)} / 5.0</span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <span
                onClick={() => navigate(`/profile/${match.hostId}`)}
                className="text-xs text-red-400 font-bold hover:underline cursor-pointer"
              >
                Xem tất cả các trận
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Hành động</h2>
          <div className="bg-[#121214] border border-[#242427] rounded-3xl p-5 shadow-xl space-y-4">
            <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">TRẠNG THÁI ĐĂNG KÝ</span>
            <button
              onClick={handleToggleJoin}
              disabled={joinBusy || matchStatus !== 'active' || (!isJoined && spotsLeft <= 0)}
              className={`w-full py-3 rounded-2xl font-bold text-xs shadow-md transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                isJoined
                  ? 'bg-transparent border border-red-500/50 text-white hover:bg-red-500/5'
                  : 'bg-[#ff4d4f] hover:bg-red-600 text-white'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {joinBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isJoined ? (
                'Hủy tham gia'
              ) : spotsLeft <= 0 ? (
                'Trận đấu đã đầy'
              ) : (
                'Tham gia ngay'
              )}
            </button>
            <button
              disabled
              className="w-full bg-transparent border border-[#ff4d4f]/30 hover:bg-[#ff4d4f]/5 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center cursor-not-allowed transition-all"
            >
              Chờ duyệt rà
            </button>
          </div>
        </div>
      </div>

      {/* Participants list */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Người tham gia ({match.participants.length})</h2>
        <div className="space-y-2.5">
          {match.participants.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4 bg-[#121214] border border-[#242427] rounded-2xl">Chưa có ai đăng ký tham gia.</p>
          ) : (
            match.participants.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/profile/${p.id}`)}
                className="bg-[#121214] border border-[#242427] rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-red-500/20 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-[#242427] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner overflow-hidden">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="Avatar" className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <span>{p.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white truncate block group-hover:text-[#ff4d4f] transition-colors">{p.name}</span>
                    <span className="text-[10px] text-gray-500 block">Level {p.level === 'Beginner' ? 'Beginner' : p.level === 'Advanced' ? 'Advanced' : 'Intermediate'}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Google Maps block */}
      <div className="bg-[#121214] border border-[#242427] rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-md font-bold text-white uppercase tracking-wider">Vị trí bản đồ</h3>
        <div className="w-full h-80 rounded-2xl overflow-hidden border border-[#242427]">
          <iframe
            title="Google Maps Location"
            src={match.mapUrl}
            className="w-full h-full border-none"
            loading="lazy"
          />
        </div>
      </div>

      {/* REPORT MODAL */}
      {reportModalOpen && reportTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-darkCard border border-darkBorder rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <div>
              <h3 className="text-lg font-bold text-white">Report người tham gia</h3>
              <p className="text-xs text-gray-500 mt-1">
                Báo cáo hành vi không đẹp của: <strong className="text-white font-medium">{reportTarget.name}</strong>
              </p>
            </div>

            {reportSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                <CheckIcon className="h-5 w-5 shrink-0" />
                <span>Báo cáo thành công! Admin sẽ xem xét.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                {reportError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{reportError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs text-gray-400 font-medium">Lý do báo cáo</label>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Ví dụ: Không tham gia trận đấu không báo trước, có thái độ thô lỗ..."
                    className="w-full h-32 bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={reportBusy}
                    onClick={() => setReportModalOpen(false)}
                    className="flex-1 bg-darkBg border border-darkBorder hover:border-gray-700 text-gray-400 hover:text-white py-3 rounded-2xl text-xs font-bold transition-all duration-300"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={reportBusy}
                    className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 rounded-2xl text-xs font-bold transition-all duration-300 shadow-md shadow-primary/10"
                  >
                    {reportBusy ? 'Đang gửi...' : 'Gửi báo cáo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
