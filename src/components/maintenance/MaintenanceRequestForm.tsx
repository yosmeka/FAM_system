// 'use client';

// import React, { useState, useEffect } from 'react';
// import { useSession } from 'next-auth/react';
// import { toast } from 'react-hot-toast';
// import { AlertTriangle, Clock, X } from 'lucide-react';

// interface Asset {
//   id: string;
//   name: string;
//   serialNumber: string;
//   location: string;
//   status: string;
// }

// interface MaintenanceRequestFormProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onRequestCreated: () => void;
//   preSelectedAssetId?: string;
// }

// const ISSUE_TYPES = [
//   'Equipment Failure',
//   'Performance Issue',
//   'Safety Concern',
//   'Unusual Noise/Vibration',
//   'Electrical Problem',
//   'Mechanical Problem',
//   'Software/Control Issue',
//   'Preventive Maintenance Due',
//   'Other'
// ];

// const URGENCY_LEVELS = [
//   { value: 'Immediate', label: 'Immediate', color: 'text-red-600', description: 'Asset down, production stopped' },
//   { value: 'Urgent', label: 'Urgent', color: 'text-orange-600', description: 'Asset degraded, needs attention soon' },
//   { value: 'Normal', label: 'Normal', color: 'text-yellow-600', description: 'Standard maintenance request' },
//   { value: 'Low', label: 'Low', color: 'text-green-600', description: 'Non-critical, can be scheduled' }
// ];

// const PRIORITY_MAPPING = {
//   'Immediate': 'CRITICAL',
//   'Urgent': 'HIGH',
//   'Normal': 'MEDIUM',
//   'Low': 'LOW'
// };

// export default function MaintenanceRequestForm({ 
//   isOpen, 
//   onClose, 
//   onRequestCreated,
//   preSelectedAssetId 
// }: MaintenanceRequestFormProps) {
//   const { data: session } = useSession();
//   const [assets, setAssets] = useState<Asset[]>([]);
//   const [managers, setManagers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [submitting, setSubmitting] = useState(false);

//   // Form state
//   const [selectedAssetId, setSelectedAssetId] = useState(preSelectedAssetId || '');
//   const [issueType, setIssueType] = useState('');
//   const [urgencyLevel, setUrgencyLevel] = useState('Normal');
//   const [description, setDescription] = useState('');
//   const [impactDescription, setImpactDescription] = useState('');
//   const [assetDowntime, setAssetDowntime] = useState(false);
//   const [managerId, setManagerId] = useState('');
//   const [notes, setNotes] = useState('');

//   useEffect(() => {
//     if (isOpen) {
//       fetchAssets();
//       fetchManagers();
//     }
//   }, [isOpen]);

//   const fetchAssets = async () => {
//     try {
//       const response = await fetch('/api/assets');
//       if (response.ok) {
//         const data = await response.json();
//         setAssets(data.filter((asset: Asset) => asset.status === 'ACTIVE'));
//       }
//     } catch (error) {
//       console.error('Error fetching assets:', error);
//     }
//   };

