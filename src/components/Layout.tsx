import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="min-h-screen bg-darkBg text-white flex flex-col md:flex-row">
      {/* Navigation Panels */}
      <Sidebar />
      <BottomNav />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 md:pl-64 pb-20 md:pb-0 flex flex-col justify-between">
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in flex-1">
          <Outlet />
        </div>
        <Footer />
      </main>
    </div>
  );
}
