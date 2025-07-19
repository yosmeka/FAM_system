// "use client";

// import { useEffect, useState } from "react";
// import { useRouter, useParams } from "next/navigation";
// import { RoleBasedButton } from "@/components/ui/RoleBasedButton";
// import { toast } from "react-hot-toast";
// import { useSession } from "next-auth/react";

// interface TransferDetails {
//   id: string;
//   assetId: string;
//   fromDepartment: string;
//   toDepartment: string;
//   reason: string;
//   status: string;
//   createdAt: string;
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
// }

// export default function EditTransferPage() {
//   const [redirecting, setRedirecting] = useState(false);
//   const params = useParams() as { id: string };
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [transfer, setTransfer] = useState<TransferDetails | null>(null);
//   const [toDepartment, setToDepartment] = useState("");
//   const [reason, setReason] = useState("");
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchTransfer = async () => {
//       setLoading(true);
//       try {
//         const response = await fetch(`/api/transfers/${params.id}`);
//         if (!response.ok) throw new Error("Failed to fetch transfer");
//         const data = await response.json();
//         setTransfer(data);
//         setToDepartment(data.toDepartment || "");
//         setReason(data.reason || "");
//       } catch (err: any) {
//         setError(err.message || "Failed to fetch transfer");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchTransfer();
//   }, [params.id]);

//   if (redirecting) return <div>Redirecting...</div>;
//   if (status === "loading" || loading) return <div>Loading...</div>;
//   if (error) return <div className="text-red-600">{error}</div>;
//   if (!transfer) return <div>Transfer not found</div>;

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const response = await fetch(`/api/transfers/${params.id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           toDepartment,
//           reason,
//         }),
//       });
//       if (!response.ok) throw new Error("Failed to update transfer");
//       toast.success("Transfer updated successfully");
//       setRedirecting(true);
//       router.push('/transfers');
//     } catch (err: any) {
//       toast.error(err.message || "Failed to update transfer");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container mx-auto p-6">
//       <div className="max-w-2xl mx-auto">
//         <h1 className="text-2xl font-semibold mb-6">Edit Transfer Request</h1>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium">Asset</label>
//             <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 mt-1">
//               <div><b>Name:</b> {transfer.asset?.name}</div>
//               <div><b>Serial Number:</b> {transfer.asset?.serialNumber}</div>
//             </div>
//           </div>
//           <div>
//             <label className="block text-sm font-medium">From Location</label>
//             <input
//               type="text"
//               className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
//               value={transfer.fromDepartment}
//               readOnly
//               disabled
//             />
//           </div>
//           <div>
//             <label htmlFor="toDepartment" className="block text-sm font-medium">To Location</label>
//             <input
//               type="text"
//               id="toDepartment"
//               name="toDepartment"
//               className="mt-1 block w-full rounded-md border border-gray-300 dark:bg-gray-700 p-2"
//               required
//               value={toDepartment}
//               onChange={e => setToDepartment(e.target.value)}
//             />
//           </div>
//           <div>
//             <label htmlFor="reason" className="block text-sm font-medium">Reason</label>
//             <textarea
//               id="reason"
//               name="reason"
//               rows={3}
//               className="mt-1 block w-full rounded-md border border-gray-300 dark:bg-gray-700 p-2"
//               required
//               value={reason}
//               onChange={e => setReason(e.target.value)}
//             />
//           </div>
//           <div className="flex justify-end space-x-4 pt-4">
//             <RoleBasedButton
//               type="button"
//               variant="secondary"
//               onClick={() => router.back()}
//             >
//               Cancel
//             </RoleBasedButton>
//             <RoleBasedButton
//               type="submit"
//               variant="primary"
//               loading={loading}
//               className="bg-red-600 hover:bg-red-700 text-white"
//               disabled={loading}
//             >
//               {loading ? "Saving..." : "Save Changes"}
//             </RoleBasedButton>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
