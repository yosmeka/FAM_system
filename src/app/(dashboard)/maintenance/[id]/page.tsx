// "use client";

// import { useState, useEffect, use } from "react";
// import { useSession } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import { ArrowLeft, CheckCircle, AlertCircle, Settings } from "lucide-react";
// import TaskWorkflowModal from "@/components/maintenance/TaskWorkflowModal";

// interface ChecklistItem {
//   id: number;
//   task: string;
//   completed: boolean;
//   completedAt?: string;
//   notes?: string;
// }

// interface MaintenanceTask {
//   id: string;
//   description: string;
//   priority: string;
//   status: string;
//   scheduledDate: string;
//   estimatedHours?: number;
//   actualHours?: number;
//   checklistItems?: string;
//   notes?: string;
//   completedAt?: string;
//   maintenanceType: string;
//   asset: {
//     id: string;
//     name: string;
//     serialNumber: string;
//     location: string;
//   };
//   schedule?: {
//     id: string;
//     title: string;
//     frequency: string;
//     template?: {
//       id: string;
//       name: string;
//       description?: string;
//       instructions?: string;
//       safetyNotes?: string;
//       toolsRequired?: string[];
//       partsRequired?: string[];
//       checklistItems?: string[];
//     };
//   };
//   template?: {
//     id: string;
//     name: string;
//     maintenanceType: string;
//     instructions?: string;
//   };
//   assignedTo?: {
//     id: string;
//     name: string;
//     email: string;
//   };
//   requester?: {
//     id: string;
//     name: string;
//     email: string;
//   };
// }

// export default function TaskDetailPage({
//   params,
// }: {
//   params: Promise<{ id: string }>;
// }) {
//   const { data: session } = useSession();
//   const router = useRouter();
//   const resolvedParams = use(params);
//   const [task, setTask] = useState<MaintenanceTask | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [showWorkflowModal, setShowWorkflowModal] = useState(false);
//   const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

//   // Show nothing until session is loaded
//   if (status === "loading") return null;

//   // If not allowed, show access denied
//   if (session?.user?.role === "AUDITOR") {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-900">
//         <div className="bg-white p-8 rounded shadow text-center">
//           <h1 className="text-2xl font-bold mb-2 text-red-600">
//             Access Denied
//           </h1>
//           <p className="text-gray-700">
//             You do not have permission to view this page.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   useEffect(() => {
//     fetchTask();
//   }, [resolvedParams.id]);

//   const fetchTask = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(`/api/maintenance/${resolvedParams.id}`);
//       if (!response.ok) throw new Error("Failed to fetch task");

//       const data = await response.json();
//       setTask(data);

//       // Parse checklist items - prioritize task progress over template, but use template for labels
//       let checklistToUse: ChecklistItem[] = [];

//       // First, try to parse existing task checklist (preserves progress)
//       let taskChecklistItems: any[] = [];
//       if (data.checklistItems) {
//         try {
//           const items = JSON.parse(data.checklistItems);
//           console.log("Parsed task checklist items:", items);
//           console.log("Task checklist type:", typeof items);
//           console.log("Task checklist is array:", Array.isArray(items));

//           if (Array.isArray(items)) {
//             taskChecklistItems = items;
//           }
//         } catch (e) {
//           console.error("Failed to parse task checklist:", e);
//         }
//       }

//       // Get template checklist for labels
//       let templateItems: ChecklistItem[] = [];
//       if (data.schedule?.template?.checklistItems) {
//         const templateData = data.schedule.template.checklistItems;
//         console.log("Template checklist items (raw):", templateData);
//         console.log("Template checklist type:", typeof templateData);

//         try {
//           // Parse the JSON string from template
//           const parsedTemplate =
//             typeof templateData === "string"
//               ? JSON.parse(templateData)
//               : templateData;
//           console.log("Parsed template data:", parsedTemplate);

//           if (Array.isArray(parsedTemplate)) {
//             templateItems = parsedTemplate.map((item: any, index: number) => {
//               if (typeof item === "object" && item !== null && item.task) {
//                 // Seeded data format: { id: 1, task: 'Turn off HVAC system', completed: false }
//                 return {
//                   id: item.id || index + 1,
//                   task: String(item.task),
//                   completed: false, // Always start fresh for new tasks
//                 };
//               } else if (typeof item === "string") {
//                 // Simple string format
//                 return {
//                   id: index + 1,
//                   task: item,
//                   completed: false,
//                 };
//               } else {
//                 // Fallback
//                 return {
//                   id: index + 1,
//                   task: `Checklist item ${index + 1}`,
//                   completed: false,
//                 };
//               }
//             });
//           }
//         } catch (e) {
//           console.error("Failed to parse template checklist:", e);
//         }
//       }

//       // Build final checklist - merge task progress with template labels
//       if (taskChecklistItems.length > 0) {
//         // Use existing task checklist but fix labels from template
//         checklistToUse = taskChecklistItems.map((item: any, index: number) => {
//           let taskText = "";

