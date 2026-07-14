'use client';
import { useRef, useState, useCallback } from 'react';
import api from '@/services/api';

// ΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const OSRM_BASE = 'https://router.project-osrm.org';
// Seconds of simulated driving per km of route.
// Default: 8s/km ΓåÆ a 5km route takes 40s. Lower = faster demo.
const DEMO_SPEED_S_PER_KM = Number(process.env.NEXT_PUBLIC_DEMO_SPEED_S_PER_KM || 8);
const PAUSE_MS = 7000; // 7-second pause at each pickup stop
const ARRIVAL_THRESHOLD_KM = 0.08; // snap-to-stop within 80m

// ΓöÇΓöÇ Math helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Bearing in degrees (0 = north, 90 = east) between two lat/lng points. */
export const bearing = (lat1, lng1, lat2, lng2) => {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
};

/**
 * Given a flat [[lat, lng], ...] polyline and a 0ΓÇô1 progress value,
 * return the interpolated [lat, lng] position along the line.
 */
const interpolatePolyline = (points, t) => {
  if (points.length === 0) return [0, 0];
  if (t <= 0) return points[0];
  if (t >= 1) return points[points.length - 1];

  let totalLen = 0;
  const segLengths = [];
  for (let i = 1; i < points.length; i++) {
    const d = haversineKm(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    segLengths.push(d);
    totalLen += d;
  }

  const targetDist = t * totalLen;
  let covered = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (covered + segLengths[i] >= targetDist) {
      const localT = segLengths[i] > 0 ? (targetDist - covered) / segLengths[i] : 0;
      const p0 = points[i];
      const p1 = points[i + 1];
      return [p0[0] + localT * (p1[0] - p0[0]), p0[1] + localT * (p1[1] - p0[1])];
    }
    covered += segLengths[i];
  }
  return points[points.length - 1];
};

/**
 * Fetch a driving polyline from OSRM for a list of waypoints.
 * Returns [[lat, lng], ...] or null on failure.
 */
const fetchOSRMPolyline = async (waypoints) => {
  try {
    // OSRM format: coordinates are lng,lat separated by ;
    const coords = waypoints.map((w) => `${w[1]},${w[0]}`).join(';');
    const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url, { headers: { 'User-Agent': 'STCarpoolApp/1.0 DemoMode' } });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates) {
      throw new Error('No OSRM route returned');
    }
    // GeoJSON coords are [lng, lat] ΓåÆ convert to [lat, lng]
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } catch (err) {
    console.warn('[DEMO] OSRM fetch failed, using straight-line fallback:', err.message);
    return null;
  }
};

/**
 * Build a straight-line fallback polyline: ~20 interpolated points per leg.
 */
const buildStraightPolyline = (waypoints) => {
  const pts = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lng1] = waypoints[i];
    const [lat2, lng2] = waypoints[i + 1];
    const STEPS = 20;
    for (let s = 0; s <= STEPS; s++) {
      const t = s / STEPS;
      pts.push([lat1 + t * (lat2 - lat1), lng1 + t * (lng2 - lng1)]);
    }
  }
  return pts;
};

// ΓöÇΓöÇ Stage definitions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Each stage: { label, apiStatus?, demoBypass?, nextStage, pauseMs? }
export const DEMO_STAGES = {
  IDLE: 'IDLE',
  FREEZING: 'FREEZING',
  DRIVING_TO_PICKUP: 'DRIVING_TO_PICKUP',
  PAUSED_AT_PICKUP: 'PAUSED_AT_PICKUP',
  DRIVING_TO_VIA: 'DRIVING_TO_VIA',
  PAUSED_AT_VIA: 'PAUSED_AT_VIA',
  DRIVING_TO_DEST: 'DRIVING_TO_DEST',
  ARRIVING: 'ARRIVING',
  ARRIVED: 'ARRIVED',
};

