// app/dashboard/layout.tsx
'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
// Make sure this path matches where your Sidebar component is located!
import Sidebar from '@/components/Sidebar'; 

function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/signin');
  }
  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-red-300 hover:text-white hover:bg-red-500/20 rounded-sm transition-colors border border-red-500/20"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Logout
    </button>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Add the state to control the sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      
      {/* 2. Render the Sidebar and pass the state to it */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      
      {/* 3. Add dynamic left margin so the main content doesn't hide behind the fixed sidebar */}
      <div 
        className={`flex flex-col flex-1 w-full transition-all duration-300 ease-in-out ${
          isCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {/* Top Header where the logout button lives */}
        <header className="flex justify-end items-center p-4">
          <LogoutButton />
        </header>

        {/* The actual page content renders inside here */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}