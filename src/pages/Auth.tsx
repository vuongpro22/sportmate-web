import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { KeyRound, Mail, User, Phone, Eye, EyeOff, Check, X } from 'lucide-react';

type Mode = 'login' | 'register' | 'forgot-password' | 'reset-password';

export default function Auth() {
  const { login, register, requestPasswordReset, resetPassword, loading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    const result = await login({ identifier: email, password });
    if (result.ok) {
      navigate('/');
    } else {
      setError(result.error || 'Đăng nhập thất bại');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!fullName || !email || !password) {
      setError('Vui lòng điền các trường bắt buộc');
      return;
    }
    const result = await register({ fullName, email, phone, password });
    if (result.ok) {
      navigate('/');
    } else {
      setError(result.error || 'Đăng ký thất bại');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email) {
      setError('Vui lòng điền email');
      return;
    }
    const result = await requestPasswordReset(email);
    if (result.ok) {
      setSuccess('Mã khôi phục đã được gửi tới email của bạn.');
      setMode('reset-password');
    } else {
      setError(result.error || 'Yêu cầu thất bại');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email || !code || !newPassword) {
      setError('Vui lòng điền đầy đủ các trường');
      return;
    }
    const result = await resetPassword({ email, code, newPassword });
    if (result.ok) {
      setSuccess('Mật khẩu đã được cập nhật thành công. Hãy đăng nhập.');
      setMode('login');
      setPassword('');
      setCode('');
      setNewPassword('');
    } else {
      setError(result.error || 'Đặt lại mật khẩu thất bại');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-darkBg px-4 py-12 relative overflow-hidden select-none">
      {/* Background decoration elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-red-900/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-darkCard border border-darkBorder rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <span className="text-primary font-black tracking-widest text-2xl">SPORTMATE</span>
          <h2 className="mt-2 text-xl font-bold text-white">
            {mode === 'login' && 'Chào mừng trở lại'}
            {mode === 'register' && 'Tạo tài khoản mới'}
            {mode === 'forgot-password' && 'Khôi phục mật khẩu'}
            {mode === 'reset-password' && 'Đặt lại mật khẩu'}
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            {mode === 'login' && 'Đăng nhập để tìm đồng đội và đặt lịch sân'}
            {mode === 'register' && 'Đăng ký ngay để bắt đầu trải nghiệm'}
            {mode === 'forgot-password' && 'Nhập email để nhận mã xác minh 6 số'}
            {mode === 'reset-password' && 'Nhập mã xác minh và mật khẩu mới'}
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <X className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
            <Check className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* FORMS */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Tên đăng nhập hoặc Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs text-gray-400 font-medium">Mật khẩu</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot-password')}
                  className="text-xs text-primary hover:text-primary-hover font-semibold transition-colors duration-300"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                  <KeyRound className="h-5 w-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 pl-12 pr-12 text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors duration-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover font-bold text-white rounded-2xl py-3.5 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>

            <p className="text-center text-xs text-gray-500 mt-6">
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  clearMessages();
                }}
                className="text-primary font-semibold hover:text-primary-hover transition-colors duration-300"
              >
                Đăng ký ngay
              </button>
            </p>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Họ và Tên *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Email *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Số điện thoại</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                  <Phone className="h-5 w-5" />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0987654321"
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Mật khẩu *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                  <KeyRound className="h-5 w-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 pl-12 pr-12 text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors duration-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover font-bold text-white rounded-2xl py-3.5 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>

            <p className="text-center text-xs text-gray-500 mt-6">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearMessages();
                }}
                className="text-primary font-semibold hover:text-primary-hover transition-colors duration-300"
              >
                Đăng nhập
              </button>
            </p>
          </form>
        )}

        {mode === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Nhập Email tài khoản</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover font-bold text-white rounded-2xl py-3.5 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Gửi mã xác minh'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                clearMessages();
              }}
              className="w-full border border-darkBorder hover:border-gray-700 text-gray-400 hover:text-white font-semibold rounded-2xl py-3.5 text-sm transition-colors duration-300"
            >
              Quay lại đăng nhập
            </button>
          </form>
        )}

        {mode === 'reset-password' && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Mã xác minh (6 số)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-center tracking-widest font-black text-lg text-white focus:outline-none transition-all duration-300"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Mật khẩu mới</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                  <KeyRound className="h-5 w-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 pl-12 pr-12 text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors duration-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover font-bold text-white rounded-2xl py-3.5 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
