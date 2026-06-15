import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiBase';
import { resolveAvatarUrl } from '@/lib/userApi';
import { Trophy, TrendingUp, Users, Loader2, ChevronRight, Award, ShieldAlert } from 'lucide-react';

type RankEntry = {
  id: string;
  name: string;
  avatar: string | null;
  location: string;
  sport: string | null;
  level: string | null;
  matchesWon: number;
  matchesPlayed: number;
  winRate: number;
  hoursActive: number;
};

const GOLD = '#f59e0b';
const SILVER = '#94a3b8';
const BRONZE = '#cd7c3a';
const MEDAL_COLORS = [GOLD, SILVER, BRONZE];
const MEDAL_EMOJIS = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const navigate = useNavigate();

  const [data, setData] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRanking = async () => {
    setLoading(true);
    setError(null);
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/users/ranking`);
      if (!res.ok) throw new Error('Không tải được bảng xếp hạng');
      const json: RankEntry[] = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking();
  }, []);

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-semibold">Đang tải bảng xếp hạng...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <ShieldAlert className="h-12 w-12 text-primary mx-auto" />
        <h3 className="text-lg font-bold text-white">Lỗi kết nối</h3>
        <p className="text-sm text-gray-500">{error}</p>
        <button
          onClick={fetchRanking}
          className="bg-primary hover:bg-primary-hover font-bold text-white px-6 py-2.5 rounded-2xl transition-colors duration-300"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-2">
        <Trophy className="h-12 w-12 text-gray-600 mx-auto" />
        <h3 className="text-lg font-bold text-white">Bảng xếp hạng trống</h3>
        <p className="text-sm text-gray-500">Chưa có thông tin hoạt động xếp hạng của người dùng.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      {/* Header Info */}
      <section className="bg-gradient-to-br from-[#1b140b] to-darkCard border border-amber-500/10 rounded-3xl p-6 md:p-8 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-amber-500/5 blur-[80px] pointer-events-none" />
        
        {/* Trophy icon */}
        <div className="h-20 w-20 rounded-full bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center mb-4 text-3xl shadow-lg shadow-amber-500/10 animate-pulse">
          🏆
        </div>

        <span className="inline-block px-3 py-1 text-[10px] font-extrabold rounded-full border border-primary/20 text-primary bg-primary/5 uppercase tracking-wider mb-3">
          Season 2026
        </span>
        <h1 className="text-3xl font-black text-white tracking-wide uppercase">BẢNG XẾP HẠNG ĐỒNG ĐỘI</h1>
        <p className="text-gray-400 text-xs mt-2 max-w-md leading-relaxed">
          Được sắp xếp dựa trên độ uy tín, số trận thắng và tỉ lệ thắng của người chơi trong hệ thống SportMate.
        </p>

        {/* Legend stats */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-darkBg border border-darkBorder rounded-full text-[10px] font-bold text-gray-300">
            <Award className="h-3.5 w-3.5 text-amber-500" /> Số trận thắng
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-darkBg border border-darkBorder rounded-full text-[10px] font-bold text-gray-300">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Tỉ lệ thắng
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-darkBg border border-darkBorder rounded-full text-[10px] font-bold text-gray-300">
            <Users className="h-3.5 w-3.5 text-gray-500" /> Số trận chơi
          </span>
        </div>
      </section>

      {/* Podium Top 3 */}
      {top3.length > 0 && (
        <div className="space-y-4">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">🏆 Top 3 vinh danh</span>
          <div className="grid grid-cols-1 gap-4">
            {top3.map((p, index) => {
              const medalColor = MEDAL_COLORS[index];
              const medalEmoji = MEDAL_EMOJIS[index];
              const avatar = resolveAvatarUrl(p.avatar || undefined);

              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/profile/${p.id}`)}
                  className="bg-darkCard hover:bg-[#151515] border border-darkBorder hover:border-primary/20 rounded-3xl p-5 flex items-center justify-between gap-4 transition-all duration-300 cursor-pointer shadow-md relative overflow-hidden group"
                >
                  {/* Left medal accent */}
                  <div
                    className="absolute top-0 left-0 bottom-0 w-1.5"
                    style={{ backgroundColor: medalColor }}
                  />

                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-2xl w-8 shrink-0 text-center">{medalEmoji}</span>
                    
                    {/* Avatar */}
                    <div
                      className="h-14 w-14 rounded-2xl bg-darkBg overflow-hidden shrink-0 flex items-center justify-center border-2"
                      style={{ borderColor: `${medalColor}88` }}
                    >
                      {avatar ? (
                        <img src={avatar} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold" style={{ color: medalColor }}>
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <span className="font-extrabold text-white block text-sm sm:text-base truncate group-hover:text-primary transition-colors duration-300">
                        {p.name}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">
                        {p.sport || 'Nhiều môn'} • {p.location || 'Hà Nội'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold bg-[#141416] border border-darkBorder px-2.5 py-1.5 rounded-full" style={{ color: medalColor }}>
                        🏆 {p.matchesWon} thắng
                      </span>
                      <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold bg-[#141416] border border-darkBorder px-2.5 py-1.5 rounded-full text-primary">
                        ⚡ {p.winRate}% WinRate
                      </span>
                      <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold bg-[#141416] border border-darkBorder px-2.5 py-1.5 rounded-full text-gray-500">
                        🎮 {p.matchesPlayed} trận
                      </span>

                      {/* Compact for mobile */}
                      <span className="sm:hidden text-xs font-bold text-white" style={{ color: medalColor }}>
                        {p.matchesWon} W • {p.winRate}%
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rest of Leaderboard */}
      {rest.length > 0 && (
        <div className="space-y-4 pt-2">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">🔥 Danh sách người chơi</span>
          <div className="bg-darkCard border border-darkBorder rounded-3xl overflow-hidden shadow-lg divide-y divide-darkBorder/60">
            {rest.map((p, index) => {
              const rank = index + 4;
              const avatar = resolveAvatarUrl(p.avatar || undefined);

              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/profile/${p.id}`)}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-white/2 cursor-pointer transition-colors duration-300 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-xs font-bold text-gray-500 w-8 shrink-0">#{rank}</span>
                    
                    {/* Mini avatar */}
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
                      {avatar ? (
                        <img src={avatar} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-primary">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="font-bold text-white text-xs sm:text-sm block truncate group-hover:text-primary transition-colors duration-300">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-gray-500 block truncate">
                        {p.sport || 'Nhiều môn'} • {p.winRate}% win rate
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs">
                    <div className="bg-primary/10 border border-primary/20 text-primary py-1 px-3 rounded-lg text-center font-bold">
                      <span className="block text-xs">{p.matchesWon}</span>
                      <span className="block text-[8px] uppercase tracking-wide opacity-85">thắng</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-700" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
