"use client";
/**
 * Read-only panel showing top 5 frequently used locations.
 *
 * Props:
 *  frequentAddresses – array of { address, latitude, longitude, useCount, lastUsedAt }
 *  savedAddresses    – array of saved addresses (to match icons)
 */
const LocationInsights = ({ frequentAddresses = [], savedAddresses = [] }) => {
  const top5 = [...frequentAddresses]
    .sort((a, b) => b.useCount - a.useCount || new Date(b.lastUsedAt) - new Date(a.lastUsedAt))
    .slice(0, 5);

  if (top5.length === 0) return null;

  const getIcon = (addr) => {
    const match = savedAddresses.find(
      (s) =>
        Math.abs(s.latitude - addr.latitude) < 0.001 &&
        Math.abs(s.longitude - addr.longitude) < 0.001
    );
    return match?.icon || '📍';
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
      <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
        <span>🔥</span> Most Used Locations
      </h3>
      <div className="space-y-3">
        {top5.map((addr, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl flex-shrink-0">{getIcon(addr)}</span>
              <div className="min-w-0">
                <p className="text-slate-200 text-sm font-medium truncate">{addr.address}</p>
                <p className="text-slate-500 text-xs">{timeAgo(addr.lastUsedAt)}</p>
              </div>
            </div>
            <span className="text-violet-400 text-xs font-medium bg-violet-500/10 px-2 py-1 rounded-full flex-shrink-0 ml-3">
              {addr.useCount}×
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocationInsights;
