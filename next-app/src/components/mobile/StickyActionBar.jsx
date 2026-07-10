"use client";

/**
 * Fixed-to-bottom full-width action bar, sitting above MobileNav (where present)
 * and respecting the device safe-area inset.
 */
const StickyActionBar = ({ children, aboveNav = true }) => (
  <div
    className={`lg:hidden fixed left-0 right-0 z-[9998] px-4 py-3 bg-[var(--bg-base)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] ${aboveNav ? 'bottom-16' : 'bottom-0'}`}
    style={{ paddingBottom: aboveNav ? '0.75rem' : 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
  >
    <div className="flex items-center gap-3">{children}</div>
  </div>
);

export default StickyActionBar;
