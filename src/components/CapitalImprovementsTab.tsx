'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Download } from 'lucide-react';
import { CapitalImprovementModal } from '.';
import { usePermissions } from '@/hooks/usePermissions';
import { generateCapitalImprovementsPdf } from '@/lib/generateCapitalImprovementsPdf';
import { usePDF } from 'react-to-pdf';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface CapitalImprovement {
  id: string;
  description: string;
  improvementDate: string;
  cost: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // usefulLifeMonths and depreciationMethod are no longer used
}

interface CapitalImprovementsTabProps {
  assetId: string;
}

export function CapitalImprovementsTab({ assetId }: CapitalImprovementsTabProps) {
  const { checkPermission } = usePermissions();
  const [improvements, setImprovements] = useState<CapitalImprovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedImprovement, setSelectedImprovement] = useState<CapitalImprovement | null>(null);
  const [totalImprovementValue, setTotalImprovementValue] = useState(0);
  const [assetName, setAssetName] = useState<string>('');

  // For component-based PDF generation
  const contentRef = useRef<HTMLDivElement>(null);
  const { toPDF, targetRef } = usePDF({
    filename: `capital-improvements-${assetId}.pdf`,
  });

  const fetchImprovements = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch capital improvements
      const improvementsResponse = await fetch(`/api/assets/${assetId}/capital-improvements`);
      if (!improvementsResponse.ok) throw new Error('Failed to fetch capital improvements');
      const improvementsData = await improvementsResponse.json();
      setImprovements(improvementsData);

      // Calculate total improvement value
      const total = improvementsData.reduce((sum: number, item: CapitalImprovement) => sum + item.cost, 0);
      setTotalImprovementValue(total);

      // Fetch asset details to get the name
      const assetResponse = await fetch(`/api/assets/${assetId}`);
      if (assetResponse.ok) {
        const assetData = await assetResponse.json();
        setAssetName(assetData.name || `Asset ${assetId}`);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load capital improvements');
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchImprovements();
  }, [assetId, fetchImprovements]);

  const handleAddSuccess = () => {
    fetchImprovements();
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = () => {
    fetchImprovements();
    setIsEditModalOpen(false);
    setSelectedImprovement(null);
  };

  // Function to generate PDF using jsPDF (data-based approach)
  const handleGeneratePdf = () => {
    if (improvements.length === 0) {
      toast.error('No improvements to export');
      return;
    }

    try {
      generateCapitalImprovementsPdf({
        assetName,
        assetId,
        improvements,
        totalValue: totalImprovementValue
      });
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  // Function to generate PDF using react-to-pdf (component-based approach)
  const handleExportComponentAsPdf = () => {
    if (improvements.length === 0) {
      toast.error('No improvements to export');
      return;
    }

    try {
      toPDF();
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleEdit = (improvement: CapitalImprovement) => {
    setSelectedImprovement(improvement);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (improvementId: string) => {
    if (!window.confirm('Are you sure you want to delete this capital improvement? This will reduce the asset value.')) {
      return;
    }

    try {
      const response = await fetch(`/api/assets/${assetId}/capital-improvements/${improvementId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete capital improvement');

      toast.success('Capital improvement deleted successfully');
      fetchImprovements();
    } catch (error) {
      console.error('Error deleting capital improvement:', error);
      toast.error('Failed to delete capital improvement');
    }
  };

  // Using imported formatDate and formatCurrency functions from utils/formatters

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
          <h2 className="text-xl font-semibold">Capital Improvements</h2>
          <p className="text-sm text-gray-500">
            Manage improvements that simply increase the asset&apos;s value (like painting or minor upgrades)
          </p>
        </div>
        <div className="flex space-x-2">
          {improvements.length > 0 && (
            <button
              onClick={handleGeneratePdf}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Download size={16} className="mr-2" />
              Export PDF
            </button>
          )}
          {checkPermission('Asset edit') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              Add Improvement
            </button>
          )}
        </div>
      </div>

      <div ref={targetRef}>
        {/* PDF Title - only visible in PDF */}
        <div className="print-only mb-4">
          <h1 className="text-2xl font-bold text-center">{assetName} - Capital Improvements</h1>
          <p className="text-sm text-center text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
        </div>

      {/* Summary Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Improvement Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded-md shadow-sm">
            <p className="text-sm text-gray-500">Total Improvements</p>
            <p className="text-xl font-semibold">{improvements.length}</p>
          </div>
          <div className="bg-white p-3 rounded-md shadow-sm">
            <p className="text-sm text-gray-500">Total Added Value</p>
            <p className="text-xl font-semibold text-green-600">{formatCurrency(totalImprovementValue)}</p>
          </div>
          <div className="bg-white p-3 rounded-md shadow-sm">
            <p className="text-sm text-gray-500">Latest Improvement</p>
            <p className="text-xl font-semibold">
              {improvements.length > 0
                ? formatDate(improvements[0].improvementDate)
                : 'None'}
            </p>
          </div>
        </div>
      </div>

      {/* Improvements Table */}
      {improvements.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>

                {checkPermission('Asset edit') && (
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {improvements.map((improvement) => (
                <tr key={improvement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {improvement.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(improvement.improvementDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(improvement.cost)}
                  </td>

                  {checkPermission('Asset edit') && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(improvement)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(improvement.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <Plus size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No Capital Improvements</h3>
          <p className="mt-2 text-sm text-gray-500">
            Add improvements like painting, minor repairs, or other upgrades that simply increase the asset&apos;s value.
          </p>
          {checkPermission('Asset edit') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              Add First Improvement
            </button>
          )}
        </div>
      )}
      </div> {/* Close targetRef div */}

      {/* Modals */}
      <CapitalImprovementModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        assetId={assetId}
        onSuccess={handleAddSuccess}
      />

      {selectedImprovement && (
        <CapitalImprovementModal
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedImprovement(null);
          }}
          assetId={assetId}
          onSuccess={handleEditSuccess}
          initialData={selectedImprovement}
          isEditing
        />
      )}
    </div>
  );
}
