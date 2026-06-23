import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Trophy, MessageSquare, Shield, User, LayoutGrid, Menu, X, LogOut, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function BottomNav() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStart = useRef({ x: 0, y: 0 });
  const buttonPosStart = useRef({ x: 0, y: 0 });

  const menuItems = [
    { name: 'Trang chủ', path: '/', icon: Home },
    { name: 'Trận đấu', path: '/matches', icon: Calendar },
    { name: 'Sân bãi', path: '/courts', icon: LayoutGrid },
    { name: 'Đồng đội', path: '/partners', icon: Users },
    { name: 'Xếp hạng', path: '/ranking', icon: Trophy },
    { name: 'Trò chuyện', path: '/chats', icon: MessageSquare },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ name: 'Admin', path: '/admin', icon: Shield });
  }

  // Fallback profile link
  menuItems.push({ name: 'Tôi', path: user ? `/profile/${user.id}` : '/auth', icon: User });

  const [isSnapping, setIsSnapping] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    const initX = window.innerWidth - 48 - 16;
    const initY = window.innerHeight - 48 - 24;
    setPosition({ x: initX, y: initY });
    setInitialized(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const x = Math.max(10, Math.min(window.innerWidth - 58, prev.x));
        const y = Math.max(10, Math.min(window.innerHeight - 58, prev.y));
        return { x, y };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsSnapping(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    buttonPosStart.current = { ...position };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    
    const newX = Math.max(10, Math.min(window.innerWidth - 58, buttonPosStart.current.x + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 58, buttonPosStart.current.y + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    const deltaX = Math.abs(e.clientX - dragStart.current.x);
    const deltaY = Math.abs(e.clientY - dragStart.current.y);

    if (deltaX < 5 && deltaY < 5) {
      toggleMenu();
    } else {
      setIsSnapping(true);
      const midpoint = window.innerWidth / 2;
      const padding = 16;
      const targetX = position.x < midpoint ? padding : window.innerWidth - 48 - padding;
      
      setPosition({ x: targetX, y: position.y });

      setTimeout(() => {
        setIsSnapping(false);
      }, 300);
    }
  };

  return (
    <>
      {/* Backdrop (closes menu when clicked) */}
      {isOpen && (
        <div
          onClick={closeMenu}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}

      {/* Expanded Menu Panel */}
      {isOpen && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[92%] max-w-xs bg-[#121214] border border-[#242427] rounded-3xl p-5 shadow-2xl z-50 md:hidden animate-fade-in-up">
          <div className="flex justify-between items-center mb-4 border-b border-[#242427] pb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Danh mục</span>
            <button
              onClick={closeMenu}
              className="text-gray-500 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `flex flex-col items-center p-2.5 rounded-2xl group transition-all duration-300 ${
                    isActive ? 'bg-[#ff4d4f]/10 border border-[#ff4d4f]/20' : 'bg-transparent border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-[#ff4d4f] text-white shadow-md shadow-[#ff4d4f]/20'
                          : 'bg-[#18181b] border border-[#242427]/60 text-gray-400 group-hover:text-white group-hover:border-gray-600'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`text-[10px] font-bold mt-1.5 truncate max-w-[70px] ${
                        isActive ? 'text-[#ff4d4f]' : 'text-gray-400 group-hover:text-white'
                      }`}
                    >
                      {item.name}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {user && (
            <div className="mt-4 pt-3 border-t border-[#242427]">
              <button
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-red-400 bg-red-500/5 hover:bg-red-500/10 active:bg-red-500/20 hover:text-red-300 border border-transparent hover:border-red-500/10 transition-all duration-300 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Menu Circular Button (Draggable & Snapping) */}
      <div 
        className={`fixed z-50 md:hidden ${isSnapping ? 'transition-all duration-300 ease-out' : ''}`}
        style={
          initialized 
            ? { left: `${position.x}px`, top: `${position.y}px` } 
            : { right: '16px', bottom: '24px' }
        }
      >
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ touchAction: 'none' }}
          className="bg-[#121214]/95 hover:bg-[#1a1a1c] border border-[#242427] text-white h-12 w-12 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-grab active:cursor-grabbing"
        >
          {isOpen ? (
            <X className="h-5 w-5 text-[#ff4d4f]" />
          ) : (
            <Menu className="h-5 w-5 text-[#ff4d4f]" />
          )}
        </button>
      </div>
    </>
  );
}
