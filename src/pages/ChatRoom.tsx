import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { getApiBaseUrl } from '@/lib/apiBase';
import { fetchUserById, type ApiUser, resolveAvatarUrl } from '@/lib/userApi';
import { ChevronLeft, Send, Loader2 } from 'lucide-react';

type Message = {
  _id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
};

function sortByTime(msgs: Message[]): Message[] {
  return [...msgs].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (diff !== 0) return diff;
    return a._id.localeCompare(b._id);
  });
}

export default function ChatRoom() {
  const { id: otherId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { socket, connected } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherUser, setOtherUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingIds = useRef<Set<string>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history & other user info
  useEffect(() => {
    if (!currentUser?.id || !otherId) return;

    setLoading(true);

    // 1. Fetch other user's info
    fetchUserById(otherId)
      .then(setOtherUser)
      .catch(console.error);

    // 2. Fetch REST message history
    const base = getApiBaseUrl();
    fetch(`${base}/api/messages/${currentUser.id}/${otherId}`)
      .then((r) => r.json())
      .then((data: Message[]) => {
        setMessages(sortByTime(data || []));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch messages:', err);
        setLoading(false);
      });
  }, [currentUser?.id, otherId]);

  // Handle incoming socket events
  useEffect(() => {
    if (!socket || !currentUser?.id || !otherId) return;

    const handleReceiveMessage = (msg: Message) => {
      const isMine = msg.senderId === currentUser.id && msg.receiverId === otherId;
      const isTheirs = msg.senderId === otherId && msg.receiverId === currentUser.id;

      if (!isMine && !isTheirs) return; // Belongs to another room

      if (isMine) {
        // Replace optimistic update
        setMessages((prev) => {
          const tempIdx = prev.findIndex(
            (m) => m._id.startsWith('temp_') && pendingIds.current.size > 0
          );
          if (tempIdx !== -1) {
            const tempId = prev[tempIdx]._id;
            pendingIds.current.delete(tempId);
            const updated = [...prev];
            updated[tempIdx] = msg;
            return sortByTime(updated);
          }
          return sortByTime([...prev, msg]);
        });
      } else {
        // Other user's message
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return sortByTime([...prev, msg]);
        });
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, currentUser?.id, otherId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser?.id || !otherId || !socket) return;

    const text = inputText.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMsg: Message = {
      _id: tempId,
      senderId: currentUser.id,
      receiverId: otherId,
      text,
      createdAt: new Date().toISOString(),
    };

    pendingIds.current.add(tempId);

    // Optimistic UI update
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    socket.emit('send_message', {
      senderId: currentUser.id,
      receiverId: otherId,
      text,
    });
  };

  const otherAvatar = resolveAvatarUrl(otherUser?.avatar);

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-140px)] md:h-[calc(100vh-80px)] flex flex-col bg-darkCard border border-darkBorder rounded-3xl overflow-hidden shadow-xl">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-darkBorder bg-[#0f0f10] shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-darkBg border border-darkBorder hover:border-gray-700 text-gray-400 hover:text-white rounded-xl transition-colors duration-300"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* User profile avatar */}
        <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
          {otherAvatar ? (
            <img src={otherAvatar} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-primary">
              {otherUser?.name?.charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <span className="font-extrabold text-white text-sm block truncate">
            {otherUser?.name || 'Đang tải...'}
          </span>
          <span className="text-[10px] text-gray-500 block flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
            {connected ? 'Trực tuyến' : 'Ngoại tuyến'}
          </span>
        </div>
      </div>

      {/* Messages Column */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-darkBg/30 scrollbar-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs">Đang tải tin nhắn...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-500 text-center px-6 leading-relaxed">
            Chưa có tin nhắn nào. Bắt đầu cuộc hội thoại bằng cách gửi tin nhắn ở khung bên dưới!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUser?.id;
            const isPending = m._id.startsWith('temp_');

            return (
              <div
                key={m._id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-3xl py-3 px-4 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-primary text-white rounded-br-md shadow-md shadow-primary/5'
                      : 'bg-darkCard border border-darkBorder text-gray-200 rounded-bl-md'
                  } ${isPending ? 'opacity-70' : ''}`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        className="px-4 py-3 border-t border-darkBorder bg-[#0f0f10] shrink-0 flex items-center gap-3"
      >
        <input
          type="text"
          placeholder="Nhập tin nhắn..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-darkBg border border-darkBorder hover:border-gray-700 focus:border-primary rounded-2xl py-3 px-4 text-xs text-white focus:outline-none transition-all duration-300 placeholder-gray-600"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="h-10 w-10 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-45 text-white flex items-center justify-center shadow-lg shadow-primary/10 transition-all duration-300"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
