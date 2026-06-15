import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Trophy, MessageSquare, Shield, User, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function BottomNav() {
  const { user } = useAuth();

  const menuItems = [
    { name: 'Trang chủ', path: '/', icon: Home },
    { name: 'Trận đấu', path: '/matches', icon: Calendar },
    { name: 'Sân bãi', path: '/courts', icon: LayoutGrid },
    { name: 'Xếp hạng', path: '/ranking', icon: Trophy },
    { name: 'Trò chuyện', path: '/chats', icon: MessageSquare },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ name: 'Admin', path: '/admin', icon: Shield });
  }

  // Fallback profile link
  menuItems.push({ name: 'Tôi', path: `/profile/${user?.id}`, icon: User });

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-darkBorder bg-[#0c0c0c]/90 backdrop-blur-lg md:hidden z-30 flex justify-around py-2 px-1 text-white">
      {menuItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-medium transition-all duration-300 ${
              isActive ? 'text-primary' : 'text-gray-400'
            }`
          }
        >
          <item.icon className="h-5 w-5" />
          <span className="truncate max-w-[50px]">{item.name}</span>
        </NavLink>
      ))}
    </nav>
  );
}
