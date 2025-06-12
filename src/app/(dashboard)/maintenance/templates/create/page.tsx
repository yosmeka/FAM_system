// 'use client';

// import { useState } from 'react';
// import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import { ArrowLeft, Save, X, Plus, Trash2 } from 'lucide-react';

// export default function CreateTemplatePage() {
//   const { data: session } = useSession();
//   const router = useRouter();
//   const [saving, setSaving] = useState(false);

//   // Form state
//   const [formData, setFormData] = useState({
//     name: '',
//     description: '',
//     maintenanceType: 'PREVENTIVE',
//     instructions: '',
//     estimatedHours: '',
//     safetyNotes: '',
//   });

//   const [checklistItems, setChecklistItems] = useState<string[]>(['']);
//   const [toolsRequired, setToolsRequired] = useState<string[]>(['']);
//   const [partsRequired, setPartsRequired] = useState<string[]>(['']);

//   // Check permissions
//   if (session?.user?.role !== 'MANAGER' && session?.user?.role !== 'ADMIN') {
//     return (
//       <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212332' }}>
//         <div className="text-center">
//           <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
//           <p className="text-gray-400 mb-4">You do nothave permission to create maintenance templates.</p>
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

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleArrayItemChange = (
//     array: string[],
//     setArray: React.Dispatch<React.SetStateAction<string[]>>,
//     index: number,
//     value: string
//   ) => {
//     const newArray = [...array];
//     newArray[index] = value;
//     setArray(newArray);
//   };

//   const addArrayItem = (
//     array: string[],
//     setArray: React.Dispatch<React.SetStateAction<string[]>>
//   ) => {
//     setArray([...array, '']);
//   };

//   const removeArrayItem = (
//     array: string[],
//     setArray: React.Dispatch<React.SetStateAction<string[]>>,
//     index: number
//   ) => {
//     if (array.length > 1) {
//       const newArray = array.filter((_, i) => i !== index);
//       setArray(newArray);
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!formData.name.trim() || !formData.description.trim()) {
//       alert('Please fill in all required fields');
//       return;
//     }

//     // Filter out empty items
//     const filteredChecklistItems = checklistItems.filter(item => item.trim() !== '');
//     const filteredToolsRequired = toolsRequired.filter(item => item.trim() !== '');
//     const filteredPartsRequired = partsRequired.filter(item => item.trim() !== '');

//     setSaving(true);

//     try {
//       const templateData = {
//         name: formData.name.trim(),
//         description: formData.description.trim(),
//         maintenanceType: formData.maintenanceType,
//         instructions: formData.instructions.trim() || undefined,
//         estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
//         safetyNotes: formData.safetyNotes.trim() || undefined,
//         checklistItems: filteredChecklistItems,
//         toolsRequired: filteredToolsRequired,
//         partsRequired: filteredPartsRequired,
//       };

//       const response = await fetch('/api/maintenance-templates', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(templateData),
//       });

//       if (response.ok) {
//         const createdTemplate = await response.json();
//         alert('Template created successfully!');
//         router.push(`/maintenance/templates/${createdTemplate.id}`);
//       } else {
//         const errorData = await response.json();
//         alert(`Failed to create template: ${errorData.error || 'Unknown error'}`);
//       }
//     } catch (error) {
//       console.error('Error creating template:', error);
//       alert('Failed to create template');
//     } finally {
//       setSaving(false);
//     }
//   };

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
//           <h1 className="text-2xl font-bold text-white">Create Maintenance Template</h1>
//           <p className="text-gray-400">Create a standardized maintenance procedure template</p>
//         </div>

//         <div className="flex gap-2">
//           <button
//             onClick={() => router.push('/maintenance/templates')}
//             className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 border border-gray-600 hover:bg-gray-700 transition-colors"
//           >
//             <X className="w-4 h-4" />
//             Cancel
//           </button>

//           <button
//             onClick={handleSubmit}
//             disabled={saving}
//             className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
//             style={{ backgroundColor: saving ? '#666' : '#2697FF' }}
//           >
//             <Save className="w-4 h-4" />
//             {saving ? 'Creating...' : 'Create Template'}
//           </button>
//         </div>
//       </div>

//       {/* Form */}
//       <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {/* Left Column */}
//           <div className="space-y-6">
//             {/* Basic Information */}
//             <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
//               <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>

//               <div className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-300 mb-2">
//                     Template Name *
//                   </label>
//                   <input
//                     type="text"
//                     name="name"
//                     value={formData.name}
//                     onChange={handleInputChange}
//                     required
//                     className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
//                     placeholder="e.g., Monthly HVAC Filter Replacement"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-300 mb-2">
//                     Description *
//                   </label>
//                   <textarea
//                     name="description"
//                     value={formData.description}
//                     onChange={handleInputChange}
//                     required
//                     rows={3}
//                     className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
//                     placeholder="Describe what this maintenance template covers..."
//                   />
//                 </div>

//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-2">
//                       Maintenance Type
//                     </label>
//                     <select
//                       name="maintenanceType"
//                       value={formData.maintenanceType}
//                       onChange={handleInputChange}
//                       className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
//                     >
//                       <option value="PREVENTIVE">Preventive</option>
//                       <option value="CORRECTIVE">Corrective</option>
//                       <option value="PREDICTIVE">Predictive</option>
//                       <option value="EMERGENCY">Emergency</option>
//                       <option value="ROUTINE">Routine</option>
//                     </select>
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-2">
//                       Estimated Hours
//                     </label>
//                     <input
//                       type="number"
//                       name="estimatedHours"
//                       value={formData.estimatedHours}
//                       onChange={handleInputChange}
//                       min="0"
//                       step="0.5"
//                       className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
//                       placeholder="e.g., 2.5"
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Instructions */}
//             <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
//               <h3 className="text-lg font-semibold text-white mb-4">Instructions</h3>

