// 'use client';

// import React, { useState, useEffect, useCallback } from 'react';
// import { useRouter } from 'next/navigation';
// import { RoleBasedBadge } from '@/components/ui/RoleBasedBadge';
// import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
// import { toast } from 'react-hot-toast';
// import { useSession } from 'next-auth/react';

// interface TransferDetails {
//   id: string;
//   assetId: string;
//   fromLocation: string;
//   toLocation: string;
//   reason: string;
//   managerReason?: string;
//   status: string;
//   createdAt: string;
//   updatedAt: string;
//   asset?: {
//     name: string;
//     serialNumber: string;
//     status?: string;
//     location?: string;
//     currentValue?: number;
//   };
//   requester?: {
//     name?: string;
//     email?: string;
//     id?: string;
//   };
//   document?: {
//     id: string;
//     url: string;
//     fileName: string;
//     type: string;
//   };
// }

// export default function TransferDetailsPage({ params }: { params: Promise<{ id: string }> }) {
//   const [transfer, setTransfer] = useState<TransferDetails | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [deleted, setDeleted] = useState(false);
//   const { data: session } = useSession();
//   const router = useRouter();
//   const [resolvedId, setResolvedId] = useState<string | null>(null);

//   useEffect(() => {
//     params.then(({ id }) => setResolvedId(id));
//   }, [params]);

//   const fetchTransferDetails = useCallback(async () => {
//     if (!resolvedId) return;
//     try {
//       // Fetch transfer details
//       const response = await fetch(`/api/transfers/${resolvedId}`);
//       if (!response.ok) throw new Error('Failed to fetch transfer details');
//       const data = await response.json();

//       // If transfer is approved or rejected, check for document
//       if (data.status === 'APPROVED' || data.status === 'REJECTED') {
//         try {
//           console.log(`Fetching document for transfer ${resolvedId}`);
//           const docResponse = await fetch(`/api/transfers/${resolvedId}/document`);

//           if (docResponse.ok) {
//             const docData = await docResponse.json();
//             console.log(`Document data for transfer ${resolvedId}:`, docData);

//             if (docData.documentUrl) {
//               data.document = {
//                 id: `${data.id}-doc`,
//                 url: docData.documentUrl,
//                 fileName: `transfer_${data.status.toLowerCase()}_${data.id}.pdf`,
//                 type: data.status === 'APPROVED' ? 'TRANSFER_APPROVAL' : 'TRANSFER_REJECTION'
//               };
//               console.log(`Document found and set for transfer ${resolvedId}`);
//             } else {
//               console.log('Document URL not found in response:', docData);
//             }
//           } else {
//             console.log(`Document not found for transfer ${resolvedId}, status: ${docResponse.status}`);
//             // Try to get the error message
//             try {
//               const errorData = await docResponse.json();
//               console.log(`Error details:`, errorData);
//             } catch {
//               console.log(`Could not parse error response`);
//             }
//           }
//         } catch (docError) {
//           console.error('Error fetching document:', docError);
//           // Continue even if document fetch fails
//         }
//       }

//       setTransfer(data);
//     } catch (err) {
//       console.error('Error:', err);
//       toast.error('Failed to load transfer details');
//     } finally {
//       setLoading(false);
//     }
//   }, [resolvedId]);

//   useEffect(() => {
//     if (!deleted) {
//       fetchTransferDetails();
//     }
//   }, [resolvedId, deleted, fetchTransferDetails]);

//   useEffect(() => {
//     if (deleted) {
//       router.push('/transfers');
//       router.refresh();
//     }
//   }, [deleted, router]);

//   if (deleted) {
//     return <div>Redirecting...</div>;
//   }

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-[400px]">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
//       </div>
//     );
//   }

//   if (!transfer) {
//     return <div>Transfer not found</div>;
//   }

