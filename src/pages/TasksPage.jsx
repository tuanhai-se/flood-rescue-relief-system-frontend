import React, { useState, useEffect, useCallback } from "react";
import { taskAPI, teamAPI, regionAPI, requestAPI } from "../services/api";
import { getSocket } from "../services/socket";
import useAuthStore from "../store/authStore";
import {
  Plus,
  RefreshCw,
  X,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Send,
  Zap,
  Eye,
  Search,
  Lock,
  Ban,
  FileText,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Navigation,
  Clock,
  Crown,
  Filter,
} from "lucide-react";

const TASK_STATUS = {
  in_progress: { label: "Đang thực hiện", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Hoàn thành", cls: "bg-green-100 text-green-700" },
  partial: {
    label: "Hoàn thành một phần",
    cls: "bg-yellow-100 text-yellow-700",
  },
  cancelled: { label: "Đã hủy", cls: "bg-red-100 text-red-600" },
};

const URGENCY_CLS = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const REPORT_TYPE_LABEL = {
  stalled: "Bị chậm trễ",
  unrescuable: "Không thể cứu hộ",
  need_support: "Cần hỗ trợ thêm",
};

// ─── Task Detail Modal ────────────────────────────────────────────────────────
function TaskDetailModal({ taskId, onClose, onRefresh }) {
  const { user } = useAuthStore();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [showDispatch, setShowDispatch] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({ team_id: "", notes: "" });
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [dispatching, setDispatching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [activeTab, setActiveTab] = useState("requests"); // 'requests' | 'reports'

  const fetchTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await taskAPI.getById(taskId);
      setTask(data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
    teamAPI
      .getAll({})
      .then((r) => setTeams(r.data || []))
      .catch(() => {});
  }, [fetchTask]);

  const handleConfirmComplete = async () => {
    if (
      !window.confirm(
        "Xác nhận đóng task này? Tất cả yêu cầu hoàn thành sẽ được cập nhật.",
      )
    )
      return;
    setConfirming(true);
    try {
      await taskAPI.confirmComplete(taskId);
      fetchTask();
      onRefresh();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return alert("Vui lòng nhập lý do hủy task.");
    setCancelling(true);
    try {
      await taskAPI.cancel(taskId, { reason: cancelReason.trim() });
      setShowCancelModal(false);
      setCancelReason("");
      fetchTask();
      onRefresh();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setCancelling(false);
    }
  };

  const resolveReport = async (reportId, status) => {
    try {
      await taskAPI.resolveReport(taskId, reportId, {
        status,
        resolution_note: "",
      });
      fetchTask();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    }
  };

  const unresolveReport = async (reportId) => {
    try {
      await taskAPI.unresolveReport(taskId, reportId);
      fetchTask();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDispatch = async () => {
    if (!dispatchForm.team_id || selectedRequestIds.length === 0) {
      return alert("Chọn đội và ít nhất 1 yêu cầu cứu hộ cần hỗ trợ.");
    }
    setDispatching(true);
    try {
      await taskAPI.dispatchSupport(taskId, {
        team_id: dispatchForm.team_id,
        request_ids: selectedRequestIds,
        notes: dispatchForm.notes,
      });
      setShowDispatch(false);
      setSelectedRequestIds([]);
      fetchTask();
      onRefresh();
      alert("Đã điều thêm đội hỗ trợ.");
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setDispatching(false);
    }
  };

  const toggleRequest = (id) => {
    setSelectedRequestIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  if (loading)
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (error)
    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-red-500" size={20} />
            <h3 className="font-bold text-red-700">Lỗi tải chi tiết task</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={fetchTask}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Thử lại
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );

  if (!task) return null;

  const pendingReports = (task.incident_reports || []).filter(
    (r) => r.status === "pending",
  );
  const resolvedReports = (task.incident_reports || []).filter(
    (r) => r.status !== "pending",
  );
  const stalledMissions = (task.missions || []).filter((m) => m.stalled);
  const activeMissions = (task.missions || []).filter(
    (m) => !["completed", "failed", "aborted"].includes(m.status),
  );
  const totalVictims = (task.missions || []).reduce(
    (s, m) => s + (m.victim_count || 0),
    0,
  );
  const totalRescued = (task.missions || []).reduce(
    (s, m) => s + (m.rescued_count || 0),
    0,
  );
  const allDone =
    activeMissions.length === 0 && (task.missions || []).length > 0;
  const canConfirm = allDone && task.status === "in_progress";

  const allReports = task.incident_reports || [];
  const totalReports = allReports.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-3xl my-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{task.name}</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_STATUS[task.status]?.cls}`}
              >
                {TASK_STATUS[task.status]?.label}
              </span>
              <span className="text-xs text-gray-500">
                #{task.id} · {task.team_name} · {task.province_name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "coordinator" && task.status !== "cancelled" && (
              <button
                onClick={() => {
                  setCancelReason("");
                  setShowCancelModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
              >
                <Ban size={13} /> Hủy Task
              </button>
            )}

            {/* Modal nhập lý do hủy */}
            {showCancelModal && (
              <div
                className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
                onClick={() => setShowCancelModal(false)}
              >
                <div
                  className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-base font-bold text-gray-800 mb-1">
                    Hủy Task
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Lý do sẽ được gửi thông báo đến team leader. Các yêu cầu cứu
                    hộ sẽ trở về trạng thái chờ.
                  </p>
                  <label className="text-sm font-medium text-gray-700">
                    Lý do hủy <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    rows={3}
                    placeholder="VD: Đội cứu hộ không đủ phương tiện, cần điều phối lại..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => setShowCancelModal(false)}
                      className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                    >
                      Quay lại
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling || !cancelReason.trim()}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Ban size={14} />{" "}
                      {cancelling ? "Đang hủy..." : "Xác nhận hủy"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Scheduled date (coordinator) + Estimated completion (leader/coordinator view) */}
        <div className="flex flex-wrap gap-3 px-5 pt-4">
          {user?.role === "coordinator" && task.status === "in_progress" && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 shrink-0">📅 Ngày thực hiện:</span>
              <input
                type="date"
                className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                defaultValue={
                  task.scheduled_date
                    ? task.scheduled_date.substring(0, 10)
                    : ""
                }
                onBlur={async (e) => {
                  try {
                    await taskAPI.setScheduledDate(task.id, {
                      scheduled_date: e.target.value || null,
                    });
                  } catch (err) {
                    alert("Lỗi: " + (err.response?.data?.error || err.message));
                  }
                }}
              />
            </div>
          )}
          {user?.role === "rescue_team" && task.scheduled_date && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="shrink-0">📅 Ngày thực hiện:</span>
              <span className="font-medium text-gray-700">
                {new Date(task.scheduled_date).toLocaleDateString("vi-VN")}
              </span>
            </div>
          )}
          {task.estimated_completion && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="shrink-0">⏱ Dự kiến hoàn thành:</span>
              <span className="font-medium text-gray-700">
                {new Date(task.estimated_completion).toLocaleString("vi-VN")}
              </span>
            </div>
          )}
          {user?.role === "rescue_team" &&
            user?.is_team_leader &&
            task.status === "in_progress" && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 shrink-0">⏱ Dự kiến xong:</span>
                <input
                  type="datetime-local"
                  className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  defaultValue={
                    task.estimated_completion
                      ? task.estimated_completion.substring(0, 16)
                      : ""
                  }
                  onBlur={async (e) => {
                    try {
                      await taskAPI.setEstimatedCompletion(task.id, {
                        estimated_completion: e.target.value || null,
                      });
                    } catch (err) {
                      alert(
                        "Lỗi: " + (err.response?.data?.error || err.message),
                      );
                    }
                  }}
                />
              </div>
            )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 px-5 pt-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-blue-700">
              {(task.missions || []).length}
            </p>
            <p className="text-xs text-blue-500 mt-0.5">Yêu cầu</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-700">{totalRescued}</p>
            <p className="text-xs text-green-500 mt-0.5">Đã cứu</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-700">{totalVictims}</p>
            <p className="text-xs text-gray-500 mt-0.5">Tổng nạn nhân</p>
          </div>
        </div>

        {/* Confirm close */}
        {canConfirm && (
          <div className="mx-5 mt-3 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-green-800">
                Tất cả nhiệm vụ đã hoàn thành
              </p>
              <p className="text-xs text-green-600">
                Xác nhận để đóng task và cập nhật báo cáo tổng hợp
              </p>
            </div>
            <button
              onClick={handleConfirmComplete}
              disabled={confirming}
              className="shrink-0 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Lock size={14} />{" "}
              {confirming ? "Đang xử lý..." : "Xác nhận đóng"}
            </button>
          </div>
        )}

        {/* Stalled alert */}
        {stalledMissions.length > 0 && (
          <div className="mx-5 mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle
              className="text-orange-500 shrink-0 mt-0.5"
              size={18}
            />
            <div>
              <p className="text-sm font-semibold text-orange-800">
                {stalledMissions.length} yêu cầu bị chậm trễ
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                {stalledMissions
                  .map((m) => m.tracking_code || `#${m.id}`)
                  .join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b mx-5 mt-4 gap-1">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "requests"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <ClipboardList size={14} className="inline mr-1" />
            Yêu cầu ({task.missions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === "reports"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <AlertTriangle size={14} className="inline" />
            Báo cáo ({totalReports})
            {pendingReports.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full leading-none">
                {pendingReports.length}
              </span>
            )}
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tab: Requests */}
          {activeTab === "requests" && (
            <>
              <div className="space-y-2">
                {(task.missions || []).map((m) => {
                  const statusCls =
                    {
                      completed: "border-green-200 bg-green-50",
                      failed: "border-red-200 bg-red-50",
                      aborted: "border-gray-200 bg-gray-50",
                      on_scene: "border-blue-200 bg-blue-50",
                      en_route: "border-cyan-200 bg-cyan-50",
                    }[m.status] || "border-gray-100";
                  const statusLabel =
                    {
                      assigned: "Đã giao",
                      accepted: "Đã nhận",
                      en_route: "Đang đi",
                      on_scene: "Tại hiện trường",
                      completed: "Hoàn thành",
                      aborted: "Đã hủy",
                      failed: "Không thể cứu",
                    }[m.status] || m.status;

                  return (
                    <div
                      key={m.id}
                      className={`border rounded-xl p-3 ${statusCls} ${m.stalled ? "ring-2 ring-orange-300" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-gray-500">
                              {m.tracking_code}
                            </span>
                            <span className="text-xs font-medium text-gray-700">
                              {m.incident_type}
                            </span>
                            {m.stalled && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                                Chậm trễ
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">
                            {m.address}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                            <span>{m.victim_count} nạn nhân</span>
                            {m.rescued_count > 0 && (
                              <span className="text-green-600">
                                Đã cứu: {m.rescued_count}
                              </span>
                            )}
                            {m.assigned_to_name && (
                              <span>Giao: {m.assigned_to_name}</span>
                            )}
                            {m.citizen_phone && <span>{m.citizen_phone}</span>}
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                            m.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : m.status === "failed"
                                ? "bg-red-100 text-red-700"
                                : m.status === "on_scene"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dispatch support */}
              {/* TODO: Tính năng "Điều thêm đội hỗ trợ" — tạm ẩn
              {activeMissions.length > 0 && (
                <div>
                  {!showDispatch ? (
                    <button onClick={() => setShowDispatch(true)} ...>
                      Điều thêm đội hỗ trợ
                    </button>
                  ) : (
                    <div>...</div>
                  )}
                </div>
              )}
              */}
            </>
          )}

          {/* Tab: Reports */}
          {activeTab === "reports" && (
            <div className="space-y-3">
              {allReports.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  Chưa có báo cáo nào.
                </div>
              ) : (
                <>
                  {/* Pending reports */}
                  {pendingReports.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">
                        Chờ xử lý ({pendingReports.length})
                      </h3>
                      <div className="space-y-2">
                        {pendingReports.map((r) => (
                          <div
                            key={r.id}
                            className="border border-red-200 bg-red-50 rounded-xl p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_CLS[r.urgency] || "bg-gray-100 text-gray-600"}`}
                                  >
                                    {r.urgency?.toUpperCase() || "N/A"}
                                  </span>
                                  <span className="text-xs font-semibold text-red-700">
                                    {REPORT_TYPE_LABEL[r.report_type] ||
                                      r.report_type}
                                  </span>
                                  {r.tracking_code && (
                                    <span className="text-xs font-mono text-gray-400">
                                      {r.tracking_code}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 mt-1">
                                  {r.description}
                                </p>
                                {r.support_type && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Cần: {r.support_type}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  — {r.reported_by_name} ·{" "}
                                  {new Date(r.created_at).toLocaleString(
                                    "vi-VN",
                                  )}
                                </p>
                              </div>
                              {user?.role !== "rescue_team" && (
                                <div className="flex flex-col gap-1 shrink-0">
                                  <button
                                    onClick={() =>
                                      resolveReport(r.id, "acknowledged")
                                    }
                                    className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                                  >
                                    Đã biết
                                  </button>
                                  <button
                                    onClick={() =>
                                      resolveReport(r.id, "resolved")
                                    }
                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                  >
                                    Giải quyết
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolved reports */}
                  {resolvedReports.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                        Đã xử lý ({resolvedReports.length})
                      </h3>
                      <div className="space-y-2">
                        {resolvedReports.map((r) => (
                          <div
                            key={r.id}
                            className="border border-gray-200 bg-gray-50 rounded-xl p-3"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_CLS[r.urgency] || "bg-gray-100 text-gray-600"}`}
                              >
                                {r.urgency?.toUpperCase() || "N/A"}
                              </span>
                              <span className="text-xs font-semibold text-gray-700">
                                {REPORT_TYPE_LABEL[r.report_type] ||
                                  r.report_type}
                              </span>
                              {r.tracking_code && (
                                <span className="text-xs font-mono text-gray-400">
                                  {r.tracking_code}
                                </span>
                              )}
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  r.status === "resolved"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {r.status === "resolved"
                                  ? "Đã giải quyết"
                                  : "Đã ghi nhận"}
                              </span>
                            </div>
                            <div className="flex items-start justify-between gap-2 mt-1">
                              <div>
                                <p className="text-sm text-gray-700">
                                  {r.description}
                                </p>
                                {r.resolution_note && (
                                  <p className="text-xs text-blue-600 mt-0.5">
                                    Ghi chú: {r.resolution_note}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-0.5">
                                  — {r.reported_by_name} ·{" "}
                                  {new Date(r.created_at).toLocaleString(
                                    "vi-VN",
                                  )}
                                </p>
                              </div>
                              {user?.role !== "rescue_team" && (
                                <button
                                  onClick={() => unresolveReport(r.id)}
                                  className="px-2 py-1 text-xs border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-100 shrink-0"
                                >
                                  Hoàn tác
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Task Panel (Split-screen) ────────────────────────────────────────
// Haversine distance in km
function haversine(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function CreateTaskPanel({ onClose, onCreated }) {
  const { user } = useAuthStore();
  const [teams, setTeams] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [primaryTeamId, setPrimaryTeamId] = useState(null); // primary team designation
  const [reqTeamMap, setReqTeamMap] = useState({}); // reqId → teamId
  const [form, setForm] = useState({ name: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [specFilter, setSpecFilter] = useState(""); // filter teams by spec

  const provinceId = user?.province_id;

  useEffect(() => {
    teamAPI
      .getAll({})
      .then((r) => {
        const filtered = (r.data || []).filter(
          (t) =>
            (!provinceId || t.province_id === provinceId) &&
            t.status !== "off_duty",
        );
        setTeams(filtered);
      })
      .catch(() => {});
    taskAPI
      .suggestRequests({ province_id: provinceId, limit: 50 })
      .then((r) => setRequests(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingReqs(false));
  }, [provinceId]);

  const toggleRequest = (id) =>
    setSelectedRequests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleTeam = (id) => {
    setSelectedTeamIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (next.length <= 1) setReqTeamMap({});
      // auto-set primary if none set, or clear if primary was deselected
      setPrimaryTeamId((p) => {
        if (next.length === 0) return null;
        if (p === id && !next.includes(id)) return next[0]; // deselected primary → fallback
        if (!p || !next.includes(p)) return next[0];
        return p;
      });
      return next;
    });
  };

  const SPEC_LABEL = (s) =>
    (s || "")
      .replace(/water_rescue/g, "Cứu hộ nước")
      .replace(/evacuation/g, "Sơ tán")
      .replace(/medical/g, "Y tế")
      .replace(/search_rescue/g, "Tìm kiếm")
      .replace(/landslide_rescue/g, "Sạt lở");

  // Map incident type → list of acceptable specializations
  const getRequiredSpecs = (incidentType) => {
    const t = (incidentType || "").toLowerCase();
    if (
      t.includes("ngập") ||
      t.includes("lũ") ||
      t.includes("lụt") ||
      t.includes("mắc kẹt")
    )
      return {
        specs: ["water_rescue", "evacuation", "search_rescue"],
        label: "Cứu hộ nước / Sơ tán",
      };
    if (t.includes("sạt lở"))
      return {
        specs: ["landslide_rescue", "search_rescue"],
        label: "Cứu hộ sạt lở / Tìm kiếm",
      };
    if (t.includes("sơ tán"))
      return { specs: ["evacuation", "water_rescue"], label: "Sơ tán" };
    if (t.includes("y tế") || t.includes("cấp cứu") || t.includes("thương"))
      return { specs: ["medical"], label: "Y tế" };
    if (t.includes("tìm kiếm"))
      return { specs: ["search_rescue"], label: "Tìm kiếm" };
    return null;
  };

  // Centroid of selected requests (for distance sorting)
  const selectedReqObjs = requests.filter((r) =>
    selectedRequests.includes(r.id),
  );
  const centroid = (() => {
    const geo = selectedReqObjs.filter((r) => r.latitude && r.longitude);
    if (!geo.length) return null;
    return {
      lat: geo.reduce((s, r) => s + r.latitude, 0) / geo.length,
      lng: geo.reduce((s, r) => s + r.longitude, 0) / geo.length,
    };
  })();

  // All unique specs across all teams
  const allSpecs = [
    ...new Set(
      teams
        .flatMap((t) =>
          (t.specialization || "").split(",").map((s) => s.trim()),
        )
        .filter(Boolean),
    ),
  ];

  // Teams filtered by spec, then sorted by distance to centroid
  const displayTeams = teams
    .filter(
      (t) =>
        !specFilter ||
        (t.specialization || "")
          .split(",")
          .map((s) => s.trim())
          .includes(specFilter),
    )
    .map((t) => ({
      ...t,
      distance: centroid
        ? haversine(
            centroid.lat,
            centroid.lng,
            t.current_latitude,
            t.current_longitude,
          )
        : null,
    }))
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null)
        return a.distance - b.distance;
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return 0;
    });

  const selectedTeams = teams.filter((t) => selectedTeamIds.includes(t.id));
  const multiTeam = selectedTeamIds.length > 1;
  const totalVictims = selectedReqObjs.reduce(
    (s, r) => s + (r.victim_count || 0),
    0,
  );

  // Specialization mismatch warnings
  // specialization may be comma-separated e.g. "water_rescue,evacuation"
  const selectedTeamSpecs = new Set(
    selectedTeams
      .flatMap((t) => (t.specialization || "").split(",").map((s) => s.trim()))
      .filter(Boolean),
  );
  const specWarnings = (() => {
    if (selectedRequests.length === 0 || selectedTeamIds.length === 0)
      return [];
    const warnings = [];
    // Check if ANY selected team covers each incident type category
    const reqsByCategory = {};
    selectedRequests.forEach((id) => {
      const req = requests.find((r) => r.id === id);
      if (!req) return;
      const rule = getRequiredSpecs(req.incident_type);
      if (!rule) return;
      const covered = rule.specs.some((s) => selectedTeamSpecs.has(s));
      if (!covered) {
        const key = rule.label;
        if (!reqsByCategory[key])
          reqsByCategory[key] = {
            label: rule.label,
            needed: rule.specs,
            count: 0,
          };
        reqsByCategory[key].count++;
      }
    });
    Object.values(reqsByCategory).forEach((w) => warnings.push(w));
    return warnings;
  })();

  const handleCreate = async () => {
    if (!form.name.trim()) return alert("Vui lòng nhập tên task.");
    if (selectedTeamIds.length === 0)
      return alert("Vui lòng chọn ít nhất 1 đội thực hiện.");
    if (selectedRequests.length === 0)
      return alert("Chọn ít nhất 1 yêu cầu cứu hộ.");
    // when multi-team, all selected requests must have a team assigned
    if (multiTeam) {
      const unassigned = selectedRequests.filter((id) => !reqTeamMap[id]);
      if (unassigned.length > 0)
        return alert(
          `${unassigned.length} yêu cầu chưa được gán đội. Vui lòng chọn đội cho từng yêu cầu.`,
        );
    }
    setSaving(true);
    try {
      const requestList = selectedRequests.map((id) => ({
        id,
        team_id: multiTeam ? reqTeamMap[id] : selectedTeamIds[0],
      }));
      const { data } = await taskAPI.create({
        name: form.name,
        team_ids: selectedTeamIds,
        team_id: primaryTeamId || selectedTeamIds[0], // primary = first in task_groups.team_id
        requests: requestList,
        notes: form.notes,
      });
      onCreated(data.id);
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Tên task *  VD: Cứu hộ khu Bình Thạnh – lũ sáng 8/3"
          value={form.name}
          onChange={(e) => setForm((d) => ({ ...d, name: e.target.value }))}
        />
        <input
          className="w-56 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Ghi chú (tuỳ chọn)"
          value={form.notes}
          onChange={(e) => setForm((d) => ({ ...d, notes: e.target.value }))}
        />
        <button
          onClick={onClose}
          className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
        >
          <X size={14} /> Hủy
        </button>
        <button
          onClick={handleCreate}
          disabled={
            saving ||
            selectedTeamIds.length === 0 ||
            selectedRequests.length === 0
          }
          className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Zap size={14} />
          {saving
            ? "Đang tạo..."
            : `Tạo Task (${selectedRequests.length} yêu cầu · ${selectedTeamIds.length} đội)`}
        </button>
      </div>

      {/* Capacity bars for selected teams */}
      {selectedTeams.length > 0 && (
        <div className="space-y-2">
          {selectedTeams.map((team) => {
            const cap = team.capacity || 0;
            // victims assigned to this team
            const assigned = requests
              .filter(
                (r) =>
                  selectedRequests.includes(r.id) &&
                  (!multiTeam || reqTeamMap[r.id] === team.id),
              )
              .reduce((s, r) => s + (r.victim_count || 0), 0);
            const victims = multiTeam ? assigned : totalVictims;
            const overloaded = cap > 0 && victims > cap * 2;
            const nearLimit = cap > 0 && victims > cap;
            const pct =
              cap > 0
                ? Math.min(Math.round((victims / (cap * 2)) * 100), 100)
                : 0;
            return (
              <div
                key={team.id}
                className={`rounded-xl p-3 border ${overloaded ? "bg-red-50 border-red-200" : nearLimit ? "bg-yellow-50 border-yellow-200" : "bg-blue-50 border-blue-100"}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700">
                    {team.name} · {team.member_count || 0} thành viên · sức chứa
                    ~{cap} người
                  </span>
                  <span
                    className={`text-xs font-bold ${overloaded ? "text-red-600" : nearLimit ? "text-yellow-600" : "text-blue-600"}`}
                  >
                    {victims} / {cap} nạn nhân
                  </span>
                </div>
                <div className="w-full bg-white/70 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${overloaded ? "bg-red-500" : nearLimit ? "bg-yellow-400" : "bg-blue-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {overloaded && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    ⚠ Vượt sức chứa — nên bỏ bớt yêu cầu.
                  </p>
                )}
                {nearLimit && !overloaded && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Gần đến giới hạn sức chứa.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Specialization mismatch warning */}
      {specWarnings.length > 0 && (
        <div className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle
            size={17}
            className="text-orange-500 shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-800">
              Cảnh báo: chuyên môn đội chưa phù hợp
            </p>
            <ul className="mt-1 space-y-0.5">
              {specWarnings.map((w, i) => (
                <li key={i} className="text-xs text-orange-700">
                  ·{" "}
                  <strong>
                    {w.count} yêu cầu "{w.label}"
                  </strong>{" "}
                  cần ít nhất 1 đội có chuyên môn{" "}
                  <span className="font-semibold">
                    {w.needed.map((s) => SPEC_LABEL(s)).join(" / ")}
                  </span>
                  .
                </li>
              ))}
            </ul>
            <p className="text-xs text-orange-500 mt-1.5">
              Vẫn có thể tạo task, nhưng nên bổ sung đội phù hợp để đảm bảo hiệu
              quả cứu hộ.
            </p>
          </div>
        </div>
      )}

      {/* Split panel */}
      <div
        className="grid grid-cols-1 lg:grid-cols-5 gap-4"
        style={{ minHeight: 520 }}
      >
        {/* Left: Requests */}
        <div className="lg:col-span-3 border rounded-2xl overflow-hidden flex flex-col bg-white shadow-sm">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ClipboardList size={15} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">
                Yêu cầu cứu hộ
              </span>
              {!loadingReqs && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full font-medium">
                  {requests.length}
                </span>
              )}
            </div>
            {requests.length > 0 && (
              <button
                onClick={() =>
                  setSelectedRequests(
                    selectedRequests.length === requests.length
                      ? []
                      : requests.map((r) => r.id),
                  )
                }
                className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {selectedRequests.length === requests.length
                  ? "Bỏ chọn tất cả"
                  : "Chọn tất cả"}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {loadingReqs ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                Không có yêu cầu nào chờ xử lý trong tỉnh.
              </div>
            ) : (
              requests.map((req) => {
                const isChecked = selectedRequests.includes(req.id);
                const urgencyColor = req.urgency_color || "#9ca3af";
                return (
                  <div
                    key={req.id}
                    onClick={() => toggleRequest(req.id)}
                    className={`relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                      isChecked
                        ? "border-blue-400 bg-blue-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {/* Left accent line */}
                    <div
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all"
                      style={{
                        backgroundColor: isChecked
                          ? "#3b82f6"
                          : urgencyColor + "60",
                      }}
                    />

                    {/* Checkmark circle */}
                    <div
                      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                        isChecked
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {isChecked && (
                        <CheckCircle
                          size={12}
                          className="text-white"
                          strokeWidth={3}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pl-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono text-gray-400">
                          {req.tracking_code}
                        </span>
                        {req.urgency_level && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                            style={{
                              backgroundColor: urgencyColor + "20",
                              color: urgencyColor,
                            }}
                          >
                            {req.urgency_level}
                          </span>
                        )}
                        {req.incident_type && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                            {req.incident_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">
                        {req.address}
                      </p>
                      <div className="flex gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users size={11} className="text-gray-400" />{" "}
                          {req.victim_count} nạn nhân
                        </span>
                        {req.support_type && (
                          <span className="text-blue-500">
                            {req.support_type}
                          </span>
                        )}
                      </div>
                      {/* Per-request team assignment (only when multi-team mode) */}
                      {multiTeam && isChecked && (
                        <div
                          className="mt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-colors ${
                              reqTeamMap[req.id]
                                ? "border-blue-300 bg-blue-50"
                                : "border-orange-300"
                            }`}
                            value={reqTeamMap[req.id] || ""}
                            onChange={(e) =>
                              setReqTeamMap((prev) => ({
                                ...prev,
                                [req.id]: parseInt(e.target.value),
                              }))
                            }
                          >
                            <option value="">⚠ Chọn đội phụ trách...</option>
                            {selectedTeams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                                {t.specialization
                                  ? ` · ${SPEC_LABEL(t.specialization)}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div
            className={`px-4 py-2.5 border-t shrink-0 flex items-center justify-between transition-colors ${
              selectedRequests.length > 0 ? "bg-blue-50" : "bg-gray-50"
            }`}
          >
            <span className="text-xs font-semibold text-blue-700">
              {selectedRequests.length > 0 ? (
                `✓ ${selectedRequests.length} yêu cầu · ${totalVictims} nạn nhân`
              ) : (
                <span className="text-gray-400 font-normal">
                  Chưa chọn yêu cầu nào
                </span>
              )}
            </span>
            {multiTeam && selectedRequests.length > 0 && (
              <span
                className={`text-xs font-medium ${
                  selectedRequests.filter((id) => !reqTeamMap[id]).length > 0
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {selectedRequests.filter((id) => !reqTeamMap[id]).length > 0
                  ? `⚠ ${selectedRequests.filter((id) => !reqTeamMap[id]).length} chưa gán đội`
                  : "✓ Đã gán đội đủ"}
              </span>
            )}
          </div>
        </div>

        {/* Right: Teams */}
        <div className="lg:col-span-2 border rounded-2xl overflow-hidden flex flex-col bg-white shadow-sm">
          {/* Header */}
          <div className="px-4 py-3 border-b bg-gradient-to-r from-gray-50 to-white shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">
                  Đội cứu hộ
                </span>
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full font-medium">
                  {displayTeams.length}
                  {specFilter ? `/${teams.length}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {centroid && (
                  <span className="text-xs text-blue-500 flex items-center gap-1">
                    <Navigation size={11} /> Gần nhất trước
                  </span>
                )}
                {selectedTeamIds.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold">
                    {selectedTeamIds.length} đã chọn
                  </span>
                )}
              </div>
            </div>
            {/* Spec filter chips */}
            {allSpecs.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setSpecFilter("")}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    !specFilter
                      ? "bg-gray-700 text-white border-gray-700"
                      : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  Tất cả
                </button>
                {allSpecs.map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      setSpecFilter((prev) => (prev === s ? "" : s))
                    }
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      specFilter === s
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    {SPEC_LABEL(s)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {displayTeams.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                {specFilter
                  ? "Không có đội nào với chuyên môn này."
                  : "Không có đội nào khả dụng."}
              </div>
            ) : (
              displayTeams.map((team) => {
                const isSelected = selectedTeamIds.includes(team.id);
                const isPrimary =
                  primaryTeamId === team.id && selectedTeamIds.length > 1;
                const statusDot =
                  team.status === "available"
                    ? {
                        cls: "bg-green-400",
                        label: "Sẵn sàng",
                        text: "text-green-700",
                      }
                    : team.status === "standby"
                      ? {
                          cls: "bg-yellow-400",
                          label: "Chờ lệnh",
                          text: "text-yellow-700",
                        }
                      : {
                          cls: "bg-orange-400",
                          label: "Đang bận",
                          text: "text-orange-600",
                        };
                const memberPct =
                  team.capacity > 0
                    ? Math.min(
                        Math.round(
                          ((team.member_count || 0) / team.capacity) * 100,
                        ),
                        100,
                      )
                    : 0;
                return (
                  <label
                    key={team.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isPrimary
                        ? "border-amber-400 bg-amber-50 shadow-sm ring-1 ring-amber-200"
                        : isSelected
                          ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {/* Checkmark / Crown */}
                    <div
                      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                        isPrimary
                          ? "bg-amber-400 border-amber-400"
                          : isSelected
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300"
                      }`}
                      onClick={(e) => {
                        if (isSelected && selectedTeamIds.length > 1) {
                          e.preventDefault();
                          setPrimaryTeamId(team.id);
                        }
                      }}
                      title={
                        isSelected && selectedTeamIds.length > 1
                          ? "Nhấn để đặt làm đội chủ lực"
                          : ""
                      }
                    >
                      {isPrimary ? (
                        <Crown
                          size={10}
                          className="text-white"
                          strokeWidth={2.5}
                        />
                      ) : isSelected ? (
                        <CheckCircle
                          size={12}
                          className="text-white"
                          strokeWidth={3}
                        />
                      ) : null}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isSelected}
                      onChange={() => toggleTeam(team.id)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {team.name}
                          </p>
                          {isPrimary && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold shrink-0">
                              Chủ lực
                            </span>
                          )}
                        </div>
                        <span
                          className={`flex items-center gap-1 text-xs font-medium shrink-0 ${statusDot.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusDot.cls}`}
                          />
                          {statusDot.label}
                        </span>
                      </div>

                      {team.specialization && (
                        <p className="text-xs text-blue-600 mt-0.5 font-medium">
                          {SPEC_LABEL(team.specialization)}
                        </p>
                      )}

                      {/* Distance + location */}
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        {team.distance !== null ? (
                          <span
                            className={`flex items-center gap-0.5 font-medium ${
                              team.distance < 5
                                ? "text-green-600"
                                : team.distance < 15
                                  ? "text-yellow-600"
                                  : "text-gray-400"
                            }`}
                          >
                            <MapPin size={10} />
                            {team.distance < 1
                              ? "<1 km"
                              : `~${Math.round(team.distance)} km`}
                          </span>
                        ) : (
                          team.current_latitude && (
                            <span className="flex items-center gap-0.5 text-gray-400">
                              <MapPin size={10} /> Có tọa độ
                            </span>
                          )
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-blue-400 h-1 rounded-full transition-all"
                            style={{ width: `${memberPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">
                          {team.member_count || 0}/{team.capacity}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t bg-gray-50 shrink-0">
            {selectedTeamIds.length > 1 ? (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Crown size={11} /> Nhấn vào vòng tròn của đội để đặt làm{" "}
                <strong>đội chủ lực</strong>
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                {selectedTeamIds.length === 0
                  ? "Chọn ít nhất 1 đội để phân công"
                  : "Chọn thêm đội để phân công từng yêu cầu"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main TasksPage ───────────────────────────────────────────────────────────
export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [pageTab, setPageTab] = useState("tasks"); // 'tasks' | 'requests' | 'history'
  const [pendingRequests, setPendingRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [expandedMapId, setExpandedMapId] = useState(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await taskAPI.getAll({});
      setTasks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const fetchPendingRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const { data } = await requestAPI.getAll({
        status: "pending",
        limit: 50,
      });
      setPendingRequests(data?.data || data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setReqLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pageTab === "requests") fetchPendingRequests();
  }, [pageTab, fetchPendingRequests]);

  // Socket: auto-refresh on task events
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => fetchTasks();
    socket.on("task_created", refresh);
    socket.on("task_updated", refresh);
    socket.on("task_incident_report", refresh);
    socket.on("task_support_dispatched", refresh);
    return () => {
      socket.off("task_created", refresh);
      socket.off("task_updated", refresh);
      socket.off("task_incident_report", refresh);
      socket.off("task_support_dispatched", refresh);
    };
  }, [fetchTasks]);

  const handleVerify = async (id) => {
    setVerifyingId(id);
    try {
      await requestAPI.verify(id, {});
      fetchPendingRequests();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setVerifyingId(null);
    }
  };

  const [verifyingAll, setVerifyingAll] = useState(false);
  const handleVerifyAll = async () => {
    const pending = pendingRequests.filter((r) => r.status === "pending");
    if (pending.length === 0) return;
    if (!window.confirm(`Duyệt tất cả ${pending.length} yêu cầu đang chờ?`))
      return;
    setVerifyingAll(true);
    try {
      await Promise.all(pending.map((r) => requestAPI.verify(r.id, {})));
      fetchPendingRequests();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setVerifyingAll(false);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Lý do từ chối:");
    if (reason === null) return;
    setVerifyingId(id);
    try {
      await requestAPI.reject(id, { reason });
      fetchPendingRequests();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setVerifyingId(null);
    }
  };

  const isCoordinator = user?.role === "coordinator";
  const isManager = user?.role === "manager";

  const renderTaskCard = (task) => {
    const hasPendingReports = task.pending_reports > 0;
    const progress =
      task.total_sub > 0
        ? Math.round(
            ((task.completed_sub + task.failed_sub) / task.total_sub) * 100,
          )
        : 0;
    return (
      <div
        key={task.id}
        className={`bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer ${hasPendingReports ? "border-red-300 ring-1 ring-red-200" : ""}`}
        onClick={() => setDetailTaskId(task.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 truncate">{task.name}</h3>
            <p className="text-xs text-gray-400 font-mono">Task #{task.id}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_STATUS[task.status]?.cls}`}
            >
              {TASK_STATUS[task.status]?.label}
            </span>
            {hasPendingReports && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <AlertTriangle size={11} /> {task.pending_reports} báo cáo
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{task.team_name}</span>
          </div>
          {task.province_name && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{task.province_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <ClipboardList className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>
              {task.completed_sub}/{task.total_sub} hoàn thành
              {task.failed_sub > 0 && ` · ${task.failed_sub} không thể cứu`}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${task.failed_sub > 0 ? "bg-yellow-400" : "bg-blue-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{progress}% hoàn thành</p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <span className="text-xs text-gray-400">
            {new Date(task.created_at).toLocaleString("vi-VN", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
          <span className="text-xs text-blue-600 flex items-center gap-1">
            <Eye size={12} /> Xem chi tiết
          </span>
        </div>
      </div>
    );
  };

  const activeTasks = tasks.filter((t) => t.status === "in_progress");
  const historyTasks = tasks.filter((t) => t.status !== "in_progress");
  const filteredHistory = filterStatus
    ? historyTasks.filter((t) => t.status === filterStatus)
    : historyTasks;

  const renderTaskList = (list) => {
    const filtered = list.filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        t.name?.toLowerCase().includes(q) ||
        t.team_name?.toLowerCase().includes(q) ||
        t.province_name?.toLowerCase().includes(q)
      );
    });
    if (filtered.length === 0)
      return (
        <div className="text-center py-12 text-gray-500 text-sm">
          Không có task nào.
        </div>
      );
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((task) => renderTaskCard(task))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800">
          {showCreate
            ? "Tạo Task mới"
            : isManager
              ? "Theo dõi Task cứu hộ"
              : "Quản lý Task cứu hộ"}
        </h1>
        {!showCreate && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="pl-8 pr-3 py-2 text-sm border rounded-lg w-48"
                placeholder="Tìm task, đội..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {isCoordinator && pageTab === "history" && (
              <select
                className="px-3 py-2 text-sm border rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Tất cả lịch sử</option>
                <option value="completed">Hoàn thành</option>
                <option value="partial">Hoàn thành một phần</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            )}
            <button
              onClick={fetchTasks}
              className="p-2 border rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {isCoordinator && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Tạo Task
              </button>
            )}
          </div>
        )}
      </div>

      {showCreate ? (
        <CreateTaskPanel
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            fetchTasks();
            setDetailTaskId(id);
          }}
        />
      ) : (
        <>
          {/* Tabs */}
          {isCoordinator && (
            <div className="flex border-b gap-1">
              <button
                onClick={() => setPageTab("tasks")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  pageTab === "tasks"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <ClipboardList size={14} /> Task đang chạy
                {activeTasks.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full leading-none">
                    {activeTasks.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setPageTab("requests");
                  fetchPendingRequests();
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  pageTab === "requests"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <FileText size={14} /> Yêu cầu chờ duyệt
                {pendingRequests.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full leading-none">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setPageTab("history");
                  setFilterStatus("");
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  pageTab === "history"
                    ? "border-gray-600 text-gray-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Clock size={14} /> Lịch sử
                {historyTasks.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-gray-400 text-white rounded-full leading-none">
                    {historyTasks.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Stats summary */}
          {!loading &&
            tasks.length > 0 &&
            (() => {
              const counts = {
                in_progress: 0,
                completed: 0,
                partial: 0,
                cancelled: 0,
              };
              tasks.forEach((t) => {
                if (counts[t.status] !== undefined) counts[t.status]++;
              });
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      if (isCoordinator) setPageTab("tasks");
                      else
                        setFilterStatus((f) =>
                          f === "in_progress" ? "" : "in_progress",
                        );
                    }}
                    className={`rounded-xl p-3 text-center border transition-colors ${(!isCoordinator && filterStatus === "in_progress") || (isCoordinator && pageTab === "tasks") ? "border-blue-400 bg-blue-50" : "bg-white hover:bg-blue-50"}`}
                  >
                    <p className="text-lg font-bold text-blue-700">
                      {counts.in_progress}
                    </p>
                    <p className="text-xs text-blue-500 mt-0.5">
                      Đang thực hiện
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      if (isCoordinator) {
                        setPageTab("history");
                        setFilterStatus("completed");
                      } else
                        setFilterStatus((f) =>
                          f === "completed" ? "" : "completed",
                        );
                    }}
                    className={`rounded-xl p-3 text-center border transition-colors ${filterStatus === "completed" ? "border-green-400 bg-green-50" : "bg-white hover:bg-green-50"}`}
                  >
                    <p className="text-lg font-bold text-green-700">
                      {counts.completed}
                    </p>
                    <p className="text-xs text-green-500 mt-0.5">Hoàn thành</p>
                  </button>
                  <button
                    onClick={() => {
                      if (isCoordinator) {
                        setPageTab("history");
                        setFilterStatus("partial");
                      } else
                        setFilterStatus((f) =>
                          f === "partial" ? "" : "partial",
                        );
                    }}
                    className={`rounded-xl p-3 text-center border transition-colors ${filterStatus === "partial" ? "border-yellow-400 bg-yellow-50" : "bg-white hover:bg-yellow-50"}`}
                  >
                    <p className="text-lg font-bold text-yellow-700">
                      {counts.partial}
                    </p>
                    <p className="text-xs text-yellow-500 mt-0.5">Một phần</p>
                  </button>
                  <button
                    onClick={() => {
                      if (isCoordinator) {
                        setPageTab("history");
                        setFilterStatus("cancelled");
                      } else
                        setFilterStatus((f) =>
                          f === "cancelled" ? "" : "cancelled",
                        );
                    }}
                    className={`rounded-xl p-3 text-center border transition-colors ${filterStatus === "cancelled" ? "border-red-300 bg-red-50" : "bg-white hover:bg-red-50"}`}
                  >
                    <p className="text-lg font-bold text-red-600">
                      {counts.cancelled}
                    </p>
                    <p className="text-xs text-red-400 mt-0.5">Đã hủy</p>
                  </button>
                </div>
              );
            })()}

          {/* Tab: Task đang chạy */}
          {(pageTab === "tasks" || !isCoordinator) &&
            (loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeTasks.length === 0 && isCoordinator ? (
              <div className="text-center py-12 text-gray-500">
                Không có task nào đang thực hiện.
              </div>
            ) : (
              renderTaskList(
                isCoordinator
                  ? activeTasks
                  : filterStatus
                    ? tasks.filter((t) => t.status === filterStatus)
                    : tasks,
              )
            ))}

          {/* Tab: Lịch sử */}
          {isCoordinator &&
            pageTab === "history" &&
            (loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : historyTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                Chưa có lịch sử task nào.
              </div>
            ) : (
              renderTaskList(filteredHistory)
            ))}

          {/* Tab: Yêu cầu chờ duyệt */}
          {isCoordinator && pageTab === "requests" && (
            <div className="space-y-3">
              {reqLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Không có yêu cầu nào đang chờ duyệt.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingRequests.filter((r) => r.status === "pending")
                    .length > 0 && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleVerifyAll}
                        disabled={verifyingAll}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <ThumbsUp size={14} />
                        {verifyingAll
                          ? "Đang duyệt..."
                          : `Duyệt tất cả (${pendingRequests.filter((r) => r.status === "pending").length})`}
                      </button>
                    </div>
                  )}
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white border rounded-xl overflow-hidden cursor-pointer"
                      onClick={() =>
                        req.latitude &&
                        req.longitude &&
                        setExpandedMapId(
                          expandedMapId === req.id ? null : req.id,
                        )
                      }
                    >
                      <div className="p-4 flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-blue-700 font-bold">
                              {req.tracking_code}
                            </span>
                            {req.incident_type && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {req.incident_type}
                              </span>
                            )}
                            {req.urgency_level && (
                              <span
                                className="text-xs font-medium"
                                style={{ color: req.urgency_color }}
                              >
                                ⚠ {req.urgency_level}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-800 mt-1 truncate">
                            {req.description || "Không có mô tả"}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                            {req.citizen_name && (
                              <span>👤 {req.citizen_name}</span>
                            )}
                            {req.citizen_phone && (
                              <span>📞 {req.citizen_phone}</span>
                            )}
                            {req.address && <span>📍 {req.address}</span>}
                            {req.victim_count > 0 && (
                              <span>👥 {req.victim_count} người</span>
                            )}
                            {req.province_name && (
                              <span>🗺 {req.province_name}</span>
                            )}
                          </div>
                        </div>
                        <div
                          className="flex flex-col gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleVerify(req.id)}
                            disabled={verifyingId === req.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <ThumbsUp size={12} /> Duyệt
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={verifyingId === req.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          >
                            <ThumbsDown size={12} /> Từ chối
                          </button>
                        </div>
                      </div>
                      {expandedMapId === req.id &&
                        req.latitude &&
                        req.longitude && (
                          <div className="border-t px-4 py-3 bg-gray-50">
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
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${req.longitude - 0.01},${req.latitude - 0.008},${req.longitude + 0.01},${req.latitude + 0.008}&layer=mapnik&marker=${req.latitude},${req.longitude}`}
                              />
                            </div>
                            <div className="flex gap-2 mt-2">
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${req.latitude},${req.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              >
                                <Navigation className="w-3.5 h-3.5" /> Chỉ đường
                                (Google Maps)
                              </a>
                              <a
                                href={`https://www.openstreetmap.org/?mlat=${req.latitude}&mlon=${req.longitude}#map=15/${req.latitude}/${req.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg hover:bg-gray-100"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Mở bản
                                đồ
                              </a>
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onRefresh={fetchTasks}
        />
      )}
    </div>
  );
}
