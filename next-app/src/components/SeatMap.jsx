'use client';

/**
 * SeatMap — a top-down, RedBus-style car seat picker.
 *
 * Two modes:
 *   - mode="offer" (create-ride): the driver taps seats to OFFER. Selected =
 *     offered (green). Nothing is "booked" yet.
 *   - mode="book"  (ride-details): the passenger taps AVAILABLE seats to select.
 *     Booked seats render red/disabled; seats the ride doesn't offer are faded.
 *
 * The layout comes from `generateSeatLayout(seatCount)` so the driver-side and
 * passenger-side maps are always identical.
 *
 * Props:
 *   layout          Array<Array<{ id, type }>>  — from generateSeatLayout()
 *   selectedSeatIds string[]                     — currently selected (controlled)
 *   onToggleSeat    (id: string) => void
 *   bookedSeatIds   string[]                      — taken seats (book mode)
 *   offeredSeatIds  string[] | null              — seats this ride offers (book mode);
 *                                                  null/empty = treat all as offered
 *   mode            'offer' | 'book'              — default 'book'
 *   maxSelectable   number | null                — cap selections (null = uncapped)
 */
export default function SeatMap({
  layout = [],
  selectedSeatIds = [],
  onToggleSeat,
  bookedSeatIds = [],
  offeredSeatIds = null,
  mode = 'book',
  maxSelectable = null,
}) {
  const selected = new Set(selectedSeatIds);
  const booked = new Set(bookedSeatIds);
  const offered = offeredSeatIds && offeredSeatIds.length > 0 ? new Set(offeredSeatIds) : null;

  const atLimit =
    maxSelectable != null && selected.size >= maxSelectable;

  /** Resolve a seat's interaction state. */
  const seatState = (id) => {
    if (selected.has(id)) return 'selected';
    if (mode === 'book') {
      if (booked.has(id)) return 'booked';
      if (offered && !offered.has(id)) return 'unavailable';
    }
    return 'available';
  };

  const seatClasses = (state, disabled) => {
    const base =
      'relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-lg border text-xs font-semibold transition-all select-none';
    switch (state) {
      case 'selected':
        return `${base} bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105`;
      case 'booked':
        return `${base} bg-red-500/15 border-red-500/40 text-red-400 cursor-not-allowed`;
      case 'unavailable':
        return `${base} border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] opacity-40 cursor-not-allowed`;
      default: // available
        return `${base} border-[var(--border-subtle)] text-[var(--text-secondary)] bg-[var(--bg-card)] ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-[var(--primary-base)] hover:text-[var(--text-primary)] cursor-pointer'
        }`;
    }
  };

  const handleClick = (id, state) => {
    if (!onToggleSeat) return;
    if (state === 'booked' || state === 'unavailable') return;
    // Block selecting a new seat past the cap (deselecting is always allowed).
    if (state === 'available' && atLimit) return;
    onToggleSeat(id);
  };

  return (
    <div className="space-y-4">
      {/* Car body */}
      <div className="mx-auto max-w-[240px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
        {/* Windshield / front hint */}
        <div className="mb-3 flex justify-center">
          <div className="h-1.5 w-16 rounded-full bg-[var(--border-subtle)]" aria-hidden />
        </div>

        <div className="space-y-2.5">
          {layout.map((row, rowIdx) => (
            <div key={rowIdx} className="flex justify-center gap-2.5">
              {row.map((cell) => {
                if (cell.type === 'driver') {
                  return (
                    <div
                      key={cell.id}
                      title="Driver"
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)] sm:h-12 sm:w-12"
                    >
                      <SteeringWheelIcon />
                    </div>
                  );
                }
                const state = seatState(cell.id);
                const disabled = state === 'available' && atLimit;
                return (
                  <button
                    key={cell.id}
                    type="button"
                    aria-pressed={state === 'selected'}
                    aria-label={`Seat ${cell.id}${
                      state === 'booked' ? ' (booked)' : state === 'unavailable' ? ' (not offered)' : ''
                    }`}
                    disabled={state === 'booked' || state === 'unavailable'}
                    onClick={() => handleClick(cell.id, state)}
                    className={seatClasses(state, disabled)}
                  >
                    {cell.id}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[var(--text-secondary)]">
        <LegendSwatch className="border-[var(--border-subtle)] bg-[var(--bg-card)]" label={mode === 'offer' ? 'Not offered' : 'Available'} />
        <LegendSwatch className="border-emerald-500 bg-emerald-500" label={mode === 'offer' ? 'Offered' : 'Selected'} />
        {mode === 'book' && (
          <LegendSwatch className="border-red-500/40 bg-red-500/15" label="Booked" />
        )}
      </div>
    </div>
  );
}

function LegendSwatch({ className, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3.5 w-3.5 rounded border ${className}`} aria-hidden />
      {label}
    </span>
  );
}

function SteeringWheelIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 14.2V21M4.5 8.5l5.6 3.2M19.5 8.5l-5.6 3.2" />
    </svg>
  );
}