//           // First try to get text from template (most reliable)
//           if (templateItems[index] && templateItems[index].task) {
//             taskText = templateItems[index].task;
//           } else if (typeof item === "string") {
//             taskText = item;
//           } else if (typeof item === "object" && item !== null) {
//             // If it's an object, try to extract meaningful text
//             if (item.task) {
//               taskText = String(item.task);
//             } else if (item.text) {
//               taskText = String(item.text);
//             } else if (item.description) {
//               taskText = String(item.description);
//             } else {
//               // Fallback: use template or index-based naming
//               taskText =
//                 templateItems[index]?.task || `Checklist item ${index + 1}`;
//             }
//           } else {
//             taskText =
//               templateItems[index]?.task || `Checklist item ${index + 1}`;
//           }

//           return {
//             id: item.id || index + 1,
//             task: taskText,
//             completed: Boolean(item.completed),
//             completedAt: item.completedAt,
//             notes: item.notes,
//           };
//         });
//       } else if (templateItems.length > 0) {
//         // No task checklist, create from template
//         checklistToUse = templateItems;
//       }

//       console.log("Final checklist for task detail page:", checklistToUse);
//       setChecklist(checklistToUse);
//     } catch (error) {
//       console.error("Error fetching task:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case "SCHEDULED":
//         return "text-blue-400";
//       case "IN_PROGRESS":
//         return "text-yellow-400";
//       case "COMPLETED":
//         return "text-green-400";
//       case "CANCELLED":
//         return "text-red-400";
//       default:
//         return "text-gray-400";
//     }
//   };

//   const getStatusBgColor = (status: string) => {
//     switch (status) {
//       case "SCHEDULED":
//         return "bg-blue-100 text-blue-800";
//       case "IN_PROGRESS":
//         return "bg-yellow-100 text-yellow-800";
//       case "COMPLETED":
//         return "bg-green-100 text-green-800";
//       case "CANCELLED":
//         return "bg-red-100 text-red-800";
//       default:
//         return "bg-gray-100 text-gray-800";
//     }
//   };

//   const getPriorityColor = (priority: string) => {
//     switch (priority) {
//       case "CRITICAL":
//         return "text-red-400";
//       case "HIGH":
//         return "text-orange-400";
//       case "MEDIUM":
//         return "text-yellow-400";
//       case "LOW":
//         return "text-green-400";
//       default:
//         return "text-gray-400";
//     }
//   };

//   const getStatusIcon = (status: string) => {
//     switch (status) {
//       case "SCHEDULED":
//         return <Settings className="w-5 h-5" />;
//       case "IN_PROGRESS":
//         return <AlertCircle className="w-5 h-5" />;
//       case "COMPLETED":
//         return <CheckCircle className="w-5 h-5" />;
//       default:
//         return <Settings className="w-5 h-5" />;
//     }
//   };

//   const calculateProgress = () => {
//     if (checklist.length === 0) return 0;
//     const completedItems = checklist.filter((item) => item.completed).length;
//     return Math.round((completedItems / checklist.length) * 100);
//   };

//   const isOverdue = () => {
//     if (!task?.scheduledDate) return false;
//     return (
//       new Date(task.scheduledDate) < new Date() &&
//       !["COMPLETED", "CANCELLED"].includes(task.status)
//     );
//   };

//   const canWorkOnTask = () => {
//     return (
//       session?.user?.role === "USER" &&
//       task?.assignedTo?.id === session?.user?.id &&
//       ["SCHEDULED", "IN_PROGRESS"].includes(task?.status || "")
//     );
//   };

//   const canManageTask = () => {
//     return session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";
//   };

//   const canDeleteTask = () => {
//     return session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";
//   };

//   const deleteTask = async () => {
//     if (
//       !confirm(
//         "Are you sure you want to delete this maintenance task? This action cannot be undone."
//       )
//     ) {
//       return;
//     }

//     try {
//       const response = await fetch(`/api/maintenance/${task?.id}`, {
//         method: "DELETE",
//       });

//       if (response.ok) {
//         alert("Task deleted successfully");
//         router.push("/maintenance");
//       } else {
//         const errorData = await response.json().catch(() => ({}));
//         alert(`Failed to delete task: ${errorData.error || "Unknown error"}`);
//       }
//     } catch (error) {
//       console.error("Error deleting task:", error);
//       alert("Failed to delete task");
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-900">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 dark:border-red-400"></div>
//       </div>
//     );
//   }

