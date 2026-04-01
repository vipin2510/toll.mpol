'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Violation } from '@/types/violation';
import axios from 'axios';
import toast from 'react-hot-toast';

const TRANSLATIONS: Record<string, any> = {
  en: {
    title: 'Traffic Control System',
    subtitle: 'Enforcement Console',
    signOut: 'Sign Out',
    stats: {
      pending: 'Pending Action',
      accepted: 'Validated',
      declined: 'Flagged / Denied',
    },
    activeRecords: 'Active Records',
    noRecords: 'No records found',
    source: 'Source',
    table: {
      vehicleNumber: 'Vehicle Number',
      detectionTime: 'Detection Time',
      location: 'Location',
      violationType: 'Violation Type',
      evidence: 'Evidence',
      action: 'Action',
    },
    search: {
      filterType: 'Filter By',
      placeholder: 'Search...',
      button: 'Search',
      types: {
        id: 'ID',
        track_id: 'Track ID',
        vehicle_number: 'Vehicle Number',
        location: 'Location',
        status: 'Status',
      }
    },
    status: {
      pending: 'PENDING',
      approved: 'ACCEPTED',
      rejected: 'DECLINED',
      approve: 'ACCEPT',
      reject: 'DECLINE',
    },
    rejection: {
      title: 'Rejection Protocol',
      subtitle: 'Select justification for record denial',
      reasons: [
        'No violation visible',
        'Image too blurry or unclear',
        'Incorrect vehicle number',
        'Emergency / exempt vehicle',
        'False positive detection',
        'System entry / test',
      ],
      cancel: 'Cancel',
      confirm: 'Confirm Rejection',
      processing: 'Processing...',
    },
    pagination: {
      showing: 'Showing',
      to: 'to',
      of: 'of',
      records: 'records',
      previous: 'Previous',
      next: 'Next',
    },
    modal: {
      title: 'Violation Details',
      copyId: 'Copy ID',
      trackId: 'Track ID',
      vehicleNumber: 'Vehicle Number',
      detectionTime: 'Detection Time',
      location: 'Location',
      dateFolder: 'Date Folder',
      violationType: 'Violation Type',
      status: 'Status',
      reason: 'Reason',
      images: {
        complete: 'Full Scene',
        plate: 'License Plate',
      },
      close: 'Close',
    },
  },
  hi: {
    title: 'यातायात नियंत्रण प्रणाली',
    signOut: 'साइन आउट',
    stats: {
      pending: 'लंबित कार्रवाई',
      accepted: 'मान्य',
      declined: 'चिह्नित / अस्वीकृत',
    },
    activeRecords: 'सक्रिय रिकॉर्ड',
    noRecords: 'कोई रिकॉर्ड नहीं मिला',
    source: 'स्रोत',
    table: {
      vehicleNumber: 'वाहन संख्या',
      detectionTime: 'पहचान का समय',
      location: 'स्थान',
      violationType: 'उल्लंघन का प्रकार',
      evidence: 'साक्ष्य',
      action: 'कार्रवाई',
    },
    search: {
      filterType: 'फ़िल्टर प्रकार',
      placeholder: 'खोजें...',
      button: 'खोजें',
      types: {
        id: 'आईडी',
        track_id: 'ट्रैक आईडी',
        vehicle_number: 'वाहन संख्या',
        location: 'स्थान',
        status: 'स्थिति',
      }
    },
    status: {
      pending: 'लंबित (PENDING)',
      approved: 'स्वीकृत (ACCEPTED)',
      rejected: 'अस्वीकृत (DECLINED)',
      approve: 'स्वीकार करें',
      reject: 'अस्वीकार करें',
    },
    rejection: {
      title: 'अस्वीकृति प्रोटोकॉल',
      subtitle: 'रिकॉर्ड अस्वीकृति के लिए औचित्य चुनें',
      reasons: [
        'कोई उल्लंघन दिखाई नहीं दे रहा',
        'छवि बहुत धुंधली या अस्पष्ट है',
        'गलत वाहन संख्या',
        'आपातकालीन / छूट प्राप्त वाहन',
        'गलत सकारात्मक पहचान',
        'सिस्टम एंट्री / टेस्ट',
      ],
      cancel: 'रद्द करें',
      confirm: 'अस्वीकृति की पुष्टि करें',
      processing: 'प्रगति पर है...',
    },
    pagination: {
      showing: 'दिखा रहा है',
      to: 'से',
      of: 'का',
      records: 'रिकॉर्ड',
      previous: 'पिछला',
      next: 'अगला',
    },
    modal: {
      title: 'उल्लंघन विवरण',
      copyId: 'आईडी कॉपी करें',
      trackId: 'ट्रैक आईडी',
      vehicleNumber: 'वाहन संख्या',
      detectionTime: 'पहचान का समय',
      location: 'स्थान',
      dateFolder: 'डेट फोल्डर',
      violationType: 'उल्लंघन का प्रकार',
      status: 'स्थिति',
      reason: 'कारण',
      images: {
        complete: 'पूर्ण दृश्य',
        plate: 'लाइसेंस प्लेट',
      },
      close: 'बंद करें',
    },
  },
};

