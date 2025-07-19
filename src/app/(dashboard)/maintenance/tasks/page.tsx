// "use client";

// import { useState, useEffect } from "react";
// import { useSession } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import {
//   CheckCircle,
//   AlertCircle,
//   Settings,
//   Play,
//   FileText,
//   Clock,
//   DollarSign,
// } from "lucide-react";
// import WorkDocumentationModal from "@/components/maintenance/WorkDocumentationModal";

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
//   maintenanceType: string;
//   issueType?: string;
//   urgencyLevel?: string;
//   assetDowntime?: boolean;
//   workPerformed?: string;
//   laborHours?: number;
//   totalCost?: number;
//   workStartedAt?: string;
//   workCompletedAt?: string;
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
//   };
//   template?: {
//     id: string;
//     name: string;
//     maintenanceType: string;
//   };
// }

// export default function MyTasksPage() {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState("all");
//   const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(
//     null
//   );
//   const [showWorkModal, setShowWorkModal] = useState(false);

//   const fetchMyTasks = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch("/api/maintenance/my-tasks");
//       if (!response.ok) throw new Error("Failed to fetch tasks");
//       const data = await response.json();
//       setTasks(data);
//     } catch (error) {
//       console.error("Error fetching tasks:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchMyTasks();
//   }, [filter]);

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

//   const handleStartWork = async (task: MaintenanceTask) => {
//     try {
//       const response = await fetch(`/api/maintenance/${task.id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           status: "IN_PROGRESS",
//           workStartedAt: new Date().toISOString(),
//         }),
//       });

//       if (!response.ok) throw new Error("Failed to start work");

//       fetchMyTasks(); // Refresh tasks
//     } catch (error) {
//       console.error("Error starting work:", error);
//     }
//   };

//   const handleDocumentWork = (task: MaintenanceTask) => {
//     setSelectedTask(task);
//     setShowWorkModal(true);
//   };

//   const handleWorkCompleted = () => {
//     fetchMyTasks(); // Refresh tasks
//     setSelectedTask(null);
//     setShowWorkModal(false);
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case "APPROVED":
//         return "text-blue-400";
//       case "SCHEDULED":
//         return "text-blue-400";
//       case "IN_PROGRESS":
//         return "text-yellow-400";
//       case "WORK_COMPLETED":
//         return "text-orange-400";
//       case "PENDING_REVIEW":
//         return "text-purple-400";
//       case "COMPLETED":
//         return "text-green-400";
//       case "CANCELLED":
//         return "text-red-400";
//       default:
//         return "text-gray-400";
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
//       case "APPROVED":
//         return <Settings className="w-4 h-4" />;
//       case "SCHEDULED":
//         return <Settings className="w-4 h-4" />;
//       case "IN_PROGRESS":
//         return <AlertCircle className="w-4 h-4" />;
//       case "WORK_COMPLETED":
//         return <FileText className="w-4 h-4" />;
//       case "PENDING_REVIEW":
//         return <Clock className="w-4 h-4" />;
//       case "COMPLETED":
//         return <CheckCircle className="w-4 h-4" />;
//       default:
//         return <Settings className="w-4 h-4" />;
//     }
//   };

//   const filteredTasks =
//     filter === "all"
//       ? tasks
//       : tasks.filter((task) => task.status === filter.toUpperCase());

//   const isOverdue = (scheduledDate: string) => {
//     return (
//       new Date(scheduledDate) < new Date() &&
//       !["COMPLETED", "CANCELLED"].includes(
//         tasks.find((t) => t.scheduledDate === scheduledDate)?.status || ""
//       )
//     );
//   };

//   if (loading) {
//     return (
//       <div
//         className="min-h-screen flex items-center justify-center"
//         style={{ backgroundColor: "#212332" }}
//       >
//         <div
//           className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
//           style={{ borderColor: "#2697FF" }}
//         ></div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6" style={{ backgroundColor: "#212332" }}>
//       {/* Navigation Tabs - Only show My Tasks for technicians */}
//       <div className="mb-6">
//         <div
//           className="flex space-x-1 p-1 rounded-lg w-fit"
//           style={{ backgroundColor: "#2A2D3E" }}
//         >
//           <button
//             className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm font-medium"
//             style={{ backgroundColor: "#2697FF" }}
//           >
//             <Settings className="w-4 h-4" />
//             My Tasks
//           </button>
//         </div>
//       </div>

