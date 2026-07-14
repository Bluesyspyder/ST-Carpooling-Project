'use client';
import { useRef, useState, useCallback, useEffect } from 'react';

// Seconds of simulated driving per km of route.
// Default: 8s/km -> a 5km route takes 40s. Lower = faster demo.
const DEMO_SPEED_S_PER_KM = Number(process.env.NEXT_PUBLIC_DEMO_SPEED_S_PER_KM || 8);
const PAUSE_MS = 4000; // 4-second pause at each pickup stop

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

export const bearing = (lat1, lng1, lat2, lng2) => {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
};

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

export const DEMO_STAGES = {
  IDLE: 'IDLE',
  DRIVING_TO_PICKUP: 'DRIVING_TO_PICKUP',
  PAUSED_AT_PICKUP: 'PAUSED_AT_PICKUP',
  DRIVING_TO_DEST: 'DRIVING_TO_DEST',
  ARRIVED: 'ARRIVED',
};

const useDemoAnimation = ({ routePath = [], passengerPickups = [], onLocationUpdate, onStageChange }) => {
  const [stage, setStage] = useState(DEMO_STAGES.IDLE);
  
  const rafRef = useRef(null);
  const stageRef = useRef(DEMO_STAGES.IDLE);
  const startTimeRef = useRef(null);
  const legPolyRef = useRef([]); // current leg polyline
  const legDurationMsRef = useRef(0);
  const pauseStartRef = useRef(null);
  const countdownRef = useRef(null);
  const pickedUpRef = useRef(new Set());

  const transitionTo = useCallback((newStage, extra = {}) => {
    stageRef.current = newStage;
    setStage(newStage);
    onStageChange?.(newStage, extra);
  }, [onStageChange]);

  const updateCountdown = useCallback((remainingMs) => {
    const seconds = Math.ceil(remainingMs / 1000);
    if (countdownRef.current !== seconds) {
      countdownRef.current = seconds;
      onStageChange?.(stageRef.current, { countdown: seconds });
    }
  }, [onStageChange]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    transitionTo(DEMO_STAGES.IDLE);
  }, [transitionTo]);

  const start = useCallback(() => {
    if (stageRef.current !== DEMO_STAGES.IDLE) return;
    if (!routePath || routePath.length < 2) return;
    
    transitionTo(DEMO_STAGES.DRIVING_TO_PICKUP);
    
    const pts = routePath.map(p => [p.latitude || p[0] || p.lat, p.longitude || p[1] || p.lng]);
    const totalDistKm = pts.reduce((acc, p, i) => {
        if (i===0) return 0;
        return acc + haversineKm(pts[i-1][0], pts[i-1][1], p[0], p[1]);
    }, 0);
    
    legPolyRef.current = pts;
    legDurationMsRef.current = Math.max(totalDistKm * DEMO_SPEED_S_PER_KM * 1000, 5000); 
    startTimeRef.current = performance.now();
    pickedUpRef.current = new Set();
    
    const runPause = (onPauseEnd) => {
      pauseStartRef.current = performance.now();
      const tick = (now) => {
        if (stageRef.current === DEMO_STAGES.IDLE) return;
        const elapsed = now - pauseStartRef.current;
        updateCountdown(Math.max(0, PAUSE_MS - elapsed));
        if (elapsed >= PAUSE_MS) {
          onPauseEnd?.();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const tick = (now) => {
      if (stageRef.current === DEMO_STAGES.IDLE || stageRef.current === DEMO_STAGES.ARRIVED) return;
      if (stageRef.current === DEMO_STAGES.PAUSED_AT_PICKUP) return; // pause running in runPause

      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / legDurationMsRef.current, 1);
      const [lat, lng] = interpolatePolyline(pts, t);

      const tAhead = Math.min(t + 0.005, 1);
      const [aheadLat, aheadLng] = interpolatePolyline(pts, tAhead);
      const h = bearing(lat, lng, aheadLat, aheadLng);

      onLocationUpdate?.({ lat, lng, heading: h });
      
      // Check for proximity to passengers
      let foundPassenger = false;
      for (const p of passengerPickups) {
          if (!pickedUpRef.current.has(p.id)) {
              const dLat = p.lat - lat;
              const dLng = p.lng - lng;
              const dist = Math.sqrt(dLat*dLat + dLng*dLng);
              if (dist < 0.0005) { // 50 meters
                 pickedUpRef.current.add(p.id);
                 foundPassenger = true;
                 break;
              }
          }
      }

      if (foundPassenger) {
          transitionTo(DEMO_STAGES.PAUSED_AT_PICKUP, { countdown: 4 });
          runPause(() => {
              transitionTo(DEMO_STAGES.DRIVING_TO_DEST);
              // Shift start time to account for pause time so car resumes from same spot
              startTimeRef.current += PAUSE_MS; 
              rafRef.current = requestAnimationFrame(tick);
          });
          return;
      }

      if (t >= 1) {
        transitionTo(DEMO_STAGES.ARRIVED);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [routePath, passengerPickups, onLocationUpdate, transitionTo, updateCountdown]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { stage, start, stop };
};

export default useDemoAnimation;
