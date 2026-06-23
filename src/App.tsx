import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { ModalProvider } from '@/contexts/ModalContext';
import ProtectedRoutes from '@/components/ProtectedRoutes';
import Layout from '@/components/Layout';

// Lazily load pages (or standard imports)
import Auth from '@/pages/Auth';
import Home from '@/pages/Home';
import Matches from '@/pages/Matches';
import MatchDetail from '@/pages/MatchDetail';
import CreateMatch from '@/pages/CreateMatch';
import Courts from '@/pages/Courts';
import CourtDetail from '@/pages/CourtDetail';
import CreateCourt from '@/pages/CreateCourt';
import MyCourts from '@/pages/MyCourts';
import Ranking from '@/pages/Ranking';
import Chats from '@/pages/Chats';
import ChatRoom from '@/pages/ChatRoom';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import Partners from '@/pages/Partners';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <ModalProvider>
            <Routes>
              {/* Public route */}
              <Route path="/auth" element={<Auth />} />

              {/* Layout-wrapped pages */}
              <Route element={<Layout />}>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/matches/:id" element={<MatchDetail />} />
                <Route path="/courts" element={<Courts />} />
                <Route path="/courts/:id" element={<CourtDetail />} />
                <Route path="/ranking" element={<Ranking />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/profile/:id" element={<Profile />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoutes />}>
                  <Route path="/matches/create" element={<CreateMatch />} />
                  <Route path="/courts/create" element={<CreateCourt />} />
                  <Route path="/courts/my-courts" element={<MyCourts />} />
                  <Route path="/chats" element={<Chats />} />
                  <Route path="/chats/:id" element={<ChatRoom />} />
                  <Route path="/admin" element={<Admin />} />
                </Route>
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ModalProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}
