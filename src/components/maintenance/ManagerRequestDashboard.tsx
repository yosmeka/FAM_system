'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import {
  AlertTriangle,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Wrench,
  AlertCircle
} from 'lucide-react';

interface MaintenanceRequest {
  id: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  maintenanceType: string;
  issueType?: string;
  urgencyLevel?: string;
  assetDowntime: boolean;
  impactDescription?: string;
  asset: {
    name: string;
    serialNumber: string;
    location: string;
  };
  requester: {
    name: string;
    email: string;
  };
}

interface ManagerRequestDashboardProps {
  onRequestApproved: () => void;
  onRequestSelected?: (request: MaintenanceRequest) => void;
}

export default function ManagerRequestDashboard({ onRequestApproved, onRequestSelected }: ManagerRequestDashboardProps) {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING_APPROVAL');
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Only fetch CORRECTIVE maintenance requests (technician-submitted requests)
      params.append('maintenanceType', 'CORRECTIVE');

      if (filter !== 'ALL') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/maintenance?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Additional filter to ensure we only get corrective maintenance requests
        const correctiveRequests = data.filter((request: MaintenanceRequest) =>
          request.maintenanceType === 'CORRECTIVE'
        );
        setRequests(correctiveRequests);
      }
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'Immediate': return 'text-red-600';
      case 'Urgent': return 'text-orange-600';
      case 'Normal': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const handleApproveRequest = (request: MaintenanceRequest) => {
    if (onRequestSelected) {
      onRequestSelected(request);
    } else {
      setSelectedRequest(request);
      setShowApprovalModal(true);
    }
  };

  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      const response = await fetch(`/api/maintenance/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          notes: `Request rejected by manager: ${reason}`,
        }),
      });

      if (!response.ok) throw new Error('Failed to reject request');

      toast.success('Request rejected successfully');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Corrective Maintenance Requests</h2>
          <p className="text-gray-400">Review and approve issue reports submitted by technicians</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4">
        {[
          { key: 'PENDING_APPROVAL', label: 'Pending Approval', count: requests.filter(r => r.status === 'PENDING_APPROVAL').length },
          { key: 'APPROVED', label: 'Approved', count: requests.filter(r => r.status === 'APPROVED').length },
          { key: 'REJECTED', label: 'Rejected', count: requests.filter(r => r.status === 'REJECTED').length },
          { key: 'ALL', label: 'All Requests', count: requests.length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              filter === tab.key
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            style={{
              backgroundColor: filter === tab.key ? '#2697FF' : '#2A2D3E',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="px-2 py-1 text-xs bg-gray-600 text-white rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests Grid */}
      {requests.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Corrective Maintenance Requests</h3>
          <p className="text-gray-400">
            {filter === 'PENDING_APPROVAL'
              ? 'No pending corrective maintenance requests from technicians to review.'
              : `No ${filter.toLowerCase()} corrective maintenance requests.`
            }
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Technicians can submit issue reports through "Report Issues" page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request) => (
            <div
              key={request.id}
              className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
              style={{ backgroundColor: '#2A2D3E' }}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {request.asset.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {request.asset.serialNumber} • {request.asset.location}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(request.priority)}`}>
                    {request.priority}
                  </span>
                  {request.assetDowntime && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                      ASSET DOWN
                    </span>
                  )}
                </div>
              </div>

              {/* Issue Details */}
              <div className="space-y-3 mb-4">
                {request.issueType && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{request.issueType}</span>
                  </div>
                )}

                {request.urgencyLevel && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className={`w-4 h-4 ${getUrgencyColor(request.urgencyLevel)}`} />
                    <span className={getUrgencyColor(request.urgencyLevel)}>
                      {request.urgencyLevel} Priority
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <User className="w-4 h-4" />
                  <span>Reported by: {request.requester.name}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Calendar className="w-4 h-4" />
                  <span>Reported: {new Date(request.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <p className="text-sm text-gray-300 line-clamp-3">
                  {request.description}
                </p>
              </div>

              {/* Impact Description */}
              {request.impactDescription && (
                <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-500">Operational Impact</span>
                  </div>
                  <p className="text-sm text-yellow-100">
                    {request.impactDescription}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {request.status === 'PENDING_APPROVAL' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRejectRequest(request.id, 'Request rejected by manager')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproveRequest(request)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                </div>
              )}

              {request.status !== 'PENDING_APPROVAL' && (
                <div className="text-center">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                    request.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : request.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {request.status === 'APPROVED' && <CheckCircle className="w-4 h-4" />}
                    {request.status === 'REJECTED' && <XCircle className="w-4 h-4" />}
                    {request.status.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal will be added in next component */}
    </div>
  );
}
