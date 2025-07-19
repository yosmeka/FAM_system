// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { RoleBasedForm } from '@/components/ui/RoleBasedForm';
// import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
// import { toast } from 'react-hot-toast';

// import { useSession } from 'next-auth/react';

// // Add types for Asset and Manager
// interface Asset {
//   id: string;
//   name: string;
//   serialNumber: string;
//   location: string;
//   status: string;
//   currentValue?: number;
// }
// interface Manager {
//   id: string;
//   name?: string;
//   email: string;
// }

// export default function NewTransferPage() {
//   const { data: session, status } = useSession();
//   const router = useRouter();

//   const [loading, setLoading] = useState(false);
//   const [assets, setAssets] = useState<Asset[]>([]);
//   const [managers, setManagers] = useState<Manager[]>([]);
//   const [assetsLoading, setAssetsLoading] = useState(true);
//   const [assetsError, setAssetsError] = useState<string | null>(null);
//   const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
//   const [selectedManager, setSelectedManager] = useState<string>('');

//   // Show nothing until session is loaded
//   if (status === 'loading'){
//     return (
//       <div className="flex justify-center items-center min-h-[400px]">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
//       </div>
//     );
//   }

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

//   useEffect(() => {
//     const fetchManagers = async () => {
//       try {
//         const response = await fetch('/api/users/managers');
//         if (!response.ok) throw new Error('Failed to fetch managers');
//         const data: Manager[] = await response.json();
//         setManagers(data);
//       } catch {
//         // Optionally handle error
//       }
//     };
//     const fetchAssets = async () => {
//       setAssetsLoading(true);
//       setAssetsError(null);
//       try {
//         const response = await fetch('/api/assets');
//         if (!response.ok) throw new Error('Failed to fetch assets');
//         const data: Asset[] = await response.json();
//         const activeAssets = data.filter((asset) => asset.status !== 'DISPOSED');
//         setAssets(activeAssets);
//       } catch (err) {
//         setAssetsError((err as Error).message || 'Failed to fetch assets');
//       } finally {
//         setAssetsLoading(false);
//       }
//     };
//     fetchAssets();
//     fetchManagers();
//   }, []);

//   //if (status === 'loading') return null;
//   if (!session || session.user.role !== 'USER') {
//     if (typeof window !== 'undefined') {
//       router.replace('/dashboard');
//       toast.error('Access denied: Only users can create transfer requests.');
//     }
//     return null;
//   }

//   const handleSubmit = async (formData: FormData) => {
//     if (!formData.get('assetId')) {
//       toast.error('Please select an asset.');
//       return;
//     }
//     if (!selectedAsset) {
//       toast.error('Please select an asset.');
//       return;
//     }
//     if (!selectedManager) {
//       toast.error('Please select a manager.');
//       return;
//     }

//     try {
//       setLoading(true);
//       const data = {
//         assetId: formData.get('assetId'),
//         fromLocation: selectedAsset?.location || '', // Use selected asset's location
//         toLocation: formData.get('toLocation'),
//         reason: formData.get('reason'),
//         managerId: selectedManager,
//       };

//       const response = await fetch('/api/transfers', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(data),
//       });

//       if (!response.ok) {
//         throw new Error('Failed to create transfer');
//       }

//       toast.success('Transfer request created successfully');
//       router.push('/transfers');
//       router.refresh();
//     } catch (error) {
//       console.error('Error:', error);
//       toast.error('Failed to create transfer request');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleAssetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const asset = assets.find(a => a.id === e.target.value);
//     if (asset?.status === 'DISPOSED') {
//       toast.error('Cannot transfer a disposed asset');
//       setSelectedAsset(null);
//       return;
//     }
//     setSelectedAsset(asset || null);
//   };

//   return (
//     <div className="container mx-auto p-6">
//       <div className="max-w-2xl mx-auto">
//         <h1 className="text-2xl font-semibold mb-6">New Transfer Request</h1>
        
