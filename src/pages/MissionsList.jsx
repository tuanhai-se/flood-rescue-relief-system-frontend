import React, { useState, useEffect, useCallback } from 'react';
import { missionAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { STATUS_LABELS, formatDate, formatTimeAgo } from '../utils/helpers';
import { Navigation, MapPin, Users, Clock, AlertTriangle, CheckCircle, Play, Eye, ChevronDown, ChevronUp, X, Phone, ExternalLink } from 'lucide-react';

const MISSION_STATUS = {
  assigned: { label: 'Đã phân công', color: 'bg-purple-100 text-purple-800', border: 'border-purple-400' },
  accepted: { label: 'Đã nhận', color: 'bg-blue-100 text-blue-800', border: 'border-blue-400' },
  en_route: { label: 'Đang di chuyển', color: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-400' },
  on_scene: { label: 'Tại hiện trường', color: 'bg-orange-100 text-orange-800', border: 'border-orange-400' },
  completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800', border: 'border-green-400' },
  aborted: { label: 'Đã hủy', color: 'bg-red-100 text-red-800', border: 'border-red-400' },
};

const STATUS_FLOW = {
  assigned: ['accepted'],
  accepted: ['en_route'],
  en_route: ['on_scene'],
  on_scene: ['completed', 'aborted'],
};

export default function MissionsList() {
  const { user } = useAuthStore();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [logs, setLogs] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  // Complete modal
  const [showComplete, setShowComplete] = useState(false);
  const [completeMission, setCompleteMission] = useState(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [rescuedCount, setRescuedCount] = useState('');

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (statusFilter) params.status = statusFilter;
      const { data } = await missionAPI.getAll(params);
      setMissions(data.data || []);
      setPagination(p => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [pagination.page, statusFilter]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

  const fetchLogs = async (missionId) => {
    if (logs[missionId]) return;
    try {
      const { data } = await missionAPI.getLogs(missionId);
      setLogs(l => ({ ...l, [missionId]: data || [] }));
    } catch (err) { console.error(err); }
  };

  const handleToggle = (id) => {
    setExpandedId(expandedId === id ? null : id);
    if (expandedId !== id) fetchLogs(id);
  };

  const updateStatus = async (missionId, newStatus, notes = '') => {
    setActionLoading(true);
    try {
      await missionAPI.updateStatus(missionId, { status: newStatus, notes });
      fetchMissions();
      setShowComplete(false);
      setCompleteNotes('');
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setActionLoading(false); }
  };

  const openComplete = (mission) => {
    setCompleteMission(mission);
    setShowComplete(true);
    setCompleteNotes('');
    setRescuedCount(mission.victim_count || '');
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('result_notes', completeNotes);
      formData.append('rescued_count', rescuedCount || 0);
      await missionAPI.submitResult(completeMission.id, formData);
      await missionAPI.updateStatus(completeMission.id, { status: 'completed' });
      fetchMissions();
      setShowComplete(false);
      setCompleteNotes('');
      setRescuedCount('');
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setActionLoading(false); }
  };

  const activeMissions = missions.filter(m => !['completed', 'aborted'].includes(m.status));
  const doneMissions = missions.filter(m => ['completed', 'aborted'].includes(m.status));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">🚨 Nhiệm vụ Cứu hộ</h1>
        <div className="flex gap-1">
          {[{ key: '', label: 'Tất cả' }, { key: 'assigned', label: 'Mới' }, { key: 'en_route', label: 'Đang đi' },
          { key: 'on_scene', label: 'Tại hiện trường' }, { key: 'completed', label: 'Xong' }
          ].map(s => (
            <button key={s.key}
              onClick={() => { setStatusFilter(s.key); setPagination(p => ({ ...p, page: 1 })); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors
                ${statusFilter === s.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : missions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Không có nhiệm vụ nào.</div>
      ) : (
        <div className="space-y-6">
          {/* Active missions */}
          {activeMissions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Đang hoạt động ({activeMissions.length})</h2>
              <div className="space-y-2">
                {activeMissions.map(m => (
                  <MissionCard key={m.id} mission={m}
                    expanded={expandedId === m.id}
                    onToggle={() => handleToggle(m.id)}
                    logs={logs[m.id]}
                    onUpdateStatus={updateStatus}
                    onComplete={openComplete}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed missions */}
          {doneMissions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Đã hoàn thành ({doneMissions.length})</h2>
              <div className="space-y-2">
                {doneMissions.map(m => (
                  <MissionCard key={m.id} mission={m}
                    expanded={expandedId === m.id}
                    onToggle={() => handleToggle(m.id)}
                    logs={logs[m.id]}
                    onUpdateStatus={updateStatus}
                    onComplete={openComplete}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complete Modal */}
      {showComplete && completeMission && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowComplete(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-green-700">✅ Báo cáo kết quả cứu hộ</h2>
              <button onClick={() => setShowComplete(false)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Nhiệm vụ: <span className="font-mono font-bold text-blue-700">{completeMission.tracking_code}</span>
              {completeMission.address && <span className="block text-xs text-gray-500 mt-0.5">📍 {completeMission.address}</span>}
            </p>

            {/* Số người đã cứu */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                👥 Số người đã cứu được <span className="text-red-500">*</span>
              </label>
              <input type="number" min="0"
                className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Nhập số người"
                value={rescuedCount}
                onChange={e => setRescuedCount(e.target.value)}
              />
              {completeMission.victim_count > 0 && (
                <p className="text-xs text-gray-400 mt-1">📋 Yêu cầu ban đầu: {completeMission.victim_count} người</p>
              )}
            </div>

            {/* Ghi chú */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">📝 Ghi chú kết quả</label>
              <textarea className="w-full p-2.5 border rounded-lg text-sm resize-none h-24 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Mô tả tình trạng hiện trường, khó khăn gặp phải, kết quả thực tế..."
                value={completeNotes}
                onChange={e => setCompleteNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowComplete(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleComplete}
                disabled={actionLoading || rescuedCount === ''}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                {actionLoading ? 'Đang lưu...' : 'Xác nhận hoàn thành'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MissionCard({ mission: m, expanded, onToggle, logs, onUpdateStatus, onComplete, actionLoading }) {
  const ms = MISSION_STATUS[m.status] || MISSION_STATUS.assigned;
  const nextStatuses = STATUS_FLOW[m.status] || [];

  return (
    <div className={`border-l-4 ${ms.border} bg-white rounded-lg shadow-sm overflow-hidden`}>
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-blue-700">{m.tracking_code}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ms.color}`}>{ms.label}</span>
              {m.incident_type && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: (m.incident_color || '#666') + '20', color: m.incident_color }}>
                  {m.incident_type}
                </span>
              )}
              {m.urgency_level && (
                <span className="text-xs" style={{ color: m.urgency_color }}>
                  <AlertTriangle className="inline w-3 h-3" /> {m.urgency_level}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 mt-1 truncate">{m.description || 'Không có mô tả'}</p>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
              {m.citizen_name && <span>👤 {m.citizen_name}</span>}
              {m.citizen_phone && <span><Phone className="inline w-3 h-3" /> {m.citizen_phone}</span>}
              {m.address && <span><MapPin className="inline w-3 h-3" /> {m.address}</span>}
              {m.victim_count > 0 && <span><Users className="inline w-3 h-3" /> {m.victim_count} người</span>}
              <span><Clock className="inline w-3 h-3" /> {formatTimeAgo(m.created_at)}</span>
              <span className="text-purple-600">🚑 {m.team_name}</span>
              {m.vehicle_name && <span>🚗 {m.vehicle_name} ({m.plate_number})</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {nextStatuses.length > 0 && (
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                {nextStatuses.map(ns => {
                  if (ns === 'completed') {
                    return (
                      <button key={ns} onClick={() => onComplete(m)} disabled={actionLoading}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Hoàn thành
                      </button>
                    );
                  }
                  return (
                    <button key={ns} onClick={() => onUpdateStatus(m.id, ns)} disabled={actionLoading}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                      {ns === 'accepted' && <><CheckCircle className="w-3.5 h-3.5" /> Nhận</>}
                      {ns === 'en_route' && <><Navigation className="w-3.5 h-3.5" /> Xuất phát</>}
                      {ns === 'on_scene' && <><MapPin className="w-3.5 h-3.5" /> Đến nơi</>}
                      {ns === 'aborted' && <><X className="w-3.5 h-3.5" /> Hủy</>}
                    </button>
                  );
                })}
              </div>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </div>

      {/* Expanded: Mission logs + Map */}
      {expanded && (
        <div className="border-t px-4 py-3 bg-gray-50">
          {/* Mini map + directions */}
          {m.latitude && m.longitude && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Vị trí cứu hộ</h4>
              <div className="rounded-lg overflow-hidden border" style={{ height: 200 }}>
                <iframe
                  title="map"
                  width="100%" height="200" frameBorder="0" style={{ border: 0 }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${m.longitude - 0.01},${m.latitude - 0.008},${m.longitude + 0.01},${m.latitude + 0.008}&layer=mapnik&marker=${m.latitude},${m.longitude}`}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Navigation className="w-3.5 h-3.5" /> Chỉ đường (Google Maps)
                </a>
                <a href={`https://www.openstreetmap.org/?mlat=${m.latitude}&mlon=${m.longitude}#map=15/${m.latitude}/${m.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg hover:bg-gray-100">
                  <ExternalLink className="w-3.5 h-3.5" /> Mở bản đồ
                </a>
              </div>
            </div>
          )}

          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Lịch sử hoạt động</h4>
          {!logs ? (
            <div className="text-xs text-gray-400">Đang tải...</div>
          ) : logs.length === 0 ? (
            <div className="text-xs text-gray-400">Chưa có hoạt động nào.</div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-medium">{MISSION_STATUS[log.action]?.label || log.action}</span>
                    {log.user_name && <span className="text-gray-500"> · {log.user_name}</span>}
                    <span className="text-gray-400 ml-1">{formatDate(log.created_at)}</span>
                    {log.description && <p className="text-gray-600 mt-0.5">{log.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick info */}
          {m.support_type && (
            <div className="mt-3 pt-2 border-t text-xs text-gray-500">
              <span className="font-medium">Hỗ trợ cần:</span> {m.support_type}
            </div>
          )}
          {m.priority_score > 0 && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">Điểm ưu tiên:</span> {m.priority_score}
              <span className="ml-2 font-medium">Mức lũ:</span> {m.flood_severity}/5
            </div>
          )}
        </div>
      )}
    </div>
  );
}
