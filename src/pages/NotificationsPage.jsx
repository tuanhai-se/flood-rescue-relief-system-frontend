import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, RefreshCw } from 'lucide-react';
import { notificationAPI } from '../services/api';
import { formatDate } from '../utils/helpers';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await notificationAPI.getMine({ limit: 50 });
      setNotifications(data?.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  async function markAllRead() {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* silent */ }
  }

  async function handleDelete(id) {
    try {
      await notificationAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Bell size={22} className="text-gray-500" /> Thông báo
        </h1>
        <div className="flex gap-2">
          <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <CheckCheck size={14} /> Đọc tất cả
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 transition">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm divide-y">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Đang tải...</div>
        ) : notifications.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Chưa có thông báo</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition ${!n.is_read ? 'bg-blue-50/40' : ''}`}>
              <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-gray-200'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800">{n.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
              </div>
              <button onClick={() => handleDelete(n.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
