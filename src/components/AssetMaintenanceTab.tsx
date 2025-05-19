'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Wrench,
  FileText,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { MaintenanceModal } from './MaintenanceModal';
import { MaintenanceApprovalModal } from './MaintenanceApprovalModal';
import { usePermissions } from '@/hooks/usePermissions';
import { useRole } from '@/hooks/useRole';
import { MaintenancePriority, MaintenanceStatus } from '@/types/maintenance';

interface MaintenanceRecord {
  id: string;
  assetId: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  cost?: number | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: {
    name: string;
    email: string;
  };
}

interface AssetMaintenanceTabProps {
  assetId: string;
  assetName: string;
  lastMaintenance?: string | null;
  nextMaintenance?: string | null;
}

export function AssetMaintenanceTab({
  assetId,
  assetName,
  lastMaintenance,
  nextMaintenance
}: AssetMaintenanceTabProps) {
  const { checkPermission } = usePermissions();
  const { isManager, isAdmin } = useRole();
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [maintenanceStats, setMaintenanceStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    pendingApproval: 0,
    rejected: 0,
    maintenanceDue: false,
    daysSinceLastMaintenance: 0,
    daysUntilNextMaintenance: 0
  });

  const fetchMaintenanceRecords = async () => {
    try {
      console.log("MAINTENANCE TAB - Fetching records for asset:", assetId);
      setIsLoading(true);

      // Use the test API endpoint that we know works
      const response = await fetch(`/api/test/maintenance?assetId=${assetId}`);

      console.log("MAINTENANCE TAB - Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("MAINTENANCE TAB - Error response:", errorText);
        throw new Error(`Failed to fetch maintenance records: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("MAINTENANCE TAB - Received data:", data);
      setMaintenanceRecords(data);

      // Calculate stats
      const stats = {
        total: data.length,
        pending: data.filter((record: MaintenanceRecord) =>
          record.status === 'PENDING_APPROVAL' ||
          record.status === 'APPROVED' ||
          record.status === 'SCHEDULED'
        ).length,
        inProgress: data.filter((record: MaintenanceRecord) => record.status === 'IN_PROGRESS').length,
        completed: data.filter((record: MaintenanceRecord) => record.status === 'COMPLETED').length,
        pendingApproval: data.filter((record: MaintenanceRecord) => record.status === 'PENDING_APPROVAL').length,
        rejected: data.filter((record: MaintenanceRecord) => record.status === 'REJECTED').length,
        maintenanceDue: false,
        daysSinceLastMaintenance: 0,
        daysUntilNextMaintenance: 0
      };

      // Calculate days since last maintenance
      if (lastMaintenance) {
        const lastDate = new Date(lastMaintenance);
        stats.daysSinceLastMaintenance = differenceInDays(new Date(), lastDate);
      }

      // Calculate days until next maintenance
      if (nextMaintenance) {
        const nextDate = new Date(nextMaintenance);
        stats.daysUntilNextMaintenance = differenceInDays(nextDate, new Date());
        stats.maintenanceDue = stats.daysUntilNextMaintenance <= 0;
      }

      setMaintenanceStats(stats);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      toast.error('Failed to load maintenance records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceRecords();
  }, [assetId]);

  const handleAddSuccess = () => {
    fetchMaintenanceRecords();
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = () => {
    fetchMaintenanceRecords();
    setIsEditModalOpen(false);
    setSelectedRecord(null);
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setIsEditModalOpen(true);
  };

  const handleApproval = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setIsApprovalModalOpen(true);
  };

  const handleApprovalSuccess = () => {
    fetchMaintenanceRecords();
    setIsApprovalModalOpen(false);
    setSelectedRecord(null);
  };

  const toggleExpandRecord = (id: string) => {
    if (expandedRecordId === id) {
      setExpandedRecordId(null);
    } else {
      setExpandedRecordId(id);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const getStatusBadge = (status: any) => {
    // Handle undefined or null status
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unknown
        </span>
      );
    }

    // Convert to string to handle any type issues
    const statusStr = String(status).toUpperCase();

    switch (statusStr) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <ThumbsUp className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ThumbsDown className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Calendar className="w-3 h-3 mr-1" />
            Scheduled
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Wrench className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </span>
        );
      default:
        // Fallback for any other status
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {statusStr}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: any) => {
    // Handle undefined or null priority
    if (!priority) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unknown
        </span>
      );
    }

    // Convert to string to handle any type issues
    const priorityStr = String(priority).toUpperCase();

    switch (priorityStr) {
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Low
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Medium
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            High
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Critical
          </span>
        );
      default:
        // Fallback for any other priority
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {priorityStr}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Asset Maintenance</h2>
          <p className="text-sm text-gray-500">
            Track and manage maintenance for {assetName}
          </p>
        </div>
        {checkPermission('Asset edit') && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={16} className="mr-2" />
            {(isManager() || isAdmin()) ? "Schedule/Request Maintenance" : "Request Maintenance"}
          </button>
        )}
      </div>

      {/* Maintenance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Records</p>
              <p className="text-xl font-semibold">{maintenanceStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-xl font-semibold">{maintenanceStats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-xl font-semibold">{maintenanceStats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${nextMaintenance ? (maintenanceStats.maintenanceDue ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600') : 'bg-gray-100 text-gray-600'} mr-4`}>
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Next Maintenance</p>
              {nextMaintenance ? (
                <p className="text-sm font-semibold">
                  {maintenanceStats.maintenanceDue
                    ? 'Overdue'
                    : `In ${maintenanceStats.daysUntilNextMaintenance} days`}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not scheduled</p>
              )}
              {nextMaintenance && (
                <p className="text-xs text-gray-500">{formatDate(nextMaintenance)}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Records List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          <p className="mt-2 text-gray-600">Loading maintenance records...</p>
        </div>
      ) : maintenanceRecords.length > 0 ? (
        <div className="space-y-4">
          {maintenanceRecords.map((record) => (
            <div
              key={record.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpandRecord(record.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Wrench className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {record.description.length > 60
                        ? record.description.substring(0, 60) + '...'
                        : record.description}
                    </p>
                    <p className="text-sm text-gray-500">
                      Created on {formatDate(record.createdAt)}
                      {record.requester && ` by ${record.requester.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(record.status)}
                  {getPriorityBadge(record.priority)}
                </div>
              </div>

              {expandedRecordId === record.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Description</h4>
                      <p className="mt-1">{record.description}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Details</h4>
                      <ul className="mt-1 space-y-1 text-sm">
                        <li><span className="font-medium">Status:</span> {record.status}</li>
                        <li><span className="font-medium">Priority:</span> {record.priority}</li>
                        {record.cost && <li><span className="font-medium">Cost:</span> ${record.cost.toFixed(2)}</li>}
                        {record.completedAt && <li><span className="font-medium">Completed:</span> {formatDate(record.completedAt)}</li>}
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-4">
                    {(isManager() || isAdmin()) && record.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproval(record);
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50"
                      >
                        <ThumbsUp size={14} className="mr-1.5" />
                        Review Request
                      </button>
                    )}

                    {checkPermission('Asset edit') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(record);
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Edit size={14} className="mr-1.5" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <Wrench size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No Maintenance Records</h3>
          <p className="mt-2 text-sm text-gray-500">
            Schedule maintenance to keep track of this asset's upkeep.
          </p>
          {checkPermission('Asset edit') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              {(isManager() || isAdmin()) ? "Schedule/Request First Maintenance" : "Request First Maintenance"}
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <MaintenanceModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        assetId={assetId}
        onSuccess={handleAddSuccess}
      />

      {selectedRecord && (
        <MaintenanceModal
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedRecord(null);
          }}
          assetId={assetId}
          onSuccess={handleEditSuccess}
          initialData={selectedRecord}
          isEditing
        />
      )}

      {selectedRecord && (
        <MaintenanceApprovalModal
          open={isApprovalModalOpen}
          onClose={() => {
            setIsApprovalModalOpen(false);
            setSelectedRecord(null);
          }}
          maintenanceId={selectedRecord.id}
          assetId={assetId}
          description={selectedRecord.description}
          priority={selectedRecord.priority}
          requesterName={selectedRecord.requester?.name}
          createdAt={selectedRecord.createdAt}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </div>
  );
}
