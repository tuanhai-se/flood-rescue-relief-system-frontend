import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck,
  Package,
  Truck,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { resourceAPI } from "../services/api";

const SUPPLY_STATUS_LABELS = {
  issued: { label: "Đã xuất", color: "bg-blue-100 text-blue-700" },
  confirmed: { label: "Đội đã nhận", color: "bg-indigo-100 text-indigo-700" },
  return_requested: {
    label: "Đang yêu cầu trả",
    color: "bg-yellow-100 text-yellow-700",
  },
  partially_returned: {
    label: "Trả 1 phần",
    color: "bg-orange-100 text-orange-700",
  },
  returned: { label: "Đã trả hết", color: "bg-green-100 text-green-700" },
};

const VEHICLE_TYPE_LABELS = {
  boat: "Thuyền",
  truck: "Xe tải",
  car: "Xe ô tô",
  helicopter: "Trực thăng",
  ambulance: "Xe cấp cứu",
  other: "Khác",
};

const VEHICLE_STATUS_LABELS = {
  pending: { label: "Chờ duyệt", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Đã duyệt", color: "bg-blue-100 text-blue-700" },
  fulfilled: { label: "Đã nhận xe", color: "bg-indigo-100 text-indigo-700" },
  returned: { label: "Đã trả xe", color: "bg-green-100 text-green-700" },
  rejected: { label: "Từ chối", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Đã hủy", color: "bg-gray-100 text-gray-500" },
};

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function InventoryCheckPage() {
  const [tab, setTab] = useState("supplies");
  const [distributions, setDistributions] = useState([]);
  const [vehicleRequests, setVehicleRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [error, setError] = useState("");

  const fetchDistributions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await resourceAPI.getDistributions({});
      setDistributions(res.data || []);
    } catch {
      setError("Không thể tải dữ liệu vật tư.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVehicleRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await resourceAPI.getVehicleRequests({});
      const rows = (res.data || []).filter((v) =>
        ["fulfilled", "returned"].includes(v.status),
      );
      setVehicleRequests(rows);
    } catch {
      setError("Không thể tải dữ liệu phương tiện.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "supplies") fetchDistributions();
    else fetchVehicleRequests();
  }, [tab, fetchDistributions, fetchVehicleRequests]);

  async function handleConfirmReturn(id) {
    setConfirmingId(id);
    try {
      await resourceAPI.confirmReturnDistribution(id, {});
      setDistributions((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                status: "returned",
                return_confirmed_at: new Date().toISOString(),
              }
            : d,
        ),
      );
    } catch (e) {
      alert(e?.response?.data?.error || "Xác nhận thất bại.");
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleConfirmVehicleReturn(id) {
    setConfirmingId(id);
    try {
      await resourceAPI.confirmVehicleRequest(id, "returned");
      setVehicleRequests((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: "returned" } : v)),
      );
    } catch (e) {
      alert(e?.response?.data?.error || "Xác nhận thất bại.");
    } finally {
      setConfirmingId(null);
    }
  }

  const pendingSupplies = distributions.filter(
    (d) => d.status !== "returned",
  ).length;
  const pendingVehicles = vehicleRequests.filter(
    (v) => v.status === "fulfilled",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="text-blue-600" size={28} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Kiểm hàng hóa</h1>
            <p className="text-sm text-gray-500">
              Theo dõi vật tư và phương tiện đã xuất — xác nhận đã trả
            </p>
          </div>
        </div>
        <button
          onClick={() =>
            tab === "supplies" ? fetchDistributions() : fetchVehicleRequests()
          }
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw size={15} /> Làm mới
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          <button
            onClick={() => setTab("supplies")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition
              ${
                tab === "supplies"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <Package size={16} />
            Vật tư
            {pendingSupplies > 0 && (
              <span className="ml-1 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {pendingSupplies}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("vehicles")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition
              ${
                tab === "vehicles"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <Truck size={16} />
            Phương tiện
            {pendingVehicles > 0 && (
              <span className="ml-1 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {pendingVehicles}
              </span>
            )}
          </button>
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">
          Đang tải...
        </div>
      ) : tab === "supplies" ? (
        <SuppliesTable
          rows={distributions}
          onConfirmReturn={handleConfirmReturn}
          confirmingId={confirmingId}
        />
      ) : (
        <VehiclesTable
          rows={vehicleRequests}
          onConfirmReturn={handleConfirmVehicleReturn}
          confirmingId={confirmingId}
        />
      )}
    </div>
  );
}

function SuppliesTable({ rows, onConfirmReturn, confirmingId }) {
  if (!rows.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Package size={40} className="mx-auto mb-3 opacity-30" />
        <p>Chưa có bản ghi xuất vật tư nào.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">
              Kho
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">
              Vật tư
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">
              Đội nhận
            </th>
            <th className="text-right px-4 py-3 font-semibold text-gray-600">
              Số lượng
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">
              Ngày xuất
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">
              Trạng thái
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">
              Ngày trả
            </th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((d) => (
            <tr
              key={d.id}
              className={`hover:bg-gray-50 transition ${d.status === "returned" ? "opacity-60" : ""}`}
            >
              <td className="px-4 py-3 text-gray-700">{d.warehouse_name}</td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-800">{d.item_name}</span>
                {d.category && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({d.category})
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {d.team_name || <span className="text-gray-400 italic">—</span>}
              </td>
              <td className="px-4 py-3 text-right font-mono text-gray-800">
                {d.quantity}{" "}
                <span className="text-gray-400 text-xs">{d.item_unit}</span>
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {fmt(d.created_at)}
              </td>
              <td className="px-4 py-3">
                {(() => {
                  const st = SUPPLY_STATUS_LABELS[d.status] || {
                    label: d.status,
                    color: "bg-gray-100 text-gray-500",
                  };
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}
                    >
                      {d.status === "returned" ? (
                        <CheckCircle size={12} />
                      ) : (
                        <Clock size={12} />
                      )}
                      {st.label}
                    </span>
                  );
                })()}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {fmt(d.return_confirmed_at)}
              </td>
              <td className="px-4 py-3">
                {d.status === "return_requested" && (
                  <button
                    onClick={() => onConfirmReturn(d.id)}
                    disabled={confirmingId === d.id}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
                  >
                    {confirmingId === d.id ? "..." : "Xác nhận nhận lại"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VehiclesTable({ rows, onConfirmReturn, confirmingId }) {
  if (!rows.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Truck size={40} className="mx-auto mb-3 opacity-30" />
        <p>Chưa có phương tiện nào đã được giao.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">
              Loại xe
            </th>
            <th className="text-right px-4 py-3 font-semibold text-gray-600">
              SL
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">
              Đội nhận
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">
              Nguồn
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">
              Ngày nhận
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">
              Ngày trả dự kiến
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">
              Trạng thái
            </th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((v) => {
            const st = VEHICLE_STATUS_LABELS[v.status] || {
              label: v.status,
              color: "bg-gray-100 text-gray-600",
            };
            return (
              <tr
                key={v.id}
                className={`hover:bg-gray-50 transition ${v.status === "returned" ? "opacity-60" : ""}`}
              >
                <td className="px-4 py-3 font-medium text-gray-800">
                  {VEHICLE_TYPE_LABELS[v.vehicle_type] || v.vehicle_type}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-800">
                  {v.quantity}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {v.destination_team_name || "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs capitalize">
                  {v.source_type?.replace("_", " ")}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {fmt(v.fulfilled_at)}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {v.return_date
                    ? new Date(v.return_date).toLocaleDateString("vi-VN")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}
                  >
                    {st.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {v.status === "fulfilled" && (
                    <button
                      onClick={() => onConfirmReturn(v.id)}
                      disabled={confirmingId === v.id}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
                    >
                      {confirmingId === v.id ? "..." : "Xác nhận đã trả"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
