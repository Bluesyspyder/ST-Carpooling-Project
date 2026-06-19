import { useEffect, useRef, useCallback, useState } from 'react';
import { fetchReverseGeocode } from '../services/locationService.js';

/**
 * UnifiedCreateRideMap
 * Dual-location Leaflet map preview with draggable markers for both pickup and destination.
 *
 * Props:
 *   pickup             – { address, latitude, longitude, verified }
 *   destination        – { address, latitude, longitude, verified }
 *   onPickupChange     – fn({ address, latitude, longitude })
 *   onDestChange       – fn({ address, latitude, longitude })
 *   onPickupConfirm    – fn()
 *   onPickupUnconfirm  – fn()
 *   onDestConfirm      – fn()
 *   onDestUnconfirm    – fn()
 *   height             – CSS string (default '420px')
 */
const UnifiedCreateRideMap = ({
  pickup,
  destination,
  onPickupChange,
  onDestChange,
  onPickupConfirm,
  onPickupUnconfirm,
  onDestConfirm,
  onDestUnconfirm,
  height = '420px',
}) => {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  const reversePickupTimer = useRef(null);
  const reverseDestTimer = useRef(null);
  const isMountedRef = useRef(true);

  const [pickupLoading, setPickupLoading] = useState(false);
  const [destLoading, setDestLoading] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeout(reversePickupTimer.current);
      clearTimeout(reverseDestTimer.current);
    };
  }, []);

  // ── Debounced Reverse Geocoding ──────────────────────────────────────────
  const handlePickupDragEnd = useCallback(
    async (newLat, newLng) => {
      onPickupChange?.({ ...pickup, latitude: newLat, longitude: newLng });

      clearTimeout(reversePickupTimer.current);
      setPickupLoading(true);
      reversePickupTimer.current = setTimeout(async () => {
        try {
          const result = await fetchReverseGeocode(newLat, newLng);
          if (isMountedRef.current && result?.address) {
            onPickupChange?.({ address: result.address, latitude: newLat, longitude: newLng });
          }
        } catch (error) {
          console.error('Failed to reverse geocode pickup location:', error);
        } finally {
          if (isMountedRef.current) setPickupLoading(false);
        }
      }, 400);
    },
    [pickup, onPickupChange]
  );

  const handleDestDragEnd = useCallback(
    async (newLat, newLng) => {
      onDestChange?.({ ...destination, latitude: newLat, longitude: newLng });

      clearTimeout(reverseDestTimer.current);
      setDestLoading(true);
      reverseDestTimer.current = setTimeout(async () => {
        try {
          const result = await fetchReverseGeocode(newLat, newLng);
          if (isMountedRef.current && result?.address) {
            onDestChange?.({ address: result.address, latitude: newLat, longitude: newLng });
          }
        } catch (error) {
          console.error('Failed to reverse geocode destination location:', error);
        } finally {
          if (isMountedRef.current) setDestLoading(false);
        }
      }, 400);
    },
    [destination, onDestChange]
  );

  // ── Build custom pin icons ───────────────────────────────────────────────
  const makePinIcon = useCallback((L, color, label, isVerified) =>
    L.divIcon({
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      html: `<div style="
        display:flex;align-items:center;justify-content:center;
        width:32px;height:32px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${isVerified ? '#10b981' : color};
        color:#fff;border:2px solid rgba(255,255,255,0.9);
        font-weight:700;font-size:12px;
        box-shadow:0 4px 10px rgba(0,0,0,0.45);
        transition:transform 0.15s ease;
        cursor: pointer;
      "><span style="transform:rotate(45deg);line-height:1">${isVerified ? '✓' : label}</span></div>`,
    }),
    []
  );

  // ── Initialise / update map ─────────────────────────────────────────────
  useEffect(() => {
    const hasPickup = pickup?.latitude && pickup?.longitude;
    const hasDest = destination?.latitude && destination?.longitude;

    if (!hasPickup && !hasDest) return;

    const init = async () => {
      try {
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');

        if (!isMountedRef.current) return;

        const defaultCenter = hasPickup
          ? [pickup.latitude, pickup.longitude]
          : [destination.latitude, destination.longitude];

        // 1. Initialize Map
        if (!leafletMapRef.current && mapRef.current) {
          leafletMapRef.current = L
            .map(mapRef.current, { zoomControl: true, scrollWheelZoom: false })
            .setView(defaultCenter, 13);

          L.tileLayer(`https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/{z}/{x}/{y}.png?api_key=${import.meta.env.VITE_OLA_MAPS_API_KEY}`, {
            attribution: '© Ola Maps',
          }).addTo(leafletMapRef.current);
        }

        const map = leafletMapRef.current;
        if (!map) return;

        // 2. Setup Pickup Marker
        if (hasPickup) {
          const pickupIcon = makePinIcon(L, '#10b981', 'A', pickup.verified);
          if (pickupMarkerRef.current) {
            pickupMarkerRef.current.setLatLng([pickup.latitude, pickup.longitude]);
            pickupMarkerRef.current.setIcon(pickupIcon);
            if (!pickup.verified) pickupMarkerRef.current.dragging?.enable();
            else pickupMarkerRef.current.dragging?.disable();
          } else {
            pickupMarkerRef.current = L.marker([pickup.latitude, pickup.longitude], {
              draggable: !pickup.verified,
              icon: pickupIcon,
              autoPan: true,
              riseOnHover: true,
            }).addTo(map);

            pickupMarkerRef.current.on('dragstart', () => {
              map.dragging.disable();
            });

            pickupMarkerRef.current.on('dragend', (e) => {
              map.dragging.enable();
              const { lat: nLat, lng: nLng } = e.target.getLatLng();
              handlePickupDragEnd(nLat, nLng);
            });
          }
        } else {
          if (pickupMarkerRef.current) {
            pickupMarkerRef.current.remove();
            pickupMarkerRef.current = null;
          }
        }

        // 3. Setup Destination Marker
        if (hasDest) {
          const destIcon = makePinIcon(L, '#6366f1', 'B', destination.verified);
          if (destMarkerRef.current) {
            destMarkerRef.current.setLatLng([destination.latitude, destination.longitude]);
            destMarkerRef.current.setIcon(destIcon);
            if (!destination.verified) destMarkerRef.current.dragging?.enable();
            else destMarkerRef.current.dragging?.disable();
          } else {
            destMarkerRef.current = L.marker([destination.latitude, destination.longitude], {
              draggable: !destination.verified,
              icon: destIcon,
              autoPan: true,
              riseOnHover: true,
            }).addTo(map);

            destMarkerRef.current.on('dragstart', () => {
              map.dragging.disable();
            });

            destMarkerRef.current.on('dragend', (e) => {
              map.dragging.enable();
              const { lat: nLat, lng: nLng } = e.target.getLatLng();
              handleDestDragEnd(nLat, nLng);
            });
          }
        } else {
          if (destMarkerRef.current) {
            destMarkerRef.current.remove();
            destMarkerRef.current = null;
          }
        }

        // 4. Fit Bounds if both present
        if (hasPickup && hasDest) {
          const bounds = L.latLngBounds(
            [pickup.latitude, pickup.longitude],
            [destination.latitude, destination.longitude]
          );
          map.fitBounds(bounds, { padding: [50, 50] });
        } else {
          const singleCenter = hasPickup
            ? [pickup.latitude, pickup.longitude]
            : [destination.latitude, destination.longitude];
          map.setView(singleCenter, 14);
        }
      } catch (error) {
        console.error('Failed to initialize Leaflet map in UnifiedCreateRideMap:', error);
      }
    };

    init();

    return () => {
      // Clean up markers on unmount/re-effect
      // We don't remove the map container itself to prevent flickering on quick updates
    };
  }, [
    pickup?.latitude,
    pickup?.longitude,
    pickup?.verified,
    destination?.latitude,
    destination?.longitude,
    destination?.verified,
    makePinIcon,
    handlePickupDragEnd,
    handleDestDragEnd,
  ]);

  // Clean up whole map on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        pickupMarkerRef.current = null;
        destMarkerRef.current = null;
      }
    };
  }, []);

  const hasPickup = pickup?.latitude && pickup?.longitude;
  const hasDest = destination?.latitude && destination?.longitude;

  if (!hasPickup && !hasDest) {
    return (
      <div
        style={{ height }}
        className="bg-slate-800/60 rounded-xl border border-dashed border-slate-600/50 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm"
      >
        <span className="text-3xl opacity-40">🗺️</span>
        <span>Map preview appears after entering locations</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-600/50 shadow-lg">
      <div ref={mapRef} style={{ height }} className="w-full bg-slate-900" />

      {/* Verification control footer */}
      <div className="bg-slate-900/95 border-t border-slate-700/60 p-4 grid sm:grid-cols-2 gap-4">
        {/* Pickup Status */}
        <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
              Pickup (Point A)
            </span>
            {pickup?.verified && (
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                ✓ Verified
              </span>
            )}
          </div>
          <div className="min-h-12">
            <p className="text-slate-200 text-xs truncate">
              {pickupLoading ? (
                <span className="text-slate-400 italic">Resolving address…</span>
              ) : (
                pickup?.address || 'Enter pickup address'
              )}
            </p>
            {pickup?.latitude && (
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {pickup.latitude.toFixed(6)}, {pickup.longitude.toFixed(6)}
              </p>
            )}
          </div>
          {hasPickup && (
            <div className="pt-1 flex justify-end">
              {pickup.verified ? (
                <button
                  type="button"
                  onClick={onPickupUnconfirm}
                  className="text-[11px] text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-600 px-2.5 py-1 rounded transition-all cursor-pointer"
                >
                  Edit Location
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPickupConfirm}
                  className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1 rounded transition-all cursor-pointer"
                >
                  Confirm Pickup Location
                </button>
              )}
            </div>
          )}
        </div>

        {/* Destination Status */}
        <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0" />
              Destination (Point B)
            </span>
            {destination?.verified && (
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                ✓ Verified
              </span>
            )}
          </div>
          <div className="min-h-12">
            <p className="text-slate-200 text-xs truncate">
              {destLoading ? (
                <span className="text-slate-400 italic">Resolving address…</span>
              ) : (
                destination?.address || 'Enter destination address'
              )}
            </p>
            {destination?.latitude && (
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {destination.latitude.toFixed(6)}, {destination.longitude.toFixed(6)}
              </p>
            )}
          </div>
          {hasDest && (
            <div className="pt-1 flex justify-end">
              {destination.verified ? (
                <button
                  type="button"
                  onClick={onDestUnconfirm}
                  className="text-[11px] text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-600 px-2.5 py-1 rounded transition-all cursor-pointer"
                >
                  Edit Location
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onDestConfirm}
                  className="text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1 rounded transition-all cursor-pointer"
                >
                  Confirm Destination Location
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedCreateRideMap;
