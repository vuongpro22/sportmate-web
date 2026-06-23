import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type SuggestedPartner } from '@/contexts/AuthContext';
import { Search, MapPin, Trophy, MessageSquare, Loader2, User, Activity, Sparkles } from 'lucide-react';

const SPORTS = [
  { key: 'all', label: 'Tất cả bộ môn' },
  { key: 'Bóng đá', label: 'Bóng đá' },
  { key: 'Cầu lông', label: 'Cầu lông' },
  { key: 'Tennis', label: 'Tennis' },
  { key: 'Pickleball', label: 'Pickleball' },
  { key: 'Bóng rổ', label: 'Bóng rổ' },
  { key: 'Bóng chuyền', label: 'Bóng chuyền' },
];

const SKILL_LEVELS = [
  { key: 'all', label: 'Mọi trình độ' },
  { key: 'Sơ Cấp', label: 'Sơ cấp' },
  { key: 'Trung Bình', label: 'Trung bình' },
  { key: 'Cao', label: 'Cao cấp' },
  { key: 'Chuyên Nghiệp', label: 'Chuyên nghiệp' },
];

export default function Partners() {
  const navigate = useNavigate();
  const { fetchSuggestedPartners } = useAuth();

  // Search states
  const [partners, setPartners] = useState<SuggestedPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    async function loadPartners() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchSuggestedPartners({
          limit: 100,
          q: searchQuery.trim() || undefined,
          sport: selectedSport !== 'all' ? selectedSport : undefined,
          level: selectedLevel !== 'all' ? selectedLevel : undefined,
        });
        setPartners(result.partners);
      } catch (err) {
        setError('Không tải được danh sách đồng đội.');
      } finally {
        setLoading(false);
      }
    }
    const delayDebounceFn = setTimeout(() => {
      loadPartners();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedSport, selectedLevel, fetchSuggestedPartners]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSport, selectedLevel]);

  const totalPages = Math.ceil(partners.length / ITEMS_PER_PAGE);

  const displayPartners = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return partners.slice(start, start + ITEMS_PER_PAGE);
  }, [partners, currentPage]);

  const pageNumbers = useMemo(() => {
    const range = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Tìm đồng đội
        </h1>
        <p className="text-gray-400 text-xs mt-1">Tìm kiếm và kết nối với những người chơi thể thao cùng đam mê quanh bạn</p>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-darkCard border border-darkBorder rounded-3xl p-5 shadow-inner">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm theo tên, username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none transition-all duration-300"
          />
        </div>

        {/* Sport Selector */}
        <select
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-sm text-white focus:outline-none transition-all duration-300 cursor-pointer appearance-none"
        >
          {SPORTS.map((s) => (
            <option key={s.key} value={s.key} className="bg-darkCard text-white">
              Bộ môn: {s.label}
            </option>
          ))}
        </select>

        {/* Level Selector */}
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

      {/* Main partner list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-darkCard border border-darkBorder rounded-3xl gap-3 text-gray-400 shadow-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm">Đang tìm kiếm đồng đội phù hợp...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-3xl text-red-400 text-sm">
          {error}
        </div>
      ) : partners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-darkCard border border-darkBorder rounded-3xl p-6 text-center space-y-4 shadow-lg">
          <span className="text-4xl">🏃‍♂️</span>
          <h3 className="text-base font-bold text-white">Không tìm thấy đồng đội</h3>
          <p className="text-xs text-gray-500 max-w-sm">
            Không có người chơi nào khớp với các tiêu chí tìm kiếm hiện tại của bạn.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayPartners.map((partner) => (
              <div
                key={partner.id}
                className="bg-darkCard border border-darkBorder hover:border-primary/20 rounded-3xl p-6 flex flex-col justify-between gap-5 transition-all duration-300 group shadow-md relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-transparent group-hover:bg-primary transition-all duration-300" />

                <div className="space-y-4">
                  {/* User info header */}
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                      {partner.avatar ? (
                        <img src={partner.avatar} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-white text-base truncate group-hover:text-primary transition-colors duration-300">
                        {partner.name}
                      </h3>
                      <p className="text-gray-500 text-xs truncate">@{partner.id.slice(-6)}</p>
                    </div>
                  </div>

                  {/* Sports and levels */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 border border-primary/20 text-primary uppercase">
                      {partner.sport || 'Chưa chọn môn'}
                    </span>
                    {partner.level && (
                      <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-darkBg border border-darkBorder text-gray-300 uppercase">
                        {partner.level}
                      </span>
                    )}
                  </div>

                  {/* Location and stats */}
                  <div className="space-y-2 text-xs text-gray-400 border-t border-darkBorder/40 pt-3">
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      <span className="truncate">{partner.location || 'Không rõ địa chỉ'}</span>
                    </p>
                    <div className="flex justify-between items-center bg-darkBg/60 rounded-xl p-2.5 border border-darkBorder/30">
                      <div className="flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                        <span>Tỉ lệ thắng: <strong className="text-white">{partner.winRate}%</strong></span>
                      </div>
                    </div>
                  </div>

                  {partner.bio && (
                    <p className="text-xs text-gray-500 line-clamp-2 italic">
                      "{partner.bio}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => navigate(`/profile/${partner.id}`)}
                    className="w-full bg-[#1c1c1f] hover:bg-neutral-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors border border-transparent cursor-pointer"
                  >
                    Hồ sơ
                  </button>
                  <button
                    onClick={() => navigate(`/chats/${partner.id}`)}
                    className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Nhắn tin
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl bg-darkCard border border-darkBorder text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-55 disabled:hover:bg-darkCard transition-all cursor-pointer"
              >
                Trang trước
              </button>
              
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPage === page
                      ? 'bg-primary text-white font-extrabold'
                      : 'bg-darkCard border border-darkBorder text-gray-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl bg-darkCard border border-darkBorder text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-55 disabled:hover:bg-darkCard transition-all cursor-pointer"
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
