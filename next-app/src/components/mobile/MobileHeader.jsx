"use client";

/**
 * Home-screen style header: avatar/greeting on the left, one or two icon buttons on the right.
 * Structural pattern from the coffee-app/dashboard reference mockups.
 */
const MobileHeader = ({ title, subtitle, avatar, actions }) => {
  return (
    <div className="flex items-center justify-between gap-3 safe-top">
      <div className="flex items-center gap-3 min-w-0">
        {avatar && (
          <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border border-[var(--border-subtle)]">
            {avatar}
          </div>
        )}
        <div className="min-w-0">
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] truncate">{subtitle}</p>
          )}
          {title && (
            <h1 className="text-lg font-bold text-[var(--text-primary)] truncate">{title}</h1>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
};

export default MobileHeader;
