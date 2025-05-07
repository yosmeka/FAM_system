"use client";
import BellIcon from "@heroicons/react/24/outline/BellIcon";
import { useState } from "react";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const notifications = [
    { id: 1, message: "Welcome to the system!" },
    // Add more notifications here
  ];
  return (
    <div className="relative mr-2">
      <button
        className="p-1 rounded-full hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-white relative"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-2 px-4 font-semibold border-b border-gray-100 dark:border-gray-800">Notifications</div>
          {notifications.length === 0 ? (
            <div className="p-4 text-gray-500">No new notifications.</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                {n.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
