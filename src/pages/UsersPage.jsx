import React, { useState, useEffect, useCallback } from 'react';
import { userAPI, regionAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { ROLE_LABELS, formatDate } from '../utils/helpers';
import { Plus, Search, Edit2, Key, UserCheck, UserX, X, Save, ChevronLeft, ChevronRight } from 'lucide-react';

const ROLE_BADGE = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  coordinator: 'bg-cyan-100 text-cyan-700',
  rescue_team: 'bg-orange-100 text-orange-700',
};

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [regions, setRegions] = useState([]);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', full_name: '', phone: '',
    role: 'rescue_team', region_id: '', province_id: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      const { data } = await userAPI.getAll(params);
      setUsers(data.data || []);
      setPagination(p => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [pagination.page, search, filterRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    Promise.all([regionAPI.getAll(), regionAPI.getProvinces()])
      .then(([rRes, pRes]) => { setRegions(rRes.data || []); setProvinces(pRes.data || []); })
      .catch(() => { });
  }, []);

  const openCreate = () => {
    setEditUser(null);
    setFormData({
      username: '', email: '', password: '123456', full_name: '', phone: '',
      role: 'rescue_team', region_id: '', province_id: ''
    });
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setFormData({
      full_name: u.full_name, phone: u.phone || '', role: u.role,
      region_id: u.region_id || '', province_id: u.province_id || ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editUser) {
        await userAPI.update(editUser.id, {
          full_name: formData.full_name, phone: formData.phone, role: formData.role,
          region_id: formData.region_id || null, province_id: formData.province_id || null
        });
      } else {
        if (!formData.username || !formData.email || !formData.full_name) {
          return alert('Vui lòng nhập đầy đủ thông tin.');
        }
        await userAPI.create(formData);
      }
      setShowForm(false);
      fetchUsers();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    if (!window.confirm(`${u.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'} tài khoản ${u.full_name}?`)) return;
    try {
      await userAPI.update(u.id, { is_active: !u.is_active });
      fetchUsers();
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  const resetPassword = async (u) => {
    if (!window.confirm(`Đặt lại mật khẩu cho ${u.full_name} thành 123456?`)) return;
    try {
      await userAPI.resetPassword(u.id);
      alert('Đã đặt lại mật khẩu thành: 123456');
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800">👥 Quản lý Người dùng</h1>
        <button onClick={openCreate}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
          <Plus className="w-4 h-4" /> Thêm tài khoản
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Tìm tên, username, email..."
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          />
        </div>
        <select className="px-3 py-2 text-sm border rounded-lg"
          value={filterRole} onChange={e => { setFilterRole(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}>
          <option value="">Tất cả vai trò</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Không tìm thấy người dùng nào.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Họ tên</th>
                <th className="text-left px-4 py-2.5 font-medium">Username</th>
                <th className="text-left px-4 py-2.5 font-medium">Email</th>
                <th className="text-left px-4 py-2.5 font-medium">Vai trò</th>
                <th className="text-left px-4 py-2.5 font-medium">Khu vực</th>
                <th className="text-left px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="text-left px-4 py-2.5 font-medium">Đăng nhập cuối</th>
                <th className="text-right px-4 py-2.5 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{u.full_name}</div>
                    {u.phone && <div className="text-xs text-gray-500">{u.phone}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ROLE_BADGE[u.role] || 'bg-gray-100'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.province_name || u.region_name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.last_login ? formatDate(u.last_login) : 'Chưa'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} title="Sửa"
                        className="p-1.5 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                      {currentUser?.role === 'admin' && (
                        <>
                          <button onClick={() => resetPassword(u)} title="Reset mật khẩu"
                            className="p-1.5 hover:bg-gray-100 rounded"><Key className="w-3.5 h-3.5 text-gray-500" /></button>
                          <button onClick={() => toggleActive(u)} title={u.is_active ? 'Khóa' : 'Mở khóa'}
                            className="p-1.5 hover:bg-gray-100 rounded">
                            {u.is_active ? <UserX className="w-3.5 h-3.5 text-red-500" /> : <UserCheck className="w-3.5 h-3.5 text-green-500" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-500">{pagination.total} người dùng</span>
          <div className="flex gap-1">
            <button onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1} className="p-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-2 text-sm">{pagination.page}/{pagination.totalPages}</span>
            <button onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
              disabled={pagination.page >= pagination.totalPages} className="p-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editUser ? 'Sửa tài khoản' : 'Thêm tài khoản'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {!editUser && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Username *</label>
                    <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.username}
                      onChange={e => setFormData(d => ({ ...d, username: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email *</label>
                    <input type="email" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.email}
                      onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mật khẩu</label>
                    <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.password}
                      onChange={e => setFormData(d => ({ ...d, password: e.target.value }))} placeholder="Mặc định: 123456" />
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Họ tên *</label>
                <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.full_name}
                  onChange={e => setFormData(d => ({ ...d, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.phone}
                  onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Vai trò *</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.role}
                  onChange={e => setFormData(d => ({ ...d, role: e.target.value }))}>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Vùng miền</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.region_id}
                  onChange={e => setFormData(d => ({ ...d, region_id: e.target.value }))}>
                  <option value="">Không chọn</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tỉnh/Thành</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.province_id}
                  onChange={e => setFormData(d => ({ ...d, province_id: e.target.value }))}>
                  <option value="">Không chọn</option>
                  {provinces
                    .filter(p => !formData.region_id || p.region_id == formData.region_id)
                    .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