//   if (!task) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <h2 className="text-xl font-semibold text-white mb-2">
//             Task Not Found
//           </h2>
//           <p className="text-gray-400 mb-4">
//             The maintenance task you are looking for does not exist.
//           </p>
//           <button
//             onClick={() => router.back()}
//             className="px-4 py-2 rounded-lg text-white transition-colors"
//             style={{ backgroundColor: "#2697FF" }}
//           >
//             Go Back
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen p-6">
//       {/* Header */}
//       <div className="flex items-center gap-4 mb-6">
//         <button
//           onClick={() => router.back()}
//           className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
//         >
//           <ArrowLeft className="w-5 h-5" />
//         </button>
//         <div>
//           <h1 className="text-2xl font-bold dark:text-white">
//             {task.schedule?.title || task.description}
//           </h1>
//           <p className="text-gray-400">
//             {task.asset.name} ({task.asset.serialNumber}) -{" "}
//             {task.asset.location}
//           </p>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Main Content */}
//         <div className="lg:col-span-2 space-y-6">
//           {/* Status and Actions */}
//           <div className="p-6 rounded-lg">
//             <div className="flex justify-between items-start mb-4">
//               <div className="flex items-center gap-3">
//                 <span className={getStatusColor(task.status)}>
//                   {getStatusIcon(task.status)}
//                 </span>
//                 <div>
//                   <span
//                     className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBgColor(
//                       task.status
//                     )}`}
//                   >
//                     {task.status}
//                   </span>
//                   <p className="text-gray-400 text-sm mt-1">
//                     {task.maintenanceType} Maintenance
//                   </p>
//                 </div>
//               </div>

//               {/* Debug Info */}
//               <div className="text-xs text-gray-500 mb-2">
//                 <p>User Role: {session?.user?.role}</p>
//                 <p>User ID: {session?.user?.id}</p>
//                 <p>Assigned To: {task.assignedTo?.id}</p>
//                 <p>Task Status: {task.status}</p>
//                 <p>Can Work: {canWorkOnTask() ? "Yes" : "No"}</p>
//               </div>

//               {/* Technician Actions */}
//               {canWorkOnTask() && (
//                 <button
//                   onClick={() => setShowWorkflowModal(true)}
//                   className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
//                   style={{ backgroundColor: "red" }}
//                 >
//                   {task.status === "SCHEDULED" ? (
//                     <>
//                       <Settings className="w-4 h-4" />
//                       Start Task
//                     </>
//                   ) : (
//                     <>
//                       <Settings className="w-4 h-4" />
//                       Work on Task
//                     </>
//                   )}
//                 </button>
//               )}

//               {/* Manager Actions */}
//               {canManageTask() && (
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => setShowWorkflowModal(true)}
//                     className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
//                     style={{ backgroundColor: "red" }}
//                   >
//                     <Settings className="w-4 h-4" />
//                     View/Edit Task
//                   </button>

//                   {canDeleteTask() && (
//                     <button
//                       onClick={deleteTask}
//                       className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors bg-red-600 hover:bg-red-700"
//                     >
//                       <Settings className="w-4 h-4" />
//                       Delete Task
//                     </button>
//                   )}
//                 </div>
//               )}

//               {/* Debug button for testing 
//               {!canWorkOnTask() && !canManageTask() && session?.user?.role === 'USER' && (
//                 <button
//                   onClick={() => setShowWorkflowModal(true)}
//                   className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors bg-orange-600"
//                 >
//                   <Settings className="w-4 h-4" />
//                   Debug: Work on Task
//                 </button>
//               )}*/}
//             </div>

//             {/* Progress Bar */}
//             {checklist.length > 0 && (
//               <div className="mb-4">
//                 <div className="flex justify-between text-sm mb-2">
//                   <span className="text-gray-300">Progress</span>
//                   <span className="text-gray-300">
//                     {calculateProgress()}% Complete
//                   </span>
//                 </div>
//                 <div className="w-full bg-gray-700 rounded-full h-2">
//                   <div
//                     className="h-2 rounded-full transition-all duration-300"
//                     style={{
//                       backgroundColor: "red",
//                       width: `${calculateProgress()}%`,
//                     }}
//                   ></div>
//                 </div>
//               </div>
//             )}

//             {/* Task Details */}
//             <div className="grid grid-cols-2 gap-4 text-sm">
//               <div>
//                 <span className="text-gray-400">Priority:</span>
//                 <span
//                   className={`ml-2 font-medium ${getPriorityColor(
//                     task.priority
//                   )}`}
//                 >
//                   {task.priority}
//                 </span>
//               </div>
//               <div>
//                 <span className="text-gray-400">Scheduled:</span>
//                 <span
//                   className={`ml-2 ${
//                     isOverdue() ? "text-red-400" : "text-gray-300"
//                   }`}
//                 >
//                   {new Date(task.scheduledDate).toLocaleDateString()}
//                   {isOverdue() && " (Overdue)"}
//                 </span>
//               </div>
//               {task.estimatedHours && (
//                 <div>
//                   <span className="text-gray-400">Estimated:</span>
//                   <span className="ml-2 text-gray-300">
//                     {task.estimatedHours}h
//                   </span>
//                 </div>
//               )}
//               {task.actualHours && (
//                 <div>
//                   <span className="text-gray-400">Actual:</span>
//                   <span className="ml-2 text-gray-300">
//                     {task.actualHours}h
//                   </span>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Description */}
//           <div className="p-6 rounded-lg">
//             <h3 className="text-lg font-semibold text-white mb-3">
//               Description
//             </h3>
//             <p className="text-gray-300">{task.description}</p>

