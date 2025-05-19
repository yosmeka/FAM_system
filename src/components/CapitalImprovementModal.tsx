'use client';

import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { CapitalImprovementForm } from './CapitalImprovementForm';

// Define a more specific type for initialData
interface CapitalImprovement {
  id?: string;
  description?: string;
  improvementDate?: string;
  cost?: number;
  notes?: string | null;
}

interface CapitalImprovementModalProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
  onSuccess: () => void;
  initialData?: CapitalImprovement;
  isEditing?: boolean;
}

export function CapitalImprovementModal({
  open,
  onClose,
  assetId,
  onSuccess,
  initialData,
  isEditing = false,
}: CapitalImprovementModalProps) {
  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition
          show={open}
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition
              show={open}
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div>
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      {isEditing ? 'Edit Capital Improvement' : 'Add Capital Improvement'}
                    </Dialog.Title>
                    <div className="mt-4">
                      <CapitalImprovementForm
                        assetId={assetId}
                        onSuccess={handleSuccess}
                        initialData={initialData}
                        isEditing={isEditing}
                      />
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
