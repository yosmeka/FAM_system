'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface FilterOptions {
  categories: string[];
  departments: string[];
  locations: string[];
  depreciationMethods: string[];
}

export interface FilterValues {
  startDate: string;
  endDate: string;
  category: string;
  department: string;
  location: string;
  status: string;
  minValue: string;
  maxValue: string;
  depreciationMethod: string;
}

interface AdvancedFiltersProps {
  filterOptions: FilterOptions;
  onFiltersChange: (filters: FilterValues) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function AdvancedFilters({
  filterOptions,
  onFiltersChange,
  onRefresh,
  isLoading = false
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({
    startDate: '',
    endDate: '',
    category: 'all',
    department: 'all',
    location: 'all',
    status: 'all',
    minValue: '',
    maxValue: '',
    depreciationMethod: 'all'
  });



  // Local state for pending filters (before submission)
  const [pendingFilters, setPendingFilters] = useState<FilterValues>(filters);

  // Update pending filters when props change
  useEffect(() => {
    setPendingFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    let processedValue = value;

    // Validation for date inputs
    if (key === 'endDate' && pendingFilters.startDate && value && value < pendingFilters.startDate) {
      // Don't allow end date before start date
      return;
    }

    if (key === 'startDate' && pendingFilters.endDate && value && value > pendingFilters.endDate) {
      // If start date is after end date, clear end date
      setPendingFilters({ ...pendingFilters, [key]: value, endDate: '' });
      return;
    }

    // Validation for value inputs
    if (key === 'minValue' || key === 'maxValue') {
      // Remove any non-numeric characters except decimal point
      processedValue = value.replace(/[^0-9.]/g, '');

      // Ensure only one decimal point
      const parts = processedValue.split('.');
      if (parts.length > 2) {
        processedValue = parts[0] + '.' + parts.slice(1).join('');
      }

      // Validate min/max relationship
      if (key === 'maxValue' && pendingFilters.minValue && processedValue && parseFloat(processedValue) < parseFloat(pendingFilters.minValue)) {
        // Don't allow max value less than min value
        return;
      }

      if (key === 'minValue' && pendingFilters.maxValue && processedValue && parseFloat(processedValue) > parseFloat(pendingFilters.maxValue)) {
        // If min value is greater than max value, clear max value
        setPendingFilters({ ...pendingFilters, [key]: processedValue, maxValue: '' });
        return;
      }
    }

    // Update pending filters only (don't trigger API call yet)
    setPendingFilters({ ...pendingFilters, [key]: processedValue });
  };

  // Apply filters function
  const applyFilters = () => {
    setFilters(pendingFilters);
    onFiltersChange(pendingFilters);
  };

  // Reset pending filters to current applied filters
  const resetPendingFilters = () => {
    setPendingFilters(filters);
  };

  const clearFilters = () => {
    const clearedFilters: FilterValues = {
      startDate: '',
      endDate: '',
      category: 'all',
      department: 'all',
      location: 'all',
      status: 'all',
      minValue: '',
      maxValue: '',
      depreciationMethod: 'all'
    };
    setPendingFilters(clearedFilters);
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value =>
    value !== '' && value !== 'all'
  );

  // Helper function to check if pending filters have changes
  const hasPendingChanges = JSON.stringify(pendingFilters) !== JSON.stringify(filters);

  // Helper function to check if pending filters have any values
  const hasPendingFilters = Object.values(pendingFilters).some(value =>
    value !== '' && value !== 'all'
  );

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value !== '' && value !== 'all').length;
  };

  const getPendingFilterCount = () => {
    return Object.values(pendingFilters).filter(value => value !== '' && value !== 'all').length;
  };

  const getActiveFilterSummary = () => {
    const activeFilters = [];

    if (filters.startDate && filters.endDate) {
      activeFilters.push(`Date: ${filters.startDate} to ${filters.endDate}`);
    } else if (filters.startDate) {
      activeFilters.push(`From: ${filters.startDate}`);
    } else if (filters.endDate) {
      activeFilters.push(`Until: ${filters.endDate}`);
    }

    if (filters.category && filters.category !== 'all') {
      activeFilters.push(`Category: ${filters.category}`);
    }

    if (filters.status && filters.status !== 'all') {
      activeFilters.push(`Status: ${filters.status}`);
    }

    if (filters.department && filters.department !== 'all') {
      activeFilters.push(`Department: ${filters.department}`);
    }

    if (filters.location && filters.location !== 'all') {
      activeFilters.push(`Location: ${filters.location}`);
    }

    if (filters.minValue || filters.maxValue) {
      const min = filters.minValue || '0';
      const max = filters.maxValue || '∞';
      activeFilters.push(`Value: $${min} - $${max}`);
    }

    if (filters.depreciationMethod && filters.depreciationMethod !== 'all') {
      activeFilters.push(`Method: ${filters.depreciationMethod}`);
    }

    return activeFilters;
  };

  return (
    <div className="bg-white dark:bg-black p-6 rounded-lg shadow-lg mb-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
        onReset={(e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
      >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-red-600 text-lg">🔍</span>
          <h3 className="text-lg font-semibold text-black dark:text-white">
            🔍 Advanced Filters
          </h3>
          {hasActiveFilters && (
            <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full font-medium">
              {getActiveFilterCount()} Active
            </span>
          )}
          {/* <div className="flex items-center gap-1 text-xs text-black dark:text-white">
            <span className="font-medium">Logic:</span>
            <span className="bg-red-600 text-white px-2 py-1 rounded font-medium">AND</span>
            <span title="Assets must match ALL selected criteria" className="text-red-600">ℹ️</span>
          </div> */}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRefresh();
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-red-600 font-medium"
          >
            <span className={`text-sm ${isLoading ? 'animate-spin' : ''}`}>🔄</span>
            Refresh Data
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearFilters();
              }}
              className="flex items-center gap-1 px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors border border-black font-medium"
            >
              <X className="h-4 w-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-black dark:text-white mb-1">
            📅 Start Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={pendingFilters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 pr-8 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
              placeholder="Select start date"
            />
            {pendingFilters.startDate && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFilterChange('startDate', '');
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Clear start date"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-black dark:text-white mb-1">
            📅 End Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={pendingFilters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              min={pendingFilters.startDate || undefined}
              className="w-full px-3 py-2 pr-8 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
              placeholder="Select end date"
            />
            {pendingFilters.endDate && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFilterChange('endDate', '');
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Clear end date"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-black dark:text-white mb-1">
            🏷️ Category
          </label>
          <select
            value={pendingFilters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
          >
            <option value="all">All Categories</option>
            {filterOptions.categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-black dark:text-white mb-1">
            📊 Status
          </label>
          <select
            value={pendingFilters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="DISPOSED">Disposed</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters - Always Visible */}
      <div className="pt-4">
        <h4 className="text-md font-medium text-black dark:text-white mb-4">⚙️ Additional Filters</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Department Filter */}
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <select
                value={pendingFilters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {filterOptions.departments.map(department => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div> */}

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                📍 Location
              </label>
              <select
                value={pendingFilters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
              >
                <option value="all">All Locations</option>
                {filterOptions.locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            {/* Depreciation Method Filter */}
            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                📊 Depreciation Method
              </label>
              <select
                value={pendingFilters.depreciationMethod}
                onChange={(e) => handleFilterChange('depreciationMethod', e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
              >
                <option value="all">All Methods</option>
                {filterOptions.depreciationMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            {/* Value Range Filters */}
            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                💰 Min Value ($)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={pendingFilters.minValue || ''}
                  onChange={(e) => handleFilterChange('minValue', e.target.value)}
                  placeholder="Enter minimum value"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 pr-8 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                />
                {pendingFilters.minValue && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleFilterChange('minValue', '');
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Clear minimum value"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                💰 Max Value ($)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={pendingFilters.maxValue || ''}
                  onChange={(e) => handleFilterChange('maxValue', e.target.value)}
                  placeholder="Enter maximum value"
                  min={pendingFilters.minValue || "0"}
                  step="0.01"
                  className="w-full px-3 py-2 pr-8 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                />
                {pendingFilters.maxValue && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleFilterChange('maxValue', '');
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Clear maximum value"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Apply/Reset Buttons */}
      <div className="pt-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasPendingChanges && (
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                ⚠️ You have unsaved filter changes
              </span>
            )}
            {hasPendingFilters && !hasPendingChanges && (
              <span className="text-sm text-black dark:text-white">
                🎯 {getPendingFilterCount()} filter(s) ready to apply
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {hasPendingChanges && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  resetPendingFilters();
                }}
                className="px-4 py-2 text-sm text-black dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors border border-black dark:border-white rounded-md hover:border-red-600"
              >
                🔄 Reset Changes
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyFilters();
              }}
              disabled={!hasPendingFilters}
              className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-md transition-colors border-2 ${
                hasPendingFilters
                  ? 'bg-red-600 text-white hover:bg-red-700 border-red-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
              } ${hasPendingChanges ? 'ring-2 ring-red-400 ring-opacity-50' : ''}`}
            >
              <span className="text-sm">🔍</span>
              Apply Filters
              {hasPendingFilters && (
                <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs font-medium">
                  {getPendingFilterCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                🎯 Active Filters ({getActiveFilterCount()}) - AND Logic
              </h4>
              <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                Showing assets that match <strong>ALL</strong> selected criteria simultaneously
              </p>
              <div className="flex flex-wrap gap-2">
                {getActiveFilterSummary().map((filter, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs rounded-md font-medium"
                  >
                    {filter}
                    {index < getActiveFilterSummary().length - 1 && (
                      <span className="text-white font-bold ml-1 bg-black px-1 rounded">AND</span>
                    )}
                  </span>
                ))}
              </div>
              {getActiveFilterCount() > 2 && (
                <div className="mt-3 p-3 bg-white dark:bg-black rounded text-xs">
                  <span className="text-red-800 dark:text-red-200">
                    💡 <strong>Tip:</strong> Multiple filters narrow down results. If you see few/no results, try removing some filters to broaden the search.
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearFilters();
              }}
              className="flex-shrink-0 bg-black text-white px-3 py-1 rounded-md hover:bg-gray-800 text-sm font-medium transition-colors"
              title="Clear all filters"
            >
              Clear All
            </button>
          </div>
        </div>
      )}


      </form>
    </div>
  );
}