//             {task.template?.instructions && (
//               <div className="mt-4">
//                 <h4 className="text-md font-medium text-white mb-2">
//                   Instructions
//                 </h4>
//                 <p className="text-gray-300 text-sm">
//                   {task.template.instructions}
//                 </p>
//               </div>
//             )}
//           </div>

//           {/* Checklist */}
//           {checklist.length > 0 && (
//             <div className="p-6 rounded-lg">
//               <h3 className="text-lg font-semibold text-white mb-4">
//                 Checklist
//               </h3>

//               <div className="space-y-3">
//                 {checklist.map((item, index) => (
//                   <div
//                     key={item.id || index}
//                     className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg"
//                   >
//                     <div
//                       className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
//                         item.completed
//                           ? "bg-green-500 border-green-500"
//                           : "border-gray-400"
//                       }`}
//                     >
//                       {item.completed && (
//                         <CheckCircle className="w-3 h-3 text-white" />
//                       )}
//                     </div>
//                     <div className="flex-1">
//                       <p
//                         className={`text-sm ${
//                           item.completed
//                             ? "line-through text-gray-500"
//                             : "text-gray-300"
//                         }`}
//                       >
//                         {typeof item.task === "string"
//                           ? item.task
//                           : String(item.task || "No task text")}
//                       </p>
//                       {item.completed && item.completedAt && (
//                         <p className="text-xs text-gray-500 mt-1">
//                           Completed:{" "}
//                           {new Date(item.completedAt).toLocaleString()}
//                         </p>
//                       )}
//                       {item.notes && (
//                         <p className="text-xs text-gray-400 mt-1">
//                           Note: {item.notes}
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Notes */}
//           {task.notes && (
//             <div
//               className="p-6 rounded-lg"
//               style={{ backgroundColor: "#2A2D3E" }}
//             >
//               <h3 className="text-lg font-semibold text-white mb-3">Notes</h3>
//               <p className="text-gray-300 whitespace-pre-wrap">{task.notes}</p>
//             </div>
//           )}
//         </div>

//         {/* Sidebar */}
//         <div className="space-y-6">
//           {/* Assignment Info */}
//           <div
//             className="p-6 rounded-lg"
//             style={{ backgroundColor: "#2A2D3E" }}
//           >
//             <h3 className="text-lg font-semibold text-white mb-4">
//               Assignment
//             </h3>
//             <div className="space-y-3 text-sm">
//               {task.assignedTo && (
//                 <div className="flex items-center gap-2">
//                   <Settings className="w-4 h-4 text-gray-400" />
//                   <div>
//                     <p className="text-gray-300">{task.assignedTo.name}</p>
//                     <p className="text-gray-500">{task.assignedTo.email}</p>
//                   </div>
//                 </div>
//               )}

//               {task.schedule && (
//                 <div className="flex items-center gap-2">
//                   <Settings className="w-4 h-4 text-gray-400" />
//                   <div>
//                     <p className="text-gray-300">From Schedule</p>
//                     <p className="text-gray-500">
//                       {task.schedule.frequency} maintenance
//                     </p>
//                   </div>
//                 </div>
//               )}

//               {task.template && (
//                 <div className="flex items-center gap-2">
//                   <Settings className="w-4 h-4 text-gray-400" />
//                   <div>
//                     <p className="text-gray-300">{task.template.name}</p>
//                     <p className="text-gray-500">
//                       {task.template.maintenanceType}
//                     </p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Timeline */}
//           {task.completedAt && (
//             <div
//               className="p-6 rounded-lg"
//               style={{ backgroundColor: "#2A2D3E" }}
//             >
//               <h3 className="text-lg font-semibold text-white mb-4">
//                 Timeline
//               </h3>
//               <div className="space-y-3 text-sm">
//                 <div className="flex items-center gap-2">
//                   <CheckCircle className="w-4 h-4 text-green-400" />
//                   <div>
//                     <p className="text-gray-300">Completed</p>
//                     <p className="text-gray-500">
//                       {new Date(task.completedAt).toLocaleString()}
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Task Workflow Modal */}
//       <TaskWorkflowModal
//         open={showWorkflowModal}
//         onClose={() => setShowWorkflowModal(false)}
//         taskId={task.id}
//         onTaskUpdated={fetchTask}
//       />
//     </div>
//   );
// }
// // 'use client';

// // import { useState, useEffect, use } from 'react';
// // import { useSession } from 'next-auth/react';
// // import { useRouter } from 'next/navigation';
// // import { ArrowLeft, CheckCircle, AlertCircle, Settings } from 'lucide-react';
// // import TaskWorkflowModal from '@/components/maintenance/TaskWorkflowModal';

// // interface ChecklistItem {
// //   id: number;
// //   task: string;
// //   completed: boolean;
// //   completedAt?: string;
// //   notes?: string;
// // }

