// 'use client';

// import React, { useState, useEffect } from 'react';
// import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import {
//   Calendar,
//   Clock,
//   CheckCircle,
//   AlertTriangle,
//   User,
//   FileText,
//   Plus,
//   Search
// } from 'lucide-react';
// import CreateAssignmentModal from '@/components/audit/CreateAssignmentModal';
// import CreateRequestModal from '@/components/audit/CreateRequestModal';
// import { ToastContainer } from 'react-toastify';

// interface AuditAssignment {
//   id: string;
//   title: string;
//   description?: string;
//   priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
//   dueDate: string;
//   status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
//   asset: {
//     id: string;
//     name: string;
//     serialNumber: string;
//     department: string;
//     category: string;
//     location: string;
//   };
//   assignedTo: {
//     id: string;
//     name: string;
//     email: string;
//   };
//   assignedBy: {
//     id: string;
//     name: string;
//     email: string;
//   };
//   audits: Array<{
//     id: string;
//     status: string;
//     workflowStatus: string;
//     auditDate: string;
//     condition: string;
//   }>;
// }

// interface AuditRequest {
//   id: string;
//   title: string;
//   reason: string;
//   urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
//   requestedDate: string;
//   status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
//   asset: {
//     id: string;
//     name: string;
//     serialNumber: string;
//     department: string;
//     category: string;
//     location: string;
//   };
//   requester: {
//     id: string;
//     name: string;
//     email: string;
//   };
//   manager?: {
//     id: string;
//     name: string;
//     email: string;
//   };
//   audits: Array<{
//     id: string;
//     status: string;
//     workflowStatus: string;
//     auditDate: string;
//     condition: string;
//   }>;
// }

// export default function AuditWorkflowPage() {
//   const { data: session, status } = useSession();
//   const router = useRouter();

//   const [activeTab, setActiveTab] = useState<'assignments' | 'requests'>('assignments');
//   const [assignments, setAssignments] = useState<AuditAssignment[]>([]);
//   const [requests, setRequests] = useState<AuditRequest[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [statusFilter, setStatusFilter] = useState('all');
//   const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
//   const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);

//   // Show nothing until session is loaded
//   if (status === 'loading') return null;

//   // If not allowed, show access denied
//   if (session?.user?.role === 'USER') {
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
//     fetchData();
//   }, []);

//   const fetchData = async () => {
//     try {
//       setLoading(true);

//       // Fetch assignments
//       const assignmentsResponse = await fetch('/api/audit-assignments');
//       if (assignmentsResponse.ok) {
//         const assignmentsData = await assignmentsResponse.json();
//         setAssignments(assignmentsData);
//       }

//       // Fetch requests
//       const requestsResponse = await fetch('/api/audit-requests');
//       if (requestsResponse.ok) {
//         const requestsData = await requestsResponse.json();
//         setRequests(requestsData);
//       }
//     } catch (error) {
//       console.error('Error fetching audit data:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getStatusIcon = (status: string) => {
//     switch (status) {
//       case 'COMPLETED':
//       case 'APPROVED':
//         return <CheckCircle className="h-4 w-4 text-green-500" />;
//       case 'PENDING':
//       case 'PENDING_APPROVAL':
//         return <Clock className="h-4 w-4 text-yellow-500" />;
//       case 'IN_PROGRESS':
//       case 'ACCEPTED':
//         return <User className="h-4 w-4 text-blue-500" />;
//       case 'OVERDUE':
//       case 'REJECTED':
//         return <AlertTriangle className="h-4 w-4 text-red-500" />;
//       default:
//         return <FileText className="h-4 w-4 text-gray-500" />;
//     }
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'COMPLETED':
//       case 'APPROVED':
//         return 'bg-green-100 text-green-800';
//       case 'PENDING':
//       case 'PENDING_APPROVAL':
//         return 'bg-yellow-100 text-yellow-800';
//       case 'IN_PROGRESS':
//       case 'ACCEPTED':
//         return 'bg-blue-100 text-blue-800';
//       case 'OVERDUE':
//       case 'REJECTED':
//         return 'bg-red-100 text-red-800';
//       default:
//         return 'bg-gray-100 text-gray-800';
//     }
//   };

