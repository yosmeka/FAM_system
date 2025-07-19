// 'use client';

// import { useState, useEffect, use, useCallback } from 'react';
// import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import { ArrowLeft, Edit, Trash2, CheckCircle, Wrench, Package, AlertTriangle } from 'lucide-react';

// interface MaintenanceTemplate {
//   id: string;
//   name: string;
//   description: string;
//   maintenanceType: string;
//   instructions?: string;
//   estimatedHours?: number;
//   checklistItems: string[];
//   toolsRequired: string[];
//   partsRequired: string[];
//   safetyNotes?: string;
//   createdAt: string;
//   createdBy: {
//     id: string;
//     name: string;
//     email: string;
//   };
//   maintenanceSchedules: Array<{
//     id: string;
//     title: string;
//     asset: {
//       name: string;
//       serialNumber: string;
//     };
//   }>;
// }

// export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const resolvedParams = use(params);
//   const [template, setTemplate] = useState<MaintenanceTemplate | null>(null);
//   const [loading, setLoading] = useState(true);

//   const fetchTemplate = useCallback(async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(`/api/maintenance-templates/${resolvedParams.id}`);
//       if (!response.ok) throw new Error('Failed to fetch template');

//       const data = await response.json();
//       setTemplate(data);
//     } catch (error) {
//       console.error('Error fetching template:', error);
//     } finally {
//       setLoading(false);
//     }
//   }, [resolvedParams.id]);

//   useEffect(() => {
//     fetchTemplate();
//   }, [fetchTemplate]);

//   // Show nothing until session is loaded
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

//   const deleteTemplate = async () => {
//     if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
//       return;
//     }

//     try {
//       const response = await fetch(`/api/maintenance-templates/${resolvedParams.id}`, {
//         method: 'DELETE',
//       });

//       if (response.ok) {
//         alert('Template deleted successfully');
//         router.push('/maintenance/templates');
//       } else {
//         const errorData = await response.json().catch(() => ({}));
//         alert(`Failed to delete template: ${errorData.error || 'Unknown error'}`);
//       }
//     } catch (error) {
//       console.error('Error deleting template:', error);
//       alert('Failed to delete template');
//     }
//   };

//   const canManageTemplate = () => {
//     return session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN';
//   };

//   const getMaintenanceTypeColor = (type: string) => {
//     switch (type.toUpperCase()) {
//       case 'PREVENTIVE': return 'bg-green-600';
//       case 'CORRECTIVE': return 'bg-orange-600';
//       case 'PREDICTIVE': return 'bg-blue-600';
//       case 'EMERGENCY': return 'bg-red-600';
//       case 'ROUTINE': return 'bg-gray-600';
//       default: return 'bg-gray-600';
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212332' }}>
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: '#2697FF' }}></div>
//       </div>
//     );
//   }

//   if (!template) {
//     return (
//       <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212332' }}>
//         <div className="text-center">
//           <h2 className="text-xl font-semibold text-white mb-2">Template Not Found</h2>
//           <p className="text-gray-400 mb-4">The maintenance template you are looking for does not exist.</p>
//           <button
//             onClick={() => router.push('/maintenance/templates')}
//             className="px-4 py-2 rounded-lg text-white transition-colors"
//             style={{ backgroundColor: '#2697FF' }}
//           >
//             Back to Templates
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen p-6" style={{ backgroundColor: '#212332' }}>
//       {/* Header */}
//       <div className="flex items-center gap-4 mb-6">
//         <button
//           onClick={() => router.push('/maintenance/templates')}
//           className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
//         >
//           <ArrowLeft className="w-5 h-5" />
//         </button>
//         <div className="flex-1">
//           <div className="flex items-center gap-3 mb-2">
//             <h1 className="text-2xl font-bold text-white">
//               {template.name}
//             </h1>
//             <span className={`px-3 py-1 rounded text-sm font-medium text-white ${getMaintenanceTypeColor(template.maintenanceType)}`}>
//               {template.maintenanceType}
//             </span>
//           </div>
//           <p className="text-gray-400">{template.description}</p>
//         </div>

//         {/* Manager Actions */}
//         {canManageTemplate() && (
//           <div className="flex gap-2">
//             <button
//               onClick={() => router.push(`/maintenance/templates/${resolvedParams.id}/edit`)}
//               className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
//               style={{ backgroundColor: '#2697FF' }}
//             >
//               <Edit className="w-4 h-4" />
//               Edit Template
//             </button>

