'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MaintenancePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to scheduled maintenance since we're focusing on preventive maintenance
    router.replace('/maintenance/scheduled');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212332' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto mb-4" style={{ borderColor: '#2697FF' }}></div>
        <p className="text-white">Redirecting to Scheduled Maintenance...</p>
      </div>
    </div>
  );
}
