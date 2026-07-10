"use client";
import { useMemo, useState } from 'react';
import Link from 'next/link';

/**
 * Lightweight month-grid ride calendar built on native Date — no calendar library dependency.
 * Marks days that have an upcoming booking (as passenger) or driving ride (as driver).
 */
const RideCalendar = ({ bookings = [], drivingRides = [] }) => {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState(null);

  const dayKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };

  const eventsByDay = useMemo(() => {
    const map = new Map();
    const add = (item, type) => {
      const rideDate = type === 'booking' ? item.ride?.journeyDate : item.journeyDate;
      if (!rideDate) return;
      const key = dayKey(rideDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ type, item });
    };
    bookings.forEach((b) => add(b, 'booking'));
    drivingRides.forEach((r) => add(r, 'driving'));
    return map;
  }, [bookings, drivingRides]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedEvents = selectedKey ? eventsByDay.get(selectedKey) || [] : [];

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const changeMonth = (delta) => {
    setCursor(new Date(year, month + delta, 1));
    setSelectedKey(null);
  };

  return (
    <div className="glass-panel p-5 border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-[var(--text-primary)] uppercase tracking-widest text-sm flex items-center gap-2">
          <span className="w-1.5 h-6 rounded bg-emerald-400 block" />
          Ride Calendar
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition text-xs">‹</button>
          <span className="text-xs font-semibold text-[var(--text-secondary)] w-24 text-center">{monthLabel}</span>
          <button onClick={() => changeMonth(1)} className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition text-xs">›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] font-bold text-[var(--text-muted)] uppercase text-center py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = `${year}-${month}-${day}`;
          const hasEvents = eventsByDay.has(key);
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const isSelected = selectedKey === key;
          return (
            <button
              key={i}
              onClick={() => hasEvents && setSelectedKey(isSelected ? null : key)}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors ${
                isSelected
                  ? 'bg-[var(--primary-base)]/20 text-[var(--primary-base)] font-bold'
                  : isToday
                  ? 'border border-[var(--primary-base)]/40 text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
              } ${hasEvents ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span>{day}</span>
              {hasEvents && <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />}
            </button>
          );
        })}
      </div>

      {selectedEvents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-2">
          {selectedEvents.map(({ type, item }, i) => {
            const ride = type === 'booking' ? item.ride : item;
            if (!ride) return null;
            return (
              <Link
                key={i}
                href={`/ride-details?id=${ride._id}`}
                className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors text-xs"
              >
                <div className="min-w-0">
                  <p className="text-[var(--text-primary)] font-semibold truncate">
                    {ride.pickupLocation?.address?.split(',')[0]} → {ride.destinationLocation?.address?.split(',')[0]}
                  </p>
                  <p className="text-[var(--text-muted)]">{ride.journeyTime} · {type === 'driving' ? 'Driving' : 'Riding'}</p>
                </div>
                <span className="text-[var(--text-muted)] flex-shrink-0">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RideCalendar;