//   const fetchManagers = async () => {
//     try {
//       const response = await fetch('/api/managers');
//       if (response.ok) {
//         const data = await response.json();
//         setManagers(data);
//       }
//     } catch (error) {
//       console.error('Error fetching managers:', error);
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!selectedAssetId) {
//       toast.error('Please select an asset');
//       return;
//     }
    
//     if (!issueType) {
//       toast.error('Please select an issue type');
//       return;
//     }
    
//     if (!description.trim()) {
//       toast.error('Please provide a description of the issue');
//       return;
//     }

//     if (!managerId) {
//       toast.error('Please select a manager to review this request');
//       return;
//     }
    
//     try {
//       setSubmitting(true);
      
//       const payload = {
//         description,
//         priority: PRIORITY_MAPPING[urgencyLevel as keyof typeof PRIORITY_MAPPING],
//         notes,
//         maintenanceType: 'CORRECTIVE',
//         status: 'PENDING_APPROVAL',
//         managerId,
//         issueType,
//         urgencyLevel,
//         assetDowntime,
//         impactDescription: impactDescription.trim() || undefined,
//         reportedBy: session?.user?.name || 'Unknown'
//       };
      
//       const response = await fetch(`/api/assets/${selectedAssetId}/maintenance`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });
      
//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || 'Failed to submit maintenance request');
//       }
      
//       toast.success('Maintenance request submitted successfully!');
//       onRequestCreated();
//       onClose();
      
//       // Reset form
//       setSelectedAssetId(preSelectedAssetId || '');
//       setIssueType('');
//       setUrgencyLevel('Normal');
//       setDescription('');
//       setImpactDescription('');
//       setAssetDowntime(false);
//       setManagerId('');
//       setNotes('');
      
//     } catch (error) {
//       console.error('Error submitting maintenance request:', error);
//       toast.error(error instanceof Error ? error.message : 'Failed to submit maintenance request');
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (!isOpen) return null;

//   const selectedUrgency = URGENCY_LEVELS.find(level => level.value === urgencyLevel);

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
//         {/* Header */}
//         <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
//           <div className="flex items-center gap-3">
//             <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
//               Report Maintenance Issue
//             </h2>
//           </div>
//           <button
//             onClick={onClose}
//             className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
//           >
//             <X className="w-6 h-6" />
//           </button>
//         </div>

//         <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
//           {/* Asset Selection */}
//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Asset <span className="text-red-500">*</span>
//             </label>
//             <select
//               value={selectedAssetId}
//               onChange={(e) => setSelectedAssetId(e.target.value)}
//               className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
//               required
//             >
//               <option value="">Select an asset...</option>
//               {assets.map((asset) => (
//                 <option key={asset.id} value={asset.id}>
//                   {asset.name} ({asset.serialNumber}) - {asset.location}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Issue Type */}
//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Issue Type <span className="text-red-500">*</span>
//             </label>
//             <select
//               value={issueType}
//               onChange={(e) => setIssueType(e.target.value)}
//               className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
//               required
//             >
//               <option value="">Select issue type...</option>
//               {ISSUE_TYPES.map((type) => (
//                 <option key={type} value={type}>
//                   {type}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Urgency Level */}
//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Urgency Level <span className="text-red-500">*</span>
//             </label>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//               {URGENCY_LEVELS.map((level) => (
//                 <label
//                   key={level.value}
//                   className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
//                     urgencyLevel === level.value
//                       ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
//                       : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
//                   }`}
//                 >
//                   <input
//                     type="radio"
//                     name="urgencyLevel"
//                     value={level.value}
//                     checked={urgencyLevel === level.value}
//                     onChange={(e) => setUrgencyLevel(e.target.value)}
//                     className="sr-only"
//                   />
//                   <div className="flex-1">
//                     <div className={`font-medium ${level.color}`}>
//                       {level.label}
//                     </div>
//                     <div className="text-sm text-gray-600 dark:text-gray-400">
//                       {level.description}
//                     </div>
//                   </div>
//                   {urgencyLevel === level.value && (
//                     <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
//                   )}
//                 </label>
//               ))}
//             </div>
//           </div>

//           {/* Asset Downtime */}
//           <div className="mb-6">
//             <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
//               <input
//                 type="checkbox"
//                 checked={assetDowntime}
//                 onChange={(e) => setAssetDowntime(e.target.checked)}
//                 className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//               />
//               <div className="flex items-center gap-2">
//                 <AlertTriangle className="w-5 h-5 text-red-500" />
//                 <span className="font-medium text-gray-900 dark:text-white">
//                   Asset is currently down/unusable
//                 </span>
//               </div>
//             </label>
//           </div>

//           {/* Description */}
//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Issue Description <span className="text-red-500">*</span>
//             </label>
//             <textarea
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               rows={4}
//               className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
//               placeholder="Describe the issue in detail..."
//               required
//             />
//           </div>

//           {/* Impact Description */}
//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Operational Impact
//             </label>
//             <textarea
//               value={impactDescription}
//               onChange={(e) => setImpactDescription(e.target.value)}
//               rows={3}
//               className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
//               placeholder="How does this issue affect operations? (optional)"
//             />
//           </div>

//           {/* Manager Selection */}
//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Report to Manager <span className="text-red-500">*</span>
//             </label>
//             <select
//               value={managerId}
//               onChange={(e) => setManagerId(e.target.value)}
//               className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
//               required
//             >
//               <option value="">Select a manager...</option>
//               {managers.map((manager) => (
//                 <option key={manager.id} value={manager.id}>
//                   {manager.name} ({manager.email})
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Additional Notes */}
//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Additional Notes
//             </label>
//             <textarea
//               value={notes}
//               onChange={(e) => setNotes(e.target.value)}
//               rows={3}
//               className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
//               placeholder="Any additional information..."
//             />
//           </div>

//           {/* Submit Buttons */}
//           <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end items-center gap-4">
//             <button
//               type="button"
//               onClick={onClose}
//               className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={submitting}
//               className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
//             >
//               {submitting ? 'Submitting...' : 'Submit Request'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