//   const getPriorityColor = (priority: string) => {
//     switch (priority) {
//       case 'CRITICAL':
//         return 'bg-red-100 text-red-800';
//       case 'HIGH':
//         return 'bg-orange-100 text-orange-800';
//       case 'MEDIUM':
//         return 'bg-yellow-100 text-yellow-800';
//       case 'LOW':
//         return 'bg-green-100 text-green-800';
//       default:
//         return 'bg-gray-100 text-gray-800';
//     }
//   };

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString();
//   };

//   const filteredAssignments = assignments.filter(assignment => {
//     const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                          assignment.asset.name.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
//     return matchesSearch && matchesStatus;
//   });

//   const filteredRequests = requests.filter(request => {
//     const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                          request.asset.name.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
//     return matchesSearch && matchesStatus;
//   });

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-900">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 dark:border-red-400"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-6 min-h-screen">
//       <div className="mb-8">
//         <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Audit Workflow</h1>
//         <p className="text-gray-400 dark:text-gray-300">
//           Manage audit assignments and requests with maker-checker workflow
//         </p>
//       </div>

//       {/* Tab Navigation */}
//       <div className="flex space-x-1 mb-6 p-1 rounded-lg">
//         <button
//           onClick={() => setActiveTab('assignments')}
//           className={`px-4 py-2 rounded-md font-medium transition-colors ${
//             activeTab === 'assignments'
//               ? 'bg-red-600 text-white'
//               : 'text-gray-400 hover:text-white hover:bg-gray-700'
//           }`}
//         >
//           Audit Assignments ({assignments.length})
//         </button>
//         <button
//           onClick={() => setActiveTab('requests')}
//           className={`px-4 py-2 rounded-md font-medium transition-colors ${
//             activeTab === 'requests'
//               ? 'bg-red-600 text-white'
//               : 'text-gray-400 hover:text-white hover:bg-gray-700'
//           }`}
//         >
//           Audit Requests ({requests.length})
//         </button>
//       </div>

//       {/* Filters */}
//       <div className="flex flex-col sm:flex-row gap-4 mb-6">
//         <div className="flex-1">
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//             <input
//               type="text"
//               placeholder="Search audits..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//         </div>
//         <div className="flex gap-2">
//           <select
//             value={statusFilter}
//             onChange={(e) => setStatusFilter(e.target.value)}
//             className="px-4 py-2 rounded-lg border border-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="all">All Status</option>
//             <option value="PENDING">Pending</option>
//             <option value="IN_PROGRESS">In Progress</option>
//             <option value="COMPLETED">Completed</option>
//             <option value="OVERDUE">Overdue</option>
//           </select>
//           {session?.user?.role === 'MANAGER' && activeTab === 'assignments' && (
//             <button
//               onClick={() => setShowCreateAssignmentModal(true)}
//               className="px-4 py-2 bg-requestedDate-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
//             >
//               <Plus className="h-4 w-4" />
//               New Assignment
//             </button>
//           )}
//           {session?.user?.role === 'AUDITOR' && activeTab === 'requests' && (
//             <button
//               onClick={() => setShowCreateRequestModal(true)}
//               className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
//             >
//               <Plus className="h-4 w-4" />
//               New Request
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Content */}
//       {activeTab === 'assignments' ? (
//         <div className="grid gap-4">
//           {filteredAssignments.map((assignment) => (
//             <div
//               key={assignment.id}
//               className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow dark:bg-gray-700 cursor-pointer"
//               onClick={() => router.push(`/audits/assignments/${assignment.id}`)}
//             >
//               <div className="flex items-start justify-between mb-4">
//                 <div className="flex-1">
//                   <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{assignment.title}</h3>
//                   <p className="text-gray-400 dark:text-gray-300 text-sm mb-2">{assignment.description}</p>
//                   <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-gray-300">
//                     <span>Asset: {assignment.asset.name}</span>
//                     <span>Serial: {assignment.asset.serialNumber}</span>
//                     <span>Department: {assignment.asset.department}</span>
//                   </div>
//                 </div>
//                 <div className="flex flex-col items-end gap-2">
//                   <div className="flex items-center gap-2">
//                     {getStatusIcon(assignment.status)}
//                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
//                       {assignment.status.replace('_', ' ')}
//                     </span>
//                   </div>
//                   <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(assignment.priority)}`}>
//                     {assignment.priority}
//                   </span>
//                 </div>
//               </div>

