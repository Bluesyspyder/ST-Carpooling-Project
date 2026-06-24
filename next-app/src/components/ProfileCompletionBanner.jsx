"use client";
import Link from 'next/link';
import { useMemo } from 'react';

import { useAuth } from '@/hooks/useAuth';

/**
 * useProfileCompletion — computes which profile fields are missing.
 *
 * Required fields (from Phase 8 spec):
 *   ✓ Name (firstName + lastName)
 *   ✓ ST Email Verified
 *   ✓ Phone Number
 *   ✓ Profile Picture
 *   ✓ Home Location Verified
 *
 * For hybrid (Rider) users:
 *   + Vehicle registered
 */
export const useProfileCompletion = () => {
  const { user } = useAuth();

  const checklist = useMemo(() => {
    if (!user) return [];

    return [
      {
        key: 'name',
        label: 'Full name set',
        done: !!(user.firstName?.trim() && user.lastName?.trim()),
      },
      {
        key: 'email',
        label: 'ST Email verified',
        done: !!user.isEmailVerified,
      },
      {
        key: 'phone',
        label: 'Phone number added',
        done: !!user.phone?.trim(),
      },
      {
        key: 'photo',
        label: 'Profile photo uploaded',
        done: !!user.profileImage,
      },
      {
        key: 'homeLocation',
        label: 'Home location verified',
        done: !!user.homeLocation?.verified,
      },
    ];
  }, [user]);

  const completedCount = checklist.filter((c) => c.done).length;
  const totalCount     = checklist.length;
  const percentage     = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;
  const isComplete     = completedCount === totalCount;
  const missing        = checklist.filter((c) => !c.done);

  return { checklist, completedCount, totalCount, percentage, isComplete, missing };
};

/**
 * ProfileCompletionBanner — shows a completion progress bar + missing items.
 * Displayed at the top of the Dashboard and Profile pages.
 *
 * @param {boolean} compact - If true, only shows a slim bar without detailed checklist.
 */
const ProfileCompletionBanner = ({ compact = false }) => {
  const { checklist, completedCount, totalCount, percentage, isComplete, missing } = useProfileCompletion();

  if (isComplete) return null;

  if (compact) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-secondary)] font-semibold">Profile {percentage}% complete</span>
            <Link href="/profile" className="text-[var(--primary-base)] hover:text-[var(--primary-hover)] font-bold transition">Complete →</Link>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--primary-hover)] to-[var(--primary-base)] rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-4 shadow-lg shadow-[var(--border-glow)]/10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--primary-base)] flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--primary-base)] rounded-full animate-pulse" />
            Complete Your Profile
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {completedCount}/{totalCount} steps done — {missing.length} remaining
          </p>
        </div>
        <span className="text-lg font-extrabold text-[var(--primary-base)]">{percentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--primary-hover)] to-[var(--primary-base)] rounded-full transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Checklist */}
      <div className="grid sm:grid-cols-2 gap-2">
        {checklist.map((item) => (
          <div
            key={item.key}
            className={`flex items-center gap-2.5 text-xs px-3 py-2 rounded-lg border transition ${
              item.done
                ? 'border-emerald-500/20 bg-emerald-950/20 text-emerald-400'
                : 'border-slate-700/50 bg-slate-900/30 text-slate-400'
            }`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
              item.done ? 'bg-emerald-500' : 'border border-slate-600'
            }`}>
              {item.done && (
                <svg className="w-2.5 h-2.5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            {item.label}
          </div>
        ))}
      </div>

      <Link
        href="/profile"
        className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary-base)] hover:text-[var(--primary-hover)] transition"
      >
        Go to Profile →
      </Link>
    </div>
  );
};

export default ProfileCompletionBanner;
