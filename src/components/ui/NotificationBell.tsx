"use client";
import React, { useState, useRef, useEffect } from "react";
import { Notification } from "@/types/notification";

type NotificationBellProps = {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
};

export function NotificationBell({ notifications, setNotifications }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  // State for full message modal (currently using alert instead)
  // const [fullMessage, setFullMessage] = useState<string | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Function to refresh notifications
  const refreshNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  };

  // Handle clicks outside the notification dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Only close if clicking outside both the bell and the dropdown
      const dropdownEl = document.getElementById('notification-dropdown');
      const isClickInDropdown = dropdownEl && dropdownEl.contains(event.target as Node);
      const isClickInBell = bellRef.current && bellRef.current.contains(event.target as Node);

      if (!isClickInDropdown && !isClickInBell) {
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

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

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
        <div
          id="notification-dropdown"
          className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-[80vh] overflow-y-auto"
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-lg text-gray-900 dark:text-gray-200">Notifications</h4>
              {notifications.length > 0 && (
                <button
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete all notifications?')) {
                      try {
                        const res = await fetch('/api/notifications/clear-all', {
                          method: 'DELETE',
                        });
                        if (res.ok) {
                          setNotifications([]);
                        } else {
                          alert('Failed to clear notifications');
                        }
                      } catch (err) {
                        console.error('Failed to clear notifications:', err);
                        alert('Failed to clear notifications');
                      }
                    }
                  }}
                >
                  Clear All
                </button>
              )}
            </div>
            {notifications.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400 text-sm">No new notifications.</div>
            )}
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`relative bg-yellow-100 dark:bg-yellow-900 rounded px-3 py-2 text-yellow-900 dark:text-yellow-100 text-sm shadow flex flex-col gap-1 ${n.read ? 'opacity-60' : ''} overflow-hidden word-break-all`}
                  onClick={(e) => e.stopPropagation()} // Prevent closing dropdown when clicking notification
                >
                  <div className="flex items-center justify-between">
                    <div className="pr-2 flex-1 break-words whitespace-pre-wrap">
                      {n.message.length > 150 ? (
                        <>
                          {n.message.substring(0, 150)}...
                          <button
                            className="text-blue-600 hover:underline text-xs ml-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(n.message);
                            }}
                          >
                            Read more
                          </button>
                        </>
                      ) : (
                        n.message
                      )}
                    </div>
                    <div className="flex gap-2 ml-2 flex-shrink-0">
                      {!n.read ? (
                        <button
                          title="Mark as read"
                          className="text-green-600 hover:text-green-800"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch('/api/admin/notifications', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: n.id }),
                              });
                              if (!res.ok) {
                                const err = await res.json();
                                throw new Error(err.error || 'Failed to mark as read');
                              }
                              // Update the notification in the local state
                              setNotifications((prev) => prev.map((notif) =>
                                notif.id === n.id ? { ...notif, read: true } : notif
                              ));
                              // Refresh notifications after a short delay
                              setTimeout(refreshNotifications, 500);
                            } catch (err) {
                              console.error('Failed to mark as read:', err);
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
                            const res = await fetch('/api/admin/notifications', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: n.id }),
                            });
                            if (!res.ok) {
                              const err = await res.json();
                              throw new Error(err.error || 'Failed to delete notification');
                            }
                            // Remove the notification from the local state
                            setNotifications((prev) => prev.filter((notif) => notif.id !== n.id));
                            // Refresh notifications after a short delay
                            setTimeout(refreshNotifications, 500);
                          } catch (err) {
                            console.error('Failed to delete notification:', err);
                            alert('Failed to delete notification');
                          }
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>

                  {/* Document link for transfer notifications */}
                  {n.meta && n.meta.documentUrl && (
                    <div className="mt-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <a
                        href={n.meta.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {n.type === 'transfer_approved' || n.type === 'transfer_completed'
                          ? 'View Approval Document'
                          : n.type === 'transfer_rejected'
                            ? 'View Rejection Document'
                            : 'View Document'}
                      </a>
                    </div>
                  )}

                  {/* Rejection reason for transfer rejections */}
                  {n.meta && n.meta.rejectionReason && n.type === 'transfer_rejected' && (
                    <div className="mt-1 text-xs text-red-700 bg-red-50 p-1 rounded">
                      <strong>Reason:</strong> {n.meta.rejectionReason}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
