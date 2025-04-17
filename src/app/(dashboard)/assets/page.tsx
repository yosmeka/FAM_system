'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';

// Mock data for initial development
const mockAssets = [
  {
    id: '1',
    name: 'Laptop Dell XPS 13',
    serialNumber: 'LAP-001',
    purchaseDate: '2023-01-15',
    purchasePrice: 1200,
    currentValue: 1000,
    status: 'ACTIVE',
    location: 'IT Department',
    department: 'IT',
    category: 'Electronics',
    supplier: 'Dell Inc.',
  },
  {
    id: '2',
    name: 'Office Chair',
    serialNumber: 'FUR-001',
    purchaseDate: '2023-02-20',
    purchasePrice: 300,
    currentValue: 250,
    status: 'ACTIVE',
    location: 'Finance Department',
    department: 'Finance',
    category: 'Furniture',
    supplier: 'Office Supplies Co.',
  },
  {
    id: '3',
    name: 'Printer HP LaserJet',
    serialNumber: 'PRN-001',
    purchaseDate: '2023-03-10',
    purchasePrice: 500,
    currentValue: 400,
    status: 'UNDER_MAINTENANCE',
    location: 'Admin Office',
    department: 'Administration',
    category: 'Electronics',
    supplier: 'HP Inc.',
  },
];

export default function AssetsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // In a real application, this would fetch from the API
  // const { data: assets, isLoading } = useQuery({
  //   queryKey: ['assets'],
  //   queryFn: async () => {
  //     const response = await fetch('/api/assets');
  //     return response.json();
  //   },
  // });

  // For now, we'll use mock data
  const assets = mockAssets;
  const isLoading = false;

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || asset.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    // In a real application, this would call an API
    // try {
    //   await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    //   toast.success('Asset deleted successfully');
    //   router.refresh();
    // } catch (error) {
    //   toast.error('Failed to delete asset');
    // }
    
    // For now, just show a success message
    alert('Asset deleted successfully');
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Assets</h1>
        <Link
          href="/assets/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add New Asset
        </Link>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search assets..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="TRANSFERRED">Transferred</option>
            <option value="DISPOSED">Disposed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading assets...</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredAssets.map((asset) => (
              <li key={asset.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {asset.name}
                      </p>
                      <p className="ml-2 flex-shrink-0 flex">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          asset.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          asset.status === 'UNDER_MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
                          asset.status === 'TRANSFERRED' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {asset.status.replace('_', ' ')}
                        </span>
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="mr-2 text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </Link>
                      <Link
                        href={`/assets/${asset.id}/edit`}
                        className="mr-2 text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        Serial: {asset.serialNumber}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Department: {asset.department}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        Purchase Date: {new Date(asset.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 