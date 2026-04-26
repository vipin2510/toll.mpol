// components/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  language?: 'en' | 'hi';
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

// Group our navigation links into an array so it's easy to add more later
const NAV_LINKS = [
  {
    href: '/dashboard/vehicle-search',
    label: 'Vehicle Search',
    labelHi: 'वाहन खोज',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/add-vehicle',
    label: 'Add Vehicle',
    labelHi: 'वाहन जोड़ें',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} 
          d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  // 👇 ADDED DATA DASHBOARD LINK HERE 👇
  {
    href: '/dashboard/data-dash',
    label: 'Data Dash',
    labelHi: 'डेटा डैशबोर्ड',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} 
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  }
];

export default function Sidebar({ language = 'en', isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-blue-700 flex flex-col z-50 shadow-2xl transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* ── Toggle button ── */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-12 bg-white text-blue-700 rounded-full p-1 shadow-lg border border-blue-100 hover:bg-blue-50 transition-transform active:scale-90"
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* ── Brand ── */}
      <div className="px-4 py-5 border-b border-blue-600/60 overflow-hidden shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-[3px] shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          {!isCollapsed && (
            <div className="transition-opacity duration-300 whitespace-nowrap">
              <p className="text-[11px] font-black text-white uppercase tracking-[0.18em] leading-tight">Traffic</p>
              <p className="text-[11px] font-black text-blue-200 uppercase tracking-[0.18em] leading-tight">Console</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Nav Links ── */}
      <nav className="py-4 px-2 flex flex-col gap-1 overflow-y-auto flex-1">
        {!isCollapsed && (
          <p className="text-[8px] font-black text-blue-300/50 uppercase tracking-[0.25em] px-3 mb-2">
            Modules
          </p>
        )}

        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-center gap-3 px-3 py-3 transition-all duration-150 rounded-sm relative ${
                isActive
                  ? 'bg-white/15 text-white shadow-inner border border-white/10'
                  : 'text-blue-200 hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-300 group-hover:text-white'}`}>
                {link.icon}
              </span>

              {!isCollapsed && (
                <p className="text-[12px] font-bold uppercase tracking-widest leading-tight truncate">
                  {language === 'hi' ? link.labelHi : link.label}
                </p>
              )}

              {/* Tooltip when collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 font-bold tracking-widest uppercase">
                  {language === 'hi' ? link.labelHi : link.label}
                </div>
              )}

              {/* Active Indicator Line */}
              {isActive && !isCollapsed && (
                <div className="ml-auto w-1 h-5 bg-white rounded-full shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-4 py-4 border-t border-blue-600/60 overflow-hidden shrink-0">
        {!isCollapsed ? (
          <>
            <p className="text-[9px] text-blue-400/60 uppercase tracking-widest font-bold whitespace-nowrap">
              Enforcement System
            </p>
            <p className="text-[8px] text-blue-500/50 mt-0.5">v2.0</p>
          </>
        ) : (
          <p className="text-[9px] text-blue-400/60 font-black text-center">V2</p>
        )}
      </div>
    </aside>
  );
}