//               <div className="flex items-center justify-between text-sm text-gray-400">
//                 <div className="flex items-center gap-4">
//                   <div className="flex items-center gap-1">
//                     <User className="h-4 w-4" />
//                     <span>Assigned to: {assignment.assignedTo.name}</span>
//                   </div>
//                   <div className="flex items-center gap-1">
//                     <Calendar className="h-4 w-4" />
//                     <span>Due: {formatDate(assignment.dueDate)}</span>
//                   </div>
//                 </div>
//                 <div className="text-xs">
//                   Assigned by: {assignment.assignedBy.name}
//                 </div>
//               </div>
//             </div>
//           ))}

//           {filteredAssignments.length === 0 && (
//             <div className="text-center py-12">
//               <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//               <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No audit assignments found</h3>
//               <p className="text-gray-400 dark:text-gray-300">
//                 {assignments.length === 0
//                   ? 'No audit assignments have been created yet.'
//                   : 'No assignments match your current filters.'
//                 }
//               </p>
//             </div>
//           )}
//         </div>
//       ) : (
//         <div className="grid gap-4">
//           {filteredRequests.map((request) => (
//             <div
//               key={request.id}
//               className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow dark:bg-gray-700 cursor-pointer"
//               onClick={() => router.push(`/audits/requests/${request.id}`)}
//             >
//               <div className="flex items-start justify-between mb-4">
//                 <div className="flex-1">
//                   <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{request.title}</h3>
//                   <p className="text-gray-400 dark:text-gray-300 text-sm mb-2">{request.reason}</p>
//                   <div className="flex items-center gap-4 text-sm text-gray-400">
//                     <span>Asset: {request.asset.name}</span>
//                     <span>Serial: {request.asset.serialNumber}</span>
//                     <span>Department: {request.asset.department}</span>
//                   </div>
//                 </div>
//                 <div className="flex flex-col items-end gap-2">
//                   <div className="flex items-center gap-2">
//                     {getStatusIcon(request.status)}
//                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
//                       {request.status.replace('_', ' ')}
//                     </span>
//                   </div>
//                   <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.urgency)}`}>
//                     {request.urgency}
//                   </span>
//                 </div>
//               </div>

//               <div className="flex items-center justify-between text-sm text-gray-400">
//                 <div className="flex items-center gap-4">
//                   <div className="flex items-center gap-1">
//                     <User className="h-4 w-4" />
//                     <span>Requested by: {request.requester.name}</span>
//                   </div>
//                   <div className="flex items-center gap-1">
//                     <Calendar className="h-4 w-4" />
//                     <span>Requested for: {formatDate(request.requestedDate)}</span>
//                   </div>
//                 </div>
//                 {request.manager && (
//                   <div className="text-xs">
//                     Manager: {request.manager.name}
//                   </div>
//                 )}
//               </div>
//             </div>
//           ))}

//           {filteredRequests.length === 0 && (
//             <div className="text-center py-12">
//               <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//               <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No audit requests found</h3>
//               <p className="text-gray-400 dark:text-gray-300">
//                 {requests.length === 0
//                   ? 'No audit requests have been created yet.'
//                   : 'No requests match your current filters.'
//                 }
//               </p>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Modals */}
//       <CreateAssignmentModal
//         isOpen={showCreateAssignmentModal}
//         onClose={() => setShowCreateAssignmentModal(false)}
//         onSuccess={fetchData}
//       />

//       <CreateRequestModal
//         isOpen={showCreateRequestModal}
//         onClose={() => setShowCreateRequestModal(false)}
//         onSuccess={fetchData}
//       />
//     <ToastContainer />
//     </div>
//   );
// }
