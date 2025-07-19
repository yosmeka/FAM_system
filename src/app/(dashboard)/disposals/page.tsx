// 'use client';

// import React, { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
// import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
// import { RoleBasedBadge } from '@/components/ui/RoleBasedBadge';
// import type { DisposalRequest, DisposalStatus } from '@/types/disposals';
// import type { Column } from '@/types/reports';

// import { useSession } from 'next-auth/react';
// import { toast } from 'react-hot-toast';

// // Delete Confirmation Modal Component
// function DeleteConfirmationModal({ 
//   isOpen, 
//   onClose, 
//   onConfirm, 
//   assetName 
// }: { 
//   isOpen: boolean; 
//   onClose: () => void; 
//   onConfirm: () => void;
//   assetName: string;
// }) {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
//         <h3 className="text-lg font-semibold mb-4 dark:text-white">Confirm Deletion</h3>
//         <p className="mb-4 dark:text-white">
//           Are you sure you want to delete the disposal request for asset &quot;{assetName}&quot;? 
//           This action cannot be undone.
//         </p>
//         <div className="flex justify-end space-x-3">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-200 dark:hover:text-gray-200"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={onConfirm}
//             className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
//           >
//             Delete
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Reject Confirmation Modal Component
// function RejectConfirmationModal({
//   isOpen,
//   onClose,
//   onConfirm,
//   assetName,
//   reason,
//   setReason
// }: {
//   isOpen: boolean;
//   onClose: () => void;
//   onConfirm: () => void;
//   assetName: string;
//   reason: string;
//   setReason: (reason: string) => void;
// }) {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
//         <h3 className="text-lg font-semibold mb-4 dark:text-white">Reject Disposal Request</h3>
//         <p className="mb-4 dark:text-white">
//           Please provide a reason for rejecting the disposal request for asset &quot;{assetName}&quot;.
//         </p>
//         <textarea
//           value={reason}
//           onChange={(e) => setReason(e.target.value)}
//           className="w-full p-2 border rounded mb-4 dark:bg-gray-800"
//           rows={3}
//           placeholder="Enter rejection reason..."
//           required
//         />
//         <div className="flex justify-end space-x-3">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-200 dark:hover:text-gray-200"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={onConfirm}
//             disabled={!reason.trim()}
//             className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:hover:bg-red-700 disabled:opacity-50"
//           >
//             Reject
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }


// export default function DisposalsPage() {
//   const { data: session, status } = useSession();
//   const router = useRouter();

//   const [loading, setLoading] = useState(true);
//   const [disposals, setDisposals] = useState<DisposalRequest[]>([]);
//   const [filteredDisposals, setFilteredDisposals] = useState<DisposalRequest[]>([]);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [searchField, setSearchField] = useState('assetName');
//   const [deleteModalOpen, setDeleteModalOpen] = useState(false);
//   const [disposalToDelete, setDisposalToDelete] = useState<{ id: string; assetName: string } | null>(null);
//   const [rejectModal, setRejectModal] = useState<{ open: boolean; disposalId: string | null; assetName: string }>({ 
//     open: false, 
//     disposalId: null,
//     assetName: ''
//   });
//   const [rejectReason, setRejectReason] = useState('');
//   const [page, setPage] = useState(1);
//   const pageSize = 7;
//   const totalPages = Math.ceil(filteredDisposals.length / pageSize);
//   const paginatedDisposals = filteredDisposals.slice((page - 1) * pageSize, page * pageSize);

//   useEffect(() => {
//     setPage(1);
//   }, [filteredDisposals]);

//   useEffect(() => {
//     fetchDisposals();
//     // Set up notification listener for new disposal requests
//     if (session?.user?.role === 'MANAGER') {
//       const eventSource = new EventSource('/api/notifications/disposals');
//       eventSource.onmessage = (event) => {
//         const data = JSON.parse(event.data);
//         if (data.type === 'NEW_DISPOSAL') {
//           toast.success(`New disposal request for ${data.assetName}`);
//           fetchDisposals(); // Refresh the list
//         }
//       };
//       return () => eventSource.close();
//     }
//   }, [session?.user?.role]);

//   useEffect(() => {
//     // Filter disposals based on search query
//     if (!searchQuery.trim()) {
//       setFilteredDisposals(disposals);
//       return;
//     }

//     const query = searchQuery.toLowerCase().trim();
//     const filtered = disposals.filter(disposal => {
//       switch (searchField) {
//         case 'assetName':
//           return disposal.asset?.name?.toLowerCase().includes(query);
//         case 'method':
//           return disposal.method.toLowerCase().includes(query);
//         case 'status':
//           return disposal.status.toLowerCase().includes(query);
//         case 'reason':
//           return disposal.reason.toLowerCase().includes(query);
//         case 'requester':
//           return disposal.requester?.name?.toLowerCase().includes(query);
//         default:
//           return true;
//       }
//     });
//     setFilteredDisposals(filtered);
//   }, [searchQuery, searchField, disposals]);

