'use client';

import React from 'react';
import { X } from 'lucide-react';
import { MaintenanceFormSimple } from './MaintenanceFormSimple';

interface MaintenanceModalProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
  onSuccess: () => void;
  initialData?: any;
  isEditing?: boolean;
}

export function MaintenanceModal({
  open,
  onClose,
  assetId,
  onSuccess,
  initialData,
  isEditing = false,
}: MaintenanceModalProps) {
  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose}></div>

        {/* Modal */}
        <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          {/* Close button */}
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div>
            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                {isEditing ? 'Edit Maintenance Record' : 'Schedule or Request Maintenance'}
              </h3>
              <div className="mt-4">
                <MaintenanceFormSimple
                  assetId={assetId}
                  onSuccess={handleSuccess}
                  initialData={initialData}
                  isEditing={isEditing}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