//   // Delete handler
//   async function handleDelete() {
//     if (!window.confirm('Are you sure you want to delete this transfer request?')) return;
//     try {
//       setLoading(true);
//       const response = await fetch(`/api/transfers/${resolvedId}`, { method: 'DELETE' });
//       if (!response.ok) throw new Error('Failed to delete transfer');
//       toast.success('Transfer request deleted');
//       setDeleted(true);
//     } catch (error) {
//       toast.error('Failed to delete transfer');
//     } finally {
//       setLoading(false);
//     }
//   }

//   // Complete transfer handler
//   async function handleCompleteTransfer() {
//     try {
//       setLoading(true);
//       const response = await fetch(`/api/transfers/${resolvedId}/complete`, { method: 'POST' });
//       if (!response.ok) throw new Error('Failed to complete transfer');
//       toast.success('Transfer marked as completed.');
//       fetchTransferDetails();
//     } catch (error) {
//       toast.error('Failed to complete transfer');
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <div className="max-w-2xl mx-auto">
//         <div className="flex justify-between items-center mb-8 border-b pb-4">
//           <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-300">Transfer Details</h1>
//           <RoleBasedBadge label={transfer.status} className="text-lg" />
//         </div>

//         <div className="bg-white shadow-xl rounded-2xl p-8 space-y-8 border border-gray-200 dark:bg-gray-800">
//           <section className='dark:bg-gray-800'>
//             <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-400 border-b pb-1">Asset Information</h2>
//             <div className="grid grid-cols-2 gap-4 text-gray-600 dark:text-gray-400">
//               <div><b>Name:</b> {transfer.asset?.name}</div>
//               <div><b>Serial Number:</b> {transfer.asset?.serialNumber}</div>
//               {transfer.asset?.status && <div><b>Status:</b> {transfer.asset.status}</div>}
//               {transfer.asset?.location && <div><b>Location:</b> {transfer.asset.location}</div>}
//               {transfer.asset?.currentValue !== undefined && <div><b>Value:</b> ${transfer.asset.currentValue?.toLocaleString?.() ?? transfer.asset.currentValue}</div>}
//             </div>
//           </section>

//           <section>
//             <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-400 border-b pb-1">Requester Information</h2>
//             <div className="grid grid-cols-2 gap-4 text-gray-600 dark:text-gray-400">
//               <div><b>Name:</b> {transfer.requester?.name || 'Unknown'}</div>
//               <div><b>Email:</b> {transfer.requester?.email || 'Unknown'}</div>
//             </div>
//           </section>

//           <section className="grid grid-cols-2 gap-4">
//             <div>
//               <h3 className="font-medium text-gray-700 dark:text-gray-400">From Location</h3>
//               <p className="text-gray-600 dark:text-gray-400">{transfer.fromLocation}</p>
//             </div>
//             <div>
//               <h3 className="font-medium text-gray-700 dark:text-gray-400">To Location</h3>
//               <p className="text-gray-600 dark:text-gray-400">{transfer.toLocation}</p>
//             </div>
//           </section>

//           <section>
//             <h3 className="font-medium text-gray-700 dark:text-gray-400">Request Reason</h3>
//             <p className="text-gray-600 dark:text-gray-400 italic">{transfer.reason}</p>
//           </section>

//           {transfer.managerReason && (
//             <section>
//               <h3 className="font-medium text-gray-700 dark:text-gray-400">
//                 {transfer.status === 'APPROVED' ? 'Approval Reason' : 'Rejection Reason'}
//               </h3>
//               <p className="text-gray-600 dark:text-gray-400 italic">{transfer.managerReason}</p>
//             </section>
//           )}

//           <section className="grid grid-cols-2 gap-4">
//             <div>
//               <h3 className="font-medium text-gray-700 dark:text-gray-400">Request Date</h3>
//               <p className="text-gray-600 dark:text-gray-400">{new Date(transfer.createdAt).toLocaleDateString()}</p>
//             </div>
//             {transfer.status !== 'PENDING' && (
//               <div>
//                 <h3 className="font-medium text-gray-700 dark:text-gray-400">Response Date</h3>
//                 <p className="text-gray-600 dark:text-gray-400">{new Date(transfer.updatedAt).toLocaleDateString()}</p>
//               </div>
//             )}
//           </section>

