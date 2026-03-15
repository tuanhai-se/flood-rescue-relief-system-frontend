import React, { useState, useEffect, useCallback } from "react";
import { missionAPI, requestAPI, taskAPI, teamAPI } from "../services/api";
import useAuthStore from "../store/authStore";
import { getSocket } from "../services/socket";
import { STATUS_LABELS, formatDate, formatTimeAgo } from "../utils/helpers";
import {
  Navigation,
  MapPin,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  ExternalLink,
  UserCheck,
  Flag,
  ClipboardList,
} from "lucide-react";

const MISSION_STATUS = {
  assigned: {
    label: "Đã phân công",
    color: "bg-purple-100 text-purple-800",
    border: "border-purple-400",
  },
  accepted: {
    label: "Đã nhận",
    color: "bg-blue-100 text-blue-800",
    border: "border-blue-400",
  },
  en_route: {
    label: "Đang di chuyển",
    color: "bg-yellow-100 text-yellow-800",
    border: "border-yellow-400",
  },
  on_scene: {
    label: "Tại hiện trường",
    color: "bg-orange-100 text-orange-800",
    border: "border-orange-400",
  },
  completed: {
    label: "Hoàn thành",
    color: "bg-green-100 text-green-800",
    border: "border-green-400",
  },
  aborted: {
    label: "Đã hủy",
    color: "bg-red-100 text-red-800",
    border: "border-red-400",
  },
  failed: {
    label: "Không thể cứu",
    color: "bg-red-100 text-red-900",
    border: "border-red-600",
  },
};

const STATUS_FLOW = {
  assigned: ["accepted"],
  accepted: ["completed", "aborted"],
  en_route: ["completed", "aborted"],
  on_scene: ["completed", "aborted"],
};