//       {/* Header */}
//       <div className="flex justify-between items-center mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-white mb-2">
//             My Maintenance Tasks
//           </h1>
//           <p className="text-gray-400">
//             Tasks assigned to you from scheduled maintenance
//           </p>
//         </div>
//       </div>

//       {/* Filter Tabs */}
//       <div className="flex gap-4 mb-6 flex-wrap">
//         {["all", "APPROVED", "IN_PROGRESS", "WORK_COMPLETED", "COMPLETED"].map(
//           (status) => (
//             <button
//               key={status}
//               onClick={() => setFilter(status)}
//               className={`px-4 py-2 rounded-lg transition-colors ${
//                 filter === status
//                   ? "text-white"
//                   : "text-gray-400 hover:text-white"
//               }`}
//               style={{
//                 backgroundColor: filter === status ? "#2697FF" : "#2A2D3E",
//               }}
//             >
//               {status === "all"
//                 ? "All Tasks"
//                 : status === "WORK_COMPLETED"
//                 ? "Work Completed"
//                 : status.charAt(0) + status.slice(1).toLowerCase()}
//             </button>
//           )
//         )}
//       </div>

//       {/* Tasks Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//         {filteredTasks.map((task) => (
//           <div
//             key={task.id}
//             className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
//             style={{ backgroundColor: "#2A2D3E" }}
//           >
//             {/* Header */}
//             <div className="flex justify-between items-start mb-4">
//               <div className="flex-1">
//                 <div className="flex items-center gap-2 mb-1">
//                   <h3 className="text-lg font-semibold text-white">
//                     {task.schedule?.title || task.description}
//                   </h3>
//                   {task.maintenanceType === "CORRECTIVE" && (
//                     <span className="px-2 py-1 text-xs bg-red-600 text-white rounded-full">
//                       CORRECTIVE
//                     </span>
//                   )}
//                   {task.assetDowntime && (
//                     <span className="px-2 py-1 text-xs bg-orange-600 text-white rounded-full">
//                       ASSET DOWN
//                     </span>
//                   )}
//                 </div>
//                 <p className="text-sm text-gray-400">
//                   {task.asset.name} ({task.asset.serialNumber})
//                 </p>
//                 {task.issueType && (
//                   <p className="text-xs text-orange-400 mt-1">
//                     Issue: {task.issueType}
//                   </p>
//                 )}
//               </div>
//               <div className="flex items-center gap-2">
//                 <span className={getStatusColor(task.status)}>
//                   {getStatusIcon(task.status)}
//                 </span>
//                 <span
//                   className={`text-sm font-medium ${getStatusColor(
//                     task.status
//                   )}`}
//                 >
//                   {task.status.replace("_", " ")}
//                 </span>
//               </div>
//             </div>

//             {/* Task Info */}
//             <div className="space-y-3 mb-4">
//               <div className="flex items-center gap-2 text-sm">
//                 <Settings className="w-4 h-4" />
//                 <span
//                   className={
//                     isOverdue(task.scheduledDate)
//                       ? "text-red-400"
//                       : "text-gray-300"
//                   }
//                 >
//                   Due: {new Date(task.scheduledDate).toLocaleDateString()}
//                   {isOverdue(task.scheduledDate) && " (Overdue)"}
//                 </span>
//               </div>

//               <div className="flex items-center gap-2 text-sm">
//                 <AlertCircle className="w-4 h-4" />
//                 <span
//                   className={`${getPriorityColor(task.priority)} font-medium`}
//                 >
//                   {task.priority} Priority
//                   {task.urgencyLevel && ` (${task.urgencyLevel})`}
//                 </span>
//               </div>

//               {task.estimatedHours && (
//                 <div className="flex items-center gap-2 text-sm text-gray-300">
//                   <Clock className="w-4 h-4" />
//                   <span>Est. {task.estimatedHours}h</span>
//                 </div>
//               )}