// // interface MaintenanceTask {
// //   id: string;
// //   description: string;
// //   priority: string;
// //   status: string;
// //   scheduledDate: string;
// //   estimatedHours?: number;
// //   actualHours?: number;
// //   checklistItems?: string;
// //   notes?: string;
// //   completedAt?: string;
// //   maintenanceType: string;
// //   asset: {
// //     id: string;
// //     name: string;
// //     serialNumber: string;
// //     location: string;
// //   };
// //   schedule?: {
// //     id: string;
// //     title: string;
// //     frequency: string;
// //     template?: {
// //       id: string;
// //       name: string;
// //       description?: string;
// //       instructions?: string;
// //       safetyNotes?: string;
// //       toolsRequired?: string[];
// //       partsRequired?: string[];
// //       checklistItems?: string[];
// //     };
// //   };
// //   template?: {
// //     id: string;
// //     name: string;
// //     maintenanceType: string;
// //     instructions?: string;
// //   };
// //   assignedTo?: {
// //     id: string;
// //     name: string;
// //     email: string;
// //   };
// //   requester?: {
// //     id: string;
// //     name: string;
// //     email: string;
// //   };
// // }

// // export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
// //   const { data: session } = useSession();
// //   const router = useRouter();
// //   const resolvedParams = use(params);
// //   const [task, setTask] = useState<MaintenanceTask | null>(null);
// //   const [loading, setLoading] = useState(true);
// //   const [showWorkflowModal, setShowWorkflowModal] = useState(false);
// //   const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

// // // Show nothing until session is loaded
// //   if (status === 'loading') return null;

// //   // If not allowed, show access denied
// //   if (session?.user?.role === 'AUDITOR') {
// //     return (
// //       <div className="flex items-center justify-center min-h-screen bg-gray-900">
// //         <div className="bg-white p-8 rounded shadow text-center">
// //           <h1 className="text-2xl font-bold mb-2 text-red-600">Access Denied</h1>
// //           <p className="text-gray-700">You do not have permission to view this page.</p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   useEffect(() => {
// //     fetchTask();
// //   }, [resolvedParams.id]);

// //   const fetchTask = async () => {
// //     try {
// //       setLoading(true);
// //       const response = await fetch(`/api/maintenance/${resolvedParams.id}`);
// //       if (!response.ok) throw new Error('Failed to fetch task');

// //       const data = await response.json();
// //       setTask(data);

// //       // Parse checklist items - prioritize task progress over template, but use template for labels
// //       let checklistToUse: ChecklistItem[] = [];

// //       // First, try to parse existing task checklist (preserves progress)
// //       let taskChecklistItems: any[] = [];
// //       if (data.checklistItems) {
// //         try {
// //           const items = JSON.parse(data.checklistItems);
// //           console.log('Parsed task checklist items:', items);
// //           console.log('Task checklist type:', typeof items);
// //           console.log('Task checklist is array:', Array.isArray(items));

// //           if (Array.isArray(items)) {
// //             taskChecklistItems = items;
// //           }
// //         } catch (e) {
// //           console.error('Failed to parse task checklist:', e);
// //         }
// //       }

// //       // Get template checklist for labels
// //       let templateItems: ChecklistItem[] = [];
// //       if (data.schedule?.template?.checklistItems) {
// //         const templateData = data.schedule.template.checklistItems;
// //         console.log('Template checklist items (raw):', templateData);
// //         console.log('Template checklist type:', typeof templateData);

// //         try {
// //           // Parse the JSON string from template
// //           const parsedTemplate = typeof templateData === 'string' ? JSON.parse(templateData) : templateData;
// //           console.log('Parsed template data:', parsedTemplate);

// //           if (Array.isArray(parsedTemplate)) {
// //             templateItems = parsedTemplate.map((item: any, index: number) => {
// //               if (typeof item === 'object' && item !== null && item.task) {
// //                 // Seeded data format: { id: 1, task: 'Turn off HVAC system', completed: false }
// //                 return {
// //                   id: item.id || index + 1,
// //                   task: String(item.task),
// //                   completed: false, // Always start fresh for new tasks
// //                 };
// //               } else if (typeof item === 'string') {
// //                 // Simple string format
// //                 return {
// //                   id: index + 1,
// //                   task: item,
// //                   completed: false,
// //                 };
// //               } else {
// //                 // Fallback
// //                 return {
// //                   id: index + 1,
// //                   task: `Checklist item ${index + 1}`,
// //                   completed: false,
// //                 };
// //               }
// //             });
// //           }
// //         } catch (e) {
// //           console.error('Failed to parse template checklist:', e);
// //         }
// //       }

// //       // Build final checklist - merge task progress with template labels
// //       if (taskChecklistItems.length > 0) {
// //         // Use existing task checklist but fix labels from template
// //         checklistToUse = taskChecklistItems.map((item: any, index: number) => {
// //           let taskText = '';

