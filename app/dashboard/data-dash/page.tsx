// app/dashboard/data-dash/page.tsx
'use client';

import React, { useState, useEffect } from 'react';

// Define the shape of our data
type StatRow = {
  entry_date: string;
  location: string;
  entry_count: number;
};

export default function DataDashPage() {
  const [stats, setStats] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/data-dash');
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch data');
      
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Fetch immediately on mount
    fetchStats();

    // 2. Set up "real-time" polling every 10 seconds (10000ms)
    const intervalId = setInterval(fetchStats, 10000);

    // 3. Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="max-w-5xl mx-auto mt-8 px-4">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wider uppercase mb-1">
            Data Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Real-time daily vehicle counts added via website. Updates every 10s.
          </p>
        </div>
        
        {/* Simple live indicator */}
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          LIVE
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm font-bold">
          Error: {error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase font-black tracking-widest text-blue-300/70 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Total Entries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading && stats.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500 font-bold">
                    Loading data...
                  </td>
                </tr>
              ) : stats.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500 font-bold">
                    No website entries found.
                  </td>
                </tr>
              ) : (
                stats.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-800/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">
                      {new Date(row.entry_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-blue-100">
                      {row.location}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-emerald-300">
                      {row.entry_count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}