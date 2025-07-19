// 'use client';

// import { useState, useEffect } from 'react';
// import { X, Calendar, Clock, User, FileText, AlertTriangle } from 'lucide-react';

// interface Asset {
//   id: string;
//   name: string;
//   serialNumber: string;
//   location: string;
//   department: string;
// }

// interface User {
//   id: string;
//   name: string;
//   email: string;
//   role: string;
// }

// interface MaintenanceTemplate {
//   id: string;
//   name: string;
//   description?: string;
//   maintenanceType: string;
//   priority: string;
//   estimatedHours?: number;
//   instructions?: string;
// }

// interface CreateScheduleModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onScheduleCreated: () => void;
// }

// export default function CreateScheduleModal({ isOpen, onClose, onScheduleCreated }: CreateScheduleModalProps) {
//   const [formData, setFormData] = useState({
//     assetId: '',
//     title: '',
//     description: '',
//     frequency: 'MONTHLY',
//     customInterval: '',
//     priority: 'MEDIUM',
//     estimatedHours: '',
//     assignedToId: '',
//     templateId: '',
//     startDate: '',
//     endDate: '',
//     leadTimeDays: '7',
//     autoAssign: true,
//   });

//   const [assets, setAssets] = useState<Asset[]>([]);
//   const [users, setUsers] = useState<User[]>([]);
//   const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [errors, setErrors] = useState<{ [key: string]: string }>({});

//   useEffect(() => {
//     if (isOpen) {
//       fetchAssets();
//       fetchUsers();
//       fetchTemplates();
//     }
//   }, [isOpen]);

//   const fetchAssets = async () => {
//     try {
//       const response = await fetch('/api/assets');
//       if (response.ok) {
//         const data = await response.json();
//         setAssets(data);
//       }
//     } catch (error) {
//       console.error('Error fetching assets:', error);
//     }
//   };

//   const fetchUsers = async () => {
//     try {
//       console.log('Fetching users with role=USER...');
//       const response = await fetch('/api/users?role=USER');
//       console.log('Users API response status:', response.status);

//       if (response.ok) {
//         const data = await response.json();
//         console.log('Fetched users:', data);
//         setUsers(data);
//       } else {
//         const errorData = await response.json().catch(() => ({}));
//         console.error('Failed to fetch users:', response.status, errorData);
//       }
//     } catch (error) {
//       console.error('Error fetching users:', error);
//     }
//   };

//   const fetchTemplates = async () => {
//     try {
//       const response = await fetch('/api/maintenance-templates?isActive=true');
//       if (response.ok) {
//         const data = await response.json();
//         setTemplates(data);
//       }
//     } catch (error) {
//       console.error('Error fetching templates:', error);
//     }
//   };

//   const handleTemplateChange = (templateId: string) => {
//     const template = templates.find(t => t.id === templateId);
//     if (template) {
//       setFormData(prev => ({
//         ...prev,
//         templateId,
//         priority: template.priority,
//         estimatedHours: template.estimatedHours?.toString() || prev.estimatedHours,
//         title: prev.title || `${template.name} - ${assets.find(a => a.id === prev.assetId)?.name || 'Asset'}`,
//       }));
//     } else {
//       setFormData(prev => ({ ...prev, templateId }));
//     }
//   };

//   const validateForm = () => {
//     const newErrors: { [key: string]: string } = {};

//     if (!formData.assetId) newErrors.assetId = 'Asset is required';
//     if (!formData.title) newErrors.title = 'Title is required';
//     if (!formData.frequency) newErrors.frequency = 'Frequency is required';
//     if (!formData.startDate) newErrors.startDate = 'Start date is required';

//     if (formData.frequency === 'CUSTOM' && !formData.customInterval) {
//       newErrors.customInterval = 'Custom interval is required';
//     }

//     if (formData.frequency === 'CUSTOM' && formData.customInterval && parseInt(formData.customInterval) <= 0) {
//       newErrors.customInterval = 'Custom interval must be greater than 0';
//     }

//     if (formData.estimatedHours && parseFloat(formData.estimatedHours) <= 0) {
//       newErrors.estimatedHours = 'Estimated hours must be greater than 0';
//     }

