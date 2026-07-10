"use client";

/**
 * Dashed-divider "ticket" style card for confirmed bookings/status items,
 * inspired by the banking-app loyalty/QR ticket cards in the reference mockups.
 */
const TicketCard = ({ statusBadge, header, body, footer, onClick, href }) => {
  const Wrapper = href ? 'a' : 'div';

  return (
    <Wrapper
      href={href}
      onClick={onClick}
      className="block glass-panel overflow-hidden min-h-[44px] active:scale-[0.99] transition-transform"
    >
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{header}</div>
        {statusBadge}
      </div>
      <div className="relative px-4">
        <div className="border-t border-dashed border-[var(--border-subtle)]" />
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--bg-base)]" />
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--bg-base)]" />
      </div>
      <div className="p-4 pt-3">{body}</div>
      {footer && (
        <div className="px-4 pb-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          {footer}
        </div>
      )}
    </Wrapper>
  );
};

export default TicketCard;
