// 'use client';

// import React, { useState } from 'react';
// import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import { useRole } from '@/hooks/useRole';
// import ManagerRequestDashboard from '@/components/maintenance/ManagerRequestDashboard';
// import RequestApprovalModal from '@/components/maintenance/RequestApprovalModal';

// interface MaintenanceRequest {
//   id: string;
//   description: string;
//   priority: string;
//   status: string;
//   createdAt: string;
//   maintenanceType: string;
//   issueType?: string;
//   urgencyLevel?: string;
//   assetDowntime: boolean;
//   impactDescription?: string;
//   notes?: string;
//   asset: {
//     name: string;
//     serialNumber: string;
//     location: string;
//   };
//   requester: {
//     name: string;
//     email: string;
//   };
// }

// export default function MaintenanceRequestsPage() {
//   const { data: session } = useSession();
//   const { isManager, isAdmin } = useRole();
//   const router = useRouter();
//   const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
//   const [showApprovalModal, setShowApprovalModal] = useState(false);
//   const [refreshTrigger, setRefreshTrigger] = useState(0);

// // Show nothing until session is loaded
//   if (status === 'loading') return null;

//   // If not allowed, show access denied
//   if (session?.user?.role === 'AUDITOR') {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-900">
//         <div className="bg-white p-8 rounded shadow text-center">
//           <h1 className="text-2xl font-bold mb-2 text-red-600">Access Denied</h1>
//           <p className="text-gray-700">You do not have permission to view this page.</p>
//         </div>
//       </div>
//     );
//   }

//   // Redirect non-managers
//   if (session && !isManager() && !isAdmin()) {
//     router.push('/maintenance/request-issue');
//     return null;
//   }

//   const handleRequestApproved = () => {
//     setRefreshTrigger(prev => prev + 1);
//     setSelectedRequest(null);
//     setShowApprovalModal(false);
//   };

//   const handleRequestSelected = (request: MaintenanceRequest) => {
//     setSelectedRequest(request);
//     setShowApprovalModal(true);
//   };

//   return (
//     <div className="p-6">
//       {/* Enhanced Manager Request Dashboard */}
//       <ManagerRequestDashboard
//         key={refreshTrigger}
//         onRequestApproved={handleRequestApproved}
//         onRequestSelected={handleRequestSelected}
//       />

//       {/* Request Approval Modal */}
//       <RequestApprovalModal
//         open={showApprovalModal}
//         onClose={() => {
//           setShowApprovalModal(false);
//           setSelectedRequest(null);
//         }}
//         request={selectedRequest}
//         onRequestProcessed={handleRequestApproved}
//       />
//     </div>
//   );
// }
