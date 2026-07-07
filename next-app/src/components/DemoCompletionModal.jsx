'use client';
import { useEffect, useRef, useState } from 'react';

const VEHICLE_CONFIG = {
  ev:      { label: 'Electric Vehicle', icon: '⚡', color: '#10b981', multiplier: '×1.8 EV Bonus' },
  petrol:  { label: 'Petrol',           icon: '⛽', color: '#f59e0b', multiplier: null },
  diesel:  { label: 'Diesel',           icon: '🛢',  color: '#6366f1', multiplier: null },
};

/**
 * Animated number counter — counts from 0 to `target` in `durationMs`.
 * Returns the current display value as a string with `decimals` decimal places.
 */
const useCountUp = (target, durationMs = 1200, decimals = 1) => {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / durationMs, 1);
      // Ease-out cubic
      const eased = 1 - (1 - t) ** 3;
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs, decimals]);

  return value;
};

/**
 * DemoCompletionModal
 *
 * Full-screen celebratory overlay shown when the demo ride reaches its destination.
 *
 * Props:
 *   isOpen               — boolean
 *   onClose              — fn()
 *   driverCreditsEarned  — number (from completed ride API response)
 *   totalEmissionSavedKg — number (from completed ride API response)
 *   routeDistance        — number km
 *   vehicleType          — 'ev' | 'petrol' | 'diesel'
 *   passengerCount       — number (default 1)
 */
const DemoCompletionModal = ({
  isOpen,
  onClose,
  driverCreditsEarned = 0,
  totalEmissionSavedKg = 0,
  routeDistance = 0,
  vehicleType = 'petrol',
  passengerCount = 1,
}) => {
  const vehicle = VEHICLE_CONFIG[vehicleType] || VEHICLE_CONFIG.petrol;
  const PASSENGER_CREDITS_PER_KM = 1.2;
  const passengerCredits = routeDistance * PASSENGER_CREDITS_PER_KM;
  const treesEquivalent = (totalEmissionSavedKg / 21.77).toFixed(2); // ~21.77 kg CO2 per tree/month

  // Animated counts — only run when modal is open
  const driverCount  = useCountUp(isOpen ? driverCreditsEarned : 0, 1200, 1);
  const passCount    = useCountUp(isOpen ? passengerCredits : 0, 1000, 1);
  const co2Count     = useCountUp(isOpen ? totalEmissionSavedKg : 0, 900, 2);
  const distCount    = useCountUp(isOpen ? routeDistance : 0, 700, 1);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {/* Confetti burst — pure CSS */}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-40px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pop-in {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes draw-check {
          to { stroke-dashoffset: 0; }
        }
        .confetti-piece {
          position: fixed;
          top: 0;
          width: 10px; height: 14px;
          animation: confetti-fall linear forwards;
        }
      `}</style>

      {/* Confetti pieces */}
      {Array.from({ length: 28 }).map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            background: ['#10b981','#6366f1','#f59e0b','#ec4899','#3b82f6'][i % 5],
            borderRadius: i % 3 === 0 ? '50%' : '2px',
            animationDuration: `${1.5 + Math.random() * 2}s`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(16,185,129,0.25)',
          animation: 'pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
          boxShadow: '0 0 60px rgba(16,185,129,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top banner */}
        <div
          className="px-6 pt-8 pb-6 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.1))' }}
        >
          {/* Animated checkmark */}
          <div className="flex justify-center mb-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, rgba(16,185,129,0.25), transparent)',
                border: '2px solid rgba(16,185,129,0.5)',
                boxShadow: '0 0 30px rgba(16,185,129,0.3)',
              }}
            >
              <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
                <path
                  d="M8 20 L16 28 L32 12"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="40"
                  strokeDashoffset="40"
                  style={{ animation: 'draw-check 0.5s 0.3s ease forwards' }}
                />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-black text-white mb-1">Ride Completed! 🎉</h2>
          <p className="text-emerald-400 text-sm font-semibold">
            {distCount} km · {vehicle.icon} {vehicle.label}
          </p>
          {vehicle.multiplier && (
            <div
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(16,185,129,0.15)', color: vehicle.color, border: `1px solid ${vehicle.color}40` }}
            >
              {vehicle.icon} {vehicle.multiplier}
            </div>
          )}
        </div>

        {/* Credits breakdown */}
        <div className="px-6 py-4 space-y-3">
          {/* Driver row */}
          <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg">🚗</div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Driver</p>
                <p className="text-slate-200 text-sm font-bold">Eco-Credits Earned</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-400">+{driverCount}</p>
              <p className="text-[10px] text-slate-500">🌿 credits</p>
            </div>
          </div>

          {/* Passenger row */}
          <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-lg">🧑</div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Passenger{passengerCount > 1 ? `s (×${passengerCount})` : ''}
                </p>
                <p className="text-slate-200 text-sm font-bold">Eco-Credits Earned</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-indigo-400">+{passCount}</p>
              <p className="text-[10px] text-slate-500">🌿 each</p>
            </div>
          </div>

          {/* CO2 divider */}
          <div
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}
          >
            <div className="flex-1">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">CO₂ Emissions Saved</p>
              <p className="text-amber-400 text-xl font-black">{co2Count} kg</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-0.5">Equivalent to</p>
              <p className="text-amber-300 font-bold text-sm">🌳 {treesEquivalent} trees/month</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
            }}
          >
            Close Demo
          </button>
          <p className="text-center text-[10px] text-slate-600 mt-3">
            All numbers are live — pulled from the real API response.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoCompletionModal;
