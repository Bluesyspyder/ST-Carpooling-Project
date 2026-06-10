import { useEffect, useRef } from 'react';

/**
 * Dual-location Leaflet map — shows both pickup (A) and destination (B) as
 * static (non-draggable) markers and auto-fits bounds to include both.
 *
 * This is a read-only preview used wherever both confirmed locations need to
 * be displayed together WITHOUT a route polyline.
 * For route display use <RouteMap /> instead.
 *
 * Props:
 *   pickup       – { address, latitude, longitude }
 *   destination  – { address, latitude, longitude }
 *   height       – CSS string (default '300px')
 *   className    – extra wrapper classes
 */
const LocationConfirmationMap = ({
  pickup,
  destination,
  height = '300px',
  className = '',
}) => {
  const mapRef      = useRef(null);
  const leafletRef  = useRef(null);
  const isMounted   = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const init = async () => {
      if (!mapRef.current) return;
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }

      const hasPickup = pickup?.latitude && pickup?.longitude;
      const hasDest   = destination?.latitude && destination?.longitude;
      if (!hasPickup && !hasDest) return;

      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!isMounted.current) return;

      const defaultCenter = hasPickup
        ? [pickup.latitude, pickup.longitude]
        : [destination.latitude, destination.longitude];

      leafletRef.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView(defaultCenter, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      }).addTo(leafletRef.current);

      const makePin = (color, letter) =>
        L.divIcon({
          className: '',
          html: `<div style="
            display:flex;align-items:center;justify-content:center;
            width:32px;height:32px;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            background:${color};
            color:#fff;border:2px solid rgba(255,255,255,0.9);
            font-weight:700;font-size:13px;
            box-shadow:0 3px 8px rgba(0,0,0,.4)
          "><span style="transform:rotate(45deg)">${letter}</span></div>`,
          iconAnchor: [16, 32],
        });

      const pickupIcon = makePin('#10b981', 'A');
      const destIcon   = makePin('#6366f1', 'B');

      if (hasPickup) {
        L.marker([pickup.latitude, pickup.longitude], { icon: pickupIcon })
          .addTo(leafletRef.current)
          .bindPopup(`<b>Pickup</b><br>${pickup.address || ''}`, { maxWidth: 220 });
      }

      if (hasDest) {
        L.marker([destination.latitude, destination.longitude], { icon: destIcon })
          .addTo(leafletRef.current)
          .bindPopup(`<b>Destination</b><br>${destination.address || ''}`, { maxWidth: 220 });
      }

      // Fit both markers
      if (hasPickup && hasDest) {
        const bounds = L.latLngBounds(
          [pickup.latitude,      pickup.longitude],
          [destination.latitude, destination.longitude]
        );
        leafletRef.current.fitBounds(bounds, { padding: [48, 48] });
      }
    };

    init();

    return () => {
      isMounted.current = false;
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [
    pickup?.latitude,      pickup?.longitude,
    destination?.latitude, destination?.longitude,
  ]);

  const hasPickup = pickup?.latitude && pickup?.longitude;
  const hasDest   = destination?.latitude && destination?.longitude;

  if (!hasPickup && !hasDest) return null;

  return (
    <div className={`rounded-xl overflow-hidden border border-slate-700/60 shadow-lg ${className}`}>
      <div ref={mapRef} style={{ height }} className="w-full bg-slate-900" />

      {/* Legend */}
      <div className="bg-slate-900/80 border-t border-slate-700/50 px-4 py-2.5 flex items-center gap-5">
        {hasPickup && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="truncate max-w-44">{pickup.address?.split(',')[0] || 'Pickup'}</span>
          </div>
        )}
        {hasDest && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-3 h-3 rounded-full bg-indigo-500 flex-shrink-0" />
            <span className="truncate max-w-44">{destination.address?.split(',')[0] || 'Destination'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationConfirmationMap;