// //           // First try to get text from template (most reliable)
// //           if (templateItems[index] && templateItems[index].task) {
// //             taskText = templateItems[index].task;
// //           } else if (typeof item === 'string') {
// //             taskText = item;
// //           } else if (typeof item === 'object' && item !== null) {
// //             // If it's an object, try to extract meaningful text
// //             if (item.task) {
// //               taskText = String(item.task);
// //             } else if (item.text) {
// //               taskText = String(item.text);
// //             } else if (item.description) {
// //               taskText = String(item.description);
// //             } else {
// //               // Fallback: use template or index-based naming
// //               taskText = templateItems[index]?.task || `Checklist item ${index + 1}`;
// //             }
// //           } else {
// //             taskText = templateItems[index]?.task || `Checklist item ${index + 1}`;
// //           }

// //           return {
// //             id: item.id || index + 1,
// //             task: taskText,
// //             completed: Boolean(item.completed),
// //             completedAt: item.completedAt,
// //             notes: item.notes,
// //           };
// //         });
// //       } else if (templateItems.length > 0) {
// //         // No task checklist, create from template
// //         checklistToUse = templateItems;
// //       }

// //       console.log('Final checklist for task detail page:', checklistToUse);
// //       setChecklist(checklistToUse);
// //     } catch (error) {
// //       console.error('Error fetching task:', error);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const getStatusColor = (status: string) => {
// //     switch (status) {
// //       case 'SCHEDULED': return 'text-blue-400';
// //       case 'IN_PROGRESS': return 'text-yellow-400';
// //       case 'COMPLETED': return 'text-green-400';
// //       case 'CANCELLED': return 'text-red-400';
// //       default: return 'text-gray-400';
// //     }
// //   };

// //   const getStatusBgColor = (status: string) => {
// //     switch (status) {
// //       case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
// //       case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
// //       case 'COMPLETED': return 'bg-green-100 text-green-800';
// //       case 'CANCELLED': return 'bg-red-100 text-red-800';
// //       default: return 'bg-gray-100 text-gray-800';
// //     }
// //   };

// //   const getPriorityColor = (priority: string) => {
// //     switch (priority) {
// //       case 'CRITICAL': return 'text-red-400';
// //       case 'HIGH': return 'text-orange-400';
// //       case 'MEDIUM': return 'text-yellow-400';
// //       case 'LOW': return 'text-green-400';
// //       default: return 'text-gray-400';
// //     }
// //   };

// //   const getStatusIcon = (status: string) => {
// //     switch (status) {
// //       case 'SCHEDULED': return <Settings className="w-5 h-5" />;
// //       case 'IN_PROGRESS': return <AlertCircle className="w-5 h-5" />;
// //       case 'COMPLETED': return <CheckCircle className="w-5 h-5" />;
// //       default: return <Settings className="w-5 h-5" />;
// //     }
// //   };

// //   const calculateProgress = () => {
// //     if (checklist.length === 0) return 0;
// //     const completedItems = checklist.filter(item => item.completed).length;
// //     return Math.round((completedItems / checklist.length) * 100);
// //   };

// //   const isOverdue = () => {
// //     if (!task?.scheduledDate) return false;
// //     return new Date(task.scheduledDate) < new Date() && !['COMPLETED', 'CANCELLED'].includes(task.status);
// //   };

// //   const canWorkOnTask = () => {
// //     return session?.user?.role === 'USER' &&
// //            task?.assignedTo?.id === session?.user?.id &&
// //            ['SCHEDULED', 'IN_PROGRESS'].includes(task?.status || '');
// //   };

// //   const canManageTask = () => {
// //     return session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN';
// //   };

// //   const canDeleteTask = () => {
// //     return session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN';
// //   };

// //   const deleteTask = async () => {
// //     if (!confirm('Are you sure you want to delete this maintenance task? This action cannot be undone.')) {
// //       return;
// //     }

// //     try {
// //       const response = await fetch(`/api/maintenance/${task?.id}`, {
// //         method: 'DELETE',
// //       });

// //       if (response.ok) {
// //         alert('Task deleted successfully');
// //         router.push('/maintenance');
// //       } else {
// //         const errorData = await response.json().catch(() => ({}));
// //         alert(`Failed to delete task: ${errorData.error || 'Unknown error'}`);
// //       }
// //     } catch (error) {
// //       console.error('Error deleting task:', error);
// //       alert('Failed to delete task');
// //     }
// //   };

// //   if (loading) {
// //     return (
// //       <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-900">
// //         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 dark:border-red-400"></div>
// //       </div>
// //     );
// //   }

