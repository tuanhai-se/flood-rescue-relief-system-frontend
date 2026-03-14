import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Search,
  MapPin,
  Clock,
  Users,
  Phone,
  CheckCircle,
  AlertTriangle,
  Truck,
  Waves,
  ArrowLeft,
  Navigation,
  FileText,
  Edit2,
  X,
  Save,
} from "lucide-react";
import { requestAPI, regionAPI } from "../services/api";
import { STATUS_LABELS, formatDate, formatTimeAgo } from "../utils/helpers";
import { getSocket } from "../services/socket";

const STATUS_STEPS = [
  { key: "pending", label: "Đã gửi", icon: FileText },
  { key: "verified", label: "Đã xác minh", icon: CheckCircle },
  { key: "assigned", label: "Đã phân công", icon: Users },
  { key: "in_progress", label: "Đang cứu hộ", icon: Truck },
  { key: "completed", label: "Hoàn thành", icon: CheckCircle },
];

function getStepIndex(status) {
  if (status === "rejected" || status === "cancelled") return -1;
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function TrackRequest() {
  const { code } = useParams();
  const [trackingCode, setTrackingCode] = useState(code || "");
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [urgencyLevels, setUrgencyLevels] = useState([]);

  useEffect(() => {
    if (code) searchRequest(code);
  }, [code]);

  useEffect(() => {
    if (request?.tracking_code) {
      const socket = getSocket();
      socket.emit("track_request", request.tracking_code);
      socket.on("request_updated", (updated) => {
        if (updated.id === request.id) {
          setRequest((prev) => ({ ...prev, ...updated }));
        }
      });
      return () => {
        socket.emit("untrack_request", request.tracking_code);
        socket.off("request_updated");
      };
    }
  }, [request?.tracking_code]);

  // Load reference data for edit form
  useEffect(() => {
    regionAPI
      .getIncidentTypes()
      .then((r) => setIncidentTypes(r.data))
      .catch(() => { });
    regionAPI
      .getUrgencyLevels()
      .then((r) => setUrgencyLevels(r.data))
      .catch(() => { });
  }, []);

  async function searchRequest(searchCode) {
    const c = searchCode || trackingCode;
    if (!c.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const { data } = await requestAPI.track(c.trim());
      setRequest(data);
    } catch (err) {
      setError("Không tìm thấy yêu cầu với mã theo dõi này.");
      setRequest(null);
    }
    setLoading(false);
  }

  const currentStep = request ? getStepIndex(request.status) : -1;
  const isTerminal =
    request && ["completed", "rejected", "cancelled"].includes(request.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-flood-dark to-flood text-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Waves className="text-flood-accent" size={28} />
            <div>
              <h1 className="text-lg font-bold font-display">
                THEO DÕI CỨU HỘ
              </h1>
              <p className="text-[10px] text-blue-300">
                Tra cứu tiến trình yêu cầu cứu hộ
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-blue-300 hover:text-white transition"
          >
            <ArrowLeft size={16} /> Bản đồ
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Search box */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Nhập mã theo dõi
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && searchRequest()}
              placeholder="VD: RQ-2024-A1B2C3"
              className="flex-1 input-field text-lg font-mono"
            />
            <button
              onClick={() => searchRequest()}
              disabled={loading}
              className="btn-primary px-6 flex items-center gap-2"
            >
              <Search size={18} />
              {loading ? "Đang tìm..." : "Tra cứu"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-red-700">
            <AlertTriangle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Result */}
        {request && (
          <div className="space-y-6">
            {/* Status card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div
                className={`px-6 py-4 ${isTerminal && request.status === "completed" ? "bg-gradient-to-r from-green-600 to-emerald-500" : request.status === "rejected" || request.status === "cancelled" ? "bg-gradient-to-r from-gray-600 to-gray-500" : "bg-gradient-to-r from-blue-600 to-cyan-500"} text-white`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">Mã theo dõi</p>
                    <p className="text-2xl font-bold font-mono">
                      {request.tracking_code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-80">Trạng thái</p>
                    <p className="text-xl font-bold">
                      {STATUS_LABELS[request.status]}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress steps */}
              {request.status !== "rejected" &&
                request.status !== "cancelled" && (
                  <div className="px-6 py-6">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0" />
                      <div
                        className="absolute top-5 left-0 h-0.5 bg-blue-500 z-0 transition-all duration-500"
                        style={{
                          width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%`,
                        }}
                      />
                      {STATUS_STEPS.map((step, i) => {
                        const Icon = step.icon;
                        const done = i <= currentStep;
                        const active = i === currentStep;
                        return (
                          <div
                            key={step.key}
                            className="flex flex-col items-center relative z-10"
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                            ${done ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-gray-200 text-gray-400"}
                            ${active ? "ring-4 ring-blue-200 scale-110" : ""}`}
                            >
                              <Icon size={18} />
                            </div>
                            <p
                              className={`text-xs mt-2 font-medium ${done ? "text-blue-700" : "text-gray-400"}`}
                            >
                              {step.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {(request.status === "rejected" ||
                request.status === "cancelled") && (
                  <div className="px-6 py-4 text-center">
                    <p className="text-red-600 font-medium">
                      {request.status === "rejected"
                        ? "Yêu cầu đã bị từ chối"
                        : "Yêu cầu đã bị hủy"}
                    </p>
                    {request.reject_reason && (
                      <p className="text-sm text-gray-500 mt-1">
                        {request.reject_reason}
                      </p>
                    )}
                  </div>
                )}
            </div>

            {/* Details card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Chi tiết yêu cầu
                </h3>
                {request.status === "pending" && (
                  <button
                    onClick={() => setShowEdit(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
                  >
                    <Edit2 size={14} /> Chỉnh sửa
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="text-blue-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs text-gray-500">Vị trí</p>
                    <p className="text-sm font-medium">
                      {request.address ||
                        `${request.latitude}, ${request.longitude}`}
                    </p>
                    {(request.district_name || request.province_name) && (
                      <p className="text-xs text-gray-400">
                        {[request.district_name, request.province_name]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock
                    className="text-orange-500 shrink-0 mt-0.5"
                    size={18}
                  />
                  <div>
                    <p className="text-xs text-gray-500">Thời gian gửi</p>
                    <p className="text-sm font-medium">
                      {formatDate(request.created_at)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatTimeAgo(request.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users
                    className="text-purple-500 shrink-0 mt-0.5"
                    size={18}
                  />
                  <div>
                    <p className="text-xs text-gray-500">Số người cần cứu</p>
                    <p className="text-sm font-medium">
                      {request.victim_count} người
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="text-red-500 shrink-0 mt-0.5"
                    size={18}
                  />
                  <div>
                    <p className="text-xs text-gray-500">Mức ngập</p>
                    <p className="text-sm font-medium">
                      Cấp {request.flood_severity}/5
                    </p>
                  </div>
                </div>
                {request.citizen_name && (
                  <div className="flex items-start gap-3">
                    <Phone
                      className="text-green-500 shrink-0 mt-0.5"
                      size={18}
                    />
                    <div>
                      <p className="text-xs text-gray-500">Người gửi</p>
                      <p className="text-sm font-medium">
                        {request.citizen_name}
                      </p>
                      {request.citizen_phone && (
                        <p className="text-xs text-gray-400">
                          {request.citizen_phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {request.urgency_level && (
                  <div className="flex items-start gap-3">
                    <div
                      className="w-4.5 h-4.5 mt-0.5 shrink-0 rounded-full"
                      style={{
                        background: request.urgency_color,
                        width: 18,
                        height: 18,
                      }}
                    />
                    <div>
                      <p className="text-xs text-gray-500">Mức độ khẩn cấp</p>
                      <p className="text-sm font-medium">
                        {request.urgency_level}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {request.description && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-1">Mô tả tình huống</p>
                  <p className="text-sm text-gray-700">{request.description}</p>
                </div>
              )}

              {/* Assigned team info */}
              {request.team_name && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="text-green-500" size={18} />
                    <p className="font-medium text-sm">
                      Đội cứu hộ được phân công
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="font-semibold text-green-800">
                      {request.team_name}
                    </p>
                    {request.team_phone && (
                      <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                        <Phone size={14} /> {request.team_phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Response time */}
              {request.response_time_minutes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500">Thời gian phản hồi</p>
                  <p className="text-lg font-bold text-blue-600">
                    {request.response_time_minutes < 60
                      ? `${request.response_time_minutes} phút`
                      : `${Math.round((request.response_time_minutes / 60) * 10) / 10} giờ`}
                  </p>
                </div>
              )}

              {/* Citizen confirm rescue */}
              {["in_progress", "completed"].includes(request.status) && (
                <div className="mt-4 pt-4 border-t">
                  {request.citizen_confirmed ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle
                        className="text-green-600 shrink-0"
                        size={24}
                      />
                      <div>
                        <p className="font-semibold text-green-800">
                          Đã xác nhận cứu hộ thành công
                        </p>
                        <p className="text-xs text-green-600 mt-0.5">
                          {request.citizen_confirmed_at
                            ? formatDate(request.citizen_confirmed_at)
                            : ""}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ConfirmRescueButton
                      trackingCode={request.tracking_code}
                      onConfirmed={() =>
                        setRequest((prev) => ({
                          ...prev,
                          citizen_confirmed: true,
                          citizen_confirmed_at: new Date().toISOString(),
                        }))
                      }
                    />
                  )}
                </div>
              )}

              {/* Pending notice with edit hint */}
              {request.status === "pending" && (
                <div className="mt-4 pt-4 border-t">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle
                      className="text-yellow-500 shrink-0 mt-0.5"
                      size={16}
                    />
                    <p className="text-xs text-yellow-800">
                      Yêu cầu đang chờ xét duyệt. Bạn có thể{" "}
                      <button
                        onClick={() => setShowEdit(true)}
                        className="underline font-semibold hover:text-yellow-900"
                      >
                        chỉnh sửa thông tin
                      </button>{" "}
                      trước khi được phê duyệt.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Live update notice */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3 text-blue-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <p className="text-sm">
                Trang này cập nhật tự động khi có thay đổi trạng thái.
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {searched && !request && !error && !loading && (
          <div className="text-center py-16 text-gray-400">
            <Search size={48} className="mx-auto mb-3" />
            <p>Nhập mã theo dõi để tra cứu tiến trình cứu hộ</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEdit && request && (
        <EditRequestModal
          request={request}
          incidentTypes={incidentTypes}
          urgencyLevels={urgencyLevels}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setRequest((prev) => ({ ...prev, ...updated }));
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}

function EditRequestModal({
  request,
  incidentTypes,
  urgencyLevels,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    citizen_name: request.citizen_name || "",
    citizen_phone: request.citizen_phone || "",
    address: request.address || "",
    incident_type_id: request.incident_type_id || "",
    urgency_level_id: request.urgency_level_id || "",
    description: request.description || "",
    victim_count: request.victim_count || "1",
    flood_severity: request.flood_severity || "2",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      await requestAPI.trackUpdate(request.tracking_code, form);
      // Re-fetch để lấy tên urgency_level, incident_type cập nhật đúng
      const { data: refreshed } = await requestAPI.track(request.tracking_code);
      onSaved(refreshed);
    } catch (err) {
      setSaveError(
        err.response?.data?.error || "Lưu thất bại. Vui lòng thử lại.",
      );
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit2 size={20} />
            <div>
              <h2 className="font-bold text-lg">Chỉnh sửa yêu cầu</h2>
              <p className="text-blue-100 text-xs font-mono">
                {request.tracking_code}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="p-6 space-y-4 max-h-[70vh] overflow-y-auto"
        >
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={16} /> {saveError}
            </div>
          )}

          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ tên
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Tên người gửi"
                value={form.citizen_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, citizen_name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                className="input-field"
                placeholder="09xx xxx xxx"
                value={form.citizen_phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, citizen_phone: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ chi tiết
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Số nhà, đường, phường/xã..."
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>

          {/* Incident type & urgency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại sự cố
              </label>
              <select
                className="input-field"
                value={form.incident_type_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, incident_type_id: e.target.value }))
                }
              >
                <option value="">Chọn loại</option>
                {incidentTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mức độ khẩn cấp
              </label>
              <select
                className="input-field"
                value={form.urgency_level_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, urgency_level_id: e.target.value }))
                }
              >
                <option value="">Chọn mức</option>
                {urgencyLevels.map((l, i) => (
                  <option key={l.id} value={l.id}>
                    {"●".repeat(urgencyLevels.length - i)} {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Victim count & flood severity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số người cần cứu
              </label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={form.victim_count}
                onChange={(e) =>
                  setForm((f) => ({ ...f, victim_count: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mức ngập:{" "}
                <span className="font-bold text-blue-600">
                  Cấp {form.flood_severity}/5
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                className="w-full mt-1.5"
                value={form.flood_severity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, flood_severity: e.target.value }))
                }
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>Nhẹ</span>
                <span>Vừa</span>
                <span>Nặng</span>
                <span>Rất nặng</span>
                <span>Cực kỳ</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả tình huống
            </label>
            <textarea
              rows={3}
              className="input-field resize-none"
              placeholder="Mô tả tình huống, nhu cầu hỗ trợ..."
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
            >
              <Save size={16} />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border rounded-xl text-sm hover:bg-gray-50 transition"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmRescueButton({ trackingCode, onConfirmed }) {
  const [confirming, setConfirming] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const { data } = await requestAPI.confirmRescue(trackingCode);
      setMessage(data.message);
      onConfirmed(data);
    } catch (err) {
      setMessage(err.response?.data?.error || "Có lỗi xảy ra.");
    }
    setConfirming(false);
    setShowConfirm(false);
  };

  if (message) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle className="text-green-600 shrink-0" size={24} />
        <p className="font-semibold text-green-800">{message}</p>
      </div>
    );
  }

  return (
    <div>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
        >
          <CheckCircle size={20} /> Xác nhận đã được cứu hộ / nhận cứu trợ
        </button>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-800 font-medium mb-3">
            Bạn xác nhận đã được cứu hộ hoặc nhận hàng cứu trợ thành công?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {confirming ? "Đang xử lý..." : "✅ Xác nhận"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
