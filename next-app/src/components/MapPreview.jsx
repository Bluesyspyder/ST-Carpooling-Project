"use client";
import { useEffect, useRef, useCallback, useState } from 'react';
import { fetchReverseGeocode } from '@/services/locationService';
import useCurrentLocation from '@/hooks/useCurrentLocation';

/**
 * Single-location Leaflet map preview with a draggable marker.
 *
 * Spec Part 5 buttons (always visible when interactive):
 *   [ Confirm Location ]  [ Reset Marker ]  [ Use Current Location ]
 *
 * Props:
 *   location           – { address, latitude, longitude }
 *   onLocationChange   – fn({ address, latitude, longitude })  (called on drag-end / GPS / reset)
 *   height             – CSS string (default '280px')
 *   interactive        – bool; enables dragging + action buttons
 *   onConfirm          – fn() — called when user clicks Confirm (sets verified: true upstream)
 *   onUnconfirm        – fn() — called when user clicks Edit after confirming (sets verified: false)
 *   confirmed          – bool; shows verified badge + Edit button
 *   markerColor        – hex color for the custom pin (default '#7c3aed' violet)
 *   markerLabel        – single char label inside pin (default '📍')
 */
const MapPreview = ({
  location,
  onLocationChange,
  height = '280px',
  interactive = false,
  onConfirm,
  onUnconfirm,
  confirmed = false,
  markerColor = '#7c3aed',
  markerLabel = '●',
}) => {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);
  const reverseGeocodeTimer = useRef(null);
  const isMountedRef = useRef(true);
  const interactiveRef = useRef(interactive);
  const confirmedRef = useRef(confirmed);
  // Track the "clean" coordinates last set by autocomplete/GPS (for Reset)
  const baseLocationRef = useRef(null);

  const [reverseLoading, setReverseLoading] = useState(false);

  const { getCurrentLocation, loading: gpsLoading } = useCurrentLocation();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeout(reverseGeocodeTimer.current);
    };
  }, []);

  useEffect(() => {
    interactiveRef.current = interactive;
    confirmedRef.current = confirmed;
  }, [interactive, confirmed]);

  // Keep baseLocationRef in sync when location changes from the outside (autocomplete / GPS)
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      baseLocationRef.current = { ...location };
    }
  }, [location?.latitude, location?.longitude]);

  // ── Reverse geocode after drag ──────────────────────────────────────────
  const handleDragEnd = useCallback(
    async (newLat, newLng) => {
      // Immediately push new coordinates upstream (address stays unchanged temporarily)
      onLocationChange?.({ ...location, latitude: newLat, longitude: newLng });

      // Debounced reverse geocode
      clearTimeout(reverseGeocodeTimer.current);
      setReverseLoading(true);
      reverseGeocodeTimer.current = setTimeout(async () => {
        try {
          const result = await fetchReverseGeocode(newLat, newLng);
          if (isMountedRef.current && result?.address) {
            onLocationChange?.({ address: result.address, latitude: newLat, longitude: newLng });
          }
        } catch {
          // Keep old address with new coords — silent fail
        } finally {
          if (isMountedRef.current) setReverseLoading(false);
        }
      }, 400);
    },
    [location, onLocationChange]
  );

  // ── Reset Marker ────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    const base = baseLocationRef.current;
    if (!base?.latitude || !base?.longitude) return;
    if (markerRef.current) markerRef.current.setLatLng([base.latitude, base.longitude]);
    if (leafletMapRef.current) leafletMapRef.current.setView([base.latitude, base.longitude], 15);
    onLocationChange?.({ ...base });
  }, [onLocationChange]);

  // ── Use Current Location ────────────────────────────────────────────────
  const handleCurrentLocation = useCallback(async () => {
    const loc = await getCurrentLocation();
    if (!loc || !isMountedRef.current) return;
    // Move marker on map
    if (markerRef.current) markerRef.current.setLatLng([loc.latitude, loc.longitude]);
    if (leafletMapRef.current) leafletMapRef.current.setView([loc.latitude, loc.longitude], 15);
    // Update base so Reset snaps back here
    baseLocationRef.current = { ...loc };
    onLocationChange?.({ ...loc });
  }, [getCurrentLocation, onLocationChange]);

  const moveMarkerTo = useCallback(
    (lat, lng) => {
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      handleDragEnd(lat, lng);
    },
    [handleDragEnd]
  );

  // ── Build custom pin icon ───────────────────────────────────────────────
  const buildIcon = useCallback((L, color) =>
    L.divIcon({
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      html: `<div style="
        display:flex;align-items:center;justify-content:center;
        width:32px;height:32px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${color};
        color:#fff;border:2px solid rgba(255,255,255,0.9);
        font-weight:700;font-size:11px;
        box-shadow:0 4px 10px rgba(0,0,0,0.45);
        transition:transform 0.15s ease;
        cursor:${interactive && !confirmed ? 'grab' : 'default'};
      "><span style="transform:rotate(45deg);line-height:1">${confirmed ? '✓' : markerLabel}</span></div>`,
    }),
    [confirmed, interactive, markerLabel]
  );

  // ── Initialise / update map ─────────────────────────────────────────────
  useEffect(() => {
    if (!location?.latitude || !location?.longitude) return;

    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      const lat = location.latitude;
      const lng = location.longitude;
      const icon = buildIcon(L, confirmed ? '#10b981' : markerColor);
      const handleMapClick = (e) => {
        if (!interactiveRef.current || confirmedRef.current) return;
        moveMarkerTo(e.latlng.lat, e.latlng.lng);
      };
      const canEditMarker = interactive && !confirmed;

      if (!leafletMapRef.current) {
        leafletMapRef.current = L
          .map(mapRef.current, { zoomControl: true, scrollWheelZoom: false })
          .setView([lat, lng], 15);

        L.tileLayer(`https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/{z}/{x}/{y}.png?api_key=${process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY}`, {
          attribution: '© Ola Maps',
        }).addTo(leafletMapRef.current);
      } else {
        leafletMapRef.current.setView([lat, lng], 15);
      }

      leafletMapRef.current.doubleClickZoom.disable();
      leafletMapRef.current.off('click');
      leafletMapRef.current.off('dblclick');
      if (canEditMarker) {
        leafletMapRef.current.on('click', handleMapClick);
        leafletMapRef.current.on('dblclick', handleMapClick);
      }

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.setIcon(icon);
        if (canEditMarker) markerRef.current.dragging?.enable();
        else markerRef.current.dragging?.disable();
      } else {
        markerRef.current = L.marker([lat, lng], {
          autoPan: true,
          draggable: canEditMarker,
          icon,
          riseOnHover: true,
          zIndexOffset: 1000,
        })
          .addTo(leafletMapRef.current);

        if (canEditMarker) {
          markerRef.current.on('dragstart', () => {
            leafletMapRef.current?.dragging.disable();
          });
          markerRef.current.on('dragend', (e) => {
            leafletMapRef.current?.dragging.enable();
            const { lat: nLat, lng: nLng } = e.target.getLatLng();
            handleDragEnd(nLat, nLng);
          });
        }
      }

      // Invalidate size after a short delay to fix rendering inside modals
      // and dynamically-sized containers where the DOM may not be fully laid out.
      setTimeout(() => {
        if (isMountedRef.current && leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 150);
    };

    init();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
      }
    };
    // Re-init only when coordinates change; confirmed changes only update icon colour
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude]);

  // Update icon color when confirmed state changes (without re-initing the map)
  useEffect(() => {
    if (!markerRef.current) return;
    const updateIcon = async () => {
      const L = (await import('leaflet')).default;
      markerRef.current.setIcon(buildIcon(L, confirmed ? '#10b981' : markerColor));
      if (interactive && !confirmed) markerRef.current.dragging?.enable();
      else markerRef.current.dragging?.disable();
    };
    updateIcon();
  }, [confirmed, buildIcon, interactive, markerColor]);

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!location?.latitude) {
    return (
      <div
        style={{ height }}
        className="bg-[var(--bg-surface)] rounded-xl border border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] text-sm"
      >
        <span className="text-3xl opacity-40">🗺️</span>
        <span>Map preview appears after selecting an address</span>
      </div>
    );
  }

  return (
    <div className="relative z-0 rounded-xl overflow-hidden border border-[var(--border-subtle)] shadow-lg shadow-[var(--border-glow)]">
      {/* Map tile */}
      <div ref={mapRef} style={{ height }} className="w-full" />

      {/* Footer — address + action buttons */}
      {interactive && (
        <div className="bg-[var(--bg-card)] border-t border-[var(--border-subtle)] px-4 py-3 space-y-2.5">
          {/* Address row */}
          <div className="flex items-start gap-2">
            <span className="text-[var(--text-muted)] text-sm mt-0.5 flex-shrink-0">📍</span>
            <div className="min-w-0 flex-1">
              <p className="text-[var(--text-primary)] font-medium text-sm leading-snug truncate">
                {reverseLoading ? (
                  <span className="text-[var(--text-muted)] italic text-xs">Resolving address…</span>
                ) : (
                  location.address || 'Unknown address'
                )}
              </p>
            </div>
            {reverseLoading && (
              <div className="w-3.5 h-3.5 border-2 border-[var(--primary-base)] border-t-transparent rounded-full animate-spin flex-shrink-0 mt-1" />
            )}
          </div>

          {/* Action buttons */}
          {confirmed ? (
            /* ── Confirmed state ── */
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-green-500 text-sm font-bold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Location Verified
              </div>
              {onUnconfirm && (
                <button
                  onClick={onUnconfirm}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--primary-base)] px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                >
                  ✏ Edit
                </button>
              )}
            </div>
          ) : (
            /* ── Unconfirmed state: all 3 spec buttons ── */
            <div className="flex flex-wrap gap-2">
              {/* Use Current Location */}
              <button
                onClick={handleCurrentLocation}
                disabled={gpsLoading}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--primary-base)] text-[var(--text-secondary)] hover:text-[var(--primary-base)] transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:scale-100 cursor-pointer"
              >
                {gpsLoading ? (
                  <div className="w-3 h-3 border-2 border-[var(--primary-base)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>📍</span>
                )}
                {gpsLoading ? 'Getting GPS…' : 'Use Current Location'}
              </button>

              {/* Reset Marker */}
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--secondary-base)] text-[var(--text-secondary)] hover:text-[var(--secondary-base)] transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
              >
                <span>↺</span>
                Reset Marker
              </button>

              {/* Confirm Location */}
              {onConfirm && (
                <button
                  onClick={onConfirm}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-[var(--border-glow)] ml-auto cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm Location
                </button>
              )}
            </div>
          )}

          {/* Drag hint */}
          {!confirmed && (
            <p className="text-xs text-[var(--text-muted)] text-center border-t border-[var(--border-subtle)] pt-2">
              Drag the pin or click the map to fine-tune · Confirm when correct
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MapPreview;
