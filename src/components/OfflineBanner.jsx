"use client";
import { useState } from 'react';
import useNetworkStatus from '@/hooks/useNetworkStatus';

export default function OfflineBanner() {
  const isOnline = useNetworkStatus();
  const [retrying, setRetrying] = useState(false);

  if (isOnline) return null;

  const handleRetry = () => {
    setRetrying(true);
    window.location.reload();
  };

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] bg-red-600 text-white text-sm flex items-center justify-center gap-3 py-2 px-4">
      <span>No internet connection. Some features may not work.</span>
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="underline font-medium disabled:opacity-60"
      >
        {retrying ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );
}
