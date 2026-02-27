import React, { useState, useEffect, useCallback } from 'react';
import { requestAPI, teamAPI, regionAPI, resourceAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { STATUS_LABELS, STATUS_COLORS, formatDate, formatTimeAgo } from '../utils/helpers';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, CheckCircle, UserPlus, MapPin, AlertTriangle, Users, Clock, X } from 'lucide-react';

const MISSION_STATUS_COLORS = {
  pending: 'border-l-yellow-400 bg-yellow-50',
  verified: 'border-l-blue-400 bg-blue-50',
  assigned: 'border-l-purple-400 bg-purple-50',
  in_progress: 'border-l-orange-400 bg-orange-50',
  completed: 'border-l-green-400 bg-green-50',
  cancelled: 'border-l-gray-400 bg-gray-50',
  rejected: 'border-l-red-400 bg-red-50',
};

export default function RequestsList() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ status: '', province_id: '', search: '' });
  const [provinces, setProvinces] = useState([]);
  const [urgencyLevels, setUrgencyLevels] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Detail/Action modals
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [suggestedTeams, setSuggestedTeams] = useState([]);
  const [assignData, setAssignData] = useState({ team_id: '', vehicle_id: '' });
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.status) params.status = filters.status;
      if (filters.province_id) params.province_id = filters.province_id;
      if (filters.search) params.search = filters.search;
      const { data } = await requestAPI.getAll(params);
      setRequests(data.data || []);
      setPagination(p => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages }));
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, uRes] = await Promise.all([regionAPI.getProvinces(), regionAPI.getUrgencyLevels()]);
        setProvinces(pRes.data || []);
        setUrgencyLevels(uRes.data || []);
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  const handleVerify = async (req) => {
    if (!window.confirm(`Xác minh yêu cầu ${req.tracking_code}?`)) return;
    setActionLoading(true);
    try {
      await requestAPI.verify(req.id, {});
      fetchRequests();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setActionLoading(false); }
  };

  const openAssign = async (req) => {
    setSelectedRequest(req);
    setShowAssign(true);
    setAssignData({ team_id: '', vehicle_id: '' });
    try {
      const [teamRes, vehicleRes] = await Promise.all([
        requestAPI.suggestTeam(req.id),
        resourceAPI.getVehicles({ status: 'available', province_id: req.province_id }),
      ]);
      setSuggestedTeams(teamRes.data || []);
      setAvailableVehicles(vehicleRes.data || []);
    } catch {
      setSuggestedTeams([]);
      setAvailableVehicles([]);
    }
  };

  const handleAssign = async () => {
    if (!assignData.team_id) return alert('Vui lòng chọn đội cứu hộ.');
    setActionLoading(true);
    try {
      await requestAPI.assign(selectedRequest.id, assignData);
      setShowAssign(false);
      setAssignData({ team_id: '', vehicle_id: '' });
      fetchRequests();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setActionLoading(false); }
  };

  const canVerify = ['admin', 'coordinator', 'manager'].includes(user?.role);
  // CHỈ coordinator mới được phân công đội — khớp với PUT /requests/:id/assign authorize('coordinator')
  const canAssign = user?.role === 'coordinator';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800">📋 Quản lý Yêu cầu Cứu hộ</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Tìm mã, tên, SĐT..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPagination(p => ({ ...p, page: 1 })); }}
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1">
            <Filter className="w-4 h-4" /> Lọc
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg">
          <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            value={filters.status}
            onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPagination(p => ({ ...p, page: 1 })); }}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            value={filters.province_id}
            onChange={e => { setFilters(f => ({ ...f, province_id: e.target.value })); setPagination(p => ({ ...p, page: 1 })); }}>
            <option value="">Tất cả tỉnh/thành</option>
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {[{ key: '', label: 'Tất cả' }, { key: 'pending', label: 'Chờ xử lý' }, { key: 'verified', label: 'Đã xác minh' },
          { key: 'assigned', label: 'Đã phân công' }, { key: 'in_progress', label: 'Đang xử lý' }, { key: 'completed', label: 'Hoàn thành' }
        ].map(s => (
          <button key={s.key}
            onClick={() => { setFilters(f => ({ ...f, status: s.key })); setPagination(p => ({ ...p, page: 1 })); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors
              ${filters.status === s.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Request list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Không có yêu cầu nào.</div>
      ) : (
        <div className="space-y-2">
          {requests.map(req => (
            <div key={req.id}
              className={`border-l-4 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${MISSION_STATUS_COLORS[req.status] || 'border-l-gray-300 bg-white'}`}
              onClick={() => { setSelectedRequest(req); setShowDetail(true); }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-blue-700">{req.tracking_code}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                    {req.urgency_level && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: req.urgency_color + '20', color: req.urgency_color }}>
                        {req.urgency_level}
                      </span>
                    )}
                    {req.priority_score > 0 && (
                      <span className="text-xs text-gray-500">⚡ {req.priority_score}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1 truncate">{req.description || 'Không có mô tả'}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                    {req.citizen_name && <span>👤 {req.citizen_name}</span>}
                    {req.province_name && <span><MapPin className="inline w-3 h-3" /> {req.district_name ? `${req.district_name}, ` : ''}{req.province_name}</span>}
                    {req.victim_count > 0 && <span><Users className="inline w-3 h-3" /> {req.victim_count} người</span>}
                    <span><Clock className="inline w-3 h-3" /> {formatTimeAgo(req.created_at)}</span>
                    {req.team_name && <span className="text-purple-600">🚑 {req.team_name}</span>}
                    {req.coordinator_name && <span className="text-blue-600">👨‍💼 {req.coordinator_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  {canVerify && req.status === 'pending' && (
                    <button onClick={() => handleVerify(req)} disabled={actionLoading}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Xác minh
                    </button>
                  )}
                  {canAssign && (req.status === 'verified' || req.status === 'pending') && (
                    <button onClick={() => openAssign(req)} disabled={actionLoading}
                      className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5" /> Phân công
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-500">
            {pagination.total} yêu cầu · Trang {pagination.page}/{pagination.totalPages}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="p-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Chi tiết yêu cầu</h2>
              <button onClick={() => setShowDetail(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-700 text-base">{selectedRequest.tracking_code}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[selectedRequest.status]}`}>
                  {STATUS_LABELS[selectedRequest.status]}
                </span>
              </div>
              {selectedRequest.description && <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedRequest.description}</p>}
              <div className="grid grid-cols-2 gap-2">
                <InfoRow label="Người gửi" value={selectedRequest.citizen_name} />
                <InfoRow label="SĐT" value={selectedRequest.citizen_phone} />
                <InfoRow label="Loại sự cố" value={selectedRequest.incident_type} />
                <InfoRow label="Mức khẩn cấp" value={selectedRequest.urgency_level} />
                <InfoRow label="Nạn nhân" value={`${selectedRequest.victim_count} người`} />
                <InfoRow label="Mức lũ" value={`${selectedRequest.flood_severity}/5`} />
                <InfoRow label="Điểm ưu tiên" value={selectedRequest.priority_score} />
                <InfoRow label="Khu vực" value={[selectedRequest.district_name, selectedRequest.province_name].filter(Boolean).join(', ')} />
                <InfoRow label="Đội cứu hộ" value={selectedRequest.team_name} />
                <InfoRow label="Điều phối viên" value={selectedRequest.coordinator_name} />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <InfoRow label="Tạo lúc" value={formatDate(selectedRequest.created_at)} />
                <InfoRow label="Xác minh" value={formatDate(selectedRequest.verified_at)} />
                <InfoRow label="Phân công" value={formatDate(selectedRequest.assigned_at)} />
                <InfoRow label="Hoàn thành" value={formatDate(selectedRequest.completed_at)} />
              </div>
              {selectedRequest.result_notes && (
                <div className="pt-2 border-t">
                  <span className="text-xs text-gray-500">Kết quả:</span>
                  <p className="text-gray-700">{selectedRequest.result_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAssign(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Phân công đội cứu hộ</h2>
              <button onClick={() => setShowAssign(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Yêu cầu: <span className="font-mono font-bold text-blue-700">{selectedRequest.tracking_code}</span>
              {selectedRequest.district_name && ` · ${selectedRequest.district_name}`}
            </p>

            {suggestedTeams.length > 0 ? (
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Đội cứu hộ gần nhất:</label>
                {suggestedTeams.map(team => (
                  <label key={team.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors
                      ${assignData.team_id == team.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <input type="radio" name="team" value={team.id}
                      checked={assignData.team_id == team.id}
                      onChange={() => setAssignData(d => ({ ...d, team_id: team.id }))}
                      className="text-blue-600" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{team.name}</div>
                      <div className="text-xs text-gray-500">
                        {team.specialization} · {team.capacity} người · {team.distance_km} km
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${team.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {team.status === 'available' ? 'Sẵn sàng' : team.status}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-gray-500">Không tìm thấy đội cứu hộ trong khu vực.</div>
            )}

            {/* Chọn phương tiện (tuỳ chọn) */}
            {availableVehicles.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  🚗 Phương tiện đi kèm <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
                </label>
                <select
                  value={assignData.vehicle_id}
                  onChange={e => setAssignData(d => ({ ...d, vehicle_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">-- Không chỉ định xe --</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.plate_number ? `(${v.plate_number})` : ''} · {v.type}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {availableVehicles.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
                ⚠️ Không có phương tiện sẵn sàng trong tỉnh. Có thể tạo yêu cầu mượn xe sau khi phân công.
              </p>
            )}

            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowAssign(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleAssign} disabled={!assignData.team_id || actionLoading}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {actionLoading ? 'Đang xử lý...' : 'Phân công'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <p className="text-gray-800 font-medium">{value || '—'}</p>
    </div>
  );
}