//     if (formData.leadTimeDays && parseInt(formData.leadTimeDays) < 0) {
//       newErrors.leadTimeDays = 'Lead time cannot be negative';
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!validateForm()) {
//       return;
//     }

//     setLoading(true);
//     try {
//       const submitData = {
//         ...formData,
//         customInterval: formData.frequency === 'CUSTOM' ? parseInt(formData.customInterval) : null,
//         estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
//         leadTimeDays: parseInt(formData.leadTimeDays),
//         assignedToId: formData.assignedToId || null,
//         templateId: formData.templateId || null,
//         endDate: formData.endDate || null,
//       };

//       const response = await fetch('/api/maintenance-schedules', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(submitData),
//       });

//       if (response.ok) {
//         onScheduleCreated();
//         resetForm();
//       } else {
//         const errorData = await response.json();
//         setErrors({ submit: errorData.error || 'Failed to create schedule' });
//       }
//     } catch (error) {
//       console.error('Error creating schedule:', error);
//       setErrors({ submit: 'Failed to create schedule' });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const resetForm = () => {
//     setFormData({
//       assetId: '',
//       title: '',
//       description: '',
//       frequency: 'MONTHLY',
//       customInterval: '',
//       priority: 'MEDIUM',
//       estimatedHours: '',
//       assignedToId: '',
//       templateId: '',
//       startDate: '',
//       endDate: '',
//       leadTimeDays: '7',
//       autoAssign: true,
//     });
//     setErrors({});
//   };

//   const handleClose = () => {
//     resetForm();
//     onClose();
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div
//         className="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
//         style={{ backgroundColor: '#2A2D3E' }}
//       >
//         {/* Header */}
//         <div className="flex justify-between items-center p-6 border-b border-gray-600">
//           <h2 className="text-xl font-semibold text-white">Create Maintenance Schedule</h2>
//           <button
//             onClick={handleClose}
//             className="text-gray-400 hover:text-white transition-colors"
//           >
//             <X className="w-6 h-6" />
//           </button>
//         </div>

//         {/* Form */}
//         <form onSubmit={handleSubmit} className="p-6">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {/* Asset Selection */}
//             <div>
//               <label className="block text-sm font-medium text-white mb-2">
//                 Asset *
//               </label>
//               <select
//                 value={formData.assetId}
//                 onChange={(e) => setFormData(prev => ({ ...prev, assetId: e.target.value }))}
//                 className="w-full p-3 rounded-lg border border-gray-600 text-white"
//                 style={{ backgroundColor: '#212332' }}
//               >
//                 <option value="">Select an asset</option>
//                 {assets.map((asset) => (
//                   <option key={asset.id} value={asset.id}>
//                     {asset.name} ({asset.serialNumber}) - {asset.location}
//                   </option>
//                 ))}
//               </select>
//               {errors.assetId && <p className="text-red-400 text-sm mt-1">{errors.assetId}</p>}
//             </div>

//             {/* Template Selection */}
//             <div>
//               <label className="block text-sm font-medium text-white mb-2">
//                 Maintenance Template
//               </label>
//               <select
//                 value={formData.templateId}
//                 onChange={(e) => handleTemplateChange(e.target.value)}
//                 className="w-full p-3 rounded-lg border border-gray-600 text-white"
//                 style={{ backgroundColor: '#212332' }}
//               >
//                 <option value="">Select a template (optional)</option>
//                 {templates.map((template) => (
//                   <option key={template.id} value={template.id}>
//                     {template.name} ({template.maintenanceType})
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Title */}
//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-white mb-2">
//                 Schedule Title *
//               </label>
//               <input
//                 type="text"
//                 value={formData.title}
//                 onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
//                 className="w-full p-3 rounded-lg border border-gray-600 text-white"
//                 style={{ backgroundColor: '#212332' }}
//                 placeholder="e.g., Monthly HVAC Filter Replacement"
//               />
//               {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
//             </div>

//             {/* Description */}
//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-white mb-2">
//                 Description
//               </label>
//               <textarea
//                 value={formData.description}
//                 onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
//                 rows={3}
//                 className="w-full p-3 rounded-lg border border-gray-600 text-white"
//                 style={{ backgroundColor: '#212332' }}
//                 placeholder="Describe the maintenance schedule..."
//               />
//             </div>
//           </div>

//           {/* Frequency and Schedule Settings */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
//             {/* Frequency */}
//             <div>
//               <label className="block text-sm font-medium text-white mb-2">
//                 Frequency *
//               </label>
//               <select
//                 value={formData.frequency}
//                 onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
//                 className="w-full p-3 rounded-lg border border-gray-600 text-white"
//                 style={{ backgroundColor: '#212332' }}
//               >
//                 <option value="DAILY">Daily</option>
//                 <option value="WEEKLY">Weekly</option>
//                 <option value="MONTHLY">Monthly</option>
//                 <option value="QUARTERLY">Quarterly</option>
//                 <option value="SEMI_ANNUALLY">Semi-Annually</option>
//                 <option value="ANNUALLY">Annually</option>
//                 <option value="CUSTOM">Custom</option>
//               </select>
//               {errors.frequency && <p className="text-red-400 text-sm mt-1">{errors.frequency}</p>}
//             </div>

//             {/* Custom Interval */}
//             {formData.frequency === 'CUSTOM' && (
//               <div>
//                 <label className="block text-sm font-medium text-white mb-2">
//                   Custom Interval (Days) *
//                 </label>
//                 <input
//                   type="number"
//                   value={formData.customInterval}
//                   onChange={(e) => setFormData(prev => ({ ...prev, customInterval: e.target.value }))}
//                   className="w-full p-3 rounded-lg border border-gray-600 text-white"
//                   style={{ backgroundColor: '#212332' }}
//                   placeholder="e.g., 30"
//                   min="1"
//                 />
//                 {errors.customInterval && <p className="text-red-400 text-sm mt-1">{errors.customInterval}</p>}
//               </div>
//             )}

