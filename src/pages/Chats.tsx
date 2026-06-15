import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/lib/apiBase';
import { resolveAvatarUrl } from '@/lib/userApi';
import { MessageSquare, Calendar, Loader2, ArrowRight } from 'lucide-react';

type Conversation = {
  _id: string; // The ID of the other user
  lastMessage: string;
  lastMessageAt: string;
  otherUser: {
    _id: string;
    name: string;
    avatar?: string;
  };
};

export default function Chats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user?.id) return;
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/messages/conversations/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách trò chuyện:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    
    // Poll for conversation updates every 5 seconds
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-semibold">Đang tải hộp thư...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" /> Tin nhắn của tôi
        </h1>
        <p className="text-gray-400 text-xs mt-1">Trò chuyện trực tiếp và trao đổi thông tin với đồng đội</p>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-darkCard border border-darkBorder rounded-3xl p-6 text-center space-y-4 shadow-lg">
          <MessageSquare className="h-12 w-12 text-gray-600 opacity-50" />
          <h3 className="text-base font-bold text-white">Chưa có tin nhắn nào</h3>
          <p className="text-xs text-gray-500 max-w-sm">
            Bạn chưa nhắn tin với ai. Khám phá các partner tuyệt vời tại Trang chủ và nhắn tin trò chuyện với họ!
          </p>
        </div>
      ) : (
        <div className="bg-darkCard border border-darkBorder rounded-3xl overflow-hidden divide-y divide-darkBorder/60 shadow-lg">
          {conversations.map((item) => {
            const avatarUrl = resolveAvatarUrl(item.otherUser.avatar);
            const initials = item.otherUser.name?.charAt(0)?.toUpperCase() || '?';
            
            // Format date
            const dateObj = new Date(item.lastMessageAt);
            const timeString = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={item._id}
                onClick={() => navigate(`/chats/${item.otherUser._id}`)}
                className="flex items-center justify-between p-4 sm:p-5 hover:bg-white/2 cursor-pointer transition-colors duration-300 group"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-primary">{initials}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex justify-between items-center pr-2">
                      <span className="font-extrabold text-white text-sm truncate group-hover:text-primary transition-colors duration-300">
                        {item.otherUser.name}
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold">{timeString}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate pr-4">{item.lastMessage}</p>
                  </div>
                </div>

                <ChevronRightIcon className="h-4 w-4 text-gray-600 shrink-0 group-hover:translate-x-0.5 transition-transform duration-300" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
