"use client";

/**
 * Horizontal snap-scroll row with peek-preview spacing, for card carousels
 * (nearby rides, vehicle cards) inspired by the banking/coffee-app reference mockups.
 */
const HorizontalScroll = ({ children, className = '' }) => (
  <div
    className={`flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${className}`}
  >
    {children}
  </div>
);

export default HorizontalScroll;