//             {/* Priority */}
//             <div>
//               <label className="block text-sm font-medium text-white mb-2">
//                 Priority
//               </label>
//               <select
//                 value={formData.priority}
//                 onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
//                 className="w-full p-3 rounded-lg border border-gray-600 text-white"
//                 style={{ backgroundColor: '#212332' }}
//               >
//                 <option value="LOW">Low</option>
//                 <option value="MEDIUM">Medium</option>
//                 <option value="HIGH">High</option>
//                 <option value="CRITICAL">Critical</option>
//               </select>
//             </div>

//             {/* Estimated Hours */}
//             <div>
//               <label className="block text-sm font-medium text-white mb-2">
//                 Estimated Hours
//               </label>
//               <input
//                 type="number"
//                 value={formData.estimatedHours}
//                 onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
//                 className="w-full p-3 rounded-lg border border-gray-600 text-white"
//                 style={{ backgroundColor: '#212332' }}
//                 placeholder="e.g., 2.5"
//                 min="0"
//                 step="0.5"
//               />
//               {errors.estimatedHours && <p className="text-red-400 text-sm mt-1">{errors.estimatedHours}</p>}
//             </div>
//           </div>

//           {/* Assignment and Dates */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
//             {/* Assigned Technician */}
//             <div>
//               <label className="block text-sm font-medium text-white mb-2">
//                 Assigned Technician
//               </label>
//               <select
//                 value={formData.assignedToId}
//                 onChange={(e) => setFormData(prev => ({ ...prev, assignedToId: e.target.value }))}
//                 className="w-full p-3 rounded-lg border border-gray-600 text-white"
//                 style={{ backgroundColor: '#212332' }}
//               >
//                 <option value="">Select a technician (optional)</option>
//                 {users.map((user) => (
//                   <option key={user.id} value={user.id}>
//                     {user.name} ({user.email})
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Lead Time */}
//             <div>
//               <label className="block text-sm font-medium text-white mb-2">
//                 Lead Time (Days)
//               </label>
//               <input
//                 type="number"
//                 value={formData.leadTimeDays}
//                 onChange={(e) => setFormData(prev => ({ ...prev, leadTimeDays: e.target.value }))}
//                 className="w-full p-3 rounded-lg border border-gray-600 text-white"
//                 style={{ backgroundColor: '#212332' }}
//                 placeholder="7"
//                 min="0"
//               />
//               {errors.leadTimeDays && <p className="text-red-400 text-sm mt-1">{errors.leadTimeDays}</p>}
//               <p className="text-gray-400 text-xs mt-1">
//                 Days before due date to generate maintenance task
//               </p>
//             </div>

//             {/* Start Date */}
//             <div>
//               <label className="block text-sm font-medium text-white mb-2">
//                 Start Date *
//               </label>
//               <input
//                 type="date"
//                 value={formData.startDate}
//                 onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
//                 className="w-full p-3 rounded-lg border border-gray-600 text-white"
//                 style={{ backgroundColor: '#212332' }}
//               />
//               {errors.startDate && <p className="text-red-400 text-sm mt-1">{errors.startDate}</p>}
//             </div>

//             {/* End Date */}
//             <div>
//               <label className="block text-sm font-medium text-white mb-2">
//                 End Date (Optional)
//               </label>
//               <input
//                 type="date"
//                 value={formData.endDate}
//                 onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
//                 className="w-full p-3 rounded-lg border border-gray-600 text-white"
//                 style={{ backgroundColor: '#212332' }}
//               />
//               <p className="text-gray-400 text-xs mt-1">
//                 Leave empty for indefinite schedule
//               </p>
//             </div>
//           </div>

//           {/* Auto-assign checkbox */}
//           <div className="mt-6">
//             <label className="flex items-center gap-3">
//               <input
//                 type="checkbox"
//                 checked={formData.autoAssign}
//                 onChange={(e) => setFormData(prev => ({ ...prev, autoAssign: e.target.checked }))}
//                 className="w-4 h-4 rounded border-gray-600"
//                 style={{ backgroundColor: '#212332' }}
//               />
//               <span className="text-white">
//                 Automatically assign generated tasks to selected technician
//               </span>
//             </label>
//           </div>

//           {/* Error Message */}
//           {errors.submit && (
//             <div className="mt-4 p-3 rounded-lg bg-red-900 border border-red-700">
//               <p className="text-red-200 text-sm">{errors.submit}</p>
//             </div>
//           )}

//           {/* Action Buttons */}
//           <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-600">
//             <button
//               type="button"
//               onClick={handleClose}
//               className="px-6 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white transition-colors"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={loading}
//               className="px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
//               style={{ backgroundColor: '#2697FF' }}
//             >
//               {loading ? 'Creating...' : 'Create Schedule'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
