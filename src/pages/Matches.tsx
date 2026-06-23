import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMatches, fetchMyMatches, type ApiMatch } from '@/lib/matchApi';
import { computeDisplayStatus } from '@/lib/matchStatus';
import { Search, MapPin, Calendar, Plus, Trophy, Activity, Loader2, ArrowRight } from 'lucide-react';

const SPORTS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'football', label: 'Bóng đá' },
  { key: 'badminton', label: 'Cầu lông' },
  { key: 'tennis', label: 'Tennis' },
  { key: 'pickleball', label: 'Pickleball' },
  { key: 'basketball', label: 'Bóng rổ' },
  { key: 'volleyball', label: 'Bóng chuyền' },
];

const SKILL_LEVELS = [
  { key: 'all', label: 'Mọi trình độ' },
  { key: 'Beginner', label: 'Sơ cấp (Beginner)' },
  { key: 'Intermediate', label: 'Trung cấp (Intermediate)' },
  { key: 'Advanced', label: 'Cao cấp (Advanced)' },
];

const SPORT_EMOJI: Record<string, string> = {
  Football: "⚽",
  Soccer: "⚽",
  Basketball: "🏀",
  Volleyball: "🏐",
  Tennis: "🎾",
  Badminton: "🏸",
  "Ping Pong": "🏓",
  "Table Tennis": "🏓",
  default: "🏆",
};

function getSportEmoji(sport: string): string {
  const key = Object.keys(SPORT_EMOJI).find((k) =>
    sport.toLowerCase().includes(k.toLowerCase())
  );
  return key ? SPORT_EMOJI[key] : SPORT_EMOJI.default;
}

