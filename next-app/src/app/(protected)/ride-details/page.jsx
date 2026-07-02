export function generateStaticParams() {
  return [{ id: '1' }];
}

import { Suspense } from 'react';
import ClientPage from './client-page';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-emerald-400">Loading Telemetry...</div>}>
      <ClientPage />
    </Suspense>
  );
}
