"use client";

/**
 * Rounded full-width pill input with an optional leading icon slot,
 * matching the auth/search pill-input pattern from the reference mockups.
 */
const PillInput = ({ icon, trailing, className = '', ...inputProps }) => (
  <div
    className={`flex items-center gap-2 w-full min-h-[48px] px-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus-within:border-[var(--primary-base)] focus-within:shadow-[0_0_0_2px_var(--border-glow)] transition-all ${className}`}
  >
    {icon && <span className="text-[var(--text-secondary)] flex-shrink-0">{icon}</span>}
    <input
      className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] py-3"
      {...inputProps}
    />
    {trailing && <span className="text-[var(--text-secondary)] flex-shrink-0">{trailing}</span>}
  </div>
);

export default PillInput;