//               <div className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-300 mb-2">
//                     Detailed Instructions
//                   </label>
//                   <textarea
//                     name="instructions"
//                     value={formData.instructions}
//                     onChange={handleInputChange}
//                     rows={6}
//                     className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
//                     placeholder="Provide step-by-step instructions for this maintenance procedure..."
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-300 mb-2">
//                     Safety Notes
//                   </label>
//                   <textarea
//                     name="safetyNotes"
//                     value={formData.safetyNotes}
//                     onChange={handleInputChange}
//                     rows={3}
//                     className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
//                     placeholder="Important safety considerations and precautions..."
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Right Column */}
//           <div className="space-y-6">
//             {/* Checklist Items */}
//             <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-semibold text-white">Checklist Items</h3>
//                 <button
//                   type="button"
//                   onClick={() => addArrayItem(checklistItems, setChecklistItems)}
//                   className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white transition-colors"
//                   style={{ backgroundColor: '#2697FF' }}
//                 >
//                   <Plus className="w-3 h-3" />
//                   Add Item
//                 </button>
//               </div>

//               <div className="space-y-2">
//                 {checklistItems.map((item, index) => (
//                   <div key={index} className="flex gap-2">
//                     <input
//                       type="text"
//                       value={item}
//                       onChange={(e) => handleArrayItemChange(checklistItems, setChecklistItems, index, e.target.value)}
//                       className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
//                       placeholder={`Checklist item ${index + 1}`}
//                     />
//                     {checklistItems.length > 1 && (
//                       <button
//                         type="button"
//                         onClick={() => removeArrayItem(checklistItems, setChecklistItems, index)}
//                         className="p-2 text-red-400 hover:text-red-300 transition-colors"
//                       >
//                         <Trash2 className="w-4 h-4" />
//                       </button>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Tools Required */}
//             <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-semibold text-white">Tools Required</h3>
//                 <button
//                   type="button"
//                   onClick={() => addArrayItem(toolsRequired, setToolsRequired)}
//                   className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white transition-colors"
//                   style={{ backgroundColor: '#2697FF' }}
//                 >
//                   <Plus className="w-3 h-3" />
//                   Add Tool
//                 </button>
//               </div>

//               <div className="space-y-2">
//                 {toolsRequired.map((tool, index) => (
//                   <div key={index} className="flex gap-2">
//                     <input
//                       type="text"
//                       value={tool}
//                       onChange={(e) => handleArrayItemChange(toolsRequired, setToolsRequired, index, e.target.value)}
//                       className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
//                       placeholder={`Tool ${index + 1}`}
//                     />
//                     {toolsRequired.length > 1 && (
//                       <button
//                         type="button"
//                         onClick={() => removeArrayItem(toolsRequired, setToolsRequired, index)}
//                         className="p-2 text-red-400 hover:text-red-300 transition-colors"
//                       >
//                         <Trash2 className="w-4 h-4" />
//                       </button>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Parts Required */}
//             <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-semibold text-white">Parts Required</h3>
//                 <button
//                   type="button"
//                   onClick={() => addArrayItem(partsRequired, setPartsRequired)}
//                   className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white transition-colors"
//                   style={{ backgroundColor: '#2697FF' }}
//                 >
//                   <Plus className="w-3 h-3" />
//                   Add Part
//                 </button>
//               </div>

//               <div className="space-y-2">
//                 {partsRequired.map((part, index) => (
//                   <div key={index} className="flex gap-2">
//                     <input
//                       type="text"
//                       value={part}
//                       onChange={(e) => handleArrayItemChange(partsRequired, setPartsRequired, index, e.target.value)}
//                       className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
//                       placeholder={`Part ${index + 1}`}
//                     />
//                     {partsRequired.length > 1 && (
//                       <button
//                         type="button"
//                         onClick={() => removeArrayItem(partsRequired, setPartsRequired, index)}
//                         className="p-2 text-red-400 hover:text-red-300 transition-colors"
//                       >
//                         <Trash2 className="w-4 h-4" />
//                       </button>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </form>
//     </div>
//   );
// }
