export function generateStaticParams() {
  return [{ id: '1' }];
}

import { Suspense } from 'react';
import ClientPage from './client-page';

const LoadingFallback = () => (
  <div className="min-h-[calc(100dvh-73px)] flex items-center justify-center px-4">
    <div className="glass-panel px-8 py-6 flex items-center gap-3">
      <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-[var(--text-secondary)] text-sm font-medium tracking-wide">
        Loading telemetry…
      </span>
    </div>
  </div>
);

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ClientPage />
    </Suspense>
  );
}