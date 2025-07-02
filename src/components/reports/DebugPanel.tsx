'use client';

import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DebugPanelProps {
  currentFilters: unknown;
  apiResponse: unknown;
  queryString: string;
  isVisible?: boolean;
}

export function DebugPanel({ 
  currentFilters, 
  apiResponse, 
  queryString, 
  isVisible = false 
}: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(isVisible);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      toast.success(`${section} copied to clipboard!`);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return 'Error formatting JSON';
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-colors"
        >
          <Bug className="h-4 w-4" />
          Debug Mode
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-purple-600 text-white">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4" />
          <span className="font-semibold text-sm">Debug Panel</span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 hover:bg-purple-700 rounded"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 max-h-80 overflow-y-auto text-xs">
        {/* Current Filters */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              Active Filters
            </h4>
            <button
              onClick={() => copyToClipboard(formatJSON(currentFilters), 'Filters')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {copiedSection === 'Filters' ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-gray-500" />
              )}
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs max-h-20 overflow-y-auto">
            <pre className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {formatJSON(currentFilters)}
            </pre>
          </div>
        </div>

        {/* API Query */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              API Query
            </h4>
            <button
              onClick={() => copyToClipboard(queryString, 'Query')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {copiedSection === 'Query' ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-gray-500" />
              )}
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
            <code className="text-blue-600 dark:text-blue-400 break-all">
              {queryString || '/api/reports/assets (no filters)'}
            </code>
          </div>
        </div>

        {/* Response Summary */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              Response Summary
            </h4>
            <button
              onClick={() => copyToClipboard(formatJSON(apiResponse), 'Response')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {copiedSection === 'Response' ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-gray-500" />
              )}
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
            {apiResponse ? (
              <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                <div>Total Assets: <span className="font-semibold text-gray-900 dark:text-gray-100">{apiResponse.stats?.totalAssets || 0}</span></div>
                <div>Active Assets: <span className="font-semibold text-gray-900 dark:text-gray-100">{apiResponse.stats?.activeAssets || 0}</span></div>
                <div>Categories: <span className="font-semibold text-gray-900 dark:text-gray-100">{apiResponse.byCategory?.length || 0}</span></div>
                <div>Status Types: <span className="font-semibold text-gray-900 dark:text-gray-100">{apiResponse.statusDistribution?.length || 0}</span></div>
                <div>Depreciation Points: <span className="font-semibold text-gray-900 dark:text-gray-100">{apiResponse.depreciation?.length || 0}</span></div>
                <div>Total Value: <span className="font-semibold text-gray-900 dark:text-gray-100">${(apiResponse.stats?.totalValue || 0).toLocaleString()}</span></div>
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">No response data</div>
            )}
          </div>
        </div>

        {/* Filter Options */}
        {apiResponse?.filterOptions && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Available Filter Options
            </h4>
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                <div>Categories: <span className="font-semibold">{apiResponse.filterOptions.categories?.length || 0}</span></div>
                <div>Departments: <span className="font-semibold">{apiResponse.filterOptions.departments?.length || 0}</span></div>
                <div>Locations: <span className="font-semibold">{apiResponse.filterOptions.locations?.length || 0}</span></div>
                <div>Methods: <span className="font-semibold">{apiResponse.filterOptions.depreciationMethods?.length || 0}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Data Validation */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Data Validation
          </h4>
          <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
            <div className="space-y-1">
              <div className={`flex items-center gap-2 ${
                apiResponse?.stats?.totalAssets > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>{apiResponse?.stats?.totalAssets > 0 ? '✓' : '✗'}</span>
                <span>Has asset data</span>
              </div>
              <div className={`flex items-center gap-2 ${
                apiResponse?.depreciation?.length > 0 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                <span>{apiResponse?.depreciation?.length > 0 ? '✓' : '⚠'}</span>
                <span>Has depreciation data</span>
              </div>
              <div className={`flex items-center gap-2 ${
                apiResponse?.byCategory?.length > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>{apiResponse?.byCategory?.length > 0 ? '✓' : '✗'}</span>
                <span>Has category data</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
