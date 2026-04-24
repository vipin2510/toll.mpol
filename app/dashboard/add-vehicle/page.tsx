// app/dashboard/add-vehicle/page.tsx
'use client';

import React, { useState } from 'react';

const LOCATIONS = ['Retikhol', 'Palsapali/Garhfuljhar', 'Temri', 'Narra','Devbhog'];

// Helper function to get exact local time in YYYY-MM-DDTHH:mm format
const getLocalISOString = () => {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

export default function AddVehiclePage() {
  const [plate, setPlate] = useState('');
  const [location, setLocation] = useState('');
  const [direction, setDirection] = useState<'in_cg' | 'exit_cg'>('in_cg');
  
  // Initialize with local time instead of GMT
  const [entryTime, setEntryTime] = useState(getLocalISOString);
  const [submitting, setSubmitting] = useState(false);
  const [entryMsg, setEntryMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleEntrySubmit(e: React.FormEvent) {
    e.preventDefault(); 
    if (!plate || !location) return;
    
    setSubmitting(true);
    setEntryMsg(null);
    try {
      const res = await fetch('/api/vehicle-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate_number: plate, location, direction, entry_time: entryTime }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      setEntryMsg({ ok: true, text: `Successfully saved vehicle entry (ID: ${json.id})` });
      setPlate('');
      setLocation('');
      // Reset the time to the current local time for the next entry
      setEntryTime(getLocalISOString());
    } catch (e: any) {
      setEntryMsg({ ok: false, text: e.message ?? 'Failed to save entry' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white tracking-wider uppercase mb-1">Add Vehicle Entry</h1>
        <p className="text-sm text-slate-400">Record a new vehicle entering or exiting the jurisdiction.</p>
      </div>

      <form onSubmit={handleEntrySubmit} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Plate Number */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-blue-300/70 uppercase tracking-widest">
              Vehicle Registration No.
            </label>
            <input
              type="text"
              required
              value={plate}
              onChange={e => setPlate(e.target.value.toUpperCase())}
              placeholder="e.g. CG04XX0000"
              className="w-full bg-slate-900/50 text-white text-base font-bold placeholder:text-slate-500 px-4 py-3 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase tracking-widest transition-all"
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-blue-300/70 uppercase tracking-widest">
              Checkpoint Location
            </label>
            <select
              required
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-slate-900/50 text-white text-base font-bold px-4 py-3 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="" disabled>Select Location...</option>
              {LOCATIONS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Direction Toggle */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-blue-300/70 uppercase tracking-widest">
              Movement Direction
            </label>
            <div className="flex rounded-lg overflow-hidden border border-slate-600 h-[50px]">
              <button
                type="button"
                onClick={() => setDirection('in_cg')}
                className={`flex-1 font-black uppercase tracking-wider transition-colors ${
                  direction === 'in_cg'
                    ? 'bg-emerald-500/20 text-emerald-300 border-r border-emerald-500/30'
                    : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 border-r border-slate-600'
                }`}
              >
                Entering CG
              </button>
              <button
                type="button"
                onClick={() => setDirection('exit_cg')}
                className={`flex-1 font-black uppercase tracking-wider transition-colors ${
                  direction === 'exit_cg'
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Exiting CG
              </button>
            </div>
          </div>

          {/* Time (Read-Only Local Time) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-blue-300/70 uppercase tracking-widest flex items-center justify-between">
              <span>Date & Time (Local)</span>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Auto-Generated</span>
            </label>
            <input
              type="datetime-local"
              required
              readOnly
              value={entryTime}
              className="w-full bg-slate-900/30 text-slate-400 text-base font-bold px-4 py-3 rounded-lg border border-slate-700 cursor-not-allowed focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Submit Area */}
        <div className="mt-8 pt-6 border-t border-slate-700 flex flex-col items-center gap-4">
          <button
            type="submit"
            disabled={submitting || !plate || !location}
            className="w-full md:w-auto px-12 py-3 text-sm font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-95"
          >
            {submitting ? 'Saving Data...' : 'Submit Record'}
          </button>

          {/* Feedback Message */}
          {entryMsg && (
            <div className={`px-4 py-2 rounded-md border text-sm font-bold tracking-wide ${
              entryMsg.ok 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {entryMsg.text}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}