//             <button
//               onClick={deleteTemplate}
//               className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors bg-red-600 hover:bg-red-700"
//             >
//               <Trash2 className="w-4 h-4" />
//               Delete Template
//             </button>
//           </div>
//         )}
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Main Content */}
//         <div className="lg:col-span-2 space-y-6">
//           {/* Instructions */}
//           {template.instructions && (
//             <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
//               <h3 className="text-lg font-semibold text-white mb-4">Instructions</h3>
//               <div className="text-gray-300 whitespace-pre-wrap">
//                 {template.instructions}
//               </div>
//             </div>
//           )}

//           {/* Checklist */}
//           <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
//             <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
//               <CheckCircle className="w-5 h-5" />
//               Checklist Items ({template.checklistItems.length})
//             </h3>

//             {template.checklistItems.length > 0 ? (
//               <div className="space-y-2">
//                 {template.checklistItems.map((item, index) => (
//                   <div key={index} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
//                     <div className="w-5 h-5 border-2 border-gray-500 rounded flex-shrink-0"></div>
//                     <span className="text-gray-300">{item}</span>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-gray-400">No checklist items defined.</p>
//             )}
//           </div>

//           {/* Safety Notes */}
//           {template.safetyNotes && (
//             <div className="p-6 rounded-lg border-l-4 border-yellow-500" style={{ backgroundColor: '#2A2D3E' }}>
//               <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
//                 <AlertTriangle className="w-5 h-5 text-yellow-500" />
//                 Safety Notes
//               </h3>
//               <div className="text-gray-300 whitespace-pre-wrap">
//                 {template.safetyNotes}
//               </div>
//             </div>
//           )}

//           {/* Usage in Schedules */}
//           <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
//             <h3 className="text-lg font-semibold text-white mb-4">
//               Used in Schedules ({template.maintenanceSchedules.length})
//             </h3>

//             {template.maintenanceSchedules.length > 0 ? (
//               <div className="space-y-2">
//                 {template.maintenanceSchedules.map((schedule) => (
//                   <div
//                     key={schedule.id}
//                     className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
//                     onClick={() => router.push(`/maintenance/scheduled/${schedule.id}`)}
//                   >
//                     <div>
//                       <p className="text-white font-medium">{schedule.title}</p>
//                       <p className="text-gray-400 text-sm">
//                         {schedule.asset.name} ({schedule.asset.serialNumber})
//                       </p>
//                     </div>
//                     <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-gray-400">This template is not currently used in any schedules.</p>
//             )}
//           </div>
//         </div>

//         {/* Sidebar */}
//         <div className="space-y-6">
//           {/* Template Info */}
//           <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
//             <h3 className="text-lg font-semibold text-white mb-4">Template Info</h3>
//             <div className="space-y-3 text-sm">
//               <div>
//                 <span className="text-gray-400">Estimated Hours:</span>
//                 <p className="text-gray-300 font-medium">
//                   {template.estimatedHours ? `${template.estimatedHours}h` : 'Not specified'}
//                 </p>
//               </div>

//               <div>
//                 <span className="text-gray-400">Created by:</span>
//                 <p className="text-gray-300">{template.createdBy.name}</p>
//                 <p className="text-gray-500 text-xs">{template.createdBy.email}</p>
//               </div>

//               <div>
//                 <span className="text-gray-400">Created on:</span>
//                 <p className="text-gray-300">{new Date(template.createdAt).toLocaleDateString()}</p>
//               </div>
//             </div>
//           </div>

//           {/* Tools Required */}
//           <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
//             <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
//               <Wrench className="w-5 h-5" />
//               Tools Required ({template.toolsRequired.length})
//             </h3>

//             {template.toolsRequired.length > 0 ? (
//               <div className="space-y-2">
//                 {template.toolsRequired.map((tool, index) => (
//                   <div key={index} className="flex items-center gap-2 text-gray-300">
//                     <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
//                     <span>{tool}</span>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-gray-400">No tools specified.</p>
//             )}
//           </div>

//           {/* Parts Required */}
//           <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
//             <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
//               <Package className="w-5 h-5" />
//               Parts Required ({template.partsRequired.length})
//             </h3>

//             {template.partsRequired.length > 0 ? (
//               <div className="space-y-2">
//                 {template.partsRequired.map((part, index) => (
//                   <div key={index} className="flex items-center gap-2 text-gray-300">
//                     <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
//                     <span>{part}</span>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-gray-400">No parts specified.</p>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }