'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Violation } from '@/types/violation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useInView } from 'react-intersection-observer';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------
function toImageSrc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (s.startsWith('data:')) return s;
  const mime = s.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${s}`;
}

// ---------------------------------------------------------------------------
// LazyImage — viewport-gated, progressive shimmer, fixed thumbnail size
// Images in the table are capped at small thumbnails to avoid heavy decode.
// ---------------------------------------------------------------------------
function LazyImage({
  src,
  alt,
  thumbClass = 'w-28 h-20',   // fixed size in table → no layout shift, fast decode
  fullSize = false,             // full-width for modal
}: {
  src: string;
  alt: string;
  thumbClass?: string;
  fullSize?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: '400px' });

  const containerCls = fullSize ? 'relative w-full bg-slate-100 overflow-hidden' : `relative bg-slate-100 overflow-hidden ${thumbClass}`;

  return (
    <div ref={ref} className={containerCls}>
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-[shimmer_1.4s_infinite]" />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          decoding="async"
          loading="lazy"
          // For thumbnails: use CSS to clip at the fixed size; avoids painting a 2MB base64 at full res
          className={`${fullSize ? 'w-full h-auto block' : 'w-full h-full object-cover'} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonRow
// ---------------------------------------------------------------------------
function SkeletonRow({ cols = 10 }: { cols?: number }) {
  return (
    <tr className="border-b border-blue-50/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div
            className="h-3 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-[shimmer_1.4s_infinite] rounded-sm"
            style={{ width: `${55 + (i * 17) % 40}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Static translations (English only)
// ---------------------------------------------------------------------------
const T = {
  title: 'Traffic Control System',
  signOut: 'Sign Out',
  fetchNew: 'Fetch New',
  fetching: 'Fetching…',
  stats: { pending: 'Pending', accepted: 'Validated', declined: 'Declined' },
  activeRecords: 'Active Records',
  noRecords: 'No records found',
  table: {
    num: '#',
    detectionTime: 'Detection Time',
    location: 'Location',
    violationType: 'Violation',
    trackId: 'Track ID',
    scene: 'Scene',
    plate: 'Plate',
    action: 'Action',
    vehicleNumber: 'Vehicle No.',
    challan: 'Challan',
  },
  search: {
    placeholder: 'Search…',
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
    undoAccept: 'undo',
    undoDecline: 'undo',
  },
  rejection: {
    title: 'Rejection Reason',
    reasons: [
      'No violation visible',
      'Image too blurry or unclear',
      'Incorrect vehicle number',
      'Emergency / exempt vehicle',
      'False positive detection',
      'System entry / test',
      'Double Violation',
      'Plate Not in Frame',
    ],
    cancel: 'Cancel',
    confirm: 'Confirm',
    processing: 'Processing…',
  },
  pagination: {
    showing: 'Showing',
    of: 'of',
    records: 'records',
    previous: '← Prev',
    next: 'Next →',
    page: 'Page',
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
    images: { complete: 'Full Scene', plate: 'License Plate' },
    close: 'Close',
  },
};

// ---------------------------------------------------------------------------
// StatusBadgeV2 — inline rejection popover + undo support
// Accept → ACCEPTED; Decline opens reason panel inline; undo resets to PENDING
// ---------------------------------------------------------------------------
function StatusBadgeV2({
  violation,
  onDeclineWithReason,
  onAccept,
  onUndo,
  updatingId,
}: {
  violation: Violation;
  onDeclineWithReason: (id: string, reason: string) => void;
  onAccept: (id: string) => void;
  onUndo: (id: string) => void;
  updatingId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const isUpdating = updatingId === violation.id;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setShowRejectPanel(false); setSelectedReason('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const base = 'inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer select-none';

  if (isUpdating) return (
    <span className={`${base} bg-blue-50 text-blue-500 border-blue-200 cursor-wait`}>
      <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" />
    </span>
  );

  // ── ACCEPTED ──
  if (violation.status === 'ACCEPTED') return (
    <div className="flex flex-col items-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      <span className={`${base} bg-emerald-50 text-emerald-600 border-emerald-200`}>✓ {T.status.approved}</span>
      <button
        onClick={() => onUndo(violation.id)}
        className="text-[9px] text-slate-300 hover:text-orange-400 uppercase tracking-widest transition-colors"
      >
        {T.status.undoAccept}
      </button>
    </div>
  );

  // ── DECLINED ──
  if (violation.status === 'DECLINED') return (
    <div className="flex flex-col items-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      <span className={`${base} bg-rose-50 text-rose-600 border-rose-200`}>✕ {T.status.rejected}</span>
      {violation.reason && (
        <p className="text-[8px] text-slate-400 text-right max-w-[120px] leading-tight">{violation.reason}</p>
      )}
      <button
        onClick={() => onUndo(violation.id)}
        className="text-[9px] text-slate-300 hover:text-orange-400 uppercase tracking-widest transition-colors"
      >
        {T.status.undoDecline}
      </button>
    </div>
  );

  // ── PENDING ──
  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => { setOpen((o) => !o); setShowRejectPanel(false); setSelectedReason(''); }}
        className={`${base} bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100`}
      >
        {T.status.pending} ▾
      </button>

      {/* Accept / Decline choice */}
      {open && !showRejectPanel && (
        <div className="absolute right-0 mt-1 bg-white border border-blue-100 shadow-xl w-36 z-50">
          <button
            onClick={() => { onAccept(violation.id); setOpen(false); }}
            className="w-full text-left px-3 py-2.5 text-[11px] font-black text-blue-600 hover:bg-blue-50 uppercase tracking-widest"
          >
            ✓ {T.status.approve}
          </button>
          <div className="border-t border-slate-100" />
          <button
            onClick={() => setShowRejectPanel(true)}
            className="w-full text-left px-3 py-2.5 text-[11px] font-black text-slate-500 hover:bg-red-50 uppercase tracking-widest"
          >
            ✕ {T.status.reject}
          </button>
        </div>
      )}

      {/* Inline rejection reason panel — appears right below the button */}
      {open && showRejectPanel && (
        <div className="absolute right-0 mt-1 bg-white border border-blue-200 shadow-2xl z-[60] w-60">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{T.rejection.title}</span>
            <button onClick={() => { setShowRejectPanel(false); setSelectedReason(''); }} className="text-slate-300 hover:text-slate-500 text-base leading-none">×</button>
          </div>
          <div className="p-1.5 space-y-0.5 max-h-52 overflow-y-auto">
            {T.rejection.reasons.map((r) => (
              <button key={r} onClick={() => setSelectedReason(r)}
                className={`w-full text-left px-2.5 py-1.5 text-[10px] font-semibold border transition-all ${selectedReason === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-100 hover:border-blue-300 hover:bg-blue-50'}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 p-2 border-t border-slate-100">
            <button
              onClick={() => { setShowRejectPanel(false); setOpen(false); setSelectedReason(''); }}
              className="flex-1 py-1.5 border border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:bg-slate-50"
            >
              {T.rejection.cancel}
            </button>
            <button
              disabled={!selectedReason || !!updatingId}
              onClick={() => { if (!selectedReason) return; onDeclineWithReason(violation.id, selectedReason); setOpen(false); setShowRejectPanel(false); setSelectedReason(''); }}
              className="flex-1 py-1.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-1"
            >
              {T.rejection.confirm}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditableVehicleNumber — read-only for non-ACCEPTED; editable inline otherwise
// ---------------------------------------------------------------------------
function EditableVehicleNumber({
  violation,
  onSave,
}: {
  violation: Violation;
  onSave: (id: string, v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(violation.vehicle_number || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAccepted = violation.status === 'ACCEPTED';
  const isEmpty = !violation.vehicle_number?.trim();

  // Sync if parent updates vehicle_number (e.g. after save)
  useEffect(() => { setValue(violation.vehicle_number || ''); }, [violation.vehicle_number]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (!isAccepted) {
    return (
      <span className="font-mono text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-1 border border-blue-100">
        {violation.vehicle_number || '—'}
      </span>
    );
  }

  if (!editing) return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={`font-mono text-[11px] font-bold px-2 py-1 border transition-all group ${isEmpty
        ? 'bg-amber-50 text-amber-600 border-amber-300 border-dashed animate-pulse hover:animate-none hover:bg-amber-100'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
        }`}
    >
      {isEmpty ? (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          ADD NO.
        </span>
      ) : (
        <span className="flex items-center gap-1">
          {violation.vehicle_number}
          <svg className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </span>
      )}
    </button>
  );

  const doSave = async () => {
    setSaving(true);
    await onSave(violation.id, value);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        onKeyDown={(e) => { if (e.key === 'Enter') doSave(); if (e.key === 'Escape') { setValue(violation.vehicle_number || ''); setEditing(false); } }}
        placeholder="CG04AB1234"
        className="font-mono text-[11px] font-bold text-blue-700 border border-blue-400 px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase bg-blue-50"
      />
      <button disabled={saving} onClick={doSave} className="p-1 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
        {saving
          ? <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" />
          : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        }
      </button>
      <button onClick={(e) => { e.stopPropagation(); setValue(violation.vehicle_number || ''); setEditing(false); }} className="p-1 text-slate-300 hover:text-slate-500">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChallanCheckbox — styled checkbox; ACCEPT-only action via the tick
// ---------------------------------------------------------------------------
function ChallanCheckbox({
  violation,
  onToggle,
  challanUpdatingId,
}: {
  violation: Violation;
  onToggle: (id: string, value: boolean) => void;
  challanUpdatingId: string | null;
}) {
  const isUpdating = challanUpdatingId === violation.id;
  const checked = !!(violation as any).challan;

  return (
    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
      {isUpdating ? (
        <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin text-blue-500" />
      ) : (
        <button
          onClick={() => onToggle(violation.id, !checked)}
          title={checked ? 'Challan issued — click to revoke' : 'Click to issue challan'}
          className={`w-5 h-5 border-2 flex items-center justify-center transition-all rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
            checked
              ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-200'
              : 'bg-white border-slate-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ViolationRow — memoized; images rendered at small thumbnail size only
// ---------------------------------------------------------------------------
const ViolationRow = React.memo(({
  violation,
  rowIndex,
  onSelect,
  onAccept,
  onDeclineWithReason,
  onUndo,
  onSaveVehicleNumber,
  onToggleChallan,
  updatingId,
  challanUpdatingId,
}: {
  violation: Violation;
  rowIndex: number;
  onSelect: (v: Violation) => void;
  onAccept: (id: string) => void;
  onDeclineWithReason: (id: string, reason: string) => void;
  onUndo: (id: string) => void;
  onSaveVehicleNumber: (id: string, v: string) => Promise<void>;
  onToggleChallan: (id: string, value: boolean) => void;
  updatingId: string | null;
  challanUpdatingId: string | null;
}) => {
  const sceneSrc = toImageSrc(violation.complete_image_b64);
  const plateSrc = toImageSrc(violation.plate_image_b64);

  return (
    <tr
      onClick={() => onSelect(violation)}
      className="hover:bg-blue-50/40 transition-colors cursor-pointer border-b border-blue-50/70"
    >
      {/* Row number */}
      <td className="px-3 py-2.5 text-[9px] text-slate-300 font-bold w-8 select-none">{rowIndex + 1}</td>

      {/* Detection time */}
      <td className="px-3 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">
        {violation.detected_at
          ? new Date(violation.detected_at).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', year: '2-digit',
              hour: '2-digit', minute: '2-digit',
            })
          : '—'}
      </td>

      {/* Location */}
      <td className="px-3 py-2.5 text-[11px] text-slate-500 font-medium uppercase max-w-[120px] truncate">{violation.location}</td>

      {/* Violation type */}
      <td className="px-3 py-2.5">
        <span className="text-blue-600 text-[10px] font-black uppercase tracking-wider">
          {violation.helmet_status || 'DETECTION'}
        </span>
      </td>

      {/* Track ID */}
      <td className="px-3 py-2.5 text-[10px] text-slate-400 font-mono">{violation.track_id}</td>

      {/* Scene thumbnail — fixed 112×80px crop; fast even for big base64 */}
      <td className="px-2 py-2">
        {sceneSrc
          ? <div className="border border-blue-100 overflow-hidden rounded-sm group">
              <LazyImage src={sceneSrc} alt="Scene" thumbClass="w-48 h-34" />
            </div>
          : <span className="text-[9px] text-slate-200 uppercase">—</span>
        }
      </td>

      {/* Plate thumbnail — fixed 96×52px */}
      <td className="px-2 py-2">
        {plateSrc
          ? <div className="border border-blue-100 overflow-hidden rounded-sm group">
              <LazyImage src={plateSrc} alt="Plate" thumbClass="w-24 h-14" />
            </div>
          : <span className="text-[9px] text-slate-200 uppercase">—</span>
        }
      </td>

      {/* Action */}
      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
        <StatusBadgeV2
          violation={violation}
          onAccept={onAccept}
          onDeclineWithReason={onDeclineWithReason}
          onUndo={onUndo}
          updatingId={updatingId}
        />
      </td>

      {/* Vehicle number — editable only when ACCEPTED */}
      <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
        <EditableVehicleNumber violation={violation} onSave={onSaveVehicleNumber} />
      </td>

      {/* Challan checkbox */}
      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
        <ChallanCheckbox
          violation={violation}
          onToggle={onToggleChallan}
          challanUpdatingId={challanUpdatingId}
        />
      </td>
    </tr>
  );
});
ViolationRow.displayName = 'ViolationRow';

// ---------------------------------------------------------------------------
// PageJumper — editable page number input
// ---------------------------------------------------------------------------
function PageJumper({
  page,
  totalPages,
  onJump,
  disabled,
}: {
  page: number;
  totalPages: number;
  onJump: (p: number) => void;
  disabled: boolean;
}) {
  const [val, setVal] = useState(String(page));
  useEffect(() => setVal(String(page)), [page]);

  const go = () => {
    const n = parseInt(val);
    if (!isNaN(n) && n >= 1 && n <= totalPages) onJump(n);
    else setVal(String(page));
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{T.pagination.page}</span>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={go}
        onKeyDown={(e) => e.key === 'Enter' && go()}
        disabled={disabled}
        className="w-12 border border-blue-200 px-1.5 py-1 text-[12px] font-bold text-blue-700 text-center focus:outline-none focus:border-blue-600 bg-blue-50/50 disabled:opacity-50"
      />
      <span className="text-[10px] text-slate-400 font-bold">/ {totalPages}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main DashboardContent
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

  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isFetchingNew, setIsFetchingNew] = useState(false);

  // Separate updating IDs: status vs challan, so they don't block each other
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [challanUpdatingId, setChallanUpdatingId] = useState<string | null>(null);

  const [loadingImages, setLoadingImages] = useState(false);
  const [extraImages, setExtraImages] = useState<{
    complete_image: string | null;
    plate_image: string | null;
  } | null>(null);

  // Batch render: first 25 immediately, next batch on scroll
  const [showSecondBatch, setShowSecondBatch] = useState(false);
  const { ref: batchRef, inView: batchInView } = useInView({ rootMargin: '200px' });
  useEffect(() => { setShowSecondBatch(false); }, [violations, page]);
  useEffect(() => {
    if (batchInView && !showSecondBatch && violations.length > 25) setShowSecondBatch(true);
  }, [batchInView, showSecondBatch, violations.length]);

  const isInitialMount = useRef(true);
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // Modal: fetch images on demand only (not embedded in list rows)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!selectedViolation) { setExtraImages(null); return; }
    // If the row already has images embedded
    if (selectedViolation.complete_image_b64 !== undefined) {
      setExtraImages({
        complete_image: selectedViolation.complete_image_b64 ?? null,
        plate_image: selectedViolation.plate_image_b64 ?? null,
      });
      return;
    }
    setLoadingImages(true);
    setExtraImages(null);
    axios.get(`/api/violations/${selectedViolation.id}`)
      .then((res) => {
        const d = res.data.data;
        setExtraImages({ complete_image: d?.complete_image_b64 ?? null, plate_image: d?.plate_image_b64 ?? null });
      })
      .catch((err: any) => {
        toast.error(err.response?.data?.error ?? 'Failed to load images');
        setExtraImages({ complete_image: null, plate_image: null });
      })
      .finally(() => setLoadingImages(false));
  }, [selectedViolation?.id]);

  // ---------------------------------------------------------------------------
  // fetchViolations
  // showLoading = full skeleton; silent = background "Fetch New" button click
  // ---------------------------------------------------------------------------
  const fetchViolations = useCallback(async (showLoading = false, silent = false) => {
    if (showLoading) setIsLoadingData(true);
    if (silent) setIsFetchingNew(true);
    try {
      const res = await axios.get('/api/violations', {
        params: { page, limit, filterType, filterValue },
      });
      if (res.status === 200) {
        setViolations(res.data.data);
        setTotalCount(res.data.count);
        setStats(res.data.stats);
      }
    } catch (err: any) {
      if (err.response?.status === 401) router.push('/signin');
      else if (!silent) toast.error(err.response?.data?.error ?? 'Failed to fetch records.');
    } finally {
      if (showLoading) setIsLoadingData(false);
      if (silent) setIsFetchingNew(false);
    }
  }, [page, limit, filterType, filterValue, router]);

  // Trigger on page change; skip on initial mount if SSR data provided
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (violations.length === 0) fetchViolations(true);
      return;
    }
    fetchViolations(true);
  }, [page]); // eslint-disable-line

  // ---------------------------------------------------------------------------
  // handleUpdateStatus — covers: accept, decline, undo → pending
  // Also handles: vehicle_number PATCH (called from EditableVehicleNumber)
  // FIX: vehicle_number PATCH now uses a SEPARATE field-only payload,
  //      not mixed with status — avoids 500 on the server if status field
  //      gets unexpected data in the same request.
  // ---------------------------------------------------------------------------
  async function handleUpdateStatus(id: string, status: string, reason?: string) {
    setUpdatingId(id);
    const toastId = toast.loading('Updating…');
    try {
      const uppercaseStatus = status.toUpperCase();
      // Only send fields that are relevant; never send empty reason
      const payload: Record<string, any> = { status: uppercaseStatus };
      if (reason) payload.reason = reason;
      // When resetting to PENDING, explicitly clear reason
      if (uppercaseStatus === 'PENDING') payload.reason = null;

      await axios.patch(`/api/violations/${id}`, payload);

      setViolations((prev) => prev.map((v) =>
        v.id === id
          ? { ...v, status: uppercaseStatus, reason: reason ?? (uppercaseStatus === 'PENDING' ? null : v.reason) }
          : v
      ));
      setStats((prev) => {
        const s = { ...prev };
        const old = violations.find((v) => v.id === id)?.status ?? 'PENDING';
        if (old === 'ACCEPTED') s.accepted = Math.max(0, s.accepted - 1);
        else if (old === 'DECLINED') s.declined = Math.max(0, s.declined - 1);
        else s.pending = Math.max(0, s.pending - 1);
        if (uppercaseStatus === 'ACCEPTED') s.accepted++;
        else if (uppercaseStatus === 'DECLINED') s.declined++;
        else s.pending++;
        return s;
      });
      if (selectedViolation?.id === id) {
        setSelectedViolation((v) => v ? {
          ...v,
          status: uppercaseStatus,
          reason: reason ?? (uppercaseStatus === 'PENDING' ? null : v.reason),
        } : v);
      }
      toast.success(
        uppercaseStatus === 'ACCEPTED' ? 'Accepted ✓' :
        uppercaseStatus === 'DECLINED' ? 'Declined ✕' :
        'Reset to Pending',
        { id: toastId }
      );
    } catch (err: any) {
      if (err.response?.status === 401) { toast.dismiss(toastId); router.push('/signin'); return; }
      toast.error(err.response?.data?.error ?? `Update failed (${err.response?.status ?? 'network'})`, { id: toastId });
    } finally {
      setUpdatingId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // handleSaveVehicleNumber — sends ONLY vehicle_number field in PATCH body
  // This is the root cause of the 500: the API route handler must support
  // partial PATCH where only vehicle_number is sent without status.
  // ---------------------------------------------------------------------------
  async function handleSaveVehicleNumber(id: string, newNumber: string) {
    const toastId = toast.loading('Saving…');
    try {
      // IMPORTANT: send only vehicle_number — no other fields
      await axios.patch(`/api/violations/${id}`, { vehicle_number: newNumber });
      setViolations((prev) => prev.map((v) => v.id === id ? { ...v, vehicle_number: newNumber } : v));
      if (selectedViolation?.id === id) {
        setSelectedViolation((v) => v ? { ...v, vehicle_number: newNumber } : v);
      }
      toast.success('Vehicle number updated ✓', { id: toastId });
    } catch (err: any) {
      // Surface the actual server error message for debugging
      const serverMsg = err.response?.data?.error ?? err.response?.data?.message ?? err.response?.data;
      toast.error(
        typeof serverMsg === 'string' ? serverMsg : `Save failed (HTTP ${err.response?.status ?? '?'})`,
        { id: toastId }
      );
      // Re-throw so the EditableVehicleNumber component knows it failed
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // handleToggleChallan — uses a separate updatingId so status badge doesn't
  //                        spin while only the checkbox is loading
  // ---------------------------------------------------------------------------
  async function handleToggleChallan(id: string, value: boolean) {
    setChallanUpdatingId(id);
    try {
      await axios.patch(`/api/violations/${id}`, { challan: value });
      setViolations((prev) => prev.map((v) => v.id === id ? { ...v, challan: value } as any : v));
      if (selectedViolation?.id === id) {
        setSelectedViolation((v) => v ? { ...v, challan: value } as any : v);
      }
      toast.success(value ? 'Challan issued ✓' : 'Challan revoked');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to update challan.');
    } finally {
      setChallanUpdatingId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  const handleLogout = async () => {
    const toastId = toast.loading('Signing out…');
    try {
      await axios.post('/api/auth/logout');
      toast.success('Signed out', { id: toastId });
      router.replace('/signin');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Sign out failed', { id: toastId });
    }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success('ID copied'); };

  const totalPages = Math.ceil(totalCount / limit);
  const SKELETON_COUNT = 8;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        .animate-\\[shimmer_1\\.4s_infinite\\] {
          background-size: 1200px 100%;
          animation: shimmer 1.4s infinite linear;
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 text-slate-800">

        {/* ── HEADER ── */}
        <header className="bg-blue-600 border-b border-blue-700 sticky top-0 z-40 shadow-sm">
          <div className="px-6 py-3.5 flex justify-between items-center">
            <h1 className="text-sm font-black text-white uppercase tracking-widest">{T.title}</h1>
            <div className="flex items-center gap-4">
              {/* Manual Fetch New button — no auto-polling */}
              <button
                onClick={() => fetchViolations(false, true)}
                disabled={isFetchingNew || isLoadingData}
                className="flex items-center gap-2 text-[10px] font-black text-blue-100 hover:text-white border border-blue-400/60 hover:border-white px-4 py-1.5 uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isFetchingNew
                  ? <><AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" /> {T.fetching}</>
                  : <>{T.fetchNew}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </>
                }
              </button>
              <button
                onClick={handleLogout}
                className="text-[10px] text-blue-100 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-all"
              >
                {T.signOut} <span>→</span>
              </button>
            </div>
          </div>
        </header>

        <main className="px-6 py-5">

          {/* ── STATS ── */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: T.stats.pending,  count: stats.pending,  color: 'text-orange-600', border: 'border-l-4 border-l-orange-400' },
              { label: T.stats.accepted, count: stats.accepted, color: 'text-emerald-600', border: 'border-l-4 border-l-emerald-400' },
              { label: T.stats.declined, count: stats.declined, color: 'text-rose-600',    border: 'border-l-4 border-l-rose-400' },
            ].map((s) => (
              <div key={s.label} className={`bg-white border border-blue-100 px-5 py-4 flex justify-between items-center shadow-sm ${s.border}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                <span className={`text-3xl font-black ${s.color}`}>{s.count}</span>
              </div>
            ))}
          </div>

          {/* ── SEARCH + FILTER ── */}
          <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center mb-4 gap-3 bg-white p-3.5 border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {T.activeRecords}{totalCount > 0 && ` (${totalCount})`}
              </h2>
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-blue-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-slate-50 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                {Object.entries(T.search.types).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <input
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (page === 1) fetchViolations(true); else setPage(1);
                  }
                }}
                placeholder={T.search.placeholder}
                className="border border-blue-100 px-3 py-2 text-[10px] focus:outline-none focus:border-blue-600 bg-white placeholder:text-slate-300 font-medium w-44"
              />
              <button
                disabled={isLoadingData}
                onClick={() => { if (page === 1) fetchViolations(true); else setPage(1); }}
                className="px-5 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
              >
                {isLoadingData && <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" />}
                {T.search.button}
              </button>
            </div>
          </div>

          {/* ── PAGINATION ── */}
          {totalPages > 1 && (
            <div className="mb-4 bg-white border border-blue-100 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {T.pagination.showing} {((page - 1) * limit) + 1}–{Math.min(page * limit, totalCount)} {T.pagination.of} {totalCount} {T.pagination.records}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1 || isLoadingData}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 border border-blue-100 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 disabled:opacity-40 transition-colors"
                >
                  {T.pagination.previous}
                </button>
                <PageJumper page={page} totalPages={totalPages} onJump={setPage} disabled={isLoadingData} />
                <button
                  disabled={page === totalPages || isLoadingData}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 border border-blue-100 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 disabled:opacity-40 transition-colors"
                >
                  {T.pagination.next}
                </button>
              </div>
            </div>
          )}

          {/* ── TABLE ── */}
          <div className="bg-white border border-blue-100 shadow-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-blue-100">
                  {[
                    T.table.num,
                    T.table.detectionTime,
                    T.table.location,
                    T.table.violationType,
                    T.table.trackId,
                    T.table.scene,
                    T.table.plate,
                    T.table.action,
                    T.table.vehicleNumber,
                    T.table.challan,
                  ].map((h, i) => (
                    <th key={i} className={`px-3 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest ${i === 7 ? 'text-right' : i === 9 ? 'text-center' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {isLoadingData
                  ? Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonRow key={i} cols={10} />)
                  : (
                    <>
                      {violations.slice(0, 25).map((v, i) => (
                        <ViolationRow
                          key={v.id}
                          violation={v}
                          rowIndex={i}
                          onSelect={setSelectedViolation}
                          onAccept={(id) => handleUpdateStatus(id, 'ACCEPTED')}
                          onDeclineWithReason={(id, reason) => handleUpdateStatus(id, 'DECLINED', reason)}
                          onUndo={(id) => handleUpdateStatus(id, 'PENDING')}
                          onSaveVehicleNumber={handleSaveVehicleNumber}
                          onToggleChallan={handleToggleChallan}
                          updatingId={updatingId}
                          challanUpdatingId={challanUpdatingId}
                        />
                      ))}

                      {/* Scroll sentinel for second batch */}
                      {violations.length > 25 && !showSecondBatch && (
                        <tr ref={batchRef}>
                          <td colSpan={10} className="py-5 text-center bg-slate-50/60">
                            <div className="flex items-center justify-center gap-2 text-slate-300 text-[9px] font-black uppercase tracking-widest">
                              <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin text-blue-400" />
                              Loading more…
                            </div>
                          </td>
                        </tr>
                      )}

                      {showSecondBatch && violations.slice(25).map((v, i) => (
                        <ViolationRow
                          key={v.id}
                          violation={v}
                          rowIndex={25 + i}
                          onSelect={setSelectedViolation}
                          onAccept={(id) => handleUpdateStatus(id, 'ACCEPTED')}
                          onDeclineWithReason={(id, reason) => handleUpdateStatus(id, 'DECLINED', reason)}
                          onUndo={(id) => handleUpdateStatus(id, 'PENDING')}
                          onSaveVehicleNumber={handleSaveVehicleNumber}
                          onToggleChallan={handleToggleChallan}
                          updatingId={updatingId}
                          challanUpdatingId={challanUpdatingId}
                        />
                      ))}
                    </>
                  )
                }
              </tbody>
            </table>

            {!isLoadingData && violations.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-slate-400 uppercase tracking-widest">{T.noRecords}</p>
              </div>
            )}
          </div>
        </main>

        {/* ── DETAIL MODAL ── */}
        {selectedViolation && (
          <div
            className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-md z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedViolation(null); }}
          >
            <div className="bg-white border border-blue-100 w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">

              {/* Modal Header */}
              <div className="px-7 py-4 border-b border-blue-50 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{T.modal.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-400">{selectedViolation.id}</span>
                    <button onClick={() => copyToClipboard(selectedViolation.id)} className="p-0.5 hover:bg-blue-100 rounded transition-colors" title={T.modal.copyId}>
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <button onClick={() => setSelectedViolation(null)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-all">
                  <span className="text-xl font-light">×</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-7">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                  {/* Images — full size in modal */}
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{T.modal.images.complete}</h4>
                      {loadingImages
                        ? <div className="w-full h-48 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-[shimmer_1.4s_infinite] border border-blue-50" />
                        : toImageSrc(extraImages?.complete_image)
                          ? <div className="border border-blue-50 overflow-hidden group rounded-sm">
                              <LazyImage src={toImageSrc(extraImages!.complete_image)!} alt="Scene" fullSize />
                            </div>
                          : <div className="w-full py-10 flex flex-col items-center gap-2 bg-slate-50 border border-dashed border-slate-200 text-[9px] text-slate-300 uppercase tracking-widest">No Image</div>
                      }
                    </div>
                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{T.modal.images.plate}</h4>
                      {loadingImages
                        ? <div className="w-full h-20 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-[shimmer_1.4s_infinite] border border-blue-50" />
                        : toImageSrc(extraImages?.plate_image)
                          ? <div className="border border-blue-50 overflow-hidden group rounded-sm">
                              <LazyImage src={toImageSrc(extraImages!.plate_image)!} alt="Plate" fullSize />
                            </div>
                          : <div className="w-full py-5 flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 text-[9px] text-slate-300 uppercase tracking-widest">No Plate Image</div>
                      }
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-7 gap-y-6">
                    {[
                      { label: T.modal.trackId,      value: selectedViolation.track_id },
                      { label: T.modal.vehicleNumber, value: selectedViolation.vehicle_number, mono: true, blue: true },
                      { label: T.modal.location,      value: selectedViolation.location,       upper: true },
                      { label: T.modal.dateFolder,    value: selectedViolation.date_folder,    mono: true },
                      { label: T.modal.violationType, value: selectedViolation.helmet_status || 'DETECTION', blue: true },
                    ].map(({ label, value, mono, blue, upper }) => (
                      <div key={label}>
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</h4>
                        <p className={`text-[12px] font-semibold ${blue ? 'text-blue-700' : 'text-slate-700'} ${mono ? 'font-mono' : ''} ${upper ? 'uppercase' : ''}`}>
                          {value || '—'}
                        </p>
                      </div>
                    ))}

                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{T.modal.detectionTime}</h4>
                      <p className="text-[12px] font-semibold text-slate-700">
                        {selectedViolation.detected_at
                          ? new Date(selectedViolation.detected_at).toLocaleString('en-IN', {
                              day: '2-digit', month: 'long', year: 'numeric',
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })
                          : '—'}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{T.modal.status}</h4>
                      <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-1 border ${
                        selectedViolation.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        selectedViolation.status === 'DECLINED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                        {selectedViolation.status === 'ACCEPTED' ? T.status.approved :
                         selectedViolation.status === 'DECLINED' ? T.status.rejected :
                         T.status.pending}
                      </span>
                    </div>

                    {selectedViolation.reason && (
                      <div className="col-span-2">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{T.modal.reason}</h4>
                        <p className="text-[12px] font-semibold text-slate-600 italic bg-slate-50 p-3 border-l-2 border-slate-200">
                          "{selectedViolation.reason}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-7 py-4 border-t border-blue-50 bg-slate-50/50 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedViolation(null)}
                  className="px-7 py-2.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm"
                >
                  {T.modal.close}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}