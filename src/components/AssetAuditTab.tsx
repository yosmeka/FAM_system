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
  FileText,
  Image
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { AssetAuditModal } from './AssetAuditModal';
import { usePermissions } from '@/hooks/usePermissions';

interface AssetAudit {
  id: string;
  auditDate: string;
  auditedBy: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW';
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL' | 'MISSING';
  locationVerified: boolean;
  notes: string | null;
  discrepancies: string | null;
  discrepancyResolved: boolean;
  resolvedDate: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  photoUrls: string | null;
  nextAuditDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AssetAuditTabProps {
  assetId: string;
  assetName: string;
  assetLocation?: string;
  lastAuditDate?: string | null;
  nextAuditDate?: string | null;
}

export function AssetAuditTab({ 
  assetId, 
  assetName,
  assetLocation,
  lastAuditDate,
  nextAuditDate
}: AssetAuditTabProps) {
  const { checkPermission } = usePermissions();
  const [audits, setAudits] = useState<AssetAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<AssetAudit | null>(null);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [auditStats, setAuditStats] = useState({
    total: 0,
    withDiscrepancies: 0,
    unresolvedDiscrepancies: 0,
    auditDue: false,
    daysSinceLastAudit: 0,
    daysUntilNextAudit: 0
  });

  const fetchAudits = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/assets/${assetId}/audits`);
      if (!response.ok) throw new Error('Failed to fetch audits');
      const data = await response.json();
      setAudits(data);
      
      // Calculate audit statistics
      const withDiscrepancies = data.filter((audit: AssetAudit) => audit.discrepancies && audit.discrepancies.trim().length > 0).length;
      const unresolvedDiscrepancies = data.filter((audit: AssetAudit) => 
        audit.discrepancies && 
        audit.discrepancies.trim().length > 0 && 
        !audit.discrepancyResolved
      ).length;
      
      // Calculate days since last audit and until next audit
      const today = new Date();
      const lastAudit = data.length > 0 ? new Date(data[0].auditDate) : null;
      const nextAuditDate = data.length > 0 && data[0].nextAuditDate ? new Date(data[0].nextAuditDate) : null;
      
      const daysSinceLastAudit = lastAudit ? Math.max(0, differenceInDays(today, lastAudit)) : 0;
      const daysUntilNextAudit = nextAuditDate ? Math.max(0, differenceInDays(nextAuditDate, today)) : 0;
      
      // Determine if audit is due
      const auditDue = nextAuditDate ? differenceInDays(nextAuditDate, today) <= 0 : false;
      
      setAuditStats({
        total: data.length,
        withDiscrepancies,
        unresolvedDiscrepancies,
        auditDue,
        daysSinceLastAudit,
        daysUntilNextAudit
      });
    } catch (error) {
      console.error('Error fetching audits:', error);
      toast.error('Failed to load audits');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, [assetId]);

  const handleAddSuccess = () => {
    fetchAudits();
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = () => {
    fetchAudits();
    setIsEditModalOpen(false);
    setSelectedAudit(null);
  };

  const handleEdit = (audit: AssetAudit) => {
    setSelectedAudit(audit);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (auditId: string) => {
    if (!window.confirm('Are you sure you want to delete this audit record?')) {
      return;
    }

    try {
      const response = await fetch(`/api/assets/${assetId}/audits/${auditId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete audit');
      
      toast.success('Audit record deleted successfully');
      fetchAudits();
    } catch (error) {
      console.error('Error deleting audit:', error);
      toast.error('Failed to delete audit');
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Completed</span>;
      case 'PENDING':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
      case 'FAILED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Failed</span>;
      case 'NEEDS_REVIEW':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><AlertTriangle className="w-3 h-3 mr-1" /> Needs Review</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Excellent</span>;
      case 'GOOD':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Good</span>;
      case 'FAIR':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Fair</span>;
      case 'POOR':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Poor</span>;
      case 'CRITICAL':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Critical</span>;
      case 'MISSING':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Missing</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{condition}</span>;
    }
  };

