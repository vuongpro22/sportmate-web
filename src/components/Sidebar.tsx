import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Trophy, MessageSquare, Shield, User, LogOut, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { resolveAvatarUrl } from '@/lib/userApi';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Trang chủ', path: '/', icon: Home },
    { name: 'Trận đấu', path: '/matches', icon: Calendar },
    { name: 'Sân bãi', path: '/courts', icon: LayoutGrid },
    { name: 'Xếp hạng', path: '/ranking', icon: Trophy },
    { name: 'Trò chuyện', path: '/chats', icon: MessageSquare },
    { name: 'Cá nhân', path: `/profile/${user?.id}`, icon: User },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ name: 'Quản trị', path: '/admin', icon: Shield });
  }

  const avatarUrl = resolveAvatarUrl(user?.avatar);

  return (
    <aside className="fixed bottom-0 left-0 top-0 hidden w-64 flex-col border-r border-darkBorder bg-[#0c0c0c] text-white md:flex z-30">
      {/* Brand Logo */}
      <div className="flex h-20 items-center px-6">
        <span className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-2xl font-black tracking-wider text-transparent">
          SPORTMATE
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 group ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info & Log out */}
      <div className="border-t border-darkBorder p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-primary font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate text-white">
              {user?.name || user?.username}
            </span>
            <span className="text-xs text-gray-500 capitalize truncate">
              {user?.role}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-4 px-4 py-3 rounded-2xl text-sm font-medium text-red-400 hover:bg-red-500/5 hover:text-red-300 transition-all duration-300"
        >
          <LogOut className="h-5 w-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
