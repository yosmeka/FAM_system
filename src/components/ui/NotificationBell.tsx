"use client";
import React, { useState, useRef, useEffect } from "react";

type NotificationBellProps = {
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
};

export function NotificationBell({ notifications, setNotifications }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={bellRef}
        className="relative p-2 rounded-full text-gray-600 dark:text-gray-200 bg-white dark:bg-gray-800 shadow hover:bg-red-100 dark:hover:bg-red-900 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
        onClick={() => setOpen((o) => !o)}
        aria-label="Show notifications"
      >
        <span className="sr-only">Show notifications</span>
        <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifications && notifications.length > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4">
            <h4 className="font-bold text-lg mb-2 text-gray-900 dark:text-gray-200">Notifications</h4>
            {notifications.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400 text-sm">No new notifications.</div>
            )}
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`relative bg-yellow-100 dark:bg-yellow-900 rounded px-3 py-2 text-yellow-900 dark:text-yellow-100 text-sm shadow flex flex-col gap-1 ${n.read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{n.message}</span>
                    <div className="flex gap-2 ml-2">
                      {!n.read ? (
                        <button
                          title="Mark as read"
                          className="text-green-600 hover:text-green-800"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch('/api/notifications', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: n.id }),
                              });
                              if (!res.ok) {
                                const err = await res.json();
                                throw new Error(err.error || 'Failed to mark as read');
                              }
                              setNotifications((prev) => prev.map((notif) => notif.id === n.id ? { ...notif, read: true } : notif));
                            } catch (err) {
                              alert('Failed to mark as read');
                            }
                          }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </button>
                      ) : (
                        <span title="Read" className="text-green-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                      )}
                      <button
                        title="Delete notification"
                        className="text-red-600 hover:text-red-800"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await fetch('/api/notifications', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: n.id }),
                            });
                            if (!res.ok) {
                              const err = await res.json();
                              throw new Error(err.error || 'Failed to delete notification');
                            }
                            setNotifications((prev) => prev.filter((notif) => notif.id !== n.id));
                          } catch (err) {
                            alert('Failed to delete notification');
                          }
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
