"use client";

import { ChevronRight } from 'lucide-react';

/**
 * Leading icon, title (+ optional subtitle), trailing chevron/action —
 * banking-app style settings/account list row. Optionally expands in place.
 */
const SettingsRow = ({ icon, title, subtitle, expanded, onToggle, trailing, children }) => {
  const isExpandable = typeof onToggle === 'function';

  return (
    <div className="border-b border-[var(--border-subtle)] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        disabled={!isExpandable}
        className="w-full min-h-[56px] flex items-center gap-3 py-3 text-left disabled:cursor-default"
      >
        {icon && (
          <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-[var(--primary-base)]/10 text-[var(--primary-base)]">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</p>
          {subtitle && <p className="text-xs text-[var(--text-secondary)] truncate">{subtitle}</p>}
        </div>
        {trailing}
        {isExpandable && (
          <ChevronRight
            className={`w-5 h-5 text-[var(--text-muted)] flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        )}
      </button>
      {isExpandable && expanded && (
        <div className="pb-4 pl-[3.25rem]">{children}</div>
      )}
    </div>
  );
};

export default SettingsRow;