// //   if (!task) {
// //     return (
// //       <div className="min-h-screen flex items-center justify-center">
// //         <div className="text-center">
// //           <h2 className="text-xl font-semibold text-white mb-2">Task Not Found</h2>
// //           <p className="text-gray-400 mb-4">The maintenance task you're looking for doesn't exist.</p>
// //           <button
// //             onClick={() => router.back()}
// //             className="px-4 py-2 rounded-lg text-white transition-colors"
// //             style={{ backgroundColor: '#2697FF' }}
// //           >
// //             Go Back
// //           </button>
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="min-h-screen p-6">
// //       {/* Header */}
// //       <div className="flex items-center gap-4 mb-6">
// //         <button
// //           onClick={() => router.back()}
// //           className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
// //         >
// //           <ArrowLeft className="w-5 h-5" />
// //         </button>
// //         <div>
// //           <h1 className="text-2xl font-bold dark:text-white">
// //             {task.schedule?.title || task.description}
// //           </h1>
// //           <p className="text-gray-400">
// //             {task.asset.name} ({task.asset.serialNumber}) - {task.asset.location}
// //           </p>
// //         </div>
// //       </div>

// //       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
// //         {/* Main Content */}
// //         <div className="lg:col-span-2 space-y-6">
// //           {/* Status and Actions */}
// //           <div className="p-6 rounded-lg">
// //             <div className="flex justify-between items-start mb-4">
// //               <div className="flex items-center gap-3">
// //                 <span className={getStatusColor(task.status)}>
// //                   {getStatusIcon(task.status)}
// //                 </span>
// //                 <div>
// //                   <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBgColor(task.status)}`}>
// //                     {task.status}
// //                   </span>
// //                   <p className="text-gray-400 text-sm mt-1">
// //                     {task.maintenanceType} Maintenance
// //                   </p>
// //                 </div>
// //               </div>

// //               {/* Debug Info */}
// //               <div className="text-xs text-gray-500 mb-2">
// //                 <p>User Role: {session?.user?.role}</p>
// //                 <p>User ID: {session?.user?.id}</p>
// //                 <p>Assigned To: {task.assignedTo?.id}</p>
// //                 <p>Task Status: {task.status}</p>
// //                 <p>Can Work: {canWorkOnTask() ? 'Yes' : 'No'}</p>
// //               </div>

// //               {/* Technician Actions */}
// //               {canWorkOnTask() && (
// //                 <button
// //                   onClick={() => setShowWorkflowModal(true)}
// //                   className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
// //                   style={{ backgroundColor: 'red' }}
// //                 >
// //                   {task.status === 'SCHEDULED' ? (
// //                     <>
// //                       <Settings className="w-4 h-4" />
// //                       Start Task
// //                     </>
// //                   ) : (
// //                     <>
// //                       <Settings className="w-4 h-4" />
// //                       Work on Task
// //                     </>
// //                   )}
// //                 </button>
// //               )}

// //               {/* Manager Actions */}
// //               {canManageTask() && (
// //                 <div className="flex gap-2">
// //                   <button
// //                     onClick={() => setShowWorkflowModal(true)}
// //                     className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
// //                     style={{ backgroundColor: 'red' }}
// //                   >
// //                     <Settings className="w-4 h-4" />
// //                     View/Edit Task
// //                   </button>

// //                   {canDeleteTask() && (
// //                     <button
// //                       onClick={deleteTask}
// //                       className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors bg-red-600 hover:bg-red-700"
// //                     >
// //                       <Settings className="w-4 h-4" />
// //                       Delete Task
// //                     </button>
// //                   )}
// //                 </div>
// //               )}

// //               {/* Debug button for testing
// //               {!canWorkOnTask() && !canManageTask() && session?.user?.role === 'USER' && (
// //                 <button
// //                   onClick={() => setShowWorkflowModal(true)}
// //                   className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors bg-orange-600"
// //                 >
// //                   <Settings className="w-4 h-4" />
// //                   Debug: Work on Task
// //                 </button>
// //               )}*/}
// //             </div>

// //             {/* Progress Bar */}
// //             {checklist.length > 0 && (
// //               <div className="mb-4">
// //                 <div className="flex justify-between text-sm mb-2">
// //                   <span className="text-gray-300">Progress</span>
// //                   <span className="text-gray-300">{calculateProgress()}% Complete</span>
// //                 </div>
// //                 <div className="w-full bg-gray-700 rounded-full h-2">
// //                   <div
// //                     className="h-2 rounded-full transition-all duration-300"
// //                     style={{
// //                       backgroundColor: 'red',
// //                       width: `${calculateProgress()}%`
// //                     }}
// //                   ></div>
// //                 </div>
// //               </div>
// //             )}

