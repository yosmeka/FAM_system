import { useEffect, useState } from 'react';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const data = await res.json();
      setNotifications(data);
    }
    setLoading(false);
  }

  async function markAsRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchNotifications();
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setShowDropdown(!showDropdown)} style={{ position: 'relative' }}>
        <span role="img" aria-label="bell">🔔</span>
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', borderRadius: '50%', padding: '0 6px', fontSize: 12 }}>{unreadCount}</span>
        )}
      </button>
      {showDropdown && (
        <div style={{ position: 'absolute', right: 0, top: '100%', background: 'white', border: '1px solid #ccc', minWidth: 240, zIndex: 10 }}>
          <div style={{ padding: 8, borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Notifications</div>
          {loading ? (
            <div style={{ padding: 16 }}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 16 }}>No notifications</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} style={{ padding: 8, borderBottom: '1px solid #eee', background: n.read ? '#f9f9f9' : '#e6f7ff', cursor: 'pointer' }} onClick={() => markAsRead(n.id)}>
                <div>{n.message}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{new Date(n.createdAt).toLocaleString()}</div>
                {!n.read && <span style={{ color: 'blue', fontSize: 10 }}>Mark as read</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
