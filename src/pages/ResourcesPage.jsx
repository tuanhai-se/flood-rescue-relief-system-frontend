import React, { useState, useEffect, useCallback } from "react";
import { resourceAPI, regionAPI, teamAPI } from "../services/api";
import { VEHICLE_TYPES, formatDate } from "../utils/helpers";
import {
  Truck,
  Warehouse,
  Package,
  Plus,
  Edit2,
  RefreshCw,
  X,
  Save,
  Send,
  ClipboardList,
  CheckCircle,
  XCircle,
  RotateCcw,
  ArrowDownCircle,
  ArrowRightLeft,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import useAuthStore from "../store/authStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const VEHICLE_TYPE_LABELS = {
  boat: "🚤 Xuồng/Tàu",
  truck: "🚛 Xe tải",
  car: "🚗 Xe con",
  helicopter: "🚁 Trực thăng",
  ambulance: "🚑 Xe cứu thương",
  other: "🚙 Khác",
};
const CATEGORY_LABELS = {
  food: "Thực phẩm",
  water: "Nước uống",
  medical: "Y tế",
  shelter: "Chỗ ở / Lều",
  equipment: "Thiết bị",
  fuel: "Nhiên liệu",
  other: "Khác",
};
const SOURCE_TYPE_LABELS = {
  purchase: "🛒 Mua mới",
  borrow_local: "🤝 Mượn trong tỉnh",
  borrow_external: "📦 Mượn ngoài tỉnh",
};
const STATUS_BADGE = {
  // vehicle
  available: "bg-green-100 text-green-700",
  in_use: "bg-orange-100 text-orange-700",
  in_transit: "bg-blue-100 text-blue-700",
  maintenance: "bg-yellow-100 text-yellow-700",
  retired: "bg-gray-100 text-gray-500",
  // distribution
  issued: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  return_requested: "bg-orange-100 text-orange-700",
  partially_returned: "bg-purple-100 text-purple-700",
  returned: "bg-gray-100 text-gray-600",
  // dispatch / transfer
  dispatched: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  // vehicle requests
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  fulfilled: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};
const STATUS_LABEL = {
  issued: "Đã cấp",
  confirmed: "Đã nhận",
  return_requested: "Chờ trả",
  partially_returned: "Trả một phần",
  returned: "Đã trả",
  dispatched: "Đã điều",
  available: "Sẵn sàng",
  in_use: "Đang dùng",
  in_transit: "Đang vận chuyển",
  maintenance: "Bảo trì",
  retired: "Nghỉ",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  fulfilled: "Đã nhận xe",
  rejected: "Từ chối",
};

// ─── Tabs config ──────────────────────────────────────────────────────────────
const TABS = [
  {
    key: "warehouses",
    label: "Kho hàng",
    icon: Warehouse,
    roles: ["manager", "coordinator"],
  },
  {
    key: "distributions",
    label: "Cấp phát vật tư",
    icon: Send,
    roles: ["manager", "coordinator"],
  },
  {
    key: "vehicle_dispatches",
    label: "Điều xe cho đội",
    icon: Truck,
    roles: ["manager", "coordinator"],
  },
  {
    key: "supply_transfers",
    label: "Điều vật tư liên tỉnh",
    icon: ArrowRightLeft,
    roles: ["manager"],
  },
  {
    key: "vehicle_transfers",
    label: "Điều xe liên tỉnh",
    icon: ArrowRightLeft,
    roles: ["manager"],
  },
  {
    key: "vehicle_requests",
    label: "Yêu cầu điều xe",
    icon: ClipboardList,
    roles: ["manager", "coordinator"],
  },
  {
    key: "my_supplies",
    label: "Vật tư của đội",
    icon: Package,
    roles: ["rescue_team"],
  },
  {
    key: "my_vehicles",
    label: "Xe của đội",
    icon: Truck,
    roles: ["rescue_team"],
  },
];