export default function Matches() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Navigation tabs: 'all' | 'mine'
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');

  useEffect(() => {
    async function loadMatchesData() {
      setLoading(true);
      setError(null);
      try {
        let list: ApiMatch[] = [];
        if (tab === 'mine') {
          if (!user?.id) {
            setError('Vui lòng đăng nhập để xem trận đấu của bạn.');
            setMatches([]);
            setLoading(false);
            return;
          }
          list = await fetchMyMatches(user.id);
        } else {
          list = await fetchMatches();
        }
        setMatches(list);
      } catch (err) {
        setError('Không tải được danh sách trận đấu');
      } finally {
        setLoading(false);
      }
    }
    loadMatchesData();
  }, [tab, user?.id]);

  // Client-side filtering
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText =
          m.title?.toLowerCase().includes(query) ||
          m.location?.toLowerCase().includes(query) ||
          m.sport?.toLowerCase().includes(query) ||
          m.host?.name?.toLowerCase().includes(query) ||
          m.host?.username?.toLowerCase().includes(query);
        if (!matchesText) return false;
      }

      // 2. Sport Filter
      if (selectedSport !== 'all') {
        // e.g. mapping key 'football' to match 'football' or 'soccer' or 'bóng đá'
        const sportLabel = SPORTS.find((s) => s.key === selectedSport)?.label.toLowerCase() || '';
        const matchSport = m.sport.toLowerCase();
        const matchesSport = matchSport.includes(selectedSport) || matchSport.includes(sportLabel);
        if (!matchesSport) return false;
      }

      // 3. Level Filter
      if (selectedLevel !== 'all') {
        const matchLevel = m.minSkillLevel.toLowerCase();
        const filterLevel = selectedLevel.toLowerCase();
        
        let matchesLevel = false;
        if (filterLevel.includes('beginner') && (matchLevel.includes('sơ') || matchLevel.includes('beginner') || matchLevel.includes('tất cả'))) {
          matchesLevel = true;
        } else if (filterLevel.includes('intermediate') && (matchLevel.includes('trung') || matchLevel.includes('intermediate') || matchLevel.includes('tất cả'))) {
          matchesLevel = true;
        } else if (filterLevel.includes('advanced') && (matchLevel.includes('cao') || matchLevel.includes('chuyên') || matchLevel.includes('advanced') || matchLevel.includes('tất cả'))) {
          matchesLevel = true;
        } else if (matchLevel.includes('tất cả') || matchLevel === '') {
          matchesLevel = true;
        }
        
        if (!matchesLevel) return false;
      }

      // 4. Past time filter (Only apply for 'All Matches' tab, NOT 'My Matches' tab)
      if (tab === 'all') {
        const displayStatus = computeDisplayStatus(m.status ?? 'active', m.date, m.time);
        if (displayStatus.key === 'finished' || displayStatus.key === 'cancelled') {
          return false;
        }
      }

      return true;
    });
  }, [matches, searchQuery, selectedSport, selectedLevel]);

  return (
    <div className="space-y-6">
      {/* Header and Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">DANH SÁCH TRẬN ĐẤU</h1>
          <p className="text-gray-400 text-xs mt-1">Tìm kiếm và đăng ký tham gia các hoạt động thể thao</p>
        </div>
        <button
          onClick={() => navigate('/matches/create')}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover px-5 py-3 rounded-2xl text-xs font-bold text-white transition-all duration-300 shadow-md shadow-primary/10 hover:scale-102 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Tạo trận đấu mới
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-darkBorder">
        <button
          onClick={() => setTab('all')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300 ${
            tab === 'all'
              ? 'border-primary text-white'
              : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          Tất cả trận đấu
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300 ${
            tab === 'mine'
              ? 'border-primary text-white'
              : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          Trận đấu của tôi
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-darkCard border border-darkBorder rounded-3xl p-5 shadow-inner">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm kiếm theo từ khóa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none transition-all duration-300"
          />
        </div>

        {/* Sport Select */}
        <select
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-sm text-white focus:outline-none transition-all duration-300 cursor-pointer appearance-none"
        >
          {SPORTS.map((s) => (
            <option key={s.key} value={s.key} className="bg-darkCard text-white">
              Môn: {s.label}
            </option>
          ))}
        </select>

        {/* Level Select */}
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-sm text-white focus:outline-none transition-all duration-300 cursor-pointer appearance-none"
        >
          {SKILL_LEVELS.map((lvl) => (
            <option key={lvl.key} value={lvl.key} className="bg-darkCard text-white">
              Trình độ: {lvl.label}
            </option>
          ))}
        </select>
      </div>

      {/* Match Cards List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-darkCard border border-darkBorder rounded-3xl gap-3 text-gray-400 shadow-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm">Đang tải danh sách trận đấu...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-3xl text-red-400 text-sm">
          {error}
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-darkCard border border-darkBorder rounded-3xl p-6 text-center space-y-4 shadow-lg">
          <span className="text-4xl">🏟️</span>
          <h3 className="text-base font-bold text-white">Không tìm thấy trận đấu</h3>
          <p className="text-xs text-gray-500 max-w-sm">
            Không tìm thấy trận đấu nào phù hợp với các bộ lọc hiện tại của bạn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredMatches.map((m) => {
            const cur = Number(m.currentPlayers ?? 0);
            const max = Number(m.maxPlayers);
            const pct = max > 0 ? Math.min(1, cur / max) : 0;
            const hostName = m.host?.name || m.host?.username || 'Người tổ chức';

            return (
              <div
                key={m.id}
                onClick={() => navigate(`/matches/${m.id}`)}
                className="bg-darkCard hover:bg-[#151515] border border-darkBorder hover:border-primary/20 rounded-3xl p-6 flex flex-col justify-between gap-5 transition-all duration-300 cursor-pointer relative overflow-hidden group shadow-md"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-transparent group-hover:bg-primary transition-all duration-300" />
                
                {/* Upper section */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 border border-primary/20 text-primary uppercase tracking-wide">
                      {m.sport}
                    </span>
                    <h3 className="font-extrabold text-white text-base truncate group-hover:text-primary transition-colors duration-300">
                      {m.title}
                    </h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-600" />
                      <span className="truncate">{m.location}</span>
                    </p>
                  </div>
                  
                  {/* Sport Icon */}
                  <div className="h-12 w-12 rounded-2xl bg-darkBg border border-darkBorder flex items-center justify-center shrink-0 text-2xl group-hover:scale-105 transition-transform duration-300 shadow-inner">
                    {getSportEmoji(m.sport)}
                  </div>
                </div>

                {/* Progress bar and details */}
                <div className="border-t border-darkBorder/60 pt-4 flex flex-col gap-4">
                  {/* Stats line */}
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-600" />
                      <span>{m.time} • {new Date(m.date).toLocaleDateString('vi-VN')}</span>
                    </span>
                    <span className="font-bold text-white">Trình độ: {m.minSkillLevel}</span>
                  </div>

                  {/* Progress segment */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Đã tham gia</span>
                      <span className="font-extrabold text-white">{cur}/{max} người chơi</span>
                    </div>
                    <div className="w-full h-1.5 bg-darkBg rounded-full overflow-hidden border border-darkBorder">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* User info and Action */}
                  <div className="flex justify-between items-center pt-1">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                        {m.host?.avatar ? (
                          <img src={m.host.avatar} alt="host" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-primary">
                            {hostName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">Host: <strong className="text-white font-medium">{hostName}</strong></span>
                    </div>

                    <span className="text-xs text-primary font-bold group-hover:translate-x-1 transition-transform duration-300 flex items-center gap-1">
                      Chi tiết <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
