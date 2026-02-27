import React, { useState, useEffect } from 'react';
import { teamAPI, regionAPI } from '../services/api';
import { TEAM_STATUS_LABELS, formatDate } from '../utils/helpers';
import { Plus, Edit2, MapPin, Users, Phone, Shield, X, Save, RefreshCw } from 'lucide-react';

const STATUS_BADGE = {
  available: 'bg-green-100 text-green-700',
  on_mission: 'bg-orange-100 text-orange-700',
  off_duty: 'bg-gray-100 text-gray-600',
  standby: 'bg-yellow-100 text-yellow-700',
};

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [provinces, setProvinces] = useState([]);
  const [filterProvince, setFilterProvince] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', leader_id: '', province_id: '', district_id: '',
    capacity: 5, specialization: 'general', phone: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProvince) params.province_id = filterProvince;
      if (filterStatus) params.status = filterStatus;
      const { data } = await teamAPI.getAll(params);
      setTeams(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, [filterProvince, filterStatus]);

  useEffect(() => {
    regionAPI.getProvinces().then(res => setProvinces(res.data || [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditTeam(null);
    setFormData({ name: '', code: '', leader_id: '', province_id: '', district_id: '', capacity: 5, specialization: 'general', phone: '' });
    setShowForm(true);
  };

  const openEdit = (team) => {
    setEditTeam(team);
    setFormData({
      name: team.name, code: team.code || '', leader_id: team.leader_id || '',
      province_id: team.province_id, district_id: team.district_id || '',
      capacity: team.capacity, specialization: team.specialization || 'general', phone: team.phone || ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.province_id) return alert('Vui lòng nhập tên và chọn tỉnh.');
    setSaving(true);
    try {
      if (editTeam) {
        await teamAPI.update(editTeam.id, formData);
      } else {
        await teamAPI.create(formData);
      }
      setShowForm(false);
      fetchTeams();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (team, newStatus) => {
    try {
      // FIX: use /status endpoint (allows coordinator) instead of general update (admin/manager only)
      await teamAPI.updateStatus(team.id, { status: newStatus });
      fetchTeams();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800">🚑 Đội Cứu hộ</h1>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 text-sm border rounded-lg"
            value={filterProvince} onChange={e => setFilterProvince(e.target.value)}>
            <option value="">Tất cả tỉnh</option>
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="px-3 py-2 text-sm border rounded-lg"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(TEAM_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={fetchTeams} className="p-2 border rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Thêm đội
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Chưa có đội cứu hộ nào.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {teams.map(team => (
            <div key={team.id} className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-gray-800">{team.name}</h3>
                  <span className="text-xs text-gray-400 font-mono">{team.code}</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_BADGE[team.status] || 'bg-gray-100'}`}>
                  {TEAM_STATUS_LABELS[team.status] || team.status}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-sm text-gray-600">
                {team.leader_name && (
                  <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-gray-400" /> {team.leader_name}</div>
                )}
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {team.province_name}{team.district_name ? ` · ${team.district_name}` : ''}</div>
                <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-gray-400" /> {team.member_count || 0}/{team.capacity} thành viên</div>
                {team.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /> {team.phone}</div>}
                {team.specialization && <div className="text-xs text-blue-600">🔧 {team.specialization}</div>}
                {team.active_missions > 0 && <div className="text-xs text-orange-600">⚡ {team.active_missions} nhiệm vụ đang thực hiện</div>}
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <button onClick={() => openEdit(team)} className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> Sửa
                </button>
                {team.status === 'available' && (
                  <button onClick={() => toggleStatus(team, 'off_duty')}
                    className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50">Nghỉ</button>
                )}
                {team.status === 'off_duty' && (
                  <button onClick={() => toggleStatus(team, 'available')}
                    className="px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100">Kích hoạt</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editTeam ? 'Sửa đội cứu hộ' : 'Thêm đội cứu hộ'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Tên đội *</label>
                <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.name}
                  onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Mã đội</label>
                  <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.code}
                    onChange={e => setFormData(d => ({ ...d, code: e.target.value }))} placeholder="VD: DT-DN-03" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">SĐT</label>
                  <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.phone}
                    onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tỉnh/Thành *</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.province_id}
                  onChange={e => setFormData(d => ({ ...d, province_id: e.target.value }))}>
                  <option value="">Chọn tỉnh</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Sức chứa</label>
                  <input type="number" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.capacity}
                    onChange={e => setFormData(d => ({ ...d, capacity: parseInt(e.target.value) || 5 }))} min={1} max={50} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Chuyên môn</label>
                  <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.specialization}
                    onChange={e => setFormData(d => ({ ...d, specialization: e.target.value }))}>
                    <option value="general">Tổng hợp</option>
                    <option value="boat_rescue">Cứu hộ đường thủy</option>
                    <option value="medical">Y tế</option>
                    <option value="search_rescue">Tìm kiếm cứu nạn</option>
                    <option value="evacuation">Di dời</option>
                  </select>
                </div>
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