export default function MissionsList() {
  const { user } = useAuthStore();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [logs, setLogs] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  // Complete modal
  const [showComplete, setShowComplete] = useState(false);
  const [completeMission, setCompleteMission] = useState(null);
  const [completeNotes, setCompleteNotes] = useState("");
  const [rescuedCount, setRescuedCount] = useState("");

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (statusFilter) params.status = statusFilter;
      const { data } = await missionAPI.getAll(params);
      setMissions(data.data || []);
      setPagination((p) => ({
        ...p,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  // Auto-refresh khi có cập nhật từ rescue team qua socket
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => fetchMissions();
    socket.on("mission_updated", refresh);
    socket.on("request_updated", refresh);
    return () => {
      socket.off("mission_updated", refresh);
      socket.off("request_updated", refresh);
    };
  }, [fetchMissions]);

  const fetchLogs = async (missionId) => {
    if (logs[missionId]) return;
    try {
      const { data } = await missionAPI.getLogs(missionId);
      setLogs((l) => ({ ...l, [missionId]: data || [] }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggle = (id) => {
    setExpandedId(expandedId === id ? null : id);
    if (expandedId !== id) fetchLogs(id);
  };

  const updateStatus = async (missionId, newStatus, notes = "") => {
    setActionLoading(true);
    try {
      await missionAPI.updateStatus(missionId, { status: newStatus, notes });
      fetchMissions();
      setShowComplete(false);
      setCompleteNotes("");
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const openComplete = (mission) => {
    setCompleteMission(mission);
    setShowComplete(true);
    setCompleteNotes("");
    setRescuedCount(mission.victim_count || "");
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append("result_notes", completeNotes);
      formData.append("rescued_count", rescuedCount || 0);
      await missionAPI.submitResult(completeMission.id, formData);
      await missionAPI.updateStatus(completeMission.id, {
        status: "completed",
      });
      fetchMissions();
      setShowComplete(false);
      setCompleteNotes("");
      setRescuedCount("");
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Coordinator đóng đơn sau khi rescue team xác nhận hoàn thành
  const handleCoordinatorClose = async (mission) => {
    if (!window.confirm(`Xác nhận đóng đơn ${mission.tracking_code}?`)) return;
    setActionLoading(true);
    try {
      await requestAPI.close(mission.request_id);
      fetchMissions();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Incident report modal state (for members/leaders)
  const [showReport, setShowReport] = useState(false);
  const [reportMission, setReportMission] = useState(null);
  const [reportForm, setReportForm] = useState({
    report_type: "unrescuable",
    urgency: "medium",
    support_type: "",
    description: "",
  });
  const [reportSaving, setReportSaving] = useState(false);

  // Assign member modal state (for leaders)
  const [showAssign, setShowAssign] = useState(false);
  const [assignMission, setAssignMission] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [assigning, setAssigning] = useState(false);

  const openReport = (mission) => {
    setReportMission(mission);
    setReportForm({
      report_type: "unrescuable",
      urgency: "medium",
      support_type: "",
      description: "",
    });
    setShowReport(true);
  };

  const handleSubmitReport = async () => {
    if (!reportForm.description) return alert("Vui lòng nhập mô tả sự cố.");
    if (!reportMission.task_group_id)
      return alert("Nhiệm vụ này không thuộc task nào.");
    setReportSaving(true);
    try {
      await taskAPI.submitReport(reportMission.task_group_id, {
        mission_id: reportMission.id,
        report_type: reportForm.report_type,
        urgency: reportForm.urgency,
        support_type: reportForm.support_type || null,
        description: reportForm.description,
      });
      setShowReport(false);
      fetchMissions();
      alert("Đã gửi báo cáo sự cố.");
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setReportSaving(false);
    }
  };

  const openAssign = async (mission) => {
    setAssignMission(mission);
    setSelectedMemberIds([]);
    setShowAssign(true);
    try {
      const { data } = await teamAPI.getById(mission.team_id);
      setTeamMembers(data.members || []);
    } catch {
      setTeamMembers([]);
    }
  };

  const toggleMember = (userId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleAssignMembers = async () => {
    if (!assignMission?.task_group_id)
      return alert("Nhiệm vụ này không thuộc task nào.");
    if (selectedMemberIds.length === 0)
      return alert("Chọn ít nhất 1 thành viên.");
    setAssigning(true);
    try {
      await taskAPI.assignMember(assignMission.task_group_id, {
        mission_id: assignMission.id,
        user_ids: selectedMemberIds,
      });
      setShowAssign(false);
      fetchMissions();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setAssigning(false);
    }
  };

  const activeMissions = missions.filter(
    (m) => !["completed", "aborted", "failed"].includes(m.status),
  );
  const doneMissions = missions.filter((m) =>
    ["completed", "aborted", "failed"].includes(m.status),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">🚨 Nhiệm vụ Cứu hộ</h1>
        <div className="flex gap-1">
          {[
            { key: "", label: "Tất cả" },
            { key: "assigned", label: "Mới" },
            { key: "en_route", label: "Đang đi" },
            { key: "on_scene", label: "Tại hiện trường" },
            { key: "completed", label: "Xong" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setStatusFilter(s.key);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors
                ${statusFilter === s.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
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
        <div className="text-center py-12 text-gray-500">
          Không có nhiệm vụ nào.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active missions */}
          {activeMissions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                Đang hoạt động ({activeMissions.length})
              </h2>
              <div className="space-y-2">
                {activeMissions.map((m) => (
                  <MissionCard
                    key={m.id}
                    mission={m}
                    expanded={expandedId === m.id}
                    onToggle={() => handleToggle(m.id)}
                    logs={logs[m.id]}
                    onUpdateStatus={updateStatus}
                    onComplete={openComplete}
                    onCoordinatorClose={handleCoordinatorClose}
                    onReport={openReport}
                    onAssignMember={openAssign}
                    actionLoading={actionLoading}
                    user={user}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed missions */}
          {doneMissions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                Đã hoàn thành ({doneMissions.length})
              </h2>
              <div className="space-y-2">
                {doneMissions.map((m) => (
                  <MissionCard
                    key={m.id}
                    mission={m}
                    expanded={expandedId === m.id}
                    onToggle={() => handleToggle(m.id)}
                    logs={logs[m.id]}
                    onUpdateStatus={updateStatus}
                    onComplete={openComplete}
                    onCoordinatorClose={handleCoordinatorClose}
                    onReport={openReport}
                    onAssignMember={openAssign}
                    actionLoading={actionLoading}
                    user={user}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Incident Report Modal */}
      {showReport && reportMission && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowReport(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <Flag className="w-5 h-5" /> Báo cáo sự cố
              </h2>
              <button onClick={() => setShowReport(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4 font-mono">
              {reportMission.tracking_code} · {reportMission.address}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Loại báo cáo
                </label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  value={reportForm.report_type}
                  onChange={(e) =>
                    setReportForm((d) => ({
                      ...d,
                      report_type: e.target.value,
                    }))
                  }
                >
                  <option value="unrescuable">
                    Không thể cứu hộ (đánh dấu thất bại)
                  </option>
                  <option value="stalled">Bị chậm trễ / gặp khó khăn</option>
                  <option value="need_support">Cần hỗ trợ thêm</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Mức độ khẩn cấp
                </label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  value={reportForm.urgency}
                  onChange={(e) =>
                    setReportForm((d) => ({ ...d, urgency: e.target.value }))
                  }
                >
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                  <option value="critical">Khẩn cấp</option>
                </select>
              </div>
              {reportForm.report_type === "need_support" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Cần hỗ trợ gì
                  </label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    value={reportForm.support_type}
                    onChange={(e) =>
                      setReportForm((d) => ({
                        ...d,
                        support_type: e.target.value,
                      }))
                    }
                  >
                    <option value="">Chọn...</option>
                    <option value="more_people">Thêm nhân lực</option>
                    <option value="vehicle">Phương tiện</option>
                    <option value="medical">Y tế</option>
                    <option value="supplies">Vật tư / thiết bị</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Mô tả chi tiết *
                </label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm resize-none h-24"
                  placeholder="Mô tả nguyên nhân, tình trạng hiện tại, điều cần hỗ trợ..."
                  value={reportForm.description}
                  onChange={(e) =>
                    setReportForm((d) => ({
                      ...d,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              {reportForm.report_type === "unrescuable" && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  Cảnh báo: Chọn "Không thể cứu hộ" sẽ đánh dấu nhiệm vụ này là
                  thất bại và thông báo cho leader/coordinator.
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setShowReport(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={reportSaving}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {reportSaving ? "Đang gửi..." : "Gửi báo cáo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Member Modal (Leader only) */}
      {showAssign && assignMission && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowAssign(false)}
        >
          <div
            className="bg-white rounded-xl max-w-sm w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" /> Giao cho thành
                viên
              </h2>
              <button onClick={() => setShowAssign(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {assignMission.tracking_code} · {assignMission.address}
            </p>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Không có thành viên nào trong đội.
              </p>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {teamMembers.map((member) => {
                    const selected = selectedMemberIds.includes(member.user_id);
                    return (
                      <button
                        key={member.id}
                        onClick={() => toggleMember(member.user_id)}
                        className={`w-full flex items-center gap-3 p-3 border rounded-xl text-left transition ${selected ? "border-blue-400 bg-blue-50" : "hover:bg-gray-50"}`}
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition ${selected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                        >
                          {selected && (
                            <svg
                              className="w-2.5 h-2.5 text-white"
                              fill="none"
                              viewBox="0 0 12 12"
                            >
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {member.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {member.full_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {member.role_in_team === "leader"
                              ? "Đội trưởng"
                              : member.role_in_team === "deputy"
                                ? "Phó đội"
                                : "Thành viên"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-3 border-t mt-3">
                  <span className="text-xs text-gray-500">
                    {selectedMemberIds.length} đã chọn
                  </span>
                  <button
                    onClick={handleAssignMembers}
                    disabled={assigning || selectedMemberIds.length === 0}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />{" "}
                    {assigning ? "Đang giao..." : "Xác nhận giao"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showComplete && completeMission && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowComplete(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-green-700">
                ✅ Báo cáo kết quả cứu hộ
              </h2>
              <button onClick={() => setShowComplete(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Nhiệm vụ:{" "}
              <span className="font-mono font-bold text-blue-700">
                {completeMission.tracking_code}
              </span>
              {completeMission.address && (
                <span className="block text-xs text-gray-500 mt-0.5">
                  📍 {completeMission.address}
                </span>
              )}
            </p>

            {/* Số người đã cứu */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                👥 Số người đã cứu được <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Nhập số người"
                value={rescuedCount}
                onChange={(e) => setRescuedCount(e.target.value)}
              />
              {completeMission.victim_count > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  📋 Yêu cầu ban đầu: {completeMission.victim_count} người
                </p>
              )}
            </div>

            {/* Ghi chú */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                📝 Ghi chú kết quả
              </label>
              <textarea
                className="w-full p-2.5 border rounded-lg text-sm resize-none h-24 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Mô tả tình trạng hiện trường, khó khăn gặp phải, kết quả thực tế..."
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowComplete(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleComplete}
                disabled={actionLoading || rescuedCount === ""}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                {actionLoading ? "Đang lưu..." : "Xác nhận hoàn thành"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MissionCard({
  mission: m,
  expanded,
  onToggle,
  logs,
  onUpdateStatus,
  onComplete,
  onCoordinatorClose,
  onReport,
  onAssignMember,
  actionLoading,
  user,
}) {
  const ms = MISSION_STATUS[m.status] || MISSION_STATUS.assigned;
  const nextStatuses = STATUS_FLOW[m.status] || [];

  const isCoordinator =
    user?.role === "coordinator" || user?.role === "manager";
  const isLeader = user?.role === "rescue_team" && user?.is_team_leader;
  const isMember = user?.role === "rescue_team" && !user?.is_team_leader;
  const isInTask = !!m.task_group_id;
  const canReport =
    (isLeader || isMember) &&
    isInTask &&
    !["completed", "aborted", "failed"].includes(m.status);

  return (
    <div
      className={`border-l-4 ${ms.border} bg-white rounded-lg shadow-sm overflow-hidden`}
    >
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-blue-700">
                {m.tracking_code}
              </span>
              <span
                className={`px-2 py-0.5 text-xs rounded-full font-medium ${ms.color}`}
              >
                {ms.label}
              </span>
              {m.incident_type && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: (m.incident_color || "#666") + "20",
                    color: m.incident_color,
                  }}
                >
                  {m.incident_type}
                </span>
              )}
              {m.urgency_level && (
                <span className="text-xs" style={{ color: m.urgency_color }}>
                  <AlertTriangle className="inline w-3 h-3" /> {m.urgency_level}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 mt-1 truncate">
              {m.description || "Không có mô tả"}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
              {m.citizen_name && <span>👤 {m.citizen_name}</span>}
              {m.citizen_phone && (
                <span>
                  <Phone className="inline w-3 h-3" /> {m.citizen_phone}
                </span>
              )}
              {m.address && (
                <span>
                  <MapPin className="inline w-3 h-3" /> {m.address}
                </span>
              )}
              {m.victim_count > 0 && (
                <span>
                  <Users className="inline w-3 h-3" /> {m.victim_count} người
                </span>
              )}
              <span>
                <Clock className="inline w-3 h-3" />{" "}
                {formatTimeAgo(m.created_at)}
              </span>
              <span className="text-purple-600">🚑 {m.team_name}</span>
              {m.assigned_to_name ? (
                <span className="text-blue-600 font-medium">
                  👷 {m.assigned_to_name}{" "}
                  <span className="text-gray-400 font-normal">
                    (#{m.assigned_to_user_id})
                  </span>
                </span>
              ) : (
                <span className="text-gray-400 italic">
                  Chưa giao thành viên
                </span>
              )}
              {m.vehicle_name && (
                <span>
                  🚗 {m.vehicle_name} ({m.plate_number})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Task group badge */}
            {isInTask && (
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <ClipboardList size={11} /> Task #{m.task_group_id}
              </span>
            )}
            {/* Coordinator: chỉ hiện nút đóng đơn khi team đã hoàn thành nhưng request chưa đóng */}
            {isCoordinator &&
              m.status === "completed" &&
              m.request_status !== "completed" && (
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onCoordinatorClose(m)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Xác nhận đóng đơn
                  </button>
                </div>
              )}
            {/* Leader: action buttons + assign member (for task missions) + report */}
            {isLeader && nextStatuses.length > 0 && (
              <div
                className="flex gap-1 flex-wrap"
                onClick={(e) => e.stopPropagation()}
              >
                {isInTask && m.status !== "assigned" && (
                  <button
                    onClick={() => onAssignMember(m)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-xs bg-violet-100 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-200 flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Giao thành viên
                  </button>
                )}
                {nextStatuses.map((ns) => {
                  if (ns === "completed") {
                    return (
                      <button
                        key={ns}
                        onClick={() => onComplete(m)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Hoàn thành
                      </button>
                    );
                  }
                  return (
                    <button
                      key={ns}
                      onClick={() => onUpdateStatus(m.id, ns)}
                      disabled={actionLoading}
                      className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${ns === "aborted" ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      {ns === "accepted" && (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" /> Nhận
                        </>
                      )}
                      {ns === "aborted" && (
                        <>
                          <X className="w-3.5 h-3.5" /> Hủy
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Report button: leader OR member (task missions only) */}
            {canReport && (
              <div onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onReport(m)}
                  className="px-3 py-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-1"
                >
                  <Flag className="w-3.5 h-3.5" /> Báo cáo sự cố
                </button>
              </div>
            )}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded: Mission logs + Map */}
      {expanded && (
        <div className="border-t px-4 py-3 bg-gray-50">
          {/* Mini map + directions */}
          {m.latitude && m.longitude && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Vị trí cứu hộ
              </h4>
              <div
                className="rounded-lg overflow-hidden border"
                style={{ height: 200 }}
              >
                <iframe
                  title="map"
                  width="100%"
                  height="200"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${m.longitude - 0.01},${m.latitude - 0.008},${m.longitude + 0.01},${m.latitude + 0.008}&layer=mapnik&marker=${m.latitude},${m.longitude}`}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Navigation className="w-3.5 h-3.5" /> Chỉ đường (Google Maps)
                </a>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${m.latitude}&mlon=${m.longitude}#map=15/${m.latitude}/${m.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg hover:bg-gray-100"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Mở bản đồ
                </a>
              </div>
            </div>
          )}

          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Lịch sử hoạt động
          </h4>
          {!logs ? (
            <div className="text-xs text-gray-400">Đang tải...</div>
          ) : logs.length === 0 ? (
            <div className="text-xs text-gray-400">Chưa có hoạt động nào.</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-medium">
                      {MISSION_STATUS[log.action]?.label || log.action}
                    </span>
                    {log.user_name && (
                      <span className="text-gray-500"> · {log.user_name}</span>
                    )}
                    <span className="text-gray-400 ml-1">
                      {formatDate(log.created_at)}
                    </span>
                    {log.description && (
                      <p className="text-gray-600 mt-0.5">{log.description}</p>
                    )}
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
              <span className="font-medium">Điểm ưu tiên:</span>{" "}
              {m.priority_score}
              <span className="ml-2 font-medium">Mức lũ:</span>{" "}
              {m.flood_severity}/5
            </div>
          )}
        </div>
      )}
    </div>
  );
}