  const toggleExpandAudit = (auditId: string) => {
    if (expandedAuditId === auditId) {
      setExpandedAuditId(null);
    } else {
      setExpandedAuditId(auditId);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Asset Audits</h2>
          <p className="text-sm text-gray-500">
            Track and manage physical audits of {assetName}
          </p>
        </div>
        {checkPermission('Asset edit') && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={16} className="mr-2" />
            Record Audit
          </button>
        )}
      </div>

      {/* Audit Summary Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Audit Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded-md shadow-sm">
            <p className="text-sm text-gray-500">Last Audit</p>
            <p className="text-xl font-semibold">
              {lastAuditDate ? formatDate(lastAuditDate) : 'Never'}
            </p>
            {lastAuditDate && (
              <p className="text-xs text-gray-500 mt-1">
                {auditStats.daysSinceLastAudit} days ago
              </p>
            )}
          </div>
          <div className="bg-white p-3 rounded-md shadow-sm">
            <p className="text-sm text-gray-500">Next Audit</p>
            <p className="text-xl font-semibold">
              {nextAuditDate ? formatDate(nextAuditDate) : 'Not scheduled'}
            </p>
            {nextAuditDate && (
              <p className={`text-xs mt-1 ${auditStats.auditDue ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                {auditStats.auditDue 
                  ? 'OVERDUE' 
                  : `In ${auditStats.daysUntilNextAudit} days`}
              </p>
            )}
          </div>
          <div className="bg-white p-3 rounded-md shadow-sm">
            <p className="text-sm text-gray-500">Unresolved Issues</p>
            <p className="text-xl font-semibold">
              {auditStats.unresolvedDiscrepancies}
            </p>
            {auditStats.withDiscrepancies > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {auditStats.withDiscrepancies} total discrepancies found
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Audits List */}
      {audits.length > 0 ? (
        <div className="space-y-4">
          {audits.map((audit) => (
            <div 
              key={audit.id} 
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div 
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpandAudit(audit.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Calendar className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Audit on {formatDate(audit.auditDate)}
                    </p>
                    <p className="text-sm text-gray-500">
                      By {audit.auditedBy}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(audit.status)}
                  {getConditionBadge(audit.condition)}
                  {audit.discrepancies && (
                    audit.discrepancyResolved ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" /> Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Unresolved
                      </span>
                    )
                  )}
                </div>
              </div>
              
              {expandedAuditId === audit.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Location Verified</h4>
                      <p className="mt-1">
                        {audit.locationVerified ? (
                          <span className="inline-flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-600">
                            <XCircle className="w-4 h-4 mr-1" /> No
                          </span>
                        )}
                        {assetLocation && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({assetLocation})
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Next Audit Date</h4>
                      <p className="mt-1">
                        {audit.nextAuditDate ? formatDate(audit.nextAuditDate) : 'Not scheduled'}
                      </p>
                    </div>
                  </div>
                  
                  {audit.notes && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 flex items-center">
                        <FileText className="w-4 h-4 mr-1" /> Notes
                      </h4>
                      <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                        {audit.notes}
                      </p>
                    </div>
                  )}
                  
                  {audit.discrepancies && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-1" /> Discrepancies
                      </h4>
                      <div className="mt-1 p-3 bg-red-50 border border-red-100 rounded-md">
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {audit.discrepancies}
                        </p>
                        
                        {audit.discrepancyResolved && (
                          <div className="mt-3 pt-3 border-t border-red-100">
                            <p className="text-sm font-medium text-green-600 flex items-center">
                              <CheckCircle className="w-4 h-4 mr-1" /> Resolved on {audit.resolvedDate ? formatDate(audit.resolvedDate) : 'unknown date'}
                              {audit.resolvedBy && ` by ${audit.resolvedBy}`}
                            </p>
                            {audit.resolutionNotes && (
                              <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                                {audit.resolutionNotes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {audit.photoUrls && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 flex items-center">
                        <Image className="w-4 h-4 mr-1" /> Photos
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {audit.photoUrls.split(',').map((url, index) => (
                          <a 
                            key={index} 
                            href={url.trim()} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Photo {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {checkPermission('Asset edit') && (
                    <div className="flex justify-end space-x-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(audit);
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Edit size={14} className="mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(audit.id);
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <Calendar size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No Audits Recorded</h3>
          <p className="mt-2 text-sm text-gray-500">
            Record audits to track the physical condition and location of this asset.
          </p>
          {checkPermission('Asset edit') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              Record First Audit
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <AssetAuditModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        assetId={assetId}
        onSuccess={handleAddSuccess}
      />

      {selectedAudit && (
        <AssetAuditModal
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAudit(null);
          }}
          assetId={assetId}
          onSuccess={handleEditSuccess}
          initialData={selectedAudit}
          isEditing
        />
      )}
    </div>
  );
}
