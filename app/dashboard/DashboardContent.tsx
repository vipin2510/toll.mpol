'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Violation } from '@/types/violation';
import axios from 'axios';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts whatever the DB returns for an image column into a valid src string.
 * - already a full data-URI → returned as-is
 * - raw base64 starting with iVBOR… → PNG
 * - everything else → JPEG
 */
function toImageSrc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (s.startsWith('data:')) return s;
  const mime = s.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${s}`;
}

// ---------------------------------------------------------------------------
// LazyImage – renders nothing until the element enters the viewport.
// Using IntersectionObserver because loading="lazy" is a no-op on data: URIs.
// ---------------------------------------------------------------------------
function LazyImage({
  src,
  alt,
  style,
  className,
}: {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={style} className="relative bg-slate-100">
      {/* Shimmer placeholder shown until image decodes */}
      {(!visible || !loaded) && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-[shimmer_1.4s_infinite]"
          style={style}
        />
      )}
      {visible && (
        <img
          src={src}
          alt={alt}
          style={{ ...style, display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          className={className}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton row – mimics a real table row while data loads
// ---------------------------------------------------------------------------
function SkeletonRow() {
  return (
    <tr className="border-b border-blue-50/50">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <td key={i} className="px-6 py-5">
          <div
            className="h-3 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-[shimmer_1.4s_infinite] rounded-sm"
            style={{ width: `${60 + (i * 13) % 40}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------
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
      },
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
      },
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

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------
function StatusBadge({
  violation,
  onOpenDecline,
  onAccept,
  updatingId,
  t,
}: {
  violation: Violation;
  onOpenDecline: (id: string) => void;
  onAccept: (id: string) => void;
  updatingId: string | null;
  t: any;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isUpdating = updatingId === violation.id;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const baseClass =
    'inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] font-semibold uppercase tracking-widest border transition-colors';

  if (isUpdating) {
    return (
      <span className={`${baseClass} bg-blue-50 text-blue-400 border-blue-200 cursor-wait`}>
        <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        {t.rejection.processing}
      </span>
    );
  }

  if (violation.status === 'ACCEPTED') {
    return (
      <span className={`${baseClass} bg-emerald-50 text-emerald-600 border-emerald-200 cursor-default`}>
        ✓ {t.status.approved}
      </span>
    );
  }

  if (violation.status === 'DECLINED') {
    return (
      <div className="flex flex-col gap-1 items-end">
        <span className={`${baseClass} bg-rose-50 text-rose-600 border-rose-200 cursor-default`}>
          ✕ {t.status.rejected}
        </span>
        {violation.reason && (
          <p className="text-[9px] text-slate-400 text-right max-w-[120px]">{violation.reason}</p>
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
        className={`${baseClass} bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100/50 cursor-pointer`}
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

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
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
  const [selectedReason, setSelectedReason] = useState('');

  // Loading states
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null); // per-row update
  const [loadingImages, setLoadingImages] = useState(false);

  const isInitialMount = useRef(true);
  const router = useRouter();

  const t = TRANSLATIONS[language];

  // ---------------------------------------------------------------------------
  // Language persistence
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem('dash_lang');
    if (saved === 'hi' || saved === 'en') setLanguage(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('dash_lang', language);
  }, [language]);

  // ---------------------------------------------------------------------------
  // Modal images
  // ---------------------------------------------------------------------------
  const [extraImages, setExtraImages] = useState<{
    complete_image: string | null;
    plate_image: string | null;
  } | null>(null);

  useEffect(() => {
    if (!selectedViolation) {
      setExtraImages(null);
      return;
    }
    // Images already embedded in the violation object — no extra fetch needed
    if (selectedViolation.complete_image_b64 !== undefined) {
      setExtraImages({
        complete_image: selectedViolation.complete_image_b64 ?? null,
        plate_image: selectedViolation.plate_image_b64 ?? null,
      });
      return;
    }
    // Fallback: fetch from dedicated endpoint
    setLoadingImages(true);
    setExtraImages(null);
    axios
      .get(`/api/violations/${selectedViolation.id}`)
      .then((res) => {
        const d = res.data.data;
        setExtraImages({
          complete_image: d?.complete_image_b64 ?? null,
          plate_image: d?.plate_image_b64 ?? null,
        });
      })
      .catch(() => {
        toast.error(language === 'en' ? 'Failed to load violation images' : 'छवियाँ लोड नहीं हो सकीं');
        setExtraImages({ complete_image: null, plate_image: null });
      })
      .finally(() => setLoadingImages(false));
  }, [selectedViolation?.id]);

  const modalImages = extraImages;

  // ---------------------------------------------------------------------------
  // Fetch violations
  // ---------------------------------------------------------------------------
  const fetchViolations = useCallback(
    async (showLoading = false) => {
      if (showLoading) setIsLoadingData(true);
      try {
        const response = await axios.get('/api/violations', {
          params: { page, limit: initialLimit, filterType, filterValue },
        });
        if (response.status === 200) {
          setViolations(response.data.data);
          setTotalCount(response.data.count);
          setStats(response.data.stats);
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          router.push('/signin');
        } else {
          toast.error(
            language === 'en'
              ? 'Failed to fetch records. Please try again.'
              : 'रिकॉर्ड प्राप्त करने में विफल। कृपया पुनः प्रयास करें।'
          );
        }
      } finally {
        if (showLoading) setIsLoadingData(false);
      }
    },
    [page, initialLimit, filterType, filterValue, language, router]
  );

  // Page-change trigger (skip initial mount — SSR already loaded page 1)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchViolations(true);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic silent refresh every 30 s
  useEffect(() => {
    const interval = setInterval(() => fetchViolations(false), 30_000);
    return () => clearInterval(interval);
  }, [fetchViolations]);

  // ---------------------------------------------------------------------------
  // Status update
  // ---------------------------------------------------------------------------
  async function handleUpdateStatus(id: string, status: string, reason?: string) {
    setUpdatingId(id);
    const toastId = toast.loading(
      language === 'en' ? 'Updating status…' : 'स्थिति अपडेट हो रही है…'
    );
    try {
      const uppercaseStatus = status.toUpperCase();
      const response = await axios.patch(`/api/violations/${id}`, {
        status: uppercaseStatus,
        reason,
      });

      if (response.status === 200) {
        setViolations((prev) =>
          prev.map((v) =>
            v.id === id ? { ...v, status: uppercaseStatus, reason: reason || null } : v
          )
        );
        setStats((prev) => {
          const s = { ...prev };
          if (uppercaseStatus === 'ACCEPTED') { s.accepted++; s.pending--; }
          else if (uppercaseStatus === 'DECLINED') { s.declined++; s.pending--; }
          return s;
        });
        // Also sync open modal
        if (selectedViolation?.id === id) {
          setSelectedViolation((v) => v ? { ...v, status: uppercaseStatus, reason: reason || null } : v);
        }
        toast.success(
          uppercaseStatus === 'ACCEPTED'
            ? (language === 'en' ? 'Violation accepted ✓' : 'उल्लंघन स्वीकृत ✓')
            : (language === 'en' ? 'Violation declined ✕' : 'उल्लंघन अस्वीकृत ✕'),
          { id: toastId }
        );
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.dismiss(toastId);
        router.push('/signin');
      } else {
        toast.error(
          language === 'en' ? 'Failed to update status. Please try again.' : 'स्थिति अपडेट विफल। पुनः प्रयास करें।',
          { id: toastId }
        );
      }
    } finally {
      setUpdatingId(null);
      setDeclineTarget(null);
      setSelectedReason('');
    }
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  const handleLogout = async () => {
    const toastId = toast.loading(language === 'en' ? 'Signing out…' : 'साइन आउट हो रहा है…');
    try {
      await axios.post('/api/auth/logout');
      toast.success(language === 'en' ? 'Signed out' : 'साइन आउट हो गए', { id: toastId });
      router.replace('/signin');
    } catch {
      toast.error(language === 'en' ? 'Sign out failed' : 'साइन आउट विफल', { id: toastId });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(language === 'en' ? 'ID copied to clipboard' : 'आईडी कॉपी हो गई');
  };

  const totalPages = Math.ceil(totalCount / limit);
  const SKELETON_COUNT = 6;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Global shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .animate-\\[shimmer_1\\.4s_infinite\\] {
          background-size: 800px 100%;
          animation: shimmer 1.4s infinite linear;
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">

        {/* ------------------------------------------------------------------ */}
        {/* HEADER */}
        {/* ------------------------------------------------------------------ */}
        <header className="bg-blue-600 border-b border-blue-700 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-sm font-bold text-white uppercase">{t.title}</h1>
              <span className="w-px h-4 bg-blue-400" />
              {/* Live indicator */}
              <span className="flex items-center gap-1.5 text-[11px] text-blue-200 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
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

          {/* ---------------------------------------------------------------- */}
          {/* STATS */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: t.stats.pending, count: stats.pending, color: 'text-orange-600', border: 'border-l-4 border-l-orange-400' },
              { label: t.stats.accepted, count: stats.accepted, color: 'text-emerald-600', border: 'border-l-4 border-l-emerald-400' },
              { label: t.stats.declined, count: stats.declined, color: 'text-rose-600', border: 'border-l-4 border-l-rose-400' },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`bg-white border border-blue-100 p-6 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow ${stat.border}`}
              >
                <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                <span className={`text-3xl font-bold ${stat.color}`}>{stat.count}</span>
              </div>
            ))}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* SEARCH & FILTERS */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center mb-6 gap-4 bg-white p-4 border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">
                {t.activeRecords}{totalCount > 0 && ` (${totalCount})`}
              </h2>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full md:w-48 border border-blue-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest bg-slate-50/50 focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
              >
                {Object.entries(t.search.types).map(([key, label]: [string, any]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <div className="relative w-full md:w-64">
                <input
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (page === 1) fetchViolations(true);
                      else setPage(1);
                    }
                  }}
                  placeholder={t.search.placeholder}
                  className="w-full border border-blue-100 px-4 py-2.5 text-[11px] focus:outline-none focus:border-blue-600 bg-white transition-all placeholder:text-slate-300 font-medium"
                />
              </div>

              <button
                disabled={isLoadingData}
                onClick={() => {
                  if (page === 1) fetchViolations(true);
                  else setPage(1);
                }}
                className="w-full md:w-auto px-8 py-2.5 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoadingData ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {language === 'en' ? 'Searching…' : 'खोज रहे हैं…'}
                  </>
                ) : t.search.button}
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* TABLE */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-white border border-blue-100 shadow-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-blue-100">
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest">{t.table.vehicleNumber}</th>
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest">{t.table.detectionTime}</th>
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest">{t.table.location}</th>
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest">{t.table.violationType}</th>
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest">
                    {language === 'en' ? 'Track ID' : 'ट्रैक आईडी'}
                  </th>
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest">{t.table.evidence}</th>
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-500 uppercase tracking-widest text-right">{t.table.action}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-blue-50/50">
                {isLoadingData
                  ? Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonRow key={i} />)
                  : violations.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedViolation(v)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-blue-700 font-bold bg-blue-50 px-2 py-1 border border-blue-100">
                          {v.vehicle_number}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-[11px] text-slate-500 whitespace-nowrap">
                        {v.detected_at
                          ? new Date(v.detected_at).toLocaleString(
                            language === 'en' ? 'en-IN' : 'hi-IN',
                            { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                          )
                          : '—'}
                      </td>

                      <td className="px-6 py-4 text-[13px] text-slate-500 font-medium uppercase tracking-tight">
                        {v.location}
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-blue-600 text-[13px] font-bold uppercase tracking-widest">
                          {v.helmet_status || (language === 'en' ? 'DETECTION' : 'पहचान')}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-[11px] text-slate-500 font-medium uppercase">{v.track_id}</td>

                      {/* Evidence thumbnails – lazy loaded */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-2">
                          {toImageSrc(v.complete_image_b64) ? (
                            <div className="group/thumb relative overflow-hidden border border-blue-100 inline-block">
                              <LazyImage
                                src={toImageSrc(v.complete_image_b64)!}
                                alt="Full scene"
                                style={{ maxWidth: 200, height: 'auto' }}
                                className="transition-transform duration-300 group-hover/thumb:scale-105"
                              />
                              <span className="absolute bottom-0 left-0 right-0 text-[8px] font-bold uppercase tracking-widest text-white bg-blue-600/70 px-1.5 py-0.5 text-center">
                                {language === 'en' ? 'Scene' : 'दृश्य'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300 uppercase tracking-widest">—</span>
                          )}

                          {toImageSrc(v.plate_image_b64) && (
                            <div className="group/plate relative overflow-hidden border border-blue-100 inline-block">
                              <LazyImage
                                src={toImageSrc(v.plate_image_b64)!}
                                alt="Plate"
                                style={{ maxWidth: 200, height: 'auto' }}
                                className="transition-transform duration-300 group-hover/plate:scale-105"
                              />
                              <span className="absolute bottom-0 left-0 right-0 text-[8px] font-bold uppercase tracking-widest text-white bg-slate-600/70 px-1.5 py-0.5 text-center">
                                {language === 'en' ? 'Plate' : 'प्लेट'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <StatusBadge
                          violation={v}
                          onAccept={(id) => handleUpdateStatus(id, 'accepted')}
                          onOpenDecline={(id) => setDeclineTarget(id)}
                          updatingId={updatingId}
                          t={t}
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {!isLoadingData && violations.length === 0 && (
              <div className="py-24 text-center flex flex-col items-center gap-3">
                <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-slate-400 uppercase tracking-widest">{t.noRecords}</p>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* PAGINATION */}
          {/* ---------------------------------------------------------------- */}
          {totalPages > 1 && (
            <div className="mt-4 bg-white border border-blue-100 px-6 py-4 flex items-center justify-between">
              <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">
                {t.pagination.showing}{' '}
                {((page - 1) * limit) + 1}–{Math.min(page * limit, totalCount)}{' '}
                {t.pagination.of} {totalCount} {t.pagination.records}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1 || isLoadingData}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 border border-blue-100 text-[13px] font-bold uppercase tracking-widest bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isLoadingData && page > 1 ? (
                    <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  ) : '←'}
                  {t.pagination.previous}
                </button>

                <span className="px-4 py-2 text-[13px] font-bold text-blue-600 border border-blue-200 bg-blue-50">
                  {page} / {totalPages}
                </span>

                <button
                  disabled={page === totalPages || isLoadingData}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 border border-blue-100 text-[13px] font-bold uppercase tracking-widest bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {t.pagination.next}
                  {isLoadingData && page < totalPages ? (
                    <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  ) : '→'}
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ------------------------------------------------------------------ */}
        {/* REJECTION MODAL */}
        {/* ------------------------------------------------------------------ */}
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
                <button
                  onClick={() => { setDeclineTarget(null); setSelectedReason(''); }}
                  className="text-slate-400 hover:text-slate-600 uppercase text-[13px]"
                >
                  {language === 'en' ? 'Close' : 'बंद करें'}
                </button>
              </div>

              <div className="space-y-2 mb-8">
                {t.rejection.reasons.map((r: string) => (
                  <button
                    key={r}
                    onClick={() => setSelectedReason(r)}
                    className={`w-full text-left px-5 py-3 text-[13px] font-bold uppercase tracking-widest border transition-all ${
                      selectedReason === r
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
                  onClick={() => { setDeclineTarget(null); setSelectedReason(''); }}
                  className="flex-1 border border-slate-200 text-slate-500 py-3 text-[13px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
                >
                  {t.rejection.cancel}
                </button>
                <button
                  disabled={!selectedReason || !!updatingId}
                  onClick={() => handleUpdateStatus(declineTarget, 'declined', selectedReason)}
                  className="flex-[2] bg-blue-600 text-white py-3 text-[13px] font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {updatingId ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      {t.rejection.processing}
                    </>
                  ) : t.rejection.confirm}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* DETAIL MODAL */}
        {/* ------------------------------------------------------------------ */}
        {selectedViolation && (
          <div
            className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-md z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedViolation(null); }}
          >
            <div className="bg-white border border-blue-100 w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">

              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-blue-50 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em]">
                    {t.modal.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono text-slate-400">{selectedViolation.id}</span>
                    <button
                      onClick={() => copyToClipboard(selectedViolation.id)}
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

                  {/* Images */}
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {t.modal.images.complete}
                      </h4>
                      {loadingImages ? (
                        <div className="w-full h-48 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-[shimmer_1.4s_infinite] border border-blue-50" />
                      ) : toImageSrc(modalImages?.complete_image) ? (
                        <div className="border border-blue-50 overflow-hidden group">
                          <LazyImage
                            src={toImageSrc(modalImages!.complete_image)!}
                            alt="Violation Scene"
                            style={{ width: '100%', height: 'auto' }}
                            className="transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="w-full py-10 flex flex-col items-center justify-center gap-2 bg-slate-50 border border-dashed border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest">
                          <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {t.modal.images.plate}
                      </h4>
                      {loadingImages ? (
                        <div className="w-full h-20 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-[shimmer_1.4s_infinite] border border-blue-50" />
                      ) : toImageSrc(modalImages?.plate_image) ? (
                        <div className="border border-blue-50 overflow-hidden group">
                          <LazyImage
                            src={toImageSrc(modalImages!.plate_image)!}
                            alt="Plate Detail"
                            style={{ width: '100%', height: 'auto' }}
                            className="transition-transform duration-500 group-hover:scale-110"
                          />
                        </div>
                      ) : (
                        <div className="w-full py-6 flex items-center justify-center gap-2 bg-slate-50 border border-dashed border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest">
                          No Plate Image
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-10">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.trackId}</h4>
                        <p className="text-[13px] font-semibold text-slate-900 font-mono">{selectedViolation.track_id}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.vehicleNumber}</h4>
                        <p className="text-[13px] font-bold text-blue-700 bg-blue-50/50 inline-block px-2 py-0.5 border border-blue-100 font-mono">
                          {selectedViolation.vehicle_number}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.detectionTime}</h4>
                        <p className="text-[13px] font-semibold text-slate-700">
                          {selectedViolation.detected_at
                            ? new Date(selectedViolation.detected_at).toLocaleString(
                              language === 'en' ? 'en-IN' : 'hi-IN',
                              { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }
                            )
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.location}</h4>
                        <p className="text-[13px] font-semibold text-slate-700 uppercase">{selectedViolation.location}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.dateFolder}</h4>
                        <p className="text-[13px] font-semibold text-slate-700 font-mono break-all">{selectedViolation.date_folder}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.violationType}</h4>
                        <span className="text-[12px] font-bold text-blue-600 uppercase tracking-wider">
                          {selectedViolation.helmet_status || (language === 'en' ? 'DETECTION' : 'पहचान')}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.status}</h4>
                        <span className={`text-[12px] font-bold uppercase tracking-wider px-2 py-1 border ${
                          selectedViolation.status === 'ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : selectedViolation.status === 'DECLINED'
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : 'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                          {selectedViolation.status === 'ACCEPTED'
                            ? t.status.approved
                            : selectedViolation.status === 'DECLINED'
                            ? t.status.rejected
                            : t.status.pending}
                        </span>
                      </div>
                      {selectedViolation.reason && (
                        <div className="col-span-2">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.modal.reason}</h4>
                          <p className="text-[13px] font-semibold text-slate-600 italic bg-slate-50 p-4 border-l-2 border-slate-200">
                            "{selectedViolation.reason}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-6 border-t border-blue-50 bg-slate-50/50 flex justify-end flex-shrink-0">
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
    </>
  );
}
