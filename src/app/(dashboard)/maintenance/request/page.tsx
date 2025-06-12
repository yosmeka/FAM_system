// 'use client';

// import React, { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { toast } from 'react-hot-toast';
// import { useSession } from 'next-auth/react';
// import { useRole } from '@/hooks/useRole';

// interface Asset {
//   id: string;
//   name: string;
//   serialNumber?: string;
//   status?: string;
//   currentValue?: number;
// }

// export default function RequestMaintenancePage() {
//   const { data: session, status } = useSession();
//   const { isUser } = useRole();
//   const router = useRouter();
//   const [assets, setAssets] = useState<Asset[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);

//   // Form state
//   const [selectedAssetId, setSelectedAssetId] = useState('');
//   const [description, setDescription] = useState('');
//   const [priority, setPriority] = useState('MEDIUM');
//   const [notes, setNotes] = useState('');

//   // Redirect if not a user
//   useEffect(() => {
//     if (status === 'loading') return;

//     if (!session) {
//       router.replace('/login');
//       return;
//     }

//     if (!isUser()) {
//       router.replace('/dashboard');
//       toast.error('Only users can request maintenance.');
//       return;
//     }

//     // Load assets for the user to select
//     fetchUserAssets();
//   }, [session, status, router, isUser]);

//   const fetchUserAssets = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch('/api/assets/user');

//       if (!response.ok) {
//         throw new Error('Failed to fetch assets');
//       }

//       const data = await response.json();
//       setAssets(data);
//     } catch (error) {
//       console.error('Error fetching assets:', error);
//       toast.error('Failed to load assets. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!selectedAssetId) {
//       toast.error('Please select an asset');
//       return;
//     }

//     if (!description.trim()) {
//       toast.error('Please provide a description of the issue');
//       return;
//     }

//     try {
//       setSubmitting(true);

//       const payload = {
//         description,
//         priority,
//         notes,
//         status: 'PENDING_APPROVAL', // Initial status for user requests
//       };

//       const response = await fetch(`/api/assets/${selectedAssetId}/maintenance`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!response.ok) {
//         throw new Error('Failed to submit maintenance request');
//       }

//       toast.success('Maintenance request submitted successfully');

//       // Reset form
//       setSelectedAssetId('');
//       setDescription('');
//       setPriority('MEDIUM');
//       setNotes('');

//       // Redirect to dashboard or confirmation page
//       router.push('/dashboard');
//     } catch (error) {
//       console.error('Error submitting maintenance request:', error);
//       toast.error('Failed to submit maintenance request. Please try again.');
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
//         <h1 className="text-2xl font-semibold mb-6">Request Maintenance</h1>

//         <form onSubmit={handleSubmit} className="space-y-6">
//           <div>
//             <label htmlFor="asset" className="block text-sm font-medium text-gray-700 mb-1">
//               Select Asset *
//             </label>
//             <select
//               id="asset"
//               className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
//               value={selectedAssetId}
//               onChange={(e) => setSelectedAssetId(e.target.value)}
//               required
//             >
//               <option value="">-- Select an asset --</option>
//               {assets.map((asset) => (
//                 <option key={asset.id} value={asset.id}>
//                   {asset.name} {asset.serialNumber ? `(${asset.serialNumber})` : ''}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
//               Description of Issue *
//             </label>
//             <textarea
//               id="description"
//               rows={4}
//               className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
//               placeholder="Describe the issue with the asset that needs maintenance"
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               required
//             />
//           </div>

//           <div>
//             <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
//               Priority *
//             </label>
//             <select
//               id="priority"
//               className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
//               value={priority}
//               onChange={(e) => setPriority(e.target.value)}
//               required
//             >
//               <option value="LOW">Low</option>
//               <option value="MEDIUM">Medium</option>
//               <option value="HIGH">High</option>
//               <option value="CRITICAL">Critical</option>
//             </select>
//           </div>

//           <div>
//             <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
//               Additional Notes
//             </label>
//             <textarea
//               id="notes"
//               rows={2}
//               className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
//               placeholder="Any additional information that might be helpful"
//               value={notes}
//               onChange={(e) => setNotes(e.target.value)}
//             />
//           </div>

//           <div className="flex justify-end space-x-3 pt-4">
//             <button
//               type="button"
//               onClick={() => router.back()}
//               className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={submitting}
//               className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
//             >
//               {submitting ? 'Submitting...' : 'Submit Request'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