// ΓöÇΓöÇ Main Hook ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
/**
 * useDemoAnimation
 *
 * Drives the investor demo: fetches a road polyline, animates a car marker
 * through pickup stop(s) and destination, and fires real API status changes
 * at each milestone.
 *
 * @param {object} ride ΓÇö full ride object from the server
 * @param {function} onLocationUpdate ΓÇö called with { lat, lng, heading } on every frame
 * @param {function} onStageChange ΓÇö called with (stage, { countdown? }) on stage transitions
 * @param {function} onComplete ΓÇö called with { driverCreditsEarned, totalEmissionSavedKg, routeDistance } at end
 * @param {string} rideId ΓÇö the ride's MongoDB _id string
 */
const useDemoAnimation = ({ ride, orderedWaypoints = [], rideId, onLocationUpdate, onStageChange, onComplete }) => {
  const [stage, setStage] = useState(DEMO_STAGES.IDLE);
  const [polyline, setPolyline] = useState([]); // [[lat,lng], ...] ΓÇö full route for the map

  const rafRef = useRef(null);
  const stageRef = useRef(DEMO_STAGES.IDLE);
  const startTimeRef = useRef(null);
  const legPolyRef = useRef([]); // current leg polyline
  const legDurationMsRef = useRef(0);
  const pauseStartRef = useRef(null);
  const countdownRef = useRef(null);

  const transitionTo = useCallback((newStage, extra = {}) => {
    stageRef.current = newStage;
    setStage(newStage);
    onStageChange?.(newStage, extra);
  }, [onStageChange]);

  /** Update the displayed countdown (called in the rAF loop during pauses). */
  const updateCountdown = useCallback((remainingMs) => {
    const seconds = Math.ceil(remainingMs / 1000);
    if (countdownRef.current !== seconds) {
      countdownRef.current = seconds;
      onStageChange?.(stageRef.current, { countdown: seconds });
    }
  }, [onStageChange]);

  /** Fire a status PATCH to the backend. */
  const patchStatus = useCallback(async (status, extraBody = {}) => {
    try {
      const res = await api.patch(`/rides/${rideId}/status`, {
        status,
        ...extraBody,
      });
      return res.data?.data?.ride;
    } catch (err) {
      console.error('[DEMO] status PATCH failed:', status, err?.response?.data?.message || err.message);
      return null;
    }
  }, [rideId]);

  /** Core rAF animation loop ΓÇö drives the marker along legPolyRef at legDurationMsRef speed. */
  const animateLeg = useCallback((onLegComplete) => {
    startTimeRef.current = performance.now();
    const pts = legPolyRef.current;
    const dur = legDurationMsRef.current;

    const tick = (now) => {
      if (stageRef.current === DEMO_STAGES.ARRIVED) return; // stopped

      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / dur, 1);
      const [lat, lng] = interpolatePolyline(pts, t);

      // Heading: look a tiny bit ahead for a smooth bearing
      const tAhead = Math.min(t + 0.01, 1);
      const [aheadLat, aheadLng] = interpolatePolyline(pts, tAhead);
      const h = bearing(lat, lng, aheadLat, aheadLng);

      onLocationUpdate?.({ lat, lng, heading: h });

      if (t >= 1) {
        onLegComplete?.();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [onLocationUpdate]);

  /** 7-second pause with countdown, then call onPauseEnd. */
  const runPause = useCallback((onPauseEnd) => {
    pauseStartRef.current = performance.now();
    const tick = (now) => {
      const elapsed = now - pauseStartRef.current;
      updateCountdown(Math.max(0, PAUSE_MS - elapsed));
      if (elapsed >= PAUSE_MS) {
        onPauseEnd?.();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [updateCountdown]);

  /**
   * start()
   * Entry point. Fetches polylines and begins the animation stage machine.
   */
  const start = useCallback(async () => {
    if (stageRef.current !== DEMO_STAGES.IDLE) return;
    transitionTo(DEMO_STAGES.FREEZING);

    // 1. Freeze the ride so no new bookings come in
    await patchStatus('FROZEN');

    // 2. Build the ordered waypoint list
    const pickup = ride.pickupLocation;
    const dest = ride.destinationLocation;
    
    // Fallback to via if no ordered waypoints (though ordered waypoints is preferred)
    const via = (ride.viaStops || []).filter((v) => v.latitude && v.longitude);
    const middleWaypoints = orderedWaypoints.length > 0 
      ? orderedWaypoints.map((w) => [w.lat, w.lng])
      : via.map((v) => [v.latitude, v.longitude]);

    const fullWaypoints = [
      [pickup.latitude, pickup.longitude],
      ...middleWaypoints,
      [dest.latitude, dest.longitude],
    ];

    // 3. Fetch exact OSRM road polyline for each leg and build legs array
    const legs = [];
    let combinedPoly = [];

    for (let i = 0; i < fullWaypoints.length - 1; i++) {
      const p1 = fullWaypoints[i];
      const p2 = fullWaypoints[i + 1];

      const osrmLeg = await fetchOSRMPolyline([p1, p2]);
      const legPoly = osrmLeg || buildStraightPolyline([p1, p2]);

      let label = 'destination';
      if (i < fullWaypoints.length - 2) {
        label = i === 0 ? 'pickup' : `via_${i}`;
      }

      legs.push({
        poly: legPoly,
        durationMs: haversineKm(p1[0], p1[1], p2[0], p2[1]) * DEMO_SPEED_S_PER_KM * 1000,
        label,
      });

      combinedPoly = combinedPoly.concat(legPoly);
    }

    setPolyline(combinedPoly);

    // 6. Sequentially drive each leg
    const driveLeg = (legIndex) => {
      if (legIndex >= legs.length) return;
      const leg = legs[legIndex];
      const isPickupLeg = leg.label === 'pickup';
      const isDestLeg = leg.label === 'destination';
      const isViaLeg = leg.label.startsWith('via_');

      const stageLabel = isPickupLeg
        ? DEMO_STAGES.DRIVING_TO_PICKUP
        : isViaLeg
        ? DEMO_STAGES.DRIVING_TO_VIA
        : DEMO_STAGES.DRIVING_TO_DEST;

      transitionTo(stageLabel);
      legPolyRef.current = leg.poly;
      legDurationMsRef.current = Math.max(leg.durationMs, 2000); // at least 2s per leg

      animateLeg(async () => {
        if (isPickupLeg) {
          // Arrived at pickup ΓÇö fire IN_PROGRESS, then pause 7s
          transitionTo(DEMO_STAGES.PAUSED_AT_PICKUP, { countdown: 7 });
          await patchStatus('IN_PROGRESS', {
            demoBypass: true,
            demoSecret: process.env.NEXT_PUBLIC_DEMO_MODE_SECRET || '',
          });
          runPause(() => driveLeg(legIndex + 1));
        } else if (isViaLeg) {
          // Arrived at a via-stop ΓÇö pause 7s, no API call (already IN_PROGRESS)
          transitionTo(DEMO_STAGES.PAUSED_AT_VIA, { countdown: 7 });
          runPause(() => driveLeg(legIndex + 1));
        } else if (isDestLeg) {
          // Arrived at destination ΓÇö fire COMPLETED
          transitionTo(DEMO_STAGES.ARRIVING);
          const completedRide = await patchStatus('COMPLETED');
          transitionTo(DEMO_STAGES.ARRIVED);
          onComplete?.({
            driverCreditsEarned: completedRide?.driverCreditsEarned ?? 0,
            totalEmissionSavedKg: completedRide?.totalEmissionSavedKg ?? 0,
            routeDistance: completedRide?.routeDistance ?? totalKm,
            vehicleType: ride.driverVehicle?.vehicleType || 'petrol',
          });
        }
      });
    };

    // Start!
    driveLeg(0);
  }, [ride, patchStatus, transitionTo, animateLeg, runPause, onComplete]);

  /** stop() ΓÇö cancel the current animation without completing the ride. */
  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    transitionTo(DEMO_STAGES.IDLE);
    setPolyline([]);
  }, [transitionTo]);

  return { stage, polyline, start, stop };
};

export default useDemoAnimation;