function StatusBadge({
  violation,
  onOpenDecline,
  onAccept,
  t,
}: {
  violation: Violation;
  onOpenDecline: (id: string) => void;
  onAccept: (id: string) => void;
  t: any;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const baseClass =
    'inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] font-semibold uppercase tracking-widest border transition-colors cursor-default';

  if (violation.status === 'ACCEPTED') {
    return (
      <span className={`${baseClass} bg-emerald-50 text-emerald-600 border-emerald-200`}>
        {t.status.approved}
      </span>
    );
  }

  if (violation.status === 'DECLINED') {
    return (
      <div className="flex flex-col gap-1 items-end">
        <span
          className={`${baseClass} bg-rose-50 text-rose-600 border-rose-200`}
        >
          {t.status.rejected}
        </span>
        {violation.reason && (
          <p className="text-[9px] text-slate-400 text-right max-w-[120px]">
            {violation.reason}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`${baseClass} bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100/50`}
      >
        {t.status.pending}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-blue-100 shadow-lg w-40 z-50">
          <button
            onClick={() => {
              onAccept(violation.id);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-3 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 uppercase tracking-widest transition-colors"
          >
            {t.status.approve}
          </button>
          <button
            onClick={() => {
              onOpenDecline(violation.id);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-3 text-[13px] font-semibold text-slate-600 hover:bg-blue-50 uppercase tracking-widest transition-colors"
          >
            {t.status.reject}
          </button>
        </div>
      )}
    </div>
  );
}

interface DashboardContentProps {
  initialViolations: Violation[];
  initialTotal: number;
  initialPage: number;
  initialLimit: number;
  initialStats: { pending: number; accepted: number; declined: number };
}

export default function DashboardContent({
  initialViolations,
  initialTotal,
  initialPage,
  initialLimit,
  initialStats,
}: DashboardContentProps) {
  const [violations, setViolations] = useState<Violation[]>(initialViolations);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const limit = initialLimit;
  const [stats, setStats] = useState(initialStats);
  const [filterType, setFilterType] = useState('vehicle_number');
  const [filterValue, setFilterValue] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [modalImages, setModalImages] = useState<{ complete_image: string | null; plate_image: string | null } | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const t = TRANSLATIONS[language];

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('dash_lang');
    if (saved === 'hi' || saved === 'en') setLanguage(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('dash_lang', language);
  }, [language]);

  // Fetch images when modal is opened
  useEffect(() => {
    if (!selectedViolation) {
      setModalImages(null);
      return;
    }
    setLoadingImages(true);
    setModalImages(null);
    axios.get(`/api/violations/${selectedViolation.id}`)
      .then(res => setModalImages(res.data.data))
      .catch(() => setModalImages({ complete_image: null, plate_image: null }))
      .finally(() => setLoadingImages(false));
  }, [selectedViolation?.id]);

  // Fetch data on page change
  useEffect(() => {
    fetchViolations();
  }, [page]);

  // Periodic Refresh
  useEffect(() => {
    const interval = setInterval(fetchViolations, 30000);
    return () => clearInterval(interval);
  }, [page, filterType, filterValue]);

  async function fetchViolations(showLoading = false) {
    if (showLoading) setIsSearching(true);
    try {
      const response = await axios.get('/api/violations', {
        params: { page, limit: initialLimit, filterType, filterValue }
      });
      if (response.status === 200) {
        setViolations(response.data.data);
        setTotalCount(response.data.count);
        setStats(response.data.stats);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/signin');
      }
    } finally {
      if (showLoading) setIsSearching(false);
    }
  }

  async function handleUpdateStatus(id: string, status: string, reason?: string) {
    setUpdating(true);
    try {
      const uppercaseStatus = status.toUpperCase();
      const response = await axios.patch(`/api/violations/${id}`, { status: uppercaseStatus, reason });

      if (response.status === 200) {
        setViolations((prev) =>
          prev.map((v) =>
            v.id === id ? { ...v, status: uppercaseStatus, reason: reason || null } : v
          )
        );
        setStats(prev => {
          const newStats = { ...prev };
          if (uppercaseStatus === 'ACCEPTED') {
            newStats.accepted++;
            newStats.pending--;
          } else if (uppercaseStatus === 'DECLINED') {
            newStats.declined++;
            newStats.pending--;
          }
          return newStats;
        });
        toast.success(`Violation ${uppercaseStatus === 'ACCEPTED' ? 'approved' : 'rejected'}`);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/signin');
      } else {
        toast.error('Failed to update status. Please try again.');
      }
    } finally {
      setUpdating(false);
      setDeclineTarget(null);
      setSelectedReason('');
    }
  }

  const handleLogout = async () => {
    const toastId = toast.loading('Signing out...');
    try {
      await axios.post('/api/auth/logout');
      toast.success('Signed out', { id: toastId });
      router.replace('/signin');
    } catch (e) {
      toast.error('Sign out failed', { id: toastId });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(language === 'en' ? 'ID copied to clipboard' : 'आईडी कॉपी हो गई');
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">

      {/* HEADER */}
      <header className="bg-blue-600 border-b border-blue-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold text-white uppercase">
              {t.title}
            </h1>
            <span className="w-px h-4 bg-blue-400" />
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')}
              className="text-[13px] font-bold text-blue-200 hover:text-white uppercase tracking-widest px-3 py-1 border border-blue-400 hover:border-white transition-all"
            >
              {language === 'en' ? 'हिन्दी' : 'English'}
            </button>
            <button
              onClick={handleLogout}
              className="text-[13px] text-blue-100 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-all hover:gap-3"
            >
              {t.signOut}
              <span className="text-xs">→</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: t.stats.pending, count: stats.pending, color: 'text-orange-600 font-semibold', border: "border-orange-400" },
            { label: t.stats.accepted, count: stats.accepted, color: 'text-green-600 font-semibold', border: "border-green-400" },
            { label: t.stats.declined, count: stats.declined, color: 'text-red-600 font-semibold', border: "border-red-400" },
          ].map((stat) => (
            <div key={stat.label} className={`bg-white border border-blue-100 p-6 flex justify-between items-center shadow-sm hover:border-blue-300 transition-colors ${stat.border}`}>
              <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
              <span className={`text-3xl ${stat.color}`}>{stat.count}</span>
            </div>
          ))}
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center mb-8 gap-4 bg-white p-4 border border-blue-100 shadow-sm transition-all hover:border-blue-200">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">
              {t.activeRecords} {totalCount > 0 && `(${totalCount})`}
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Filter Type Dropdown */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full md:w-48 border border-blue-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest bg-slate-50/50 focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
            >
              {Object.entries(t.search.types).map(([key, label]: [string, any]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Filter Value Input */}
            <div className="relative w-full md:w-64">
              <input
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder={t.search.placeholder}
                className="w-full border border-blue-100 px-4 py-2.5 text-[11px] focus:outline-none focus:border-blue-600 bg-white transition-all placeholder:text-slate-300 font-medium"
              />
            </div>

            {/* Search Button */}
            <button
              disabled={isSearching}
              onClick={() => {
                setPage(1);
                fetchViolations(true);
              }}
              className="w-full md:w-auto px-8 py-2.5 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isSearching ? (language === 'en' ? 'Searching...' : 'खोज रहे हैं...') : t.search.button}
            </button>
          </div>
        </div>

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="bg-slate-50 border-t border-blue-100 px-6 py-4 flex items-center justify-between">
            <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">
              {t.pagination.showing} {((page - 1) * limit) + 1} {t.pagination.to} {Math.min(page * limit, totalCount)} {t.pagination.of} {totalCount} {t.pagination.records}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 border border-blue-100 text-[13px] font-bold uppercase tracking-widest bg-white hover:bg-blue-50 disabled:bg-slate-50 disabled:text-slate-300 transition-colors"
              >
                {t.pagination.previous}
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 border border-blue-100 text-[13px] font-bold uppercase tracking-widest bg-white hover:bg-blue-50 disabled:bg-slate-50 disabled:text-slate-300 transition-colors"
              >
                {t.pagination.next}
              </button>
            </div>
          </div>
        )}
        {/* TABLE */}
        <div className="bg-white border border-blue-100 shadow-xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-blue-100">
                <th className="px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest">{t.table.vehicleNumber}</th>
                <th className="px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest">{t.table.detectionTime}</th>
                <th className="px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest">{t.table.location}</th>
                <th className="px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest">{t.table.violationType}</th>
                <th className='px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest'>{language == 'en' ? 'Track ID' : 'ट्रैक आईडी'}</th>
                <th className="px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest text-right">{t.table.action}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-blue-50/50">
              {violations.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelectedViolation(v)}
                  className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-5">
                    <span className="font-mono text-xs text-blue-700 font-bold bg-blue-50 px-2 py-1 border border-blue-100">
                      {v.vehicle_number}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-[11px] text-slate-500">
                    {v.detected_at
                      ? new Date(v.detected_at).toLocaleString(language === 'en' ? 'en-IN' : 'hi-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                      : '—'}
                  </td>

                  <td className="px-6 py-5 text-[13px] text-slate-500 font-medium uppercase tracking-tight">
                    {v.location}
                  </td>

                  <td className="px-6 py-5">
                    <span className="text-blue-600 text-[13px] font-bold uppercase tracking-widest">
                      {v.helmet_status || (language === 'en' ? 'DETECTION' : 'पहचान')}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-[11px] text-slate-500 font-medium uppercase tracking-tight">{v.track_id}</td>

                  <td className="px-6 py-5 text-right">
                    <StatusBadge
                      violation={v}
                      onAccept={(id) => handleUpdateStatus(id, 'accepted')}
                      onOpenDecline={(id) => setDeclineTarget(id)}
                      t={t}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {violations.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-xs text-slate-400 uppercase">{t.noRecords}</p>
            </div>
          )}


        </div>
      </main>

      {/* REJECTION MODAL */}
      {declineTarget && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm z-50 p-4">
          <div className="bg-white border border-blue-100 p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-[0.2em] mb-1">
                  {t.rejection.title}
                </h3>
                <p className="text-[13px] text-slate-400 uppercase tracking-widest">{t.rejection.subtitle}</p>
              </div>
              <button onClick={() => setDeclineTarget(null)} className="text-slate-400 hover:text-slate-600 uppercase text-[13px]">{language === 'en' ? 'Close' : 'बंद करें'}</button>
            </div>

            <div className="space-y-2 mb-8">
              {t.rejection.reasons.map((r: string) => (
                <button
                  key={r}
                  onClick={() => setSelectedReason(r)}
                  className={`w-full text-left px-5 py-3 text-[13px] font-bold uppercase tracking-widest border transition-all ${selectedReason === r
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-slate-500 border-slate-100 hover:border-blue-300'
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeclineTarget(null)}
                className="flex-1 border border-slate-200 text-slate-500 py-3 text-[13px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
              >
                {t.rejection.cancel}
              </button>
              <button
                disabled={!selectedReason || updating}
                onClick={() =>
                  handleUpdateStatus(declineTarget, 'declined', selectedReason)
                }
                className="flex-[2] bg-blue-600 text-white py-3 text-[13px] font-bold uppercase tracking-widest hover:bg-blue-700 disabled:bg-slate-200 transition-all shadow-lg hover:shadow-blue-200"
              >
                {updating ? t.rejection.processing : t.rejection.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedViolation && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-md z-50 p-4">
          <div className="bg-white border border-blue-100 w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">

            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-blue-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em]">
                  {t.modal.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-slate-400">{selectedViolation?.id}</span>
                  <button
                    onClick={() => selectedViolation && copyToClipboard(selectedViolation.id)}
                    className="p-1 hover:bg-blue-100 rounded transition-colors"
                    title={t.modal.copyId}
                  >
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedViolation(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-all"
              >
                <span className="text-2xl font-light">×</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                {/* Images Section */}
                <div className="space-y-8">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.modal.images.complete}</h4>
                    <div className="aspect-video bg-slate-100 border border-blue-50 relative overflow-hidden group">
                      {loadingImages ? (
                        <div className="absolute inset-0 bg-linear-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
                      ) : modalImages?.complete_image ? (
                        <img
                          src={`data:image/jpeg;base64,${modalImages.complete_image}`}
                          alt="Violation Scene"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 uppercase tracking-widest">No Image</div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.modal.images.plate}</h4>
                    <div className="h-48 bg-slate-100 border border-blue-50 relative overflow-hidden group">
                      {loadingImages ? (
                        <div className="absolute inset-0 bg-linear-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
                      ) : modalImages?.plate_image ? (
                        <img
                          src={`data:image/jpeg;base64,${modalImages.plate_image}`}
                          alt="Plate Detail"
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 uppercase tracking-widest">No Image</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-10">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.trackId}</h4>
                      <p className="text-[13px] font-semibold text-slate-900 font-mono">{selectedViolation?.track_id}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.vehicleNumber}</h4>
                      <p className="text-[13px] font-bold text-blue-700 bg-blue-50/50 inline-block px-2 py-0.5 border border-blue-100 font-mono">
                        {selectedViolation?.vehicle_number}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.detectionTime}</h4>
                      <p className="text-[13px] font-semibold text-slate-700">
                        {selectedViolation?.detected_at
                          ? new Date(selectedViolation.detected_at).toLocaleString(language === 'en' ? 'en-IN' : 'hi-IN', {
                            day: '2-digit', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.location}</h4>
                      <p className="text-[13px] font-semibold text-slate-700 uppercase">{selectedViolation?.location}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.dateFolder}</h4>
                      <p className="text-[13px] font-semibold text-slate-700 font-mono wrap-break-word">{selectedViolation?.date_folder}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.violationType}</h4>
                      <span className="text-[12px] font-bold text-blue-600 uppercase tracking-wider">
                        {selectedViolation?.helmet_status || (language === 'en' ? 'DETECTION' : 'पहचान')}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.status}</h4>
                      <span className={`text-[12px] font-bold uppercase tracking-wider px-2 py-1 border ${selectedViolation?.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        selectedViolation?.status === 'DECLINED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                        {selectedViolation?.status === 'ACCEPTED' ? t.status.approved :
                          selectedViolation?.status === 'DECLINED' ? t.status.rejected : t.status.pending}
                      </span>
                    </div>
                    {selectedViolation?.reason && (
                      <div className="col-span-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.reason}</h4>
                        <p className="text-[13px] font-semibold text-slate-600 italic bg-slate-50 p-4 border-l-2 border-slate-200">
                          "{selectedViolation?.reason}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-blue-50 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedViolation(null)}
                className="px-8 py-3 bg-white border border-slate-200 text-slate-600 text-[12px] font-bold uppercase tracking-widest hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm"
              >
                {t.modal.close}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