//   if (status === 'loading') return null;

//   const showAccessDenied = status !== 'authenticated' || !session || session?.user?.role === 'AUDITOR';

//   if (showAccessDenied) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-900">
//         <div className="bg-white p-8 rounded shadow text-center">
//           <h1 className="text-2xl font-bold mb-2 text-red-600">Access Denied</h1>
//           <p className="text-gray-700">You do not have permission to view this page.</p>
//         </div>
//       </div>
//     );
//   }

//   const fetchDisposals = async () => {
//     try {
//       const response = await fetch('/api/disposals');
//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || 'Failed to fetch disposals');
//       }
//       const data = await response.json();
//       setDisposals(data);
//     } catch (error: unknown) {
//       const err = error as Error;
//       console.error('Error:', err);
//       toast.error(err.message || 'Failed to fetch disposals');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDelete = async (id: string, assetName: string) => {
//     setDisposalToDelete({ id, assetName });
//     setDeleteModalOpen(true);
//   };

//   const confirmDelete = async () => {
//     if (!disposalToDelete) return;

//     try {
//       const response = await fetch(`/api/disposals/${disposalToDelete.id}`, {
//         method: 'DELETE',
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || 'Failed to delete disposal request');
//       }

//       toast.success('Disposal request deleted successfully');
//       fetchDisposals(); // Refresh the list
//     } catch (error: unknown) {
//       const err = error as Error;
//       console.error('Error:', err);
//       toast.error(err.message || 'Failed to delete disposal request');
//     } finally {
//       setDeleteModalOpen(false);
//       setDisposalToDelete(null);
//     }
//   };

//   const handleApprove = async (id: string) => {
//     try {
//       const response = await fetch(`/api/disposals/${id}/approve`, {
//         method: 'POST',
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || 'Failed to approve disposal request');
//       }

//       toast.success('Disposal request approved successfully');
//       fetchDisposals(); // Refresh the list
//     } catch (error: unknown) {
//       const err = error as Error;
//       console.error('Error:', err);
//       toast.error(err.message || 'Failed to approve disposal request');
//     }
//   };

//   const handleReject = async (id: string, assetName: string) => {
//     setRejectModal({ open: true, disposalId: id, assetName });
//   };

//   const confirmReject = async () => {
//     if (!rejectModal.disposalId || !rejectReason.trim()) return;

//     try {
//       const response = await fetch(`/api/disposals/${rejectModal.disposalId}/reject`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ reason: rejectReason }),
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || 'Failed to reject disposal request');
//       }

//       toast.success('Disposal request rejected successfully');
//       fetchDisposals();
//     } catch (error: unknown) {
//       const err = error as Error;
//       console.error('Error:', err);
//       toast.error(err.message || 'Failed to reject disposal request');
//     } finally {
//       setRejectModal({ open: false, disposalId: null, assetName: '' });
//       setRejectReason('');
//     }
//   };

//   const getStatusVariant = (status: DisposalStatus): 'success' | 'warning' | 'danger' | 'default' => {
//     switch (status) {
//       case 'APPROVED':
//         return 'success';
//       case 'REJECTED':
//         return 'danger';
//       case 'PENDING':
//         return 'warning';
//       default:
//         return 'default';
//     }
//   };

//   const columns: Column<DisposalRequest>[] = [
//     {
//       key: 'assetId',
//       header: 'Asset',
//       render: (value, item) => typeof item.asset?.name === 'string' ? item.asset.name : String(value),
//     },
//     {
//       key: 'method',
//       header: 'Method',
//       render: (value) => <span className="capitalize">{(value as string).toLowerCase()}</span>,
//     },
//     {
//       key: 'expectedValue',
//       header: 'Expected Value',
//       render: (value) => `$${(value as number).toFixed(2)}`,
//     },
//     {
//       key: 'status',
//       header: 'Status',
//       render: (value) => (
//         <RoleBasedBadge
//           label={value as string}
//           variant={getStatusVariant(value as DisposalStatus)}
//         />
//       ),
//     },
//     {
//       key: 'createdAt',
//       header: 'Date',
//       render: (value) => {
//         if (!value || typeof value !== 'string') return '';
//         const date = new Date(value);
//         return date.toLocaleDateString('en-US', {
//           year: 'numeric',
//           month: 'short',
//           day: 'numeric',
//           hour: '2-digit',
//           minute: '2-digit'
//         });
//       },
//     },
//     {
//       key: 'id',
//       header: 'Actions',
//       render: (value, item) => {
//         const isPending = item.status === 'PENDING';
//         const isManager = session.user.role === 'MANAGER';
//         const isOwner = item.requester?.id === session.user.id;

