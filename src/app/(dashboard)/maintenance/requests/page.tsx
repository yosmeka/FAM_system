'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import ManagerRequestDashboard from '@/components/maintenance/ManagerRequestDashboard';
import RequestApprovalModal from '@/components/maintenance/RequestApprovalModal';

interface MaintenanceRequest {
  id: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  maintenanceType: string;
  issueType?: string;
  urgencyLevel?: string;
  assetDowntime: boolean;
  impactDescription?: string;
  notes?: string;
  asset: {
    name: string;
    serialNumber: string;
    location: string;
  };
  requester: {
    name: string;
    email: string;
  };
}

export default function MaintenanceRequestsPage() {
  const { data: session } = useSession();
  const { isManager, isAdmin } = useRole();
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Redirect non-managers
  if (session && !isManager() && !isAdmin()) {
    router.push('/maintenance/request-issue');
    return null;
  }

  const handleRequestApproved = () => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedRequest(null);
    setShowApprovalModal(false);
  };

  const handleRequestSelected = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  return (
    <div className="p-6" style={{ backgroundColor: '#212332' }}>
      {/* Enhanced Manager Request Dashboard */}
      <ManagerRequestDashboard
        key={refreshTrigger}
        onRequestApproved={handleRequestApproved}
        onRequestSelected={handleRequestSelected}
      />

      {/* Request Approval Modal */}
      <RequestApprovalModal
        open={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onRequestProcessed={handleRequestApproved}
      />
    </div>
  );
}