//         <RoleBasedForm onSubmit={handleSubmit}>
//           <div className="space-y-4">
//             <div>
//               <label htmlFor="assetId" className="block text-sm font-medium">
//                 Asset
//               </label>
//               <select
//                 id="assetId"
//                 name="assetId"
//                 className="mt-1 block w-full rounded-md border border-gray-300 dark:bg-gray-800 p-2"
//                 required
//                 disabled={assetsLoading || !!assetsError}
//                 onChange={handleAssetChange}
//                 aria-describedby="assetHelp"
//               >
//                 <option value="">{assetsLoading ? 'Loading assets...' : assetsError ? 'Failed to load assets' : 'Select Asset'}</option>
//                 {assets.map(asset => (
//                   <option key={asset.id} value={asset.id}>
//                     {asset.name} ({asset.serialNumber}) - {asset.status}
//                   </option>
//                 ))}
//               </select>
//               <div id="assetHelp" className="text-xs text-gray-500 mt-1">
//                 {assetsLoading && 'Fetching available assets...'}
//                 {assetsError && <span className="text-red-500">{assetsError}</span>}
//                 {!assetsLoading && !assetsError && 'Choose the asset you want to transfer.'}
//               </div>
//               {selectedAsset && (
//                 <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 mt-2 border text-xs">
//                   <div><b>Serial:</b> {selectedAsset.serialNumber}</div>
//                   <div><b>Location:</b> {selectedAsset.location}</div>
//                   <div><b>Status:</b> {selectedAsset.status}</div>
//                   <div><b>Value:</b> ${selectedAsset.currentValue?.toLocaleString?.() ?? selectedAsset.currentValue}</div>
//                 </div>
//               )}
//             </div>

//             <div>
//               <label htmlFor="fromLocation" className="block text-sm font-medium">
//                 From Location
//               </label>
//               <input
//                 type="text"
//                 id="fromLocation"
//                 name="fromLocation"
//                 className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
//                 required
//                 value={selectedAsset?.location || ''}
//                 readOnly
//                 disabled
//               />
//             </div>

//             <div>
//               <label htmlFor="toLocation" className="block text-sm font-medium">
//                 To Location
//               </label>
//               <input
//                 type="text"
//                 id="toLocation"
//                 name="toLocation"
//                 className="mt-1 block w-full rounded-md border border-gray-300 dark:bg-gray-800 p-2"
//                 required
//               />
//             </div>

//             <div>
//               <label htmlFor="managerId" className="block text-sm font-medium">
//                 Assign to Manager
//               </label>
//               <select
//                 id="managerId"
//                 name="managerId"
//                 className="mt-1 block w-full rounded-md border border-gray-300 dark:bg-gray-800 p-2"
//                 required
//                 value={selectedManager}
//                 onChange={e => setSelectedManager(e.target.value)}
//               >
//                 <option value="">Select Manager</option>
//                 {managers.map((manager) => (
//                   <option key={manager.id} value={manager.id}>
//                     {manager.name || manager.email}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label htmlFor="reason" className="block text-sm font-medium">
//                 Reason
//               </label>
//               <textarea
//                 id="reason"
//                 name="reason"
//                 rows={3}
//                 className="mt-1 block w-full rounded-md border border-gray-300 dark:bg-gray-800 p-2"
//                 required
//               />
//             </div>

//             <div className="flex justify-end space-x-4 pt-4">
//               <RoleBasedButton
//                 type="button"
//                 variant="secondary"
//                 onClick={() => router.back()}
//               >
//                 Cancel
//               </RoleBasedButton>
//               <RoleBasedButton
//                 type="submit"
//                 variant="primary"
//                 loading={loading}
//                 className="bg-red-600 hover:bg-red-700 text-white"
//                 disabled={loading || assetsLoading || !!assetsError}
//               >
//                 {loading ? 'Submitting...' : 'Create Transfer'}
//               </RoleBasedButton>
//             </div>
//           </div>
//         </RoleBasedForm>
//       </div>
//     </div>
//   );
// }