// ─── Small helpers ────────────────────────────────────────────────────────────
function Badge({ status }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status] || "bg-gray-100 text-gray-600"}`}
    >
      {STATUS_LABEL[status] || status}
    </span>
  );
}
function Btn({ onClick, disabled, className = "", children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded text-sm font-medium disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
    />
  );
}
function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      {children}
    </select>
  );
}
function EmptyState({ text }) {
  return <div className="text-center py-12 text-gray-400">{text}</div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ResourcesPage() {
  const { user } = useAuthStore();
  const role = user?.role;

  const defaultTab =
    TABS.find((t) => t.roles.includes(role))?.key || "vehicles";
  const [tab, setTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState([]);
  const [tabVehicles, setTabVehicles] = useState([]); // vehicles shown inside Kho hàng tab
  const [modal, setModal] = useState(null); // { type, item }

  // Shared dropdown data — loaded lazily when first modal opens
  const [warehouses, setWarehouses] = useState([]);
  const [reliefItems, setReliefItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [sharedLoaded, setSharedLoaded] = useState(false);

  const visibleTabs = TABS.filter((t) => t.roles.includes(role));

  const loadSharedData = useCallback(() => {
    if (sharedLoaded) return;
    setSharedLoaded(true);
    resourceAPI
      .getWarehouses()
      .then((r) => setWarehouses(r.data || []))
      .catch(() => {});
    resourceAPI
      .getReliefItems()
      .then((r) => setReliefItems(r.data || []))
      .catch(() => {});
    resourceAPI
      .getVehicles()
      .then((r) => setVehicles(r.data || []))
      .catch(() => {});
    teamAPI
      .getAll()
      .then((r) => setTeams(r.data || []))
      .catch(() => {});
    regionAPI
      .getProvinces()
      .then((r) => setProvinces(r.data || []))
      .catch(() => {});
  }, [sharedLoaded]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let res;
      if (tab === "warehouses") {
        const [wRes, vRes] = await Promise.all([
          resourceAPI.getWarehouses(),
          resourceAPI.getVehicles(),
        ]);
        setData(wRes?.data || []);
        setTabVehicles(vRes?.data || []);
      } else if (tab === "distributions")
        res = await resourceAPI.getDistributions();
      else if (tab === "vehicle_dispatches")
        res = await resourceAPI.getVehicleDispatches();
      else if (tab === "supply_transfers")
        res = await resourceAPI.getSupplyTransfers();
      else if (tab === "vehicle_transfers")
        res = await resourceAPI.getVehicleTransfers();
      else if (tab === "vehicle_requests")
        res = await resourceAPI.getVehicleRequests();
      else if (tab === "my_supplies")
        res = await resourceAPI.getDistributions();
      else if (tab === "my_vehicles")
        res = await resourceAPI.getVehicleDispatches();
      if (res !== undefined) setData(res?.data || []);
    } catch (e) {
      setData([]);
      setLoadError(
        e?.response?.data?.error || e?.message || "Không thể tải dữ liệu.",
      );
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const closeModal = () => setModal(null);
  const openModal = (config) => {
    loadSharedData();
    setModal(config);
  };
  const refresh = () => loadData();

  // ── Action handlers ──
  const handle = async (fn, successMsg) => {
    try {
      await fn();
      alert(successMsg);
      refresh();
      closeModal();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  // ── Tab content router ──
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý tài nguyên</h1>
        <button
          onClick={refresh}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
        >
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Đang tải...</div>
      ) : loadError ? (
        <div className="text-center py-16">
          <p className="text-red-500 font-medium mb-2">Không thể tải dữ liệu</p>
          <p className="text-sm text-gray-500 mb-4">{loadError}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <>
          {tab === "warehouses" && (
            <TabWarehouses
              data={data}
              vehicles={tabVehicles}
              role={role}
              setModal={openModal}
              refresh={refresh}
            />
          )}
          {tab === "distributions" && (
            <TabDistributions
              data={data}
              role={role}
              setModal={openModal}
              refresh={refresh}
            />
          )}
          {tab === "vehicle_dispatches" && (
            <TabVehicleDispatches
              data={data}
              role={role}
              setModal={openModal}
              refresh={refresh}
            />
          )}
          {tab === "supply_transfers" && (
            <TabSupplyTransfers
              data={data}
              setModal={openModal}
              refresh={refresh}
            />
          )}
          {tab === "vehicle_transfers" && (
            <TabVehicleTransfers
              data={data}
              setModal={openModal}
              refresh={refresh}
            />
          )}
          {tab === "vehicle_requests" && (
            <TabVehicleRequests
              data={data}
              role={role}
              user={user}
              setModal={openModal}
              refresh={refresh}
            />
          )}
          {tab === "my_supplies" && (
            <TabMySupplies
              data={data}
              user={user}
              setModal={openModal}
              refresh={refresh}
            />
          )}
          {tab === "my_vehicles" && (
            <TabMyVehicles
              data={data}
              user={user}
              setModal={openModal}
              refresh={refresh}
            />
          )}
        </>
      )}

      {/* Modals */}
      {(modal?.type === "warehouse_create" ||
        modal?.type === "warehouse_edit") && (
        <ModalWarehouse
          item={modal.item}
          provinces={provinces}
          onClose={closeModal}
          refresh={refresh}
        />
      )}
      {modal?.type === "dispatch_supply" && (
        <ModalDispatchSupply
          warehouses={warehouses}
          reliefItems={reliefItems}
          teams={teams}
          onClose={closeModal}
          refresh={refresh}
        />
      )}
      {modal?.type === "dispatch_vehicle" && (
        <ModalDispatchVehicle
          vehicles={vehicles}
          teams={teams}
          role={role}
          onClose={closeModal}
          refresh={refresh}
        />
      )}
      {modal?.type === "transfer_supply" && (
        <ModalTransferSupply
          warehouses={warehouses}
          reliefItems={reliefItems}
          onClose={closeModal}
          refresh={refresh}
        />
      )}
      {modal?.type === "transfer_vehicle" && (
        <ModalTransferVehicle
          vehicles={vehicles}
          provinces={provinces}
          onClose={closeModal}
          refresh={refresh}
        />
      )}
      {modal?.type === "confirm_qty" && (
        <ModalConfirmQty
          item={modal.item}
          onClose={closeModal}
          refresh={refresh}
        />
      )}
      {modal?.type === "request_return" && (
        <ModalRequestReturn
          item={modal.item}
          onClose={closeModal}
          refresh={refresh}
        />
      )}
      {modal?.type === "vreq_create" && (
        <ModalVehicleRequest
          teams={teams}
          onClose={closeModal}
          refresh={refresh}
        />
      )}
    </div>
  );
}

// ─── Tab: Kho hàng (Phương tiện + Kho với tồn kho accordion) ────────────────
function TabWarehouses({ data, vehicles, role, setModal, refresh }) {
  const canManage = role === "manager" || role === "admin";
  const [expandedId, setExpandedId] = useState(null);
  const [invCache, setInvCache] = useState({}); // { warehouseId: { loading, items } }

  const toggleWarehouse = async (w) => {
    if (expandedId === w.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(w.id);
    if (invCache[w.id]) return; // already loaded
    setInvCache((prev) => ({ ...prev, [w.id]: { loading: true, items: [] } }));
    try {
      const res = await resourceAPI.getInventory({ warehouse_id: w.id });
      setInvCache((prev) => ({
        ...prev,
        [w.id]: { loading: false, items: res.data || [] },
      }));
    } catch {
      setInvCache((prev) => ({
        ...prev,
        [w.id]: { loading: false, items: [] },
      }));
    }
  };

  const handleDelete = async (w) => {
    if (!window.confirm(`Vô hiệu hóa kho "${w.name}"?`)) return;
    try {
      await resourceAPI.deleteWarehouse(w.id);
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  if (data.length === 0) return <EmptyState text="Không có kho hàng." />;

  return (
    <div className="space-y-3">
      {data.map((w) => {
        const isCentral = w.warehouse_type === "central";
        const isOpen = expandedId === w.id;
        const inv = invCache[w.id];
        // Ưu tiên lọc theo warehouse_id (sau migration), fallback về province_id + chỉ kho tổng
        const warehouseVehicles = (vehicles || []).filter((v) =>
          v.warehouse_id
            ? v.warehouse_id === w.id
            : isCentral && v.province_id === w.province_id,
        );
        return (
          <div
            key={w.id}
            className="border rounded-xl bg-white shadow-sm overflow-hidden"
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleWarehouse(w)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Warehouse className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 truncate">
                      {w.name}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${isCentral ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {isCentral ? "Kho tổng" : "Vệ tinh"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    📍 {w.province_name} · {w.address}
                  </p>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                    {w.manager_name && <span>👤 {w.manager_name}</span>}
                    {w.coordinator_name && <span>🧑‍💼 {w.coordinator_name}</span>}
                    <span>📦 {w.capacity_tons} tấn</span>
                    {warehouseVehicles.length > 0 && (
                      <span className="text-blue-500">
                        🚤 {warehouseVehicles.length} xe
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                {canManage && isCentral && (
                  <div
                    className="flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Btn
                      onClick={() =>
                        setModal({ type: "warehouse_edit", item: w })
                      }
                      className="bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs flex items-center gap-1 py-1"
                    >
                      <Edit2 className="w-3 h-3" /> Sửa
                    </Btn>
                    <Btn
                      onClick={() => handleDelete(w)}
                      className="bg-red-50 text-red-600 hover:bg-red-100 text-xs flex items-center gap-1 py-1"
                    >
                      <XCircle className="w-3 h-3" /> Xóa
                    </Btn>
                  </div>
                )}
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>

            {/* ── Expanded: Vật tư + Phương tiện ── */}
            {isOpen && (
              <div className="border-t bg-gray-50 divide-y divide-gray-200">
                {/* Vật tư tồn kho */}
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-100">
                    📦 Vật tư tồn kho
                  </p>
                  {inv?.loading ? (
                    <p className="text-center py-4 text-sm text-gray-400">
                      Đang tải...
                    </p>
                  ) : !inv?.items?.length ? (
                    <p className="px-4 py-3 text-sm text-gray-400">
                      Chưa có vật tư nào.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b bg-gray-50">
                            {[
                              "Vật phẩm",
                              "Danh mục",
                              "Đơn vị",
                              "Số lượng",
                              "Cập nhật",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-2 text-left font-medium"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {inv.items.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-white transition-colors"
                            >
                              <td className="px-4 py-2 font-medium text-gray-800">
                                {item.item_name}
                              </td>
                              <td className="px-4 py-2 text-gray-500">
                                {CATEGORY_LABELS[item.category] ||
                                  item.category}
                              </td>
                              <td className="px-4 py-2 text-gray-500">
                                {item.unit}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`font-semibold ${item.quantity <= (item.min_threshold || 0) ? "text-red-600" : "text-blue-700"}`}
                                >
                                  {item.quantity}
                                </span>
                                {item.quantity <= (item.min_threshold || 0) && (
                                  <span className="ml-1 text-xs text-red-500">
                                    (dưới ngưỡng)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-gray-400 text-xs">
                                {formatDate(item.updated_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Phương tiện trong tỉnh */}
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-100">
                    🚤 Phương tiện ({w.province_name})
                  </p>
                  {warehouseVehicles.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">
                      Không có phương tiện.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b bg-gray-50">
                            {[
                              "Tên xe",
                              "Biển số",
                              "Loại",
                              "Sức chứa",
                              "Đội",
                              "Trạng thái",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-2 text-left font-medium"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {warehouseVehicles.map((v) => (
                            <tr
                              key={v.id}
                              className="hover:bg-white transition-colors"
                            >
                              <td className="px-4 py-2 font-medium text-gray-800">
                                {v.name}
                              </td>
                              <td className="px-4 py-2 text-gray-400">
                                {v.plate_number}
                              </td>
                              <td className="px-4 py-2">
                                {VEHICLE_TYPE_LABELS[v.type] || v.type}
                              </td>
                              <td className="px-4 py-2 text-gray-600">
                                {v.capacity}
                              </td>
                              <td className="px-4 py-2 text-gray-500">
                                {v.team_name || "—"}
                              </td>
                              <td className="px-4 py-2">
                                <Badge status={v.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Cấp phát vật tư ────────────────────────────────────────────────────
function TabDistributions({ data, role, setModal, refresh }) {
  return (
    <div>
      {["manager", "coordinator"].includes(role) && (
        <div className="mb-4">
          <Btn
            onClick={() => setModal({ type: "dispatch_supply" })}
            className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Cấp phát vật tư
          </Btn>
        </div>
      )}
      <div className="space-y-3">
        {data.length === 0 ? (
          <EmptyState text="Chưa có phiếu cấp phát." />
        ) : (
          data.map((d) => (
            <DistributionCard
              key={d.id}
              d={d}
              role={role}
              setModal={setModal}
              refresh={refresh}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DistributionCard({ d, role, setModal, refresh }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <Badge status={d.status} />
          <div>
            <p className="font-medium text-sm">
              {d.item_name} × {d.quantity} {d.item_unit}
            </p>
            <p className="text-xs text-gray-500">
              {d.team_name} ← {d.warehouse_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {formatDate(d.created_at)}
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
      {open && (
        <div className="border-t px-4 py-3 bg-gray-50 text-sm space-y-1">
          <p className="text-gray-500">Cấp bởi: {d.distributed_by_name}</p>
          {d.confirmed_at && (
            <p className="text-gray-500">
              Đã nhận: {formatDate(d.confirmed_at)}
            </p>
          )}
          {d.return_quantity && (
            <p className="text-gray-500">
              Số lượng trả: {d.return_quantity} {d.item_unit}
            </p>
          )}
          {d.received_return_qty && (
            <p className="text-gray-500">
              Nhận lại thực tế: {d.received_return_qty} {d.item_unit}
            </p>
          )}
          {d.notes && <p className="text-gray-500">Ghi chú: {d.notes}</p>}
          {/* Coordinator xác nhận nhận lại hàng */}
          {["manager", "coordinator"].includes(role) &&
            d.status === "return_requested" && (
              <div className="pt-2">
                <Btn
                  onClick={() =>
                    setModal({
                      type: "confirm_qty",
                      item: { ...d, mode: "confirm_return" },
                    })
                  }
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" /> Xác nhận nhận
                  lại hàng
                </Btn>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Điều xe cho đội ────────────────────────────────────────────────────
function TabVehicleDispatches({ data, role, setModal, refresh }) {
  return (
    <div>
      {["manager", "coordinator"].includes(role) && (
        <div className="mb-4">
          <Btn
            onClick={() => setModal({ type: "dispatch_vehicle" })}
            className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Điều xe cho đội
          </Btn>
        </div>
      )}
      <div className="space-y-3">
        {data.length === 0 ? (
          <EmptyState text="Chưa có phiếu điều xe." />
        ) : (
          data.map((d) => (
            <VehicleDispatchCard
              key={d.id}
              d={d}
              role={role}
              setModal={setModal}
              refresh={refresh}
            />
          ))
        )}
      </div>
    </div>
  );
}

function VehicleDispatchCard({ d, role, setModal, refresh }) {
  const [open, setOpen] = useState(false);
  const handleConfirmReturn = async () => {
    if (!window.confirm("Xác nhận đã nhận lại xe?")) return;
    try {
      await resourceAPI.confirmReturnVehicleDispatch(d.id);
      alert("Đã xác nhận nhận lại xe.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };
  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <Badge status={d.status} />
          <div>
            <p className="font-medium text-sm">
              {d.vehicle_name} ({d.plate_number})
            </p>
            <p className="text-xs text-gray-500">
              {VEHICLE_TYPE_LABELS[d.vehicle_type]} → {d.team_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {formatDate(d.dispatched_at)}
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
      {open && (
        <div className="border-t px-4 py-3 bg-gray-50 text-sm space-y-1">
          <p className="text-gray-500">Điều bởi: {d.dispatched_by_name}</p>
          {d.confirmed_at && (
            <p className="text-gray-500">
              Team nhận: {formatDate(d.confirmed_at)}
            </p>
          )}
          {d.returned_at && (
            <p className="text-gray-500">
              Team trả: {formatDate(d.returned_at)}
            </p>
          )}
          {d.mission_note && (
            <p className="text-gray-500">Ghi chú: {d.mission_note}</p>
          )}
          {["manager", "coordinator"].includes(role) &&
            d.status === "returned" && (
              <div className="pt-2">
                <Btn
                  onClick={handleConfirmReturn}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" /> Xác nhận nhận
                  lại xe
                </Btn>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Điều vật tư liên tỉnh ──────────────────────────────────────────────
function TabSupplyTransfers({ data, setModal, refresh }) {
  const handleConfirm = (item) =>
    setModal({
      type: "confirm_qty",
      item: { ...item, mode: "supply_transfer" },
    });
  const handleCancel = async (id) => {
    if (!window.confirm("Huỷ lệnh điều vật tư? Kho nguồn sẽ được hoàn lại."))
      return;
    try {
      await resourceAPI.cancelSupplyTransfer(id);
      alert("Đã huỷ.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi.");
    }
  };
  return (
    <div>
      <div className="mb-4">
        <Btn
          onClick={() => setModal({ type: "transfer_supply" })}
          className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Tạo lệnh điều vật tư
        </Btn>
      </div>
      <div className="space-y-3">
        {data.length === 0 ? (
          <EmptyState text="Chưa có lệnh điều vật tư." />
        ) : (
          data.map((d) => (
            <div
              key={d.id}
              className="border rounded-xl bg-white shadow-sm p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status={d.status} />
                    <span className="font-medium text-sm">
                      {d.item_name} × {d.quantity} {d.item_unit}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {d.from_province_name} ({d.from_warehouse_name}) →{" "}
                    {d.to_province_name} ({d.to_warehouse_name})
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tạo bởi: {d.transferred_by_name} ·{" "}
                    {formatDate(d.created_at)}
                  </p>
                  {d.confirmed_quantity && (
                    <p className="text-xs text-green-600">
                      Nhận thực tế: {d.confirmed_quantity} {d.item_unit} bởi{" "}
                      {d.confirmed_by_name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {d.status === "in_transit" && (
                    <>
                      <Btn
                        onClick={() => handleConfirm(d)}
                        className="bg-green-600 text-white hover:bg-green-700 text-xs"
                      >
                        Xác nhận nhận
                      </Btn>
                      <Btn
                        onClick={() => handleCancel(d.id)}
                        className="bg-red-100 text-red-600 hover:bg-red-200 text-xs"
                      >
                        Huỷ
                      </Btn>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tab: Điều xe liên tỉnh ───────────────────────────────────────────────────
function TabVehicleTransfers({ data, setModal, refresh }) {
  const handleCancel = async (id) => {
    if (!window.confirm("Huỷ lệnh điều xe?")) return;
    try {
      await resourceAPI.cancelVehicleTransfer(id);
      alert("Đã huỷ.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi.");
    }
  };
  const handleConfirm = async (id) => {
    if (!window.confirm("Xác nhận đã nhận xe?")) return;
    try {
      await resourceAPI.confirmVehicleTransfer(id);
      alert("Đã xác nhận. Xe sẵn sàng tại tỉnh mới.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi.");
    }
  };
  return (
    <div>
      <div className="mb-4">
        <Btn
          onClick={() => setModal({ type: "transfer_vehicle" })}
          className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Tạo lệnh điều xe
        </Btn>
      </div>
      <div className="space-y-3">
        {data.length === 0 ? (
          <EmptyState text="Chưa có lệnh điều xe." />
        ) : (
          data.map((d) => (
            <div
              key={d.id}
              className="border rounded-xl bg-white shadow-sm p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status={d.status} />
                    <span className="font-medium text-sm">
                      {d.vehicle_name} ({d.plate_number})
                    </span>
                    <span className="text-xs text-gray-500">
                      {VEHICLE_TYPE_LABELS[d.vehicle_type]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {d.from_province_name} → {d.to_province_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tạo bởi: {d.transferred_by_name} ·{" "}
                    {formatDate(d.created_at)}
                  </p>
                  {d.confirmed_by_name && (
                    <p className="text-xs text-green-600">
                      Xác nhận bởi: {d.confirmed_by_name} ·{" "}
                      {formatDate(d.confirmed_at)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {d.status === "in_transit" && (
                    <>
                      <Btn
                        onClick={() => handleConfirm(d.id)}
                        className="bg-green-600 text-white hover:bg-green-700 text-xs"
                      >
                        Xác nhận nhận
                      </Btn>
                      <Btn
                        onClick={() => handleCancel(d.id)}
                        className="bg-red-100 text-red-600 hover:bg-red-200 text-xs"
                      >
                        Huỷ
                      </Btn>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tab: Yêu cầu điều xe ────────────────────────────────────────────────────
function TabVehicleRequests({ data, role, user, setModal, refresh }) {
  const updateStatus = async (id, status) => {
    try {
      await resourceAPI.updateVehicleRequestStatus(id, { status });
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi.");
    }
  };
  const confirmAction = async (id, action) => {
    try {
      await resourceAPI.confirmVehicleRequest(id, action);
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi.");
    }
  };
  return (
    <div>
      {["manager", "coordinator"].includes(role) && (
        <div className="mb-4">
          <Btn
            onClick={() => setModal({ type: "vreq_create" })}
            className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Tạo yêu cầu điều xe
          </Btn>
        </div>
      )}
      <div className="space-y-3">
        {data.length === 0 ? (
          <EmptyState text="Chưa có yêu cầu điều xe." />
        ) : (
          data.map((vr) => (
            <div
              key={vr.id}
              className="border rounded-xl bg-white shadow-sm p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status={vr.status} />
                    <span className="font-medium text-sm">
                      {VEHICLE_TYPE_LABELS[vr.vehicle_type]} × {vr.quantity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Đội nhận: {vr.destination_team_name} ·{" "}
                    {SOURCE_TYPE_LABELS[vr.source_type]}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Yêu cầu bởi: {vr.requested_by_name} ·{" "}
                    {formatDate(vr.created_at)}
                  </p>
                  {vr.notes && (
                    <p className="text-xs text-gray-500 mt-1">
                      Ghi chú: {vr.notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {vr.status === "pending" && role === "manager" && (
                    <>
                      <Btn
                        onClick={() => updateStatus(vr.id, "approved")}
                        className="bg-green-600 text-white hover:bg-green-700 text-xs"
                      >
                        Duyệt
                      </Btn>
                      <Btn
                        onClick={() => updateStatus(vr.id, "rejected")}
                        className="bg-red-100 text-red-600 hover:bg-red-200 text-xs"
                      >
                        Từ chối
                      </Btn>
                    </>
                  )}
                  {vr.status === "approved" && user?.is_team_leader && (
                    <Btn
                      onClick={() => confirmAction(vr.id, "received")}
                      className="bg-blue-600 text-white hover:bg-blue-700 text-xs"
                    >
                      Xác nhận nhận xe
                    </Btn>
                  )}
                  {vr.status === "fulfilled" &&
                    vr.source_type !== "purchase" &&
                    user?.is_team_leader && (
                      <Btn
                        onClick={() => confirmAction(vr.id, "returned")}
                        className="bg-gray-200 text-gray-700 hover:bg-gray-300 text-xs"
                      >
                        Xác nhận trả xe
                      </Btn>
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tab: Vật tư của đội (rescue_team) ───────────────────────────────────────
function TabMySupplies({ data, user, setModal, refresh }) {
  const isLeader = user?.is_team_leader;
  const handleConfirm = async (id) => {
    if (!window.confirm("Xác nhận đã nhận hàng?")) return;
    try {
      await resourceAPI.confirmDistribution(id);
      alert("Đã xác nhận.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi.");
    }
  };
  return (
    <div className="space-y-3">
      {data.length === 0 ? (
        <EmptyState text="Đội chưa được cấp vật tư." />
      ) : (
        data.map((d) => (
          <div key={d.id} className="border rounded-xl bg-white shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge status={d.status} />
                  <span className="font-medium">
                    {d.item_name} × {d.quantity} {d.item_unit}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Từ kho: {d.warehouse_name} · {formatDate(d.created_at)}
                </p>
                {d.return_quantity && (
                  <p className="text-xs text-orange-500 mt-1">
                    Đã gửi phiếu trả: {d.return_quantity} {d.item_unit}
                  </p>
                )}
              </div>
              {isLeader && (
                <div className="flex flex-col gap-1.5">
                  {d.status === "issued" && (
                    <Btn
                      onClick={() => handleConfirm(d.id)}
                      className="bg-green-600 text-white hover:bg-green-700 text-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> Xác
                      nhận nhận
                    </Btn>
                  )}
                  {d.status === "confirmed" && (
                    <Btn
                      onClick={() =>
                        setModal({ type: "request_return", item: d })
                      }
                      className="bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Trả hàng
                      dư
                    </Btn>
                  )}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Tab: Xe của đội (rescue_team) ───────────────────────────────────────────
function TabMyVehicles({ data, user, refresh }) {
  const isLeader = user?.is_team_leader;
  const handleConfirm = async (id) => {
    if (!window.confirm("Xác nhận đã nhận xe?")) return;
    try {
      await resourceAPI.confirmVehicleDispatch(id);
      alert("Đã xác nhận.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi.");
    }
  };
  const handleReturn = async (id) => {
    if (!window.confirm("Gửi yêu cầu trả xe?")) return;
    try {
      await resourceAPI.returnVehicleDispatch(id);
      alert("Đã gửi yêu cầu trả xe.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi.");
    }
  };
  return (
    <div className="space-y-3">
      {data.length === 0 ? (
        <EmptyState text="Đội chưa được điều xe." />
      ) : (
        data.map((d) => (
          <div key={d.id} className="border rounded-xl bg-white shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge status={d.status} />
                  <span className="font-medium">
                    {d.vehicle_name} ({d.plate_number})
                  </span>
                  <span className="text-xs text-gray-500">
                    {VEHICLE_TYPE_LABELS[d.vehicle_type]}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Điều bởi: {d.dispatched_by_name} ·{" "}
                  {formatDate(d.dispatched_at)}
                </p>
                {d.mission_note && (
                  <p className="text-xs text-gray-400 mt-1">{d.mission_note}</p>
                )}
              </div>
              {isLeader && (
                <div className="flex flex-col gap-1.5">
                  {d.status === "dispatched" && (
                    <Btn
                      onClick={() => handleConfirm(d.id)}
                      className="bg-green-600 text-white hover:bg-green-700 text-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> Xác
                      nhận nhận xe
                    </Btn>
                  )}
                  {d.status === "confirmed" && (
                    <Btn
                      onClick={() => handleReturn(d.id)}
                      className="bg-gray-200 text-gray-700 hover:bg-gray-300 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Trả xe
                    </Btn>
                  )}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ModalDispatchSupply({
  warehouses,
  reliefItems,
  teams,
  onClose,
  refresh,
}) {
  const [form, setForm] = useState({
    team_id: "",
    warehouse_id: "",
    item_id: "",
    quantity: "",
    notes: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    if (!form.team_id || !form.warehouse_id || !form.item_id || !form.quantity)
      return alert("Vui lòng điền đủ thông tin.");
    try {
      await resourceAPI.createDistribution(form);
      alert("Cấp phát thành công. Tồn kho đã trừ.");
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };
  return (
    <Modal title="Cấp phát vật tư" onClose={onClose}>
      <Field label="Đội nhận *">
        <Select
          value={form.team_id}
          onChange={(e) => set("team_id", e.target.value)}
        >
          <option value="">— Chọn đội —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Kho xuất *">
        <Select
          value={form.warehouse_id}
          onChange={(e) => set("warehouse_id", e.target.value)}
        >
          <option value="">— Chọn kho —</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Vật phẩm *">
        <Select
          value={form.item_id}
          onChange={(e) => set("item_id", e.target.value)}
        >
          <option value="">— Chọn vật phẩm —</option>
          {reliefItems.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.unit})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Số lượng *">
        <Input
          type="number"
          min="0.1"
          step="0.1"
          value={form.quantity}
          onChange={(e) => set("quantity", e.target.value)}
        />
      </Field>
      <Field label="Ghi chú">
        <Input
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Không bắt buộc"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn
          onClick={onClose}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Huỷ
        </Btn>
        <Btn
          onClick={submit}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          Cấp phát
        </Btn>
      </div>
    </Modal>
  );
}

function ModalDispatchVehicle({ vehicles, teams, onClose, refresh }) {
  const [form, setForm] = useState({
    vehicle_id: "",
    team_id: "",
    mission_note: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const availableVehicles = vehicles.filter((v) => v.status === "available");
  const submit = async () => {
    if (!form.vehicle_id || !form.team_id)
      return alert("Vui lòng chọn xe và đội.");
    try {
      await resourceAPI.createVehicleDispatch(form);
      alert("Đã điều xe cho đội.");
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };
  return (
    <Modal title="Điều xe cho đội" onClose={onClose}>
      <Field label="Xe *">
        <Select
          value={form.vehicle_id}
          onChange={(e) => set("vehicle_id", e.target.value)}
        >
          <option value="">— Chọn xe —</option>
          {availableVehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.plate_number}) - {VEHICLE_TYPE_LABELS[v.type]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Đội nhận *">
        <Select
          value={form.team_id}
          onChange={(e) => set("team_id", e.target.value)}
        >
          <option value="">— Chọn đội —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ghi chú nhiệm vụ">
        <Input
          value={form.mission_note}
          onChange={(e) => set("mission_note", e.target.value)}
          placeholder="Không bắt buộc"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn
          onClick={onClose}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Huỷ
        </Btn>
        <Btn
          onClick={submit}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          Điều xe
        </Btn>
      </div>
    </Modal>
  );
}

function ModalTransferSupply({ warehouses, reliefItems, onClose, refresh }) {
  const [form, setForm] = useState({
    from_warehouse_id: "",
    to_warehouse_id: "",
    item_id: "",
    quantity: "",
    notes: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    if (
      !form.from_warehouse_id ||
      !form.to_warehouse_id ||
      !form.item_id ||
      !form.quantity
    )
      return alert("Vui lòng điền đủ thông tin.");
    try {
      await resourceAPI.createSupplyTransfer(form);
      alert("Đã tạo lệnh điều vật tư. Kho nguồn đã trừ.");
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };
  return (
    <Modal title="Điều vật tư liên tỉnh" onClose={onClose}>
      <Field label="Kho nguồn *">
        <Select
          value={form.from_warehouse_id}
          onChange={(e) => set("from_warehouse_id", e.target.value)}
        >
          <option value="">— Chọn kho nguồn —</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.province_name})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Kho đích *">
        <Select
          value={form.to_warehouse_id}
          onChange={(e) => set("to_warehouse_id", e.target.value)}
        >
          <option value="">— Chọn kho đích —</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.province_name})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Vật phẩm *">
        <Select
          value={form.item_id}
          onChange={(e) => set("item_id", e.target.value)}
        >
          <option value="">— Chọn vật phẩm —</option>
          {reliefItems.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.unit})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Số lượng *">
        <Input
          type="number"
          min="0.1"
          step="0.1"
          value={form.quantity}
          onChange={(e) => set("quantity", e.target.value)}
        />
      </Field>
      <Field label="Ghi chú">
        <Input
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Không bắt buộc"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn
          onClick={onClose}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Huỷ
        </Btn>
        <Btn
          onClick={submit}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          Tạo lệnh điều
        </Btn>
      </div>
    </Modal>
  );
}

function ModalTransferVehicle({ vehicles, provinces, onClose, refresh }) {
  const [form, setForm] = useState({
    vehicle_id: "",
    to_province_id: "",
    notes: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const availableVehicles = vehicles.filter((v) => v.status === "available");
  const submit = async () => {
    if (!form.vehicle_id || !form.to_province_id)
      return alert("Vui lòng chọn xe và tỉnh đích.");
    try {
      await resourceAPI.createVehicleTransfer(form);
      alert("Đã tạo lệnh điều xe. Xe đang vận chuyển.");
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };
  return (
    <Modal title="Điều xe liên tỉnh" onClose={onClose}>
      <Field label="Xe *">
        <Select
          value={form.vehicle_id}
          onChange={(e) => set("vehicle_id", e.target.value)}
        >
          <option value="">— Chọn xe —</option>
          {availableVehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.plate_number}) - {v.province_name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Tỉnh đích *">
        <Select
          value={form.to_province_id}
          onChange={(e) => set("to_province_id", e.target.value)}
        >
          <option value="">— Chọn tỉnh đích —</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ghi chú">
        <Input
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Không bắt buộc"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn
          onClick={onClose}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Huỷ
        </Btn>
        <Btn
          onClick={submit}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          Tạo lệnh điều
        </Btn>
      </div>
    </Modal>
  );
}

// Modal nhập số lượng thực (dùng cho confirm_return và supply_transfer)
function ModalConfirmQty({ item, onClose, refresh }) {
  const [qty, setQty] = useState("");
  const isSupplyTransfer = item.mode === "supply_transfer";
  const maxQty = isSupplyTransfer ? item.quantity : item.return_quantity;
  const submit = async () => {
    const val = parseFloat(qty);
    if (!val || val <= 0) return alert("Số lượng phải lớn hơn 0.");
    if (val > maxQty) return alert(`Không được vượt quá ${maxQty}.`);
    try {
      if (isSupplyTransfer) {
        await resourceAPI.confirmSupplyTransfer(item.id, {
          confirmed_quantity: val,
        });
        alert(`Đã xác nhận nhận ${val} đơn vị. Kho đích đã cộng.`);
      } else {
        await resourceAPI.confirmReturnDistribution(item.id, {
          received_quantity: val,
        });
        alert(`Đã xác nhận nhận lại ${val} đơn vị. Tồn kho đã cộng.`);
      }
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };
  return (
    <Modal
      title={
        isSupplyTransfer ? "Xác nhận nhận vật tư" : "Xác nhận nhận lại hàng dư"
      }
      onClose={onClose}
    >
      <p className="text-sm text-gray-600">
        {isSupplyTransfer
          ? `Số lượng điều: ${item.quantity} ${item.item_unit || ""}`
          : `Số lượng team khai trả: ${item.return_quantity} ${item.item_unit || ""}`}
      </p>
      <Field label="Số lượng thực nhận *">
        <Input
          type="number"
          min="0.1"
          step="0.1"
          max={maxQty}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
      </Field>
      <p className="text-xs text-gray-400">
        Phần chênh lệch sẽ được hoàn lại kho nguồn.
      </p>
      <div className="flex justify-end gap-2 pt-2">
        <Btn
          onClick={onClose}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Huỷ
        </Btn>
        <Btn
          onClick={submit}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          Xác nhận
        </Btn>
      </div>
    </Modal>
  );
}

function ModalRequestReturn({ item, onClose, refresh }) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const submit = async () => {
    const val = parseFloat(qty);
    if (!val || val <= 0) return alert("Số lượng phải lớn hơn 0.");
    if (val > item.quantity)
      return alert(`Không được vượt quá số đã nhận (${item.quantity}).`);
    try {
      await resourceAPI.requestReturnDistribution(item.id, {
        return_quantity: val,
        return_note: note,
      });
      alert("Đã gửi phiếu trả hàng. Chờ coordinator xác nhận.");
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };
  return (
    <Modal title="Trả hàng dư" onClose={onClose}>
      <p className="text-sm text-gray-600">
        Đã nhận: {item.quantity} {item.item_unit}
      </p>
      <Field label="Số lượng muốn trả *">
        <Input
          type="number"
          min="0.1"
          step="0.1"
          max={item.quantity}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
      </Field>
      <Field label="Ghi chú">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Tình trạng hàng, lý do trả..."
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn
          onClick={onClose}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Huỷ
        </Btn>
        <Btn
          onClick={submit}
          className="bg-orange-500 text-white hover:bg-orange-600"
        >
          Gửi phiếu trả
        </Btn>
      </div>
    </Modal>
  );
}

function ModalVehicleRequest({ teams, onClose, refresh }) {
  const [form, setForm] = useState({
    vehicle_type: "boat",
    quantity: 1,
    destination_team_id: "",
    source_type: "borrow_local",
    expected_date: "",
    notes: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    if (!form.destination_team_id) return alert("Vui lòng chọn đội nhận.");
    try {
      await resourceAPI.createVehicleRequest(form);
      alert("Đã tạo yêu cầu điều xe.");
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };
  return (
    <Modal title="Tạo yêu cầu điều xe" onClose={onClose}>
      <Field label="Loại xe *">
        <Select
          value={form.vehicle_type}
          onChange={(e) => set("vehicle_type", e.target.value)}
        >
          {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Số lượng *">
        <Input
          type="number"
          min="1"
          value={form.quantity}
          onChange={(e) => set("quantity", e.target.value)}
        />
      </Field>
      <Field label="Đội nhận *">
        <Select
          value={form.destination_team_id}
          onChange={(e) => set("destination_team_id", e.target.value)}
        >
          <option value="">— Chọn đội —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Nguồn xe *">
        <Select
          value={form.source_type}
          onChange={(e) => set("source_type", e.target.value)}
        >
          {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ngày cần">
        <Input
          type="date"
          value={form.expected_date}
          onChange={(e) => set("expected_date", e.target.value)}
        />
      </Field>
      <Field label="Ghi chú">
        <Input
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Không bắt buộc"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn
          onClick={onClose}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Huỷ
        </Btn>
        <Btn
          onClick={submit}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          Tạo yêu cầu
        </Btn>
      </div>
    </Modal>
  );
}

// ─── Modal: Tạo/Sửa kho tổng ─────────────────────────────────────────────────
function ModalWarehouse({ item, provinces, onClose, refresh }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: item?.name || "",
    address: item?.address || "",
    province_id: item?.province_id || "",
    capacity_tons: item?.capacity_tons || "",
    phone: item?.phone || "",
    manager_id: item?.manager_id || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    if (!form.name || !form.province_id)
      return alert("Vui lòng điền tên kho và tỉnh/thành.");
    try {
      if (isEdit) {
        await resourceAPI.updateWarehouse(item.id, {
          ...form,
          warehouse_type: "central",
        });
      } else {
        await resourceAPI.createWarehouse({
          ...form,
          warehouse_type: "central",
        });
      }
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };
  return (
    <Modal
      title={isEdit ? "Sửa kho tổng" : "Tạo kho tổng mới"}
      onClose={onClose}
    >
      <Field label="Tên kho *">
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="VD: Kho tổng Hà Nội"
        />
      </Field>
      <Field label="Địa chỉ">
        <Input
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </Field>
      <Field label="Tỉnh/thành *">
        <Select
          value={form.province_id}
          onChange={(e) => set("province_id", e.target.value)}
        >
          <option value="">-- Chọn tỉnh/thành --</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Sức chứa (tấn)">
        <Input
          type="number"
          value={form.capacity_tons}
          onChange={(e) => set("capacity_tons", e.target.value)}
        />
      </Field>
      <Field label="Số điện thoại">
        <Input
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn
          onClick={onClose}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Hủy
        </Btn>
        <Btn
          onClick={submit}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          {isEdit ? "Lưu" : "Tạo kho"}
        </Btn>
      </div>
    </Modal>
  );
}
