'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Plus, AlertTriangle, Clock, CheckCircle, XCircle, Eye, Play, FileText, DollarSign } from 'lucide-react';
import MaintenanceRequestForm from '@/components/maintenance/MaintenanceRequestForm';
import WorkDocumentationModal from '@/components/maintenance/WorkDocumentationModal';

interface MaintenanceRequest {
  id: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  issueType?: string;
  urgencyLevel?: string;
  assetDowntime: boolean;
  workPerformed?: string;
  laborHours?: number;
  totalCost?: number;
  workStartedAt?: string;
  workCompletedAt?: string;
  asset: {
    name: string;
    serialNumber: string;
    location: string;
  };
  manager?: {
    name: string;
  };
  assignedTo?: {
    name: string;
    email: string;
  };
}

export default function RequestIssuePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [showWorkModal, setShowWorkModal] = useState(false);

  useEffect(() => {
    fetchMyRequests();
  }, [filter]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('maintenanceType', 'CORRECTIVE');
      params.append('requester', 'me');
      if (filter !== 'ALL') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/maintenance?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCreated = () => {
    fetchMyRequests();
    toast.success('Maintenance request submitted successfully!');
  };

  const handleStartWork = async (request: MaintenanceRequest) => {
    try {
      const response = await fetch(`/api/maintenance/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          workStartedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to start work');

      fetchMyRequests(); // Refresh requests
      toast.success('Work started successfully!');
    } catch (error) {
      console.error('Error starting work:', error);
      toast.error('Failed to start work');
    }
  };

  const handleDocumentWork = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setShowWorkModal(true);
  };

  const handleWorkCompleted = () => {
    fetchMyRequests(); // Refresh requests
    setSelectedRequest(null);
    setShowWorkModal(false);
    toast.success('Work completed and submitted for manager review!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL': return 'text-yellow-600 bg-yellow-100';
      case 'APPROVED': return 'text-green-600 bg-green-100';
      case 'REJECTED': return 'text-red-600 bg-red-100';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-100';
      case 'WORK_COMPLETED': return 'text-orange-600 bg-orange-100';
      case 'PENDING_REVIEW': return 'text-purple-600 bg-purple-100';
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: '#212332' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Report Maintenance Issues</h1>
          <p className="text-gray-400">Submit corrective maintenance requests for asset issues</p>
        </div>
        <button
          onClick={() => setShowRequestForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#2697FF' }}
        >
          <Plus className="w-4 h-4" />
          Report Issue
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6">
        {[
          { key: 'ALL', label: 'All Requests', count: requests.length },
          { key: 'PENDING_APPROVAL', label: 'Pending', count: requests.filter(r => r.status === 'PENDING_APPROVAL').length },
          { key: 'APPROVED', label: 'Approved', count: requests.filter(r => r.status === 'APPROVED').length },
          { key: 'IN_PROGRESS', label: 'In Progress', count: requests.filter(r => r.status === 'IN_PROGRESS').length },
          { key: 'WORK_COMPLETED', label: 'Work Done', count: requests.filter(r => r.status === 'WORK_COMPLETED').length },
          { key: 'COMPLETED', label: 'Completed', count: requests.filter(r => r.status === 'COMPLETED').length },
          { key: 'REJECTED', label: 'Rejected', count: requests.filter(r => r.status === 'REJECTED').length }
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
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Maintenance Requests</h3>
          <p className="text-gray-400 mb-6">
            {filter === 'ALL'
              ? "You haven't submitted any maintenance requests yet."
              : `No ${filter.toLowerCase().replace('_', ' ')} requests found.`
            }
          </p>
          <button
            onClick={() => setShowRequestForm(true)}
            className="px-6 py-3 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#2697FF' }}
          >
            Report Your First Issue
          </button>
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
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                    {request.status.replace('_', ' ')}
                  </span>
                  {request.assetDowntime && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                      ASSET DOWN
                    </span>
                  )}
                </div>
              </div>

              {/* Issue Details */}
              <div className="space-y-2 mb-4">
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
                  <span className={`font-medium ${getPriorityColor(request.priority)}`}>
                    {request.priority} Priority
                  </span>
                </div>

                {request.manager && (
                  <div className="text-sm text-gray-300">
                    <span>Assigned to: {request.manager.name}</span>
                  </div>
                )}

                <div className="text-sm text-gray-400">
                  Submitted: {new Date(request.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <p className="text-sm text-gray-300 line-clamp-3">
                  {request.description}
                </p>
              </div>

              {/* Work Information */}
              {request.workStartedAt && (
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-400 mb-2">
                    <Play className="w-4 h-4" />
                    <span>Started: {new Date(request.workStartedAt).toLocaleDateString()}</span>
                  </div>
                  {request.assignedTo && (
                    <div className="text-sm text-gray-300">
                      Assigned to: {request.assignedTo.name}
                    </div>
                  )}
                </div>
              )}

              {request.workCompletedAt && (
                <div className="mb-4 p-3 bg-orange-900/20 border border-orange-600/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-orange-400 mb-2">
                    <FileText className="w-4 h-4" />
                    <span>Completed: {new Date(request.workCompletedAt).toLocaleDateString()}</span>
                  </div>
                  {request.laborHours && (
                    <div className="text-sm text-gray-300 mb-1">
                      Labor Hours: {request.laborHours}h
                    </div>
                  )}
                  {request.totalCost && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <DollarSign className="w-4 h-4" />
                      <span>Total Cost: ${request.totalCost.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mb-4">
                {/* Start Work Button */}
                {request.status === 'APPROVED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartWork(request);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex-1"
                  >
                    <Play className="w-4 h-4" />
                    Start Work
                  </button>
                )}

                {/* Complete Work Button */}
                {request.status === 'IN_PROGRESS' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDocumentWork(request);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex-1"
                  >
                    <FileText className="w-4 h-4" />
                    Complete Work
                  </button>
                )}

                {/* View Details Button */}
                <button
                  onClick={() => router.push(`/maintenance/${request.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Details
                </button>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-center">
                {request.status === 'PENDING_APPROVAL' && (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Awaiting manager approval</span>
                  </div>
                )}
                {request.status === 'APPROVED' && (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Ready to start work</span>
                  </div>
                )}
                {request.status === 'REJECTED' && (
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm">Request rejected</span>
                  </div>
                )}
                {request.status === 'IN_PROGRESS' && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <Play className="w-4 h-4" />
                    <span className="text-sm">Work in progress</span>
                  </div>
                )}
                {request.status === 'WORK_COMPLETED' && (
                  <div className="flex items-center gap-2 text-orange-400">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Awaiting manager review</span>
                  </div>
                )}
                {request.status === 'COMPLETED' && (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Work completed and approved</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Form Modal */}
      <MaintenanceRequestForm
        isOpen={showRequestForm}
        onClose={() => setShowRequestForm(false)}
        onRequestCreated={handleRequestCreated}
      />

      {/* Work Documentation Modal */}
      <WorkDocumentationModal
        open={showWorkModal}
        onClose={() => setShowWorkModal(false)}
        task={selectedRequest}
        onWorkCompleted={handleWorkCompleted}
      />
    </div>
  );
}
