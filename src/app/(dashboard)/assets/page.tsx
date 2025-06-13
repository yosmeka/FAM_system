"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { Toaster } from "react-hot-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "react-hot-toast";

interface Asset {
  id: string;
  name: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  status: string;
  location: string;
  department: string;
  category: string;
  supplier: string;
}

export default function AssetsPage() {
  // All hooks MUST be called at the top, before any return!
  const { checkPermission, loading } = usePermissions();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 10;
  // Fetch assets
  const {
    data: assets = [],
    isLoading,
    error,
  } = useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: async () => {
      const response = await fetch("/api/assets");
      if (!response.ok) {
        throw new Error("Failed to fetch assets");
      }
      return response.json();
    },
  });
  // Get unique categories and departments
  const categories = Array.from(new Set(assets.map(asset => asset.category).filter(Boolean)));
  const departments = Array.from(new Set(assets.map(asset => asset.department).filter(Boolean)));
  // Filtered and paginated assets
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.department?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || asset.status === statusFilter;

    const matchesCategory =
      categoryFilter === "ALL" || asset.category === categoryFilter;

    const matchesDepartment =
      departmentFilter === "ALL" || asset.department === departmentFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesDepartment;
  });
  const totalPages = Math.ceil(filteredAssets.length / pageSize);
  const paginatedAssets = filteredAssets.slice((page - 1) * pageSize, page * pageSize);
  // Reset page to 1 when filters/search change
  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, categoryFilter, departmentFilter]);
  // Only after ALL hooks, check loading/permissions and return early if needed
  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen flex items-center justify-center">
        <span className="text-lg">Loading permissions...</span>
      </div>
    );
  }
  if (!checkPermission('Asset view (list and detail)')) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="mt-2">You do not have permission to view assets.</p>
      </div>
    );
  }
  // ...rest of your component


  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Asset deleted successfully");
        // Invalidate and refetch the assets query
        await queryClient.invalidateQueries({ queryKey: ["assets"] });
      } else {
        throw new Error("Failed to delete asset");
      }
    } catch (error) {
      toast.error("Failed to delete asset");
      console.error("Error deleting asset:", error);
    } finally {
      setDeleteAssetId(null);
    }
  };

  // const filteredAssets = assets.filter((asset) => {
  //   const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
  //   const matchesStatus = statusFilter === "ALL" || asset.status === statusFilter;
  //   const matchesCategory = categoryFilter === "ALL" || asset.category === categoryFilter;
  //   const matchesDepartment = departmentFilter === "ALL" || asset.department === departmentFilter;
  //   return matchesSearch && matchesStatus && matchesCategory && matchesDepartment;
  // });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "UNDER_MAINTENANCE":
        return "bg-yellow-100 text-yellow-800";
      case "TRANSFERRED":
        return "bg-blue-100 text-blue-800";
      case "DISPOSED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isAssetDisposed = (asset: Asset) => asset.status === "DISPOSED";

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Failed to load assets. Please try again later.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white dark:bg-gray-900">
      <Toaster position="top-right" />
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Assets</h1>
        {checkPermission('Asset create') && (
          <Link
            href="/assets/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Add New Asset
          </Link>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-1 sm:col-span-2">
          <input
            type="text"
            placeholder="Search assets..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            {/* <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="TRANSFERRED">Transferred</option> */}
            <option value="DISPOSED">Disposed</option>
          </select>
        </div>
        <div>
          <select
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        {/* <div>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div> */}
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-gray-900 dark:text-gray-100">Loading assets...</div>
      ) : error ? (
        <div className="text-center py-4 text-red-600 dark:text-red-400">
          Error loading assets. Please try again.
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">No assets found</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedAssets.map((asset) => (
              <li key={asset.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${isAssetDisposed(asset) ? 'bg-gray-50 dark:bg-gray-700' : ''}`}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {asset.name}
                      </p>
                      <p className="ml-2 flex-shrink-0 flex">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            asset.status
                          )}`}
                        >
                          {asset.status.replace("_", " ")}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="text-gray-600 hover:text-gray-900 hover:underline dark:text-gray-300 dark:hover:text-gray-200"
                      >
                        View
                      </Link>
                      {!isAssetDisposed(asset) && (checkPermission('Asset edit') || checkPermission('Asset delete')) && (
                        <>
                          {checkPermission('Asset edit') && (
                            <Link
                              href={`/assets/${asset.id}/edit`}
                              className="text-gray-800 dark:text-gray-400 hover:underline mr-2"
                            >
                              Edits
                            </Link>
                          )}
                          {checkPermission('Asset delete') && (
                            <button
                              className="text-[#ff0000] dark:[#ff0000] hover:underline"
                              onClick={() => setDeleteAssetId(asset.id)}
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        Serial: {asset.serialNumber}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0 sm:ml-6">
                        Department: {asset.department || "Not specified"}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                      <p>Purchase Date: {formatDate(asset.purchaseDate)}</p>
                      <p className="ml-4">
                        Value: {formatCurrency(asset.currentValue)}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <button
                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-900 dark:text-gray-100"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {page} of {totalPages}
              </span>
              <button
                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-900 dark:text-gray-100"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteAssetId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Confirm Deletion</h2>
            <p className="text-gray-700 dark:text-gray-300">Are you sure you want to delete this asset?</p>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setDeleteAssetId(null)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteAssetId)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
