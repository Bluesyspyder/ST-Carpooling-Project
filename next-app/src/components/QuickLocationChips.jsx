"use client";
import { useEffect, useRef } from 'react';

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

/**
 * Horizontal scrollable row of quick-select location chips.
 *
 * Props:
 *  savedAddresses     – array of { _id, label, icon, address, latitude, longitude }
 *  recentAddresses    – array of { address, latitude, longitude, lastUsedAt }
 *  frequentAddresses  – array of { address, latitude, longitude, useCount }
 *  onSelect           – fn({ address, latitude, longitude })
 *  showCurrentLocation – bool
 *  onCurrentLocation  – fn()
 */
const QuickLocationChips = ({
  savedAddresses = [],
  recentAddresses = [],
  frequentAddresses = [],
  onSelect,
  showCurrentLocation = false,
  onCurrentLocation,
}) => {
  const scrollRef = useRef(null);

  const top5Recent = recentAddresses.slice(0, 5);
  const top5Frequent = frequentAddresses.slice(0, 5);
  const hasAny = savedAddresses.length > 0 || top5Recent.length > 0 || top5Frequent.length > 0 || showCurrentLocation;

  if (!hasAny) return null;

  return (
    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent pb-1" ref={scrollRef}>
      <div className="flex gap-2 min-w-max">
        {/* Current Location */}
        {showCurrentLocation && (
          <button
            onClick={onCurrentLocation}
            className="flex items-center gap-1.5 bg-violet-600/20 border border-violet-500/30 hover:border-violet-500/60 text-violet-300 rounded-lg px-2.5 py-1.5 text-xs transition-all whitespace-nowrap"
          >
            <span>📍</span>
            <span>Current Location</span>
          </button>
        )}

        {/* Saved */}
        {savedAddresses.map((addr) => (
          <button
            key={addr._id}
            onClick={() => onSelect({ address: addr.address, latitude: addr.latitude, longitude: addr.longitude })}
            className="flex items-center gap-1.5 bg-slate-700/60 border border-[var(--border-hover)]/40 hover:border-slate-500 text-[var(--text-primary)] rounded-lg px-2.5 py-1.5 text-xs transition-all whitespace-nowrap"
          >
            <span>{addr.icon || '⭐'}</span>
            <span>{addr.label}</span>
          </button>
        ))}

        {/* Separator */}
        {savedAddresses.length > 0 && top5Recent.length > 0 && (
          <div className="w-px bg-slate-600/50 mx-1 self-stretch" />
        )}

        {/* Recent */}
        {top5Recent.map((addr, i) => {
          const label = addr.address?.split(',')[0]?.trim() || 'Recent';
          return (
            <button
              key={i}
              onClick={() => onSelect({ address: addr.address, latitude: addr.latitude, longitude: addr.longitude })}
              className="flex flex-col items-start bg-slate-700/40 border border-[var(--border-hover)]/30 hover:border-slate-500 text-[var(--text-primary)] rounded-lg px-2.5 py-1.5 text-[10px] transition-all whitespace-nowrap"
            >
              <span className="font-medium text-xs text-[var(--text-primary)] truncate max-w-28">{label}</span>
              <span className="text-[var(--text-muted)]">{timeAgo(addr.lastUsedAt)}</span>
            </button>
          );
        })}

        {/* Frequent */}
        {top5Frequent.map((addr, i) => {
          const label = addr.address?.split(',')[0]?.trim() || 'Frequent';
          return (
            <button
              key={`freq-${i}`}
              onClick={() => onSelect({ address: addr.address, latitude: addr.latitude, longitude: addr.longitude })}
              className="flex flex-col items-start bg-slate-700/40 border border-yellow-500/20 hover:border-yellow-500/50 text-[var(--text-primary)] rounded-lg px-2.5 py-1.5 text-[10px] transition-all whitespace-nowrap"
            >
              <span className="font-medium text-xs text-[var(--text-primary)] truncate max-w-28">{label}</span>
              <span className="text-yellow-500/70">Used {addr.useCount}×</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickLocationChips;
