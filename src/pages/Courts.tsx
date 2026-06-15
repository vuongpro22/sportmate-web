import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourts, formatCourtPrice, resolveCourtImageUrl, type ApiCourt } from '@/lib/courtApi';
import { getCourtSportLabel, COURT_SPORT_OPTIONS } from '@/constants/courtSports';
import { Search, MapPin, Clock, DollarSign, User, ShieldAlert, Plus, Settings, Loader2 } from 'lucide-react';

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export default function Courts() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('all');

  const loadCourtsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCourts();
      setCourts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách sân');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourtsData();
  }, []);

  const filteredCourts = useMemo(() => {
    const query = normalizeSearchText(searchQuery);

    return courts.filter((court) => {
      if (selectedSport !== 'all' && court.sportKey !== selectedSport) {
        return false;
      }
      if (!query) return true;

      const searchable = normalizeSearchText(
        [court.name, court.sportLabel, court.address, court.owner?.name, court.owner?.username]
          .filter(Boolean)
          .join(' ')
      );

      return searchable.includes(query);
    });
  }, [courts, searchQuery, selectedSport]);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Hero Welcome banner */}
      <section className="bg-gradient-to-br from-[#10171a] to-darkCard border border-darkBorder rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-cyan-500/5 blur-[80px] pointer-events-none" />
        <div className="space-y-4 max-w-xl relative z-10 text-center md:text-left">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full border border-primary/20 text-primary bg-primary/5">
            Hệ thống sân bãi
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight font-sans">
            Đặt sân thể thao <span className="text-primary">nhanh chóng</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Tìm kiếm sân bãi phù hợp, theo dõi các khung giờ trống và đặt lịch tiện lợi trực tuyến.
          </p>
          
          {user?.role === 'owner' && (
            <div className="flex flex-wrap gap-3 pt-2 justify-center md:justify-start">
              <button
                onClick={() => navigate('/courts/my-courts')}
                className="flex items-center gap-2 border border-primary text-primary hover:bg-primary/5 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 hover:scale-102"
              >
                <Settings className="h-4 w-4" />
                Quản lý sân của tôi
              </button>
              <button
                onClick={() => navigate('/courts/create')}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover px-5 py-2.5 rounded-2xl text-xs font-bold text-white transition-all duration-300 shadow-md shadow-primary/10 hover:scale-102"
              >
                <Plus className="h-4 w-4" />
                Đăng sân mới
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Search and Sport Filter Tabs */}
      <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 shadow-inner space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm theo tên sân, bộ môn, địa chỉ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none transition-all duration-300"
          />
        </div>

        {/* Sport Tags */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => setSelectedSport('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-300 border ${
              selectedSport === 'all'
                ? 'bg-primary border-primary text-white'
                : 'bg-darkBg border-darkBorder text-gray-400 hover:text-white'
            }`}
          >
            Tất cả
          </button>
          {COURT_SPORT_OPTIONS.map((sport) => {
            const active = selectedSport === sport.key;
            return (
              <button
                key={sport.key}
                onClick={() => setSelectedSport(sport.key)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-300 border ${
                  active
                    ? 'bg-primary border-primary text-white'
                    : 'bg-darkBg border-darkBorder text-gray-400 hover:text-white'
                }`}
              >
                {sport.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Courts grid layout */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-darkCard border border-darkBorder rounded-3xl gap-3 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-semibold">Đang tải danh sách sân...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-3xl text-red-400 text-sm">
          {error}
        </div>
      ) : filteredCourts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-darkCard border border-darkBorder rounded-3xl p-6 text-center space-y-4">
          <span className="text-4xl">🏟️</span>
          <h3 className="text-base font-bold text-white">Không tìm thấy sân đấu</h3>
          <p className="text-xs text-gray-500 max-w-sm">
            {courts.length === 0
              ? 'Hiện tại chưa có sân nào được đăng trên hệ thống.'
              : 'Thử tìm kiếm với từ khóa khác hoặc chọn môn thể thao khác.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourts.map((court) => {
            const imageUri = resolveCourtImageUrl(court.images[0] || court.imageUrl);
            const ownerName = court.owner?.name || court.owner?.username || 'Chủ sân SportMate';

            return (
              <div
                key={court.id}
                onClick={() => navigate(`/courts/${court.id}`)}
                className="bg-darkCard hover:bg-[#151515] border border-darkBorder hover:border-primary/20 rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer shadow-md group flex flex-col justify-between"
              >
                {/* Image top */}
                <div className="h-44 w-full relative bg-darkBg overflow-hidden border-b border-darkBorder flex items-center justify-center">
                  {imageUri ? (
                    <img
                      src={imageUri}
                      alt={court.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <span className="text-4xl text-primary font-bold">🏟️</span>
                  )}
                  <span className="absolute top-3 right-3 px-3 py-1 text-[10px] font-bold rounded-full bg-primary/90 border border-primary/20 text-white backdrop-blur-md">
                    {getCourtSportLabel(court.sportKey)}
                  </span>
                </div>

                {/* Content body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-white text-base truncate group-hover:text-primary transition-colors duration-300">
                      {court.name}
                    </h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                      <MapPin className="h-4 w-4 shrink-0 text-gray-600" />
                      <span className="truncate">{court.address}</span>
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 shrink-0 text-gray-600" />
                      <span>Mở cửa: {court.openTime} - {court.closeTime}</span>
                    </p>
                  </div>

                  <div className="border-t border-darkBorder/60 pt-4 flex justify-between items-center text-xs text-gray-400">
                    <span className="font-bold text-white text-sm">{formatCourtPrice(court.pricePerHour)}</span>
                    <span className="flex items-center gap-1.5 max-w-[150px] truncate text-[11px] text-gray-500">
                      <User className="h-3.5 w-3.5 text-gray-600 shrink-0" />
                      <span className="truncate">{ownerName}</span>
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