// //             {/* Task Details */}
// //             <div className="grid grid-cols-2 gap-4 text-sm">
// //               <div>
// //                 <span className="text-gray-400">Priority:</span>
// //                 <span className={`ml-2 font-medium ${getPriorityColor(task.priority)}`}>
// //                   {task.priority}
// //                 </span>
// //               </div>
// //               <div>
// //                 <span className="text-gray-400">Scheduled:</span>
// //                 <span className={`ml-2 ${isOverdue() ? 'text-red-400' : 'text-gray-300'}`}>
// //                   {new Date(task.scheduledDate).toLocaleDateString()}
// //                   {isOverdue() && ' (Overdue)'}
// //                 </span>
// //               </div>
// //               {task.estimatedHours && (
// //                 <div>
// //                   <span className="text-gray-400">Estimated:</span>
// //                   <span className="ml-2 text-gray-300">{task.estimatedHours}h</span>
// //                 </div>
// //               )}
// //               {task.actualHours && (
// //                 <div>
// //                   <span className="text-gray-400">Actual:</span>
// //                   <span className="ml-2 text-gray-300">{task.actualHours}h</span>
// //                 </div>
// //               )}
// //             </div>
// //           </div>

// //           {/* Description */}
// //           <div className="p-6 rounded-lg">
// //             <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
// //             <p className="text-gray-300">{task.description}</p>

// //             {task.template?.instructions && (
// //               <div className="mt-4">
// //                 <h4 className="text-md font-medium text-white mb-2">Instructions</h4>
// //                 <p className="text-gray-300 text-sm">{task.template.instructions}</p>
// //               </div>
// //             )}
// //           </div>

// //           {/* Checklist */}
// //           {checklist.length > 0 && (
// //             <div className="p-6 rounded-lg">
// //               <h3 className="text-lg font-semibold text-white mb-4">Checklist</h3>

// //               <div className="space-y-3">
// //                 {checklist.map((item, index) => (
// //                   <div key={item.id || index} className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
// //                     <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
// //                       item.completed
// //                         ? 'bg-green-500 border-green-500'
// //                         : 'border-gray-400'
// //                     }`}>
// //                       {item.completed && <CheckCircle className="w-3 h-3 text-white" />}
// //                     </div>
// //                     <div className="flex-1">
// //                       <p className={`text-sm ${
// //                         item.completed
// //                           ? 'line-through text-gray-500'
// //                           : 'text-gray-300'
// //                       }`}>
// //                         {typeof item.task === 'string' ? item.task : String(item.task || 'No task text')}
// //                       </p>
// //                       {item.completed && item.completedAt && (
// //                         <p className="text-xs text-gray-500 mt-1">
// //                           Completed: {new Date(item.completedAt).toLocaleString()}
// //                         </p>
// //                       )}
// //                       {item.notes && (
// //                         <p className="text-xs text-gray-400 mt-1">
// //                           Note: {item.notes}
// //                         </p>
// //                       )}
// //                     </div>
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>
// //           )}

// //           {/* Notes */}
// //           {task.notes && (
// //             <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
// //               <h3 className="text-lg font-semibold text-white mb-3">Notes</h3>
// //               <p className="text-gray-300 whitespace-pre-wrap">{task.notes}</p>
// //             </div>
// //           )}
// //         </div>

// //         {/* Sidebar */}
// //         <div className="space-y-6">
// //           {/* Assignment Info */}
// //           <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
// //             <h3 className="text-lg font-semibold text-white mb-4">Assignment</h3>
// //             <div className="space-y-3 text-sm">
// //               {task.assignedTo && (
// //                 <div className="flex items-center gap-2">
// //                   <Settings className="w-4 h-4 text-gray-400" />
// //                   <div>
// //                     <p className="text-gray-300">{task.assignedTo.name}</p>
// //                     <p className="text-gray-500">{task.assignedTo.email}</p>
// //                   </div>
// //                 </div>
// //               )}

// //               {task.schedule && (
// //                 <div className="flex items-center gap-2">
// //                   <Settings className="w-4 h-4 text-gray-400" />
// //                   <div>
// //                     <p className="text-gray-300">From Schedule</p>
// //                     <p className="text-gray-500">{task.schedule.frequency} maintenance</p>
// //                   </div>
// //                 </div>
// //               )}

// //               {task.template && (
// //                 <div className="flex items-center gap-2">
// //                   <Settings className="w-4 h-4 text-gray-400" />
// //                   <div>
// //                     <p className="text-gray-300">{task.template.name}</p>
// //                     <p className="text-gray-500">{task.template.maintenanceType}</p>
// //                   </div>
// //                 </div>
// //               )}
// //             </div>
// //           </div>

// //           {/* Timeline */}
// //           {task.completedAt && (
// //             <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
// //               <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
// //               <div className="space-y-3 text-sm">
// //                 <div className="flex items-center gap-2">
// //                   <CheckCircle className="w-4 h-4 text-green-400" />
// //                   <div>
// //                     <p className="text-gray-300">Completed</p>
// //                     <p className="text-gray-500">{new Date(task.completedAt).toLocaleString()}</p>
// //                   </div>
// //                 </div>
// //               </div>
// //             </div>
// //           )}
// //         </div>
// //       </div>

// //       {/* Task Workflow Modal */}
// //       <TaskWorkflowModal
// //         open={showWorkflowModal}
// //         onClose={() => setShowWorkflowModal(false)}
// //         taskId={task.id}
// //         onTaskUpdated={fetchTask}
// //       />
// //     </div>
// //   );
// // }
