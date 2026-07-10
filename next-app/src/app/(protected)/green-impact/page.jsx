"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

import api from '@/services/api';
import IconTileGrid, { IconTile } from '@/components/mobile/IconTileGrid';

const BADGE_TIERS = ['Beginner', 'Eco Rider', 'Green Champion', 'Climate Hero', 'Eco Legend'];

const GreenImpactPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImpact = async () => {
      setLoading(true);
      try {
        const res = await api.get('/users/me/green-impact');
        setData(res.data.data);
      } catch (err) {
        console.error('Failed to load green impact:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchImpact();
  }, []);

  const StatCard = ({ title, value, icon, colorClass }) => (
    <div className="glass-panel p-6 border border-[var(--border-subtle)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">{title}</span>
        <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${colorClass}`}>{icon}</div>
      </div>
      <div className="w-full h-px bg-[var(--border-subtle)] mb-4"></div>
      <div className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{value}</div>
    </div>
  );

  const badgeIndex = data ? BADGE_TIERS.indexOf(data.greenBadge) : 0;
  const progressPct = data && data.nextBadge
    ? Math.max(0, Math.min(100, 100 - (data.creditsToNextBadge / Math.max(data.greenCredits + data.creditsToNextBadge, 1)) * 100))
    : 100;

  return (
    <>
    {/* ═══════════ DESKTOP / BROWSER LAYOUT (unchanged) ═══════════ */}
    <div className="hidden lg:block min-h-[calc(100vh-73px)] relative py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[1100px] mx-auto space-y-8">
        <div className="glass-panel p-6 sm:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden border-none bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-1">Sustainability Module</p>
          <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            🌱 Green Impact
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mt-2">Track the carbon you've saved by sharing rides.</p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[var(--bg-surface)] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Hero: credits + progress */}
            <div className="glass-panel p-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">Current Badge</p>
                  <h3 className="text-4xl font-bold text-[var(--text-primary)]">{data.greenBadge}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1">Total Credits</p>
                  <p className="text-3xl font-bold text-emerald-400">{data.greenCredits}</p>
                </div>
              </div>
              {data.nextBadge ? (
                <>
                  <div className="w-full h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">
                    {data.creditsToNextBadge} more credits to reach <span className="text-emerald-400 font-semibold">{data.nextBadge}</span>
                  </p>
                </>
              ) : (
                <p className="text-xs text-emerald-400 font-semibold mt-2">🏆 You've reached the highest tier!</p>
              )}
            </div>

            {/* Stat tiles */}
            <div className="grid sm:grid-cols-3 gap-6">
              <StatCard
                title="CO2 Saved"
                value={`${data.totalCO2Saved.toFixed(1)} kg`}
                icon="🌍"
                colorClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              />
              <StatCard
                title="Shared Rides"
                value={data.sharedRides}
                icon="🚗"
                colorClass="bg-teal-500/10 text-teal-400 border border-teal-500/20"
              />
              <StatCard
                title="Trees Equivalent"
                value={(data.totalCO2Saved / 22).toFixed(1)}
                icon="🌳"
                colorClass="bg-green-500/10 text-green-400 border border-green-500/20"
              />
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              ← Back to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>

    {/* ═══════════ MOBILE LAYOUT ═══════════ */}
    <div className="lg:hidden min-h-[calc(100vh-73px)] relative py-5 px-4 space-y-5">
      <div>
        <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-1">Sustainability Module</p>
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">🌱 Green Impact</h2>
        <p className="text-[var(--text-secondary)] text-xs mt-1">Track the carbon you've saved by sharing rides.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-40 bg-[var(--bg-surface)] rounded-2xl animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-[var(--bg-surface)] rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Balance card */}
          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent relative overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">Total Credits</p>
            <p className="text-4xl font-bold text-[var(--text-primary)] tracking-tight mb-3">{data.greenCredits}</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">{data.greenBadge}</p>
            {data.nextBadge ? (
              <>
                <div className="w-full h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] mt-2">
                  {data.creditsToNextBadge} more credits to reach <span className="text-emerald-400 font-semibold">{data.nextBadge}</span>
                </p>
              </>
            ) : (
              <p className="text-[10px] text-emerald-400 font-semibold">🏆 You've reached the highest tier!</p>
            )}
          </div>

          {/* Stat tiles */}
          <IconTileGrid columns={3}>
            <IconTile icon="🌍" label={`${data.totalCO2Saved.toFixed(1)} kg CO2`} />
            <IconTile icon="🚗" label={`${data.sharedRides} Rides`} />
            <IconTile icon="🌳" label={`${(data.totalCO2Saved / 22).toFixed(1)} Trees`} />
          </IconTileGrid>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] min-h-[44px]"
          >
            ← Back to Dashboard
          </Link>
        </>
      )}
    </div>
    </>
  );
};

export default GreenImpactPage;
