import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Navigation, Users, Truck,
  UserCog, LogOut, Menu, Waves, Bell, ChevronDown,
  Settings, X, CheckCheck
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { notificationAPI } from '../../services/api';
import { ROLE_LABELS } from '../../utils/helpers';

const NAV_ITEMS = [
  {
    path: '/dashboard/requests', icon: FileText, label: 'Yêu cầu cứu hộ',
    roles: ['manager', 'coordinator']
  },
  {
    path: '/dashboard/missions', icon: Navigation, label: 'Nhiệm vụ',
    roles: ['manager', 'coordinator', 'rescue_team']
  },
];

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role));
  const currentPage = filteredNav.find(n => location.pathname === n.path)
    || filteredNav.find(n => location.pathname.startsWith(n.path) && n.path !== '/dashboard');

  // Fetch notifications
  useEffect(() => {
    async function fetchNotifs() {
      try {
        const [notifRes, countRes] = await Promise.all([
          notificationAPI.getMine({ limit: 10 }),
          notificationAPI.getUnreadCount()
        ]);
        // formatResponse trả về {data:[], pagination:{}} -> lấy .data
        setNotifications(notifRes.data?.data || []);
        setUnreadCount(countRes.data?.count || 0);
      } catch { /* silent */ }
    }
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleMarkAllRead() {
    try {
      await notificationAPI.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* silent */ }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-[72px]'} bg-gradient-to-b from-[#0c1e3a] to-[#0a1628] text-white flex flex-col transition-all duration-300 shrink-0`}>
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-3 border-b border-white/10">
          <Waves className="text-cyan-400 shrink-0" size={28} />
          {sidebarOpen && (
            <div>
              <h1 className="text-sm font-bold tracking-tight">CỨU HỘ LŨ LỤT</h1>
              <p className="text-[9px] text-blue-300/70">Hệ thống Điều phối & Cứu trợ</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 px-3 overflow-y-auto">
          {filteredNav.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path
              || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all
                  ${active
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Back to public map */}
        <div className="px-3 pb-2">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-gray-500 hover:bg-white/5 hover:text-gray-300 transition">
            <Waves size={18} className="shrink-0" />
            {sidebarOpen && <span>Bản đồ công khai</span>}
          </Link>
        </div>

        {/* User section */}
        <div className="px-3 pb-4 border-t border-white/10 pt-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.full_name}</p>
                <p className="text-[10px] text-gray-400">{ROLE_LABELS[user?.role]}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <Menu size={20} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800">
              {currentPage?.label || 'Bảng điều khiển'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotif(!showNotif)}
                className="p-2 hover:bg-gray-100 rounded-lg relative transition"
              >
                <Bell size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotif && (
                <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border z-50 max-h-[420px] flex flex-col">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <span className="font-semibold text-sm">Thông báo</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <CheckCheck size={14} /> Đọc tất cả
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">Không có thông báo</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition cursor-pointer ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                          <p className="text-sm font-medium text-gray-800">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : ''}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.full_name}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-2xl border z-50 py-2">
                  <div className="px-4 py-2 border-b">
                    <p className="font-medium text-sm">{user?.full_name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      {ROLE_LABELS[user?.role]}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content via Outlet */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
