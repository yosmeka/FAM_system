"use client";
import { Dialog } from "@headlessui/react/dist/components/dialog/dialog";
import { Fragment } from "react";

export default function AccountInfoModal({ open, onClose, user }: {
  open: boolean;
  onClose: () => void;
  user: { name?: string; email?: string; role?: string };
}) {
  return (
    <Dialog as="div" className="fixed z-50 inset-0 overflow-y-auto" open={open} onClose={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-auto p-8 z-10">
          <Dialog.Title className="text-xl font-bold mb-2">Account Information</Dialog.Title>
          <div className="mb-4">
            <div className="mb-2"><span className="font-semibold">Name:</span> {user.name || "Not available"}</div>
            <div className="mb-2"><span className="font-semibold">Email:</span> {user.email || "Not available"}</div>
            <div className="mb-2"><span className="font-semibold">Role:</span> {user.role || "Not available"}</div>
          </div>
          <button
            onClick={onClose}
            className="mt-2 w-full rounded-lg bg-red-600 text-white py-2 font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}