//               {task.laborHours && (
//                 <div className="flex items-center gap-2 text-sm text-gray-300">
//                   <Clock className="w-4 h-4" />
//                   <span>Actual: {task.laborHours}h</span>
//                 </div>
//               )}

//               {task.totalCost && (
//                 <div className="flex items-center gap-2 text-sm text-green-400">
//                   <DollarSign className="w-4 h-4" />
//                   <span>Cost: ${task.totalCost.toFixed(2)}</span>
//                 </div>
//               )}

//               {task.template && (
//                 <div className="flex items-center gap-2 text-sm text-gray-300">
//                   <Settings className="w-4 h-4" />
//                   <span>{task.template.name}</span>
//                 </div>
//               )}

//               {task.workStartedAt && (
//                 <div className="flex items-center gap-2 text-sm text-blue-400">
//                   <Play className="w-4 h-4" />
//                   <span>
//                     Started: {new Date(task.workStartedAt).toLocaleDateString()}
//                   </span>
//                 </div>
//               )}

//               {task.workCompletedAt && (
//                 <div className="flex items-center gap-2 text-sm text-orange-400">
//                   <FileText className="w-4 h-4" />
//                   <span>
//                     Completed:{" "}
//                     {new Date(task.workCompletedAt).toLocaleDateString()}
//                   </span>
//                 </div>
//               )}
//             </div>

//             {/* Action Buttons */}
//             <div className="flex gap-2 mb-4">
//               {/* Start Work Button */}
//               {(task.status === "APPROVED" || task.status === "SCHEDULED") && (
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     handleStartWork(task);
//                   }}
//                   className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
//                 >
//                   <Play className="w-4 h-4" />
//                   Start Work
//                 </button>
//               )}

//               {/* Document Work Button */}
//               {task.status === "IN_PROGRESS" && (
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     handleDocumentWork(task);
//                   }}
//                   className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
//                 >
//                   <FileText className="w-4 h-4" />
//                   Complete Work
//                 </button>
//               )}

//               {/* View Details Button */}
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   router.push(`/maintenance/${task.id}`);
//                 }}
//                 className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
//               >
//                 <Settings className="w-4 h-4" />
//                 View Details
//               </button>
//             </div>

//             {/* Progress Indicator */}
//             {task.checklistItems && (
//               <div className="mt-4 pt-4 border-t border-gray-600">
//                 <p className="text-xs text-gray-400 mb-2">Checklist Progress</p>
//                 <div className="w-full bg-gray-700 rounded-full h-2">
//                   <div
//                     className="h-2 rounded-full transition-all duration-300"
//                     style={{
//                       backgroundColor: "#2697FF",
//                       width: `${calculateProgress(task.checklistItems)}%`,
//                     }}
//                   ></div>
//                 </div>
//                 <p className="text-xs text-gray-400 mt-1">
//                   {calculateProgress(task.checklistItems)}% Complete
//                 </p>
//               </div>
//             )}
//           </div>
//         ))}
//       </div>

//       {filteredTasks.length === 0 && (
//         <div className="text-center py-12">
//           <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
//           <h3 className="text-xl font-semibold text-white mb-2">
//             No Tasks Found
//           </h3>
//           <p className="text-gray-400">
//             {filter === "all"
//               ? "You have no maintenance tasks assigned to you yet."
//               : `No ${filter.toLowerCase()} tasks found.`}
//           </p>
//         </div>
//       )}

//       {/* Work Documentation Modal */}
//       {selectedTask && (
//         <WorkDocumentationModal
//           open={showWorkModal}
//           onClose={() => setShowWorkModal(false)}
//           task={selectedTask}
//           onWorkCompleted={handleWorkCompleted}
//         />
//       )}
//     </div>
//   );
// }

// function calculateProgress(checklistItems: string): number {
//   try {
//     const items = JSON.parse(checklistItems);
//     if (!Array.isArray(items) || items.length === 0) return 0;

//     const completedItems = items.filter((item) => item.completed).length;
//     return Math.round((completedItems / items.length) * 100);
//   } catch {
//     return 0;
//   }
// }
