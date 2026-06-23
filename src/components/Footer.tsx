import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import logoImg from '@/assets/logo.png';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [hoveredContact, setHoveredContact] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-darkCard border-t border-darkBorder/80 text-gray-400 mt-auto transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16 md:px-8">
        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Brand Info Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-2.5">
              <img src={logoImg} alt="SportMate" className="h-8 w-8 object-contain" />
              <span className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-2xl font-black tracking-wider text-transparent">
                SPORTMATE
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              SportMate - Nền tảng kết nối đam mê thể thao hàng đầu. Hỗ trợ tìm đồng đội, cáp kèo sân đấu và nâng tầm kỹ năng mỗi ngày.
            </p>
            {/* Social Icons */}
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com/profile.php?id=61590775346515"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 flex items-center justify-center rounded-2xl bg-darkBg border border-darkBorder hover:border-primary/40 text-gray-400 hover:text-primary transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,77,79,0.2)] group"
              >
                <svg className="h-5 w-5 fill-current transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="h-10 w-10 flex items-center justify-center rounded-2xl bg-darkBg border border-darkBorder hover:border-primary/40 text-gray-400 hover:text-primary transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,77,79,0.2)] group"
              >
                <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="h-10 w-10 flex items-center justify-center rounded-2xl bg-darkBg border border-darkBorder hover:border-primary/40 text-gray-400 hover:text-primary transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,77,79,0.2)] group"
              >
                <svg className="h-5 w-5 fill-current transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>
              <a
                href="mailto:support@sportmate.com"
                className="h-10 w-10 flex items-center justify-center rounded-2xl bg-darkBg border border-darkBorder hover:border-primary/40 text-gray-400 hover:text-primary transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,77,79,0.2)] group"
              >
                <Mail className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              </a>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div className="space-y-4 md:space-y-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Khám Phá</h4>
            <ul className="space-y-3.5">
              <li>
                <Link
                  to="/"
                  className="text-sm hover:text-primary transition-colors duration-300 flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40"></span>
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link
                  to="/matches"
                  className="text-sm hover:text-primary transition-colors duration-300 flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40"></span>
                  Trận đấu sắp diễn ra
                </Link>
              </li>
              <li>
                <Link
                  to="/courts"
                  className="text-sm hover:text-primary transition-colors duration-300 flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40"></span>
                  Tìm sân đấu
                </Link>
              </li>
              <li>
                <Link
                  to="/ranking"
                  className="text-sm hover:text-primary transition-colors duration-300 flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40"></span>
                  Bảng xếp hạng
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support & Legal */}
          <div className="space-y-4 md:space-y-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Hỗ Trợ & Pháp Lý</h4>
            <ul className="space-y-3.5">
              <li>
                <a
                  href="#"
                  className="text-sm hover:text-primary transition-colors duration-300 flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-700"></span>
                  Điều khoản dịch vụ
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm hover:text-primary transition-colors duration-300 flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-700"></span>
                  Chính sách bảo mật
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm hover:text-primary transition-colors duration-300 flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-700"></span>
                  Câu hỏi thường gặp
                </a>
              </li>
              <li
                onMouseEnter={() => setHoveredContact(true)}
                onMouseLeave={() => setHoveredContact(false)}
              >
                <a
                  href="mailto:binhvuong221004@gmail.com"
                  className="text-sm hover:text-primary transition-all duration-300 flex items-center gap-2"
                >
                  <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${hoveredContact ? 'bg-primary animate-pulse' : 'bg-gray-700'}`}></span>
                  {hoveredContact ? 'binhvuong221004@gmail.com' : 'Liên hệ hợp tác'}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Bản Tin Sportmate</h4>
            <p className="text-sm leading-relaxed text-gray-400">
              Đăng ký nhận tin tức mới nhất về các giải đấu và ưu đãi đặt sân. Truy cập website giới thiệu tại{' '}
              <a
                href="https://in4sportmate.binhvuong.id.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover font-semibold underline decoration-dotted underline-offset-4 transition-colors"
              >
                in4sportmate.binhvuong.id.vn
              </a>
              .
            </p>
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="relative flex items-center">
                <input
                  type="email"
                  required
                  placeholder="Email của bạn..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 pr-12 text-sm text-white focus:outline-none transition-all duration-300 shadow-inner"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 h-8 w-8 bg-primary hover:bg-primary-hover text-white rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-md shadow-primary/20 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {subscribed && (
                <p className="text-xs text-green-400 font-semibold animate-pulse">
                  ✓ Cảm ơn bạn đã đăng ký bản tin!
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Separator */}
        <div className="my-10 border-t border-darkBorder/60" />

        {/* Bottom Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs">
          <p className="text-gray-500">
            &copy; {currentYear} SportMate. Tất cả quyền được bảo lưu.
          </p>
          <p className="text-gray-500 flex items-center gap-1">
            Thiết kế với ❤️ bởi <span className="text-white font-medium">SportMate Team</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
