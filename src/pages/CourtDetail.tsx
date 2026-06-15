import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  createCourtBooking,
  fetchCourtAvailability,
  fetchCourtById,
  formatCourtPrice,
  resolveCourtImageUrl,
  type ApiCourt,
  type CourtAvailabilitySlot,
} from '@/lib/courtApi';
import { getUpcomingDateKeys, formatDateChip } from '@/lib/courtCalendar';
import { getCourtSportLabel } from '@/constants/courtSports';
import { ChevronLeft, MapPin, DollarSign, Clock, Phone, User, Settings, Calendar, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

const DEFAULT_DATE = getUpcomingDateKeys(7)[0];

export default function CourtDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Page States
  const [court, setCourt] = useState<ApiCourt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking states
  const [selectedDate, setSelectedDate] = useState(DEFAULT_DATE);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [slots, setSlots] = useState<CourtAvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<CourtAvailabilitySlot | null>(null);
  const [bookingNotice, setBookingNotice] = useState<string | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);

  const isOwnerOfCourt = Boolean(user?.id && court?.ownerId === user.id);
  const dateOptions = getUpcomingDateKeys(7);

  // Fetch court detail
  const loadCourt = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const row = await fetchCourtById(id);
      setCourt(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được thông tin sân');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCourt();
  }, [loadCourt]);

  // Fetch slot availability
  const loadAvailability = useCallback(async () => {
    if (!id) return;
    setAvailabilityLoading(true);
    try {
      const result = await fetchCourtAvailability(id, selectedDate);
      setSlots(result.slots);
      // Reset selected slot if it is no longer available
      setSelectedSlot((current) => {
        if (!current) return null;
        const refreshed = result.slots.find((slot) => slot.startTime === current.startTime && slot.available);
        return refreshed || null;
      });
    } catch (err) {
      setSlots([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [id, selectedDate]);

  useEffect(() => {
    if (!court) return;
    loadAvailability();
  }, [court, selectedDate, loadAvailability]);

  const handleBook = async () => {
    if (!court || !selectedSlot || !user?.id) return;
    setBookingBusy(true);
    setBookingNotice(null);
    try {
      await createCourtBooking(court.id, {
        userId: user.id,
        bookingDate: selectedDate,
        startTime: selectedSlot.startTime,
        contactName: user.name || user.username,
        contactPhone: user.phone || '0987654321',
      });
      setBookingNotice(
        `Đặt sân thành công! Khung giờ: ${selectedSlot.startTime} - ${selectedSlot.endTime} ngày ${selectedDate}.`
      );
      setSelectedSlot(null);
      await loadAvailability();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Đặt lịch sân thất bại.');
    } finally {
      setBookingBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-semibold">Đang tải thông tin sân...</span>
      </div>
    );
  }

  if (error || !court) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <AlertTriangle className="h-12 w-12 text-primary mx-auto" />
        <h3 className="text-lg font-bold text-white">Lỗi tải dữ liệu</h3>
        <p className="text-sm text-gray-500">{error || 'Không tìm thấy thông tin sân đấu.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-primary hover:bg-primary-hover font-bold text-white px-6 py-2.5 rounded-2xl transition-colors duration-300"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const images = court.images.map((img) => resolveCourtImageUrl(img)).filter(Boolean) as string[];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 text-sm font-bold bg-darkCard/50 border border-darkBorder px-4 py-2 rounded-2xl"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại
        </button>
      </div>

      {/* Main Grid: Left = Info & Gallery, Right = Booking scheduler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Images & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery */}
          <div className="bg-darkCard border border-darkBorder rounded-3xl p-4 shadow-xl">
            {images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {images.slice(0, 2).map((img, index) => (
                  <div key={index} className="h-48 rounded-2xl overflow-hidden border border-darkBorder/60 bg-darkBg">
                    <img src={img} alt="Sân" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 rounded-2xl bg-[#151515] flex items-center justify-center border border-darkBorder text-gray-500 text-sm">
                Chưa có ảnh sân bãi.
              </div>
            )}
          </div>

          {/* Details Card */}
          <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
            <div>
              <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-primary/10 border border-primary/20 text-primary uppercase tracking-wide">
                {getCourtSportLabel(court.sportKey)}
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-3 leading-tight">
                {court.name}
              </h1>
            </div>

            {/* Meta attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-darkBg/60 border border-darkBorder/40 rounded-3xl p-5 shadow-inner text-sm space-y-3 sm:space-y-0">
              <div className="space-y-3">
                <p className="flex items-start gap-2 text-gray-300">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{court.address}</span>
                </p>
                <p className="flex items-center gap-2 text-gray-300">
                  <DollarSign className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-bold text-white">{formatCourtPrice(court.pricePerHour)}</span>
                </p>
                <p className="flex items-center gap-2 text-gray-300">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span>{court.openTime} - {court.closeTime} (Mỗi slot {court.slotMinutes}p)</span>
                </p>
              </div>
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-gray-300">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <span>SĐT liên hệ: {court.contactPhone || 'Đang cập nhật'}</span>
                </p>
                <p className="flex items-center gap-2 text-gray-300">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <span>Chủ sân: {court.owner?.name || court.owner?.username || 'SportMate Owner'}</span>
                </p>
              </div>
            </div>

            {/* Owner action bar */}
            {isOwnerOfCourt && (
              <div className="flex gap-4 border-t border-darkBorder pt-4">
                <button
                  onClick={() => navigate(`/courts/create?editId=${court.id}`)}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold border border-primary text-primary hover:bg-primary/5 transition-all duration-300"
                >
                  Chỉnh sửa thông tin sân
                </button>
                <button
                  onClick={() => navigate(`/courts/my-courts`)}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold bg-primary hover:bg-primary-hover text-white transition-all duration-300"
                >
                  Xem lịch đặt sân
                </button>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2 border-t border-darkBorder pt-4">
              <h3 className="text-sm font-bold text-white">Mô tả sân</h3>
              <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">
                {court.description || 'Chưa có mô tả chi tiết từ chủ sân.'}
              </p>
            </div>

            {/* Amenities */}
            <div className="space-y-3 border-t border-darkBorder pt-4">
              <h3 className="text-sm font-bold text-white">Tiện ích kèm theo</h3>
              {court.amenities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {court.amenities.map((item) => (
                    <span
                      key={item}
                      className="px-3 py-1.5 rounded-full text-xs bg-darkBg border border-darkBorder text-gray-300"
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Chưa cập nhật tiện ích sân.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Booking Selector */}
        {!isOwnerOfCourt && (
          <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/5 blur-xl pointer-events-none" />

            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Đặt lịch chơi
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Chọn ngày và khung giờ trống bên dưới để giữ chỗ
              </p>
            </div>

            {bookingNotice && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                <span>{bookingNotice}</span>
              </div>
            )}

            {/* Date Picker Horizontal Row */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-gray-400">Chọn ngày:</span>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {dateOptions.map((dateKey) => {
                  const { weekday, dayLabel } = formatDateChip(dateKey);
                  const active = selectedDate === dateKey;
                  return (
                    <button
                      key={dateKey}
                      onClick={() => {
                        setSelectedDate(dateKey);
                        setBookingNotice(null);
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border shrink-0 text-center w-14 transition-all duration-300 ${
                        active
                          ? 'bg-primary border-primary text-white shadow-md shadow-primary/10'
                          : 'bg-darkBg border-darkBorder text-gray-400 hover:text-white hover:border-gray-600'
                      }`}
                    >
                      <span className="text-[9px] uppercase font-bold tracking-tight opacity-75">{weekday}</span>
                      <span className="text-xs font-black mt-0.5">{dayLabel.split('/')[0]}</span>
                      <span className="text-[8px] opacity-75">T.{dayLabel.split('/')[1]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Picker Grid */}
            <div className="space-y-2 border-t border-darkBorder/60 pt-4">
              <span className="block text-xs font-bold text-gray-400">Chọn khung giờ:</span>
              {availabilityLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">Không tìm thấy khung giờ hoạt động nào.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const selected = selectedSlot?.startTime === slot.startTime;
                    const available = slot.available;

                    return (
                      <button
                        key={slot.startTime}
                        disabled={!available}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-3.5 px-3 rounded-2xl text-xs font-bold border transition-all duration-300 text-center ${
                          selected
                            ? 'bg-primary border-primary text-white shadow-md'
                            : !available
                            ? 'bg-darkBg border-darkBorder/40 text-gray-600 cursor-not-allowed line-through'
                            : 'bg-darkBg border-darkBorder text-emerald-400 hover:border-emerald-500 hover:bg-emerald-500/5'
                        }`}
                      >
                        {slot.startTime} - {slot.endTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Booking submission button */}
            <button
              onClick={handleBook}
              disabled={!selectedSlot || bookingBusy}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
            >
              {bookingBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : selectedSlot ? (
                `Đặt sân: ${selectedSlot.startTime} - ${selectedSlot.endTime}`
              ) : (
                'Chọn khung giờ để đặt sân'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
