"use client";

import Link from 'next/link';

/**
 * Rounded icon-in-box tile with a label underneath. Used for quick-action /
 * category grids, matching the icon-tile dashboard pattern from the reference mockups.
 */
export const IconTile = ({ href, onClick, icon, label, badge }) => {
  const content = (
    <div className="relative flex flex-col items-center justify-center gap-2 w-full min-h-[72px] p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] active:scale-95 transition-transform">
      {badge != null && (
        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[var(--primary-base)] text-white text-[10px] font-bold">
          {badge}
        </span>
      )}
      <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--primary-base)]/10 text-[var(--primary-base)]">
        {icon}
      </div>
      <span className="text-xs font-semibold text-[var(--text-primary)] text-center leading-tight">{label}</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="min-h-[44px]">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="min-h-[44px] w-full">
      {content}
    </button>
  );
};

const IconTileGrid = ({ columns = 4, children }) => (
  <div
    className="grid gap-3"
    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
  >
    {children}
  </div>
);

export default IconTileGrid;