//           {/* Only show document section to the requester */}
//           {session?.user?.id === transfer.requester?.id && transfer.document && (
//             <section className="border-t pt-6 mt-6 dark:bg-gray-800">
//               <h3 className="font-semibold mb-2 text-lg text-gray-800 dark:text-gray-400">Official Transfer Document</h3>
//               <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 flex flex-col gap-2">
//                 <div className="flex items-center space-x-3 mb-3">
//                   <div className="bg-red-100 p-2 rounded-full">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
//                     </svg>
//                   </div>
//                   <div>
//                     <h4 className="font-semibold text-md">
//                       {transfer.status === 'APPROVED' ? 'Transfer Approval Document' : 'Transfer Rejection Document'}
//                     </h4>
//                     <p className="text-sm text-gray-600 dark:text-gray-400">
//                       This document serves as official proof of the transfer {transfer.status.toLowerCase()}.
//                     </p>
//                   </div>
//                 </div>
//                 <div className="flex justify-between items-center">
//                   <p className="text-sm text-gray-500 dark:text-gray-400">
//                     {transfer.status === 'APPROVED'
//                       ? 'You can use this document as proof that your transfer request was approved.'
//                       : 'This document contains the reason why your transfer request was rejected.'}
//                   </p>
//                   <a
//                     href={transfer.document.url}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center space-x-2 transition-colors shadow"
//                   >
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
//                     </svg>
//                     <span>Download Document</span>
//                   </a>
//                 </div>
//               </div>
//             </section>
//           )}

//           {/* Only show document not available message to the requester */}
//           {session?.user?.id === transfer.requester?.id &&
//            (transfer.status === 'APPROVED' || transfer.status === 'REJECTED') &&
//            !transfer.document && (
//             <section className="border-t pt-6 mt-6">
//               <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
//                 <h3 className="font-medium text-yellow-800">Document Not Available</h3>
//                 <p className="text-sm text-yellow-700 mt-1">
//                   The transfer document is not available yet. Please check back later or contact your manager.
//                 </p>
//               </div>
//             </section>
//           )}

//           <div className="flex justify-end space-x-4 pt-6">
//             <RoleBasedButton
//               variant="secondary"
//               onClick={() => router.push('/transfers')}
//             >
//               Back to List
//             </RoleBasedButton>
//             {/* Only show All Documents button to the requester */}
//             {session?.user?.id === transfer.requester?.id && transfer.document && (
//               <RoleBasedButton
//                 variant="secondary"
//                 onClick={() => router.push('/transfers/documents')}
//                 className="flex items-center space-x-2"
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                 </svg>
//                 <span>All My Documents</span>
//               </RoleBasedButton>
//             )}
//             {/* Show Complete Transfer button if approved and user is requester */}
//             {transfer.status === 'APPROVED' && session?.user?.id === transfer.requester?.id && (
//               <RoleBasedButton
//                 variant="success"
//                 onClick={handleCompleteTransfer}
//                 loading={loading}
//                 className="bg-green-600 hover:bg-green-700 text-white"
//               >
//                 Complete Transfer
//               </RoleBasedButton>
//             )}
//             {/* Show Edit button only if transfer is pending and user is the requester */}
//             {transfer.status === 'PENDING' &&
//               session?.user?.id === transfer.requester?.id && (
//                 <RoleBasedButton
//                   variant="primary"
//                   onClick={() => router.push(`/transfers/${transfer.id}/edit`)}
//                   className="text-[#ffffff] bg-gray-400 dark:bg-gray-700 dark:text-[#ffffff] mr-2"
//                 >
//                   Edit
//                 </RoleBasedButton>
//               )
//             }
//             {/* Only show Delete Transfer button if user is requester and status is PENDING */}
//             {transfer.status === 'PENDING' && session?.user?.id === transfer.requester?.id && (
//               <RoleBasedButton
//                 variant="danger"
//                 onClick={handleDelete}
//                 loading={loading}
//               >
//                 Delete Transfer
//               </RoleBasedButton>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