//         return (
//           <div className="flex space-x-2">
//             <RoleBasedButton
//               onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
//                 e.stopPropagation();
//                 router.push(`/disposals/${value}`);
//               }}
//               variant="secondary"
//               size="sm"
//             >
//               View
//             </RoleBasedButton>

//             {isOwner && isPending && (
//               <>
//                 <RoleBasedButton
//                   onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
//                     e.stopPropagation();
//                     router.push(`/disposals/${value}/edit`);
//                   }}
//                   className="text-[#ffffff] bg-gray-400 dark:bg-gray-700 dark:text-[#ffffff] mr-2"
//                   size="sm"
//                 >
//                   Edit
//                 </RoleBasedButton>
//                 <RoleBasedButton
//                   onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
//                     e.stopPropagation();
//                     handleDelete(value as string, item.asset?.name || 'Unknown Asset');
//                   }}
//                   variant="danger"
//                   size="sm"
//                 >
//                   Delete
//                 </RoleBasedButton>
//               </>
//             )}

//             {isManager && isPending && (
//               <>
//                 <RoleBasedButton
//                   onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
//                     e.stopPropagation();
//                     handleApprove(value as string);
//                   }}
//                   variant="success"
//                   size="sm"
//                 >
//                   Approve
//                 </RoleBasedButton>
//                 <RoleBasedButton
//                   onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
//                     e.stopPropagation();
//                     handleReject(value as string, item.asset?.name || '');
//                   }}
//                   variant="danger"
//                   size="sm"
//                 >
//                   Reject
//                 </RoleBasedButton>
//               </>
//             )}
//           </div>
//         );
//       },
//     },
//   ];

//   return (
//     <div className="container mx-auto p-6">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-semibold">Asset Disposals</h1>
//         {session?.user?.role !== 'MANAGER' && (
//           <RoleBasedButton
//             onClick={() => router.push('/disposals/new')}
//             variant="primary"
//             className="bg-red-600 hover:bg-red-700 text-white"
//           >
//             New Disposal Request
//           </RoleBasedButton>
//         )}
//       </div>

//       {/* Search Section */}
//       <div className="mb-6 bg-white p-4 rounded-lg shadow dark:bg-gray-800">
//         <div className="flex flex-col md:flex-row gap-4">
//           <div className="flex-1">
//             <input
//               type="text"
//               placeholder="Search disposals..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700"
//             />
//           </div>
//           <div className="w-full md:w-48">
//             <select
//               value={searchField}
//               onChange={(e) => setSearchField(e.target.value)}
//               className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700"
//             >
//               <option value="assetName">Asset Name</option>
//               <option value="method">Disposal Method</option>
//               <option value="status">Status</option>
//               <option value="reason">Reason</option>
//               <option value="requester">Requester</option>
//             </select>
//           </div>
//         </div>
//         {searchQuery && (
//           <div className="mt-2 text-sm text-gray-600">
//             Found {filteredDisposals.length} result{filteredDisposals.length !== 1 ? 's' : ''}
//           </div>
//         )}
//       </div>

//       <RoleBasedTable
//         data={paginatedDisposals}
//         columns={columns}
//         loading={loading}
//         onRowClick={(value) => router.push(`/disposals/${value}`)}
//       />

//       {/* Pagination Controls */}
//       {totalPages > 1 && (
//         <div className="flex justify-center items-center gap-2 py-4 dark:bg-gray-900 border-t">
//           <button
//             className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-800 dark:hover:bg-gray-700"
//             onClick={() => setPage((p) => Math.max(1, p - 1))}
//             disabled={page === 1}
//           >
//             Previous
//           </button>
//           <span className="text-sm text-gray-700">
//             Page {page} of {totalPages}
//           </span>
//           <button
//             className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
//             onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
//             disabled={page === totalPages}
//           >
//             Next
//           </button>
//         </div>
//       )}

//       <DeleteConfirmationModal
//         isOpen={deleteModalOpen}
//         onClose={() => {
//           setDeleteModalOpen(false);
//           setDisposalToDelete(null);
//         }}
//         onConfirm={confirmDelete}
//         assetName={disposalToDelete?.assetName || ''}
//       />

//       <RejectConfirmationModal
//         isOpen={rejectModal.open}
//         onClose={() => {
//           setRejectModal({ open: false, disposalId: null, assetName: '' });
//           setRejectReason('');
//         }}
//         onConfirm={confirmReject}
//         assetName={rejectModal.assetName}
//         reason={rejectReason}
//         setReason={setRejectReason}
//       />
//     </div>
//   );
// }