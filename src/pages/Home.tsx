import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type SuggestedPartner } from '@/contexts/AuthContext';
import { fetchMatches, type ApiMatch } from '@/lib/matchApi';
import { computeDisplayStatus } from '@/lib/matchStatus';
import { Search, MapPin, Calendar, Users, Trophy, Plus, ArrowRight, User, Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react';

const SPORT_EMOJI: Record<string, string> = {
  Football: "⚽",
  Soccer: "⚽",
  Basketball: "🏀",
  Volleyball: "🏐",
  Tennis: "🎾",
  Badminton: "🏸",
  "Ping Pong": "🏓",
  "Table Tennis": "🏓",
  Swimming: "🏊",
  Running: "🏃",
  Gym: "💪",
  Fitness: "💪",
  Cricket: "🏏",
  default: "🏆",
};

function getSportEmoji(sport: string): string {
  const key = Object.keys(SPORT_EMOJI).find((k) =>
    sport.toLowerCase().includes(k.toLowerCase())
  );
  return key ? SPORT_EMOJI[key] : SPORT_EMOJI.default;
}

export default function Home() {
  const navigate = useNavigate();
  const { user, fetchSuggestedPartners } = useAuth();

  // States
  const [partners, setPartners] = useState<SuggestedPartner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const [partnerIndex, setPartnerIndex] = useState(0);

  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load data
  useEffect(() => {
    async function loadData() {
      // 1. Suggested Partners
      try {
        setPartnersLoading(true);
        const res = await fetchSuggestedPartners({ limit: 1000 });
        setPartners(res.partners);
      } catch (err) {
        setPartnersError('Không thể tải gợi ý partner');
      } finally {
        setPartnersLoading(false);
      }

      // 2. Matches
      try {
        setMatchesLoading(true);
        const list = await fetchMatches();
        setMatches(list);
      } catch (err) {
        setMatchesError('Không tải được danh sách trận đấu');
      } finally {
        setMatchesLoading(false);
      }
    }
    loadData();
  }, [fetchSuggestedPartners]);

  const upcomingMatches = useMemo(() => {
    return matches.filter((m) => {
      const displayStatus = computeDisplayStatus(m.status ?? 'active', m.date, m.time);
      if (displayStatus.key === 'finished' || displayStatus.key === 'cancelled') return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          m.title?.toLowerCase().includes(query) ||
          m.location?.toLowerCase().includes(query) ||
          m.sport?.toLowerCase().includes(query) ||
          m.host?.name?.toLowerCase().includes(query) ||
          m.host?.username?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [matches, searchQuery]);

  const thisWeekMatchesCount = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return matches.filter((m) => {
      const d = new Date(m.date);
      return d >= startOfWeek && d < endOfWeek;
    }).length;
  }, [matches]);

  const handleNextPartner = () => {
    if (partnerIndex < partners.length - 1) {
      setPartnerIndex((prev) => prev + 1);
    } else {
      setPartnerIndex(0); // Loop back
    }
  };

  const handlePrevPartner = () => {
    if (partnerIndex > 0) {
      setPartnerIndex((prev) => prev - 1);
    } else {
      setPartnerIndex(partners.length - 1); // Loop to end
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Hero Welcome Banner */}
      <section className="bg-gradient-to-r from-[#ff4d4f] via-[#b32424] to-[#3d1419] border border-red-600/20 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 blur-[100px] pointer-events-none" />
        <div className="space-y-4 max-w-2xl relative z-10">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-black/30 border border-white/10 text-white/95 shadow-sm">
            {user ? `Chào mừng trở lại, ${user.name || user.username}!` : 'Chào mừng đến với SportMate!'}
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Cùng SportMate kết nối đam mê thể thao
          </h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-xl">
            Khám phá các trận đấu đang diễn ra xung quanh bạn hoặc tạo một trận đấu mới để rủ đồng đội tham gia.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/matches/create')}
              className="flex items-center gap-2 bg-black hover:bg-black/85 border border-white/5 px-5 py-3 rounded-2xl text-xs font-bold text-white transition-all duration-300 shadow-md"
            >
              <Plus className="h-4 w-4" />
              Tạo trận đấu mới
            </button>
            <button
              onClick={() => navigate('/ranking')}
              className="flex items-center gap-2 bg-red-950/35 hover:bg-red-950/50 border border-white/10 px-5 py-3 rounded-2xl text-xs font-bold text-white transition-all duration-300"
            >
              <Trophy className="h-4 w-4" />
              Bảng xếp hạng
            </button>
          </div>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Thống kê nhanh */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 flex justify-between items-center shadow-md relative overflow-hidden group">
          <div className="space-y-1">
            <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">THỐNG KÊ NHANH</span>
            <span className="block text-3xl font-black text-white">{thisWeekMatchesCount}</span>
            <span className="block text-xs text-gray-400">Trận tuần này</span>
          </div>
          <div className="text-3xl bg-[#1b1b1f] border border-darkBorder/40 p-3.5 rounded-2xl group-hover:scale-105 transition-transform duration-300 shadow-inner">
            📅
          </div>
        </div>

        {/* Card 2: Cộng đồng */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 flex justify-between items-center shadow-md relative overflow-hidden group">
          <div className="space-y-1">
            <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">CỘNG ĐỒNG</span>
            <span className="block text-3xl font-black text-white">{partners.length}</span>
            <span className="block text-xs text-gray-400">Đồng đội gần đây</span>
          </div>
          <div className="text-3xl bg-[#1b1b1f] border border-darkBorder/40 p-3.5 rounded-2xl group-hover:scale-105 transition-transform duration-300 shadow-inner">
            ⏰
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Matches List, Right = Partner Suggestion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column (2/3 width): Upcoming Matches */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              🏆 Trận đấu sắp diễn ra
            </h2>
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Tìm trận đấu, môn, địa điểm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-darkCard border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none transition-all duration-300 shadow-inner"
              />
            </div>
          </div>

          {matchesLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-darkCard border border-darkBorder rounded-3xl gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm">Đang tải danh sách trận đấu...</span>
            </div>
          ) : matchesError ? (
            <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-3xl text-red-400 text-sm">
              {matchesError}
            </div>
          ) : upcomingMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-darkCard border border-darkBorder rounded-3xl text-center p-6 space-y-4">
              <span className="text-4xl">🏟️</span>
              <h3 className="text-md font-semibold text-white">Không có trận đấu nào</h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Không tìm thấy trận đấu nào phù hợp với từ khóa của bạn hoặc chưa có trận đấu nào sắp diễn ra.
              </p>
              <button
                onClick={() => navigate('/matches/create')}
                className="bg-primary hover:bg-primary-hover px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-colors duration-300"
              >
                + Tạo trận đấu mới
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingMatches.slice(0, 6).map((m, idx) => {
                const cur = Number(m.currentPlayers ?? 0);
                const max = Number(m.maxPlayers);
                const hostName = m.host?.name || m.host?.username || 'Người tổ chức';
                const isFirst = idx === 0;

                return (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/matches/${m.id}`)}
                    className={`bg-darkCard border ${
                      isFirst ? 'border-primary' : 'border-darkBorder'
                    } hover:border-primary/40 rounded-3xl p-5 flex items-center justify-between gap-4 transition-all duration-300 cursor-pointer shadow-md relative overflow-hidden group`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Sport Badge / Icon */}
                      <div className="h-12 w-12 rounded-2xl bg-darkBg border border-darkBorder flex items-center justify-center shrink-0 text-2xl group-hover:scale-105 transition-transform duration-300 shadow-inner">
                        {getSportEmoji(m.sport)}
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <h4 className="font-extrabold text-white text-base truncate group-hover:text-primary transition-colors duration-300">
                          {m.title}
                        </h4>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-600" />
                            <span className="truncate">{m.location}</span>
                          </p>
                          <p className="text-xs text-gray-400 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-600" />
                            <span>{m.time} • {new Date(m.date).toLocaleDateString('vi-VN')}</span>
                          </p>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          Tổ chức bởi: <span className="text-white font-medium">{hostName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <span className="text-xs font-bold text-red-400 tracking-wide uppercase">
                        {cur}/{max} Players
                      </span>
                      <div className="h-10 w-10 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md transition-all group-hover:scale-105">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column (1/3 width): Partner Gợi Ý */}
        <div className="space-y-6">
          {partnersLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-darkCard border border-darkBorder rounded-3xl gap-3 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs">Đang tải đồng đội...</span>
            </div>
          ) : partnersError ? (
            <div className="p-6 text-center bg-red-500/5 border border-red-500/10 rounded-3xl text-red-400 text-xs">
              {partnersError}
            </div>
          ) : partners.length === 0 ? (
            <div className="p-6 text-center bg-darkCard border border-darkBorder rounded-3xl text-gray-500 text-xs">
              Không tìm thấy đồng đội gợi ý gần bạn.
            </div>
          ) : (
            <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 shadow-lg flex flex-col items-center relative overflow-hidden select-none">
              {/* Card Title */}
              <div className="w-full flex items-center gap-2 mb-4 text-xs font-bold text-white uppercase tracking-wider justify-start">
                <span>🔥 Đồng đội của bạn ở đây</span>
              </div>

              {/* Avatar circle with letter T (or image if available) */}
              <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-red-900 to-red-600 overflow-hidden flex items-center justify-center mb-3 shrink-0 shadow-md">
                {partners[partnerIndex]?.avatar ? (
                  <img
                    src={partners[partnerIndex].avatar}
                    alt={partners[partnerIndex].name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-white">
                    {partners[partnerIndex]?.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Teammate Info */}
              <h3 className="text-md font-bold text-white truncate max-w-full">
                {partners[partnerIndex]?.name}
              </h3>
              <p className="text-[11px] text-[#ff4d4f] font-bold mt-1.5 uppercase tracking-wide">
                {partners[partnerIndex]?.sport || 'Chưa chọn môn'} • {partners[partnerIndex]?.level || 'Mọi trình độ'}
              </p>

              {/* Separator */}
              <div className="w-full border-b border-darkBorder/60 my-4" />

              {/* Stats Split Grid */}
              <div className="grid grid-cols-2 gap-3 w-full my-1">
                <div className="bg-darkBg/50 border border-darkBorder/55 rounded-xl p-3 text-center">
                  <span className="block text-[10px] text-gray-500 uppercase font-semibold">Tỉ lệ thắng</span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {partners[partnerIndex]?.winRate}%
                  </span>
                </div>
                <div className="bg-darkBg/50 border border-darkBorder/55 rounded-xl p-3 text-center">
                  <span className="block text-[10px] text-gray-500 uppercase font-semibold">Khoảng cách</span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {partners[partnerIndex]?.distance || '—'}
                  </span>
                </div>
              </div>

              {/* Location Pill */}
              <div className="w-full bg-darkBg/60 border border-darkBorder/40 py-2.5 px-4 rounded-xl flex items-center gap-2 justify-center text-xs text-gray-400 font-semibold mt-4 mb-2 truncate">
                <MapPin className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <span className="truncate">{partners[partnerIndex]?.location || 'Không rõ địa chỉ'}</span>
              </div>

              {/* View Profile Button */}
              <button
                onClick={() => navigate(`/profile/${partners[partnerIndex].id}`)}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 transition-all mt-4"
              >
                <User className="h-3.5 w-3.5" />
                Xem thêm
              </button>

              {/* Pagination Dots with Arrows */}
              <div className="flex items-center justify-center gap-3 mt-5 w-full">
                <button
                  type="button"
                  onClick={handlePrevPartner}
                  className="p-1 hover:text-red-500 text-gray-500 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  {partners.map((_, idx) => (
                    <span
                      key={`dot-${idx}`}
                      onClick={() => setPartnerIndex(idx)}
                      className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                        idx === partnerIndex ? 'w-5 bg-red-500' : 'w-1.5 bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleNextPartner}
                  className="p-1 hover:text-red-500 text-gray-500 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
