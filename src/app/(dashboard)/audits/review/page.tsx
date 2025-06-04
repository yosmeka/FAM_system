'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  FileText,
  Filter,
  Search,
  Eye
} from 'lucide-react';
import ReviewAuditModal from '@/components/audit/ReviewAuditModal';

interface PendingAudit {
  id: string;
  auditDate: string;
  condition: string;
  locationVerified: boolean;
  actualLocation?: string;
  notes: string;
  discrepancies?: string;
  recommendations?: string;
  checklistItems?: Array<{
    item: string;
    checked: boolean;
    notes?: string;
  }>;
  workflowStatus: string;
  auditorId: string;
  auditor?: {
    name: string;
    email: string;
  };
  asset: {
    id: string;
    name: string;
    serialNumber: string;
    department: string;
    category: string;
    location: string;
  };
  assignment?: {
    id: string;
    title: string;
    assignedById: string;
  };
  request?: {
    id: string;
    title: string;
    managerId: string;
  };
}

export default function AuditReviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pendingAudits, setPendingAudits] = useState<PendingAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [selectedAudit, setSelectedAudit] = useState<PendingAudit | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Wait for session to load
  if (status === 'loading') return null;

  // Show access denied for USERs
  if (session?.user?.role === 'USER') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-white p-8 rounded shadow text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-600">Access Denied</h1>
          <p className="text-gray-700">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchPendingAudits();
  }, []);

  const fetchPendingAudits = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/audits/pending-review');
      if (response.ok) {
        const data = await response.json();
        setPendingAudits(data);
      } else {
        console.error('Failed to fetch pending audits');
      }
    } catch (error) {
      console.error('Error fetching pending audits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSuccess = () => {
    fetchPendingAudits();
    setShowReviewModal(false);
    setSelectedAudit(null);
  };

  const openReviewModal = (audit: PendingAudit) => {
    setSelectedAudit(audit);
    setShowReviewModal(true);
  };

  const filteredAudits = pendingAudits.filter(audit => {
    const matchesSearch = 
      audit.asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.auditor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (audit.assignment?.title || audit.request?.title || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCondition = conditionFilter === 'all' || audit.condition === conditionFilter;

    return matchesSearch && matchesCondition;
  });

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return 'bg-green-100 text-green-800';
      case 'GOOD':
        return 'bg-green-50 text-green-600';
      case 'FAIR':
        return 'bg-yellow-100 text-yellow-800';
      case 'POOR':
        return 'bg-orange-100 text-orange-800';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysAgo = (dateString: string) => {
    const auditDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - auditDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#212332' }}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 min-h-screen" style={{ backgroundColor: '#212332' }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Audit Review</h1>
        <p className="text-gray-400">
          Review completed audits pending your approval
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search audits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Conditions</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-white">{pendingAudits.length}</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Critical Condition</p>
              <p className="text-2xl font-bold text-white">
                {pendingAudits.filter(a => a.condition === 'CRITICAL').length}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">With Discrepancies</p>
              <p className="text-2xl font-bold text-white">
                {pendingAudits.filter(a => a.discrepancies && a.discrepancies.trim()).length}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Overdue Review</p>
              <p className="text-2xl font-bold text-white">
                {pendingAudits.filter(a => getDaysAgo(a.auditDate) > 3).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Audits List */}
      {filteredAudits.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Pending Reviews</h3>
          <p className="text-gray-400">All audits have been reviewed!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAudits.map((audit) => (
            <div
              key={audit.id}
              className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
              style={{ backgroundColor: '#2A2D3E' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {audit.assignment?.title || audit.request?.title || 'Asset Audit'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConditionColor(audit.condition)}`}>
                      {audit.condition}
                    </span>
                    {getDaysAgo(audit.auditDate) > 3 && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        OVERDUE REVIEW
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                    <div>
                      <span className="font-medium">Asset:</span> {audit.asset.name}
                      <br />
                      <span className="font-medium">Serial:</span> {audit.asset.serialNumber}
                    </div>
                    <div>
                      <span className="font-medium">Auditor:</span> {audit.auditor?.name || 'Unknown'}
                      <br />
                      <span className="font-medium">Date:</span> {formatDate(audit.auditDate)}
                    </div>
                    <div>
                      <span className="font-medium">Department:</span> {audit.asset.department}
                      <br />
                      <span className="font-medium">Location Verified:</span> {audit.locationVerified ? 'Yes' : 'No'}
                    </div>
                  </div>

                  {audit.discrepancies && (
                    <div className="mt-3 p-3 bg-red-900 bg-opacity-50 border border-red-600 rounded-md">
                      <p className="text-red-200 text-sm">
                        <span className="font-medium">Discrepancies:</span> {audit.discrepancies}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => openReviewModal(audit)}
                  className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Review
                </button>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center gap-4">
                  <span>Days since audit: {getDaysAgo(audit.auditDate)}</span>
                  {audit.recommendations && (
                    <span className="text-blue-400">Has recommendations</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Pending review</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedAudit && (
        <ReviewAuditModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedAudit(null);
          }}
          onSuccess={handleReviewSuccess}
          audit={selectedAudit}
          assignmentId={selectedAudit.assignment?.id}
          requestId={selectedAudit.request?.id}
        />
      )}
    </div>
  );
}
