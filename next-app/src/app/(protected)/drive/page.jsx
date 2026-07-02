"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the Driver Mode Content with SSR disabled
// This prevents the 'window is not defined' error from react-leaflet
const DriverModeContent = dynamic(() => import('./driver-mode-content'), { 
  ssr: false,
  loading: () => <div className="p-6 text-slate-300">Loading Driver Mode Map...</div>
});

export default function DriverModePage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-300">Loading Driver Mode...</div>}>
      <DriverModeContent />
    </Suspense>
  );
}
