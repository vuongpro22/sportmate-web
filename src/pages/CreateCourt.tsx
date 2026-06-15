import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  createCourt,
  fetchCourtById,
  resolveCourtImageUrl,
  updateCourt,
  uploadCourtImages,
  type CourtImageAsset,
} from '@/lib/courtApi';
import { COURT_SPORT_OPTIONS, type CourtSportKey } from '@/constants/courtSports';
import { ChevronLeft, Info, MapPin, DollarSign, Phone, Camera, Settings, Plus, Loader2, AlertTriangle, X } from 'lucide-react';

const MAX_IMAGES = 8;

export default function CreateCourt() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editId = searchParams.get('editId');
  const isEditMode = Boolean(editId);

  // States
  const [loadingCourt, setLoadingCourt] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [sportKey, setSportKey] = useState<CourtSportKey | ''>('');
  const [address, setAddress] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [amenitiesText, setAmenitiesText] = useState('');
  const [description, setDescription] = useState('');
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<CourtImageAsset[]>([]);

  useEffect(() => {
    if (user?.phone && !isEditMode) {
      setContactPhone(user.phone);
    }
  }, [isEditMode, user?.phone]);

  // Load existing court for editing
  useEffect(() => {
    const userId = user?.id;
    if (!editId || !isEditMode || !userId) {
      setLoadingCourt(false);
      return;
    }
    async function load() {
      if (!editId || !userId) return;
      setLoadingCourt(true);
      setError(null);
      try {
        const court = await fetchCourtById(editId);
        if (court.ownerId && court.ownerId !== userId) {
          setError('Bạn không có quyền chỉnh sửa thông tin của sân này.');
          setLoadingCourt(false);
          return;
        }

        setName(court.name);
        setSportKey(court.sportKey);
        setAddress(court.address);
        setPricePerHour(court.pricePerHour > 0 ? String(court.pricePerHour) : '');
        setContactPhone(court.contactPhone || '');
        setAmenitiesText(court.amenities.join(', '));
        setDescription(court.description || '');
        setExistingImages(court.images || []);
      } catch (err) {
        setError('Không tải được thông tin sân.');
      } finally {
        setLoadingCourt(false);
      }
    }
    load();
  }, [editId, isEditMode, user?.id]);

  const amenitiesPreview = useMemo(() => {
    return amenitiesText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }, [amenitiesText]);

  const remainingImageSlots = MAX_IMAGES - existingImages.length - selectedImages.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    const mapped = filesArray.map((file) => ({
      uri: URL.createObjectURL(file),
      mimeType: file.type,
      fileName: file.name,
    }));
    setSelectedImages((prev) => [...prev, ...mapped].slice(0, remainingImageSlots));
  };

  const removeExistingImage = (img: string) => {
    setExistingImages((prev) => prev.filter((item) => item !== img));
  };

  const removeSelectedImage = (uri: string) => {
    setSelectedImages((prev) => prev.filter((item) => item.uri !== uri));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'owner' || !user?.id) {
      setError('Tài khoản của bạn không phải là Chủ sân (owner).');
      return;
    }
    setError(null);

    if (name.trim().length < 2) {
      setError('Tên sân cần ít nhất 2 ký tự.');
      return;
    }
    if (!sportKey) {
      setError('Vui lòng chọn môn thể thao chơi trên sân.');
      return;
    }
    if (!address.trim()) {
      setError('Vui lòng nhập địa chỉ sân.');
      return;
    }

    const priceNum = pricePerHour.trim() ? Number(pricePerHour.trim()) : 0;
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError('Giá thuê sân không hợp lệ.');
      return;
    }

    const amenities = amenitiesPreview.slice(0, 12);

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        sportKey,
        address: address.trim(),
        pricePerHour: Math.round(priceNum),
        contactPhone: contactPhone.trim(),
        amenities,
        description: description.trim(),
        images: existingImages,
      };

      let savedCourt = isEditMode && editId
        ? await updateCourt(editId, user.id, payload)
        : await createCourt(user.id, payload);

      if (selectedImages.length > 0) {
        savedCourt = await uploadCourtImages(savedCourt.id, user.id, selectedImages);
      }

      setSelectedImages([]);
      setExistingImages(savedCourt.images);
      alert(isEditMode ? 'Cập nhật sân thành công!' : 'Đăng sân thành công!');
      navigate('/courts/my-courts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thông tin sân');
    } finally {
      setSubmitting(false);
    }
  };

  if (role !== 'owner') {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <AlertTriangle className="h-12 w-12 text-primary mx-auto" />
        <h3 className="text-lg font-bold text-white">Yêu cầu tài khoản Chủ sân</h3>
        <p className="text-sm text-gray-500">Chỉ tài khoản đối tác chủ sân mới được quyền đăng hoặc chỉnh sửa thông tin sân đấu.</p>
        <button
          onClick={() => navigate('/courts')}
          className="bg-primary hover:bg-primary-hover font-bold text-white px-6 py-2.5 rounded-2xl transition-colors duration-300"
        >
          Về danh sách sân
        </button>
      </div>
    );
  }

  if (loadingCourt) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-semibold">Đang tải thông tin sân...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center h-10 w-10 bg-darkCard border border-darkBorder hover:border-gray-700 text-white rounded-2xl transition-colors duration-300"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide uppercase">
            {isEditMode ? 'Sửa thông tin sân' : 'Đăng sân đấu mới'}
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {isEditMode ? 'Cập nhật lại các thông tin của sân' : 'Đăng thông tin sân đấu lên SportMate để chủ động đón khách'}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-2xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 md:p-8 space-y-5 shadow-xl">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Thông tin cơ bản</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-semibold">Tên sân đấu</label>
              <input
                type="text"
                placeholder="VD: Sân bóng đá mini Hòa Lạc"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-xs text-white focus:outline-none transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-semibold font-sans">Bộ môn thi đấu</label>
              <select
                value={sportKey}
                onChange={(e) => setSportKey(e.target.value as CourtSportKey)}
                className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-xs text-white focus:outline-none transition-all duration-300 cursor-pointer appearance-none"
              >
                <option value="">-- Chọn môn --</option>
                {COURT_SPORT_OPTIONS.map((sport) => (
                  <option key={sport.key} value={sport.key} className="bg-darkCard text-white">
                    {sport.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-semibold">Địa chỉ cụ thể</label>
            <input
              type="text"
              placeholder="VD: Khu Công Nghệ Cao Hòa Lạc, Thạch Thất, Hà Nội"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-xs text-white focus:outline-none transition-all duration-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-semibold">Giá thuê theo giờ (VNĐ/h)</label>
              <input
                type="text"
                placeholder="VD: 300000"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(e.target.value.replace(/[^\d]/g, ''))}
                className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-xs text-white focus:outline-none transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-semibold font-sans">SĐT liên hệ đặt sân</label>
              <input
                type="tel"
                placeholder="VD: 0987654321"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-xs text-white focus:outline-none transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 md:p-8 space-y-5 shadow-xl">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Hình ảnh sân đấu</h3>
          <p className="text-[11px] text-gray-500">Ảnh đầu tiên sẽ tự động làm ảnh đại diện trên danh sách sân.</p>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {/* Existing images */}
            {existingImages.map((img) => {
              const url = resolveCourtImageUrl(img);
              return (
                <div key={img} className="h-20 w-full relative bg-darkBg rounded-xl border border-darkBorder overflow-hidden">
                  <img src={url} alt="Sân" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(img)}
                    className="absolute top-1 right-1 p-0.5 bg-black/75 rounded-full hover:bg-black text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}

            {/* Selected files */}
            {selectedImages.map((img) => (
              <div key={img.uri} className="h-20 w-full relative bg-darkBg rounded-xl border border-darkBorder overflow-hidden">
                <img src={img.uri} alt="Selected" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeSelectedImage(img.uri)}
                  className="absolute top-1 right-1 p-0.5 bg-black/75 rounded-full hover:bg-black text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* Add photos button */}
            {remainingImageSlots > 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-20 w-full rounded-xl border-2 border-dashed border-darkBorder hover:border-primary/50 text-gray-500 hover:text-primary transition-all duration-300 flex flex-col items-center justify-center gap-1 bg-darkBg/30"
              >
                <Camera className="h-5 w-5" />
                <span className="text-[10px] font-bold">Thêm ảnh</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <p className="text-[10px] text-gray-500">Cho phép tải lên tối đa {MAX_IMAGES} ảnh.</p>
        </div>

        {/* Description & Amenities */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 md:p-8 space-y-5 shadow-xl">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Mô tả và tiện ích</h3>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-semibold">Tiện ích sân (Cách nhau bằng dấu phẩy)</label>
            <input
              type="text"
              placeholder="VD: Nước uống miễn phí, Đèn LED ban đêm, Cho thuê giày, Giữ xe máy..."
              value={amenitiesText}
              onChange={(e) => setAmenitiesText(e.target.value)}
              className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
            />
            {amenitiesPreview.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {amenitiesPreview.map((item) => (
                  <span
                    key={item}
                    className="px-2.5 py-1 text-[10px] font-semibold bg-darkBg border border-darkBorder/60 text-gray-400 rounded-full"
                  >
                    ✓ {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-semibold">Mô tả chi tiết</label>
            <textarea
              placeholder="Mô tả cụ thể về chất lượng mặt cỏ/mặt thảm, hệ thống chiếu sáng, vị trí, hướng dẫn đỗ xe hoặc quy định đặt sân..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-32 bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-300 resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-primary/10 hover:scale-102 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <span>{isEditMode ? 'Lưu thay đổi' : 'Đăng sân ngay'}</span>
          )}
        </button>
      </form>
    </div>
  );
}
