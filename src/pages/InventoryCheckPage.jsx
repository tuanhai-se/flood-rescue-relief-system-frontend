import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Package, Truck, CheckCircle, Clock, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { resourceAPI } from '../services/api';
import useAuthStore from '../store/authStore';

const SUPPLY_STATUS_LABELS = {
  issued:             { label: 'Đã xuất',          color: 'bg-blue-100 text-blue-700' },
  confirmed:          { label: 'Đội đã nhận',       color: 'bg-indigo-100 text-indigo-700' },
  return_requested:   { label: 'Đang yêu cầu trả', color: 'bg-yellow-100 text-yellow-700' },
  partially_returned: { label: 'Trả 1 phần',        color: 'bg-orange-100 text-orange-700' },
  returned:           { label: 'Đã trả hết',         color: 'bg-green-100 text-green-700' },
};

const VEHICLE_TYPE_LABELS = {
  boat: 'Thuyền',
  truck: 'Xe tải',
  car: 'Xe ô tô',
  helicopter: 'Trực thăng',
  ambulance: 'Xe cấp cứu',
  other: 'Khác',
};

const VEHICLE_STATUS_LABELS = {
  pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-700' },
  fulfilled: { label: 'Đã nhận xe', color: 'bg-indigo-100 text-indigo-700' },
  returned: { label: 'Đã trả xe', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-500' },
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function InventoryCheckPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('supplies');
  const [distributions, setDistributions] = useState([]);
  const [vehicleRequests, setVehicleRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [error, setError] = useState('');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [returnModal, setReturnModal] = useState({ open: false, id: null, max: null, requested: null, qty: '' });
  const [incidentModal, setIncidentModal] = useState({ open: false, id: null, reported_type: null, reported_note: null, confirmed_type: 'damaged', confirmed_note: '' });

  const fetchDistributions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await resourceAPI.getDistributions({});
      setDistributions(res.data || []);
    } catch {
      setError('Không thể tải dữ liệu vật tư.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVehicleRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await resourceAPI.getVehicleDispatches({});
      setVehicleRequests(res.data || []);
    } catch {
      setError('Không thể tải dữ liệu phương tiện.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'supplies') fetchDistributions();
    else fetchVehicleRequests();
  }, [tab, fetchDistributions, fetchVehicleRequests]);

  function handleConfirmReturn(id) {
    const dist = distributions.find(d => d.id === id);
    setReturnModal({
      open: true,
      id,
      max: dist?.return_quantity ?? dist?.quantity ?? null,
      requested: dist?.return_quantity ?? null,
      qty: String(dist?.return_quantity ?? ''),
    });
  }

  async function handleSubmitReturn() {
    const qty = parseInt(returnModal.qty, 10);
    if (!qty || qty <= 0) { alert('Vui lòng nhập số lượng thực nhận hợp lệ.'); return; }
    const { id } = returnModal;
    setReturnModal(m => ({ ...m, open: false }));
    setConfirmingId(id);
    try {
      await resourceAPI.confirmReturnDistribution(id, { received_quantity: qty });
      setDistributions(prev =>
        prev.map(d => d.id === id ? { ...d, status: 'returned', return_confirmed_at: new Date().toISOString() } : d)
      );
    } catch (e) {
      alert(e?.response?.data?.error || 'Xác nhận thất bại.');
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleWarehouseConfirm(id) {
    setConfirmingId(id);
    try {
      await resourceAPI.warehouseConfirmDistribution(id);
      setDistributions(prev =>
        prev.map(d => d.id === id ? { ...d, warehouse_confirmed: 1, warehouse_confirmed_at: new Date().toISOString() } : d)
      );
    } catch (e) {
      alert(e?.response?.data?.error || 'Xác nhận thất bại.');
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleWarehouseConfirmVehicle(id) {
    setConfirmingId(id);
    try {
      await resourceAPI.warehouseConfirmVehicleDispatch(id);
      setVehicleRequests(prev =>
        prev.map(v => v.id === id ? { ...v, warehouse_confirmed: 1, warehouse_confirmed_at: new Date().toISOString() } : v)
      );
    } catch (e) {
      alert(e?.response?.data?.error || 'Xác nhận thất bại.');
    } finally {
      setConfirmingId(null);
    }
  }

  function handleOpenIncidentModal(v) {
    setIncidentModal({
      open: true,
      id: v.id,
      reported_type: v.incident_type,
      reported_note: v.incident_note,
      confirmed_type: v.incident_type || 'damaged',
      confirmed_note: '',
    });
  }

  async function handleSubmitIncident() {
    const { id, confirmed_type, confirmed_note } = incidentModal;
    setIncidentModal(m => ({ ...m, open: false }));
    setConfirmingId(id);
    try {
      await resourceAPI.confirmVehicleIncident(id, { confirmed_type, confirmed_note });
      setVehicleRequests(prev =>
        prev.map(v => v.id === id ? { ...v, status: 'cancelled', incident_confirmed: 1 } : v)
      );
    } catch (e) {
      alert(e?.response?.data?.error || 'Xác nhận thất bại.');
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleConfirmVehicleReturn(id) {
    setConfirmingId(id);
    try {
      await resourceAPI.confirmReturnVehicleDispatch(id);
      setVehicleRequests(prev =>
        prev.map(v => v.id === id ? { ...v, status: 'returned', return_confirmed_at: new Date().toISOString() } : v)
      );
    } catch (e) {
      alert(e?.response?.data?.error || 'Xác nhận thất bại.');
    } finally {
      setConfirmingId(null);
    }
  }

  const pendingSupplies = distributions.filter(d => d.status !== 'returned').length;
  const pendingVehicles = vehicleRequests.filter(v =>
    v.status === 'incident_pending' ||
    (!v.warehouse_confirmed && !['cancelled'].includes(v.status)) ||
    v.status === 'returned'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="text-blue-600" size={28} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Kiểm hàng hóa</h1>
            <p className="text-sm text-gray-500">Theo dõi vật tư và phương tiện đã xuất — xác nhận đã trả</p>
          </div>
        </div>
        <button
          onClick={() => tab === 'supplies' ? fetchDistributions() : fetchVehicleRequests()}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw size={15} /> Làm mới
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          <button
            onClick={() => setTab('supplies')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition
              ${tab === 'supplies'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
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
            onClick={() => setTab('vehicles')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition
              ${tab === 'vehicles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {tab === 'supplies' && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Tra cứu mã phiếu (VT-...)..."
            value={voucherSearch}
            onChange={e => setVoucherSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono w-56 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          {voucherSearch && (
            <button onClick={() => setVoucherSearch('')} className="text-xs text-gray-400 hover:text-gray-600">Xóa</button>
          )}
        </div>
      )}

      {/* Modal xác nhận nhận lại vật tư */}
      {returnModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Xác nhận nhận lại vật tư</h3>

            {returnModal.requested != null && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5 text-sm">
                <span className="text-gray-500">Đội khai trả: </span>
                <span className="font-bold text-yellow-800">{returnModal.requested}</span>
                <span className="text-gray-500 ml-1">đơn vị</span>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Số lượng thực tế kho đếm được
                {returnModal.max != null && (
                  <span className="text-gray-400 ml-1">(tối đa {returnModal.max})</span>
                )}:
              </label>
              <input
                type="number"
                min="1"
                max={returnModal.max ?? undefined}
                value={returnModal.qty}
                onChange={e => setReturnModal(m => ({ ...m, qty: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmitReturn()}
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Nhập số lượng..."
              />
              {returnModal.requested != null && returnModal.qty &&
                parseInt(returnModal.qty, 10) !== returnModal.requested && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Số lượng khác với khai báo của đội — sẽ ghi nhận theo số bạn đếm.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setReturnModal({ open: false, id: null, max: null, requested: null, qty: '' })}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReturn}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Xác nhận nhận lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận tình trạng xe sự cố */}
      {incidentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[420px] space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-orange-500" size={20} />
              <h3 className="font-bold text-gray-900 text-base">Xác nhận tình trạng xe sau sự cố</h3>
            </div>

            {(incidentModal.reported_type || incidentModal.reported_note) && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm space-y-1">
                <p className="font-medium text-orange-800">Đội báo cáo:</p>
                {incidentModal.reported_type && (
                  <p className="text-orange-700">
                    Loại sự cố: <span className="font-semibold">
                      {incidentModal.reported_type === 'damaged' ? 'Hư hỏng' : 'Mất/Thất lạc'}
                    </span>
                  </p>
                )}
                {incidentModal.reported_note && (
                  <p className="text-orange-600 italic">"{incidentModal.reported_note}"</p>
                )}
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Kho xác nhận thực tế:</p>
              <div className="space-y-2">
                {[
                  { value: 'damaged', label: 'Hư hỏng — cần sửa chữa', color: 'text-orange-700' },
                  { value: 'lost',    label: 'Mất/Thất lạc — không thu hồi được', color: 'text-red-700' },
                  { value: 'ok',      label: 'Bình thường — xe vẫn ổn', color: 'text-green-700' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="confirmed_type"
                      value={opt.value}
                      checked={incidentModal.confirmed_type === opt.value}
                      onChange={e => setIncidentModal(m => ({ ...m, confirmed_type: e.target.value }))}
                      className="accent-blue-600"
                    />
                    <span className={`text-sm font-medium ${opt.color}`}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Ghi chú thêm (tuỳ chọn):</label>
              <textarea
                value={incidentModal.confirmed_note}
                onChange={e => setIncidentModal(m => ({ ...m, confirmed_note: e.target.value }))}
                rows={2}
                placeholder="Mô tả mức độ hư hỏng, vị trí phát hiện..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIncidentModal(m => ({ ...m, open: false }))}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitIncident}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
              >
                Xác nhận & Báo cáo lên
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">Đang tải...</div>
      ) : tab === 'supplies' ? (
        <SuppliesTable
          rows={voucherSearch
            ? distributions.filter(d => d.voucher_code?.toLowerCase().includes(voucherSearch.toLowerCase()))
            : distributions}
          onConfirmReturn={handleConfirmReturn}
          onWarehouseConfirm={handleWarehouseConfirm}
          confirmingId={confirmingId}
          user={user}
        />
      ) : (
        <VehiclesTable
          rows={vehicleRequests}
          onWarehouseConfirm={handleWarehouseConfirmVehicle}
          onConfirmReturn={handleConfirmVehicleReturn}
          onConfirmIncident={handleOpenIncidentModal}
          confirmingId={confirmingId}
          user={user}
        />
      )}
    </div>
  );
}

function SuppliesTable({ rows, onConfirmReturn, onWarehouseConfirm, confirmingId, user }) {
  const canWarehouseConfirm = ['manager', 'warehouse_manager'].includes(user?.role);
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
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Kho</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Vật tư</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Đội nhận</th>
            <th className="text-right px-4 py-3 font-semibold text-gray-600">Số lượng</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Mã phiếu</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Ngày xuất</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Trạng thái</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Ngày trả</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(d => (
            <tr key={d.id} className={`hover:bg-gray-50 transition ${d.status === 'returned' ? 'opacity-60' : ''}`}>
              <td className="px-4 py-3 text-gray-700">{d.warehouse_name}</td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-800">{d.item_name}</span>
                {d.category && <span className="ml-1 text-xs text-gray-400">({d.category})</span>}
              </td>
              <td className="px-4 py-3 text-gray-600">{d.team_name || <span className="text-gray-400 italic">—</span>}</td>
              <td className="px-4 py-3 text-right font-mono text-gray-800">
                {d.quantity} <span className="text-gray-400 text-xs">{d.item_unit}</span>
              </td>
              <td className="px-4 py-3">
                {d.voucher_code
                  ? <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{d.voucher_code}</span>
                  : <span className="text-gray-300 text-xs">—</span>}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{fmt(d.created_at)}</td>
              <td className="px-4 py-3">
                {(() => {
                  const st = SUPPLY_STATUS_LABELS[d.status] || { label: d.status, color: 'bg-gray-100 text-gray-500' };
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                      {d.status === 'returned' ? <CheckCircle size={12} /> : <Clock size={12} />}
                      {st.label}
                    </span>
                  );
                })()}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{fmt(d.return_confirmed_at)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1.5">
                  {canWarehouseConfirm && d.status === 'issued' && !d.warehouse_confirmed && (
                    <button
                      onClick={() => onWarehouseConfirm(d.id)}
                      disabled={confirmingId === d.id}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition whitespace-nowrap flex items-center gap-1"
                    >
                      <ShieldCheck size={13} />
                      {confirmingId === d.id ? '...' : 'Xác nhận bàn giao'}
                    </button>
                  )}
                  {d.status === 'return_requested' && (
                    <button
                      onClick={() => onConfirmReturn(d.id)}
                      disabled={confirmingId === d.id}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
                    >
                      {confirmingId === d.id ? '...' : 'Xác nhận nhận lại'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const VDISPATCH_STATUS_LABELS = {
  dispatched:       { label: 'Chờ bàn giao',        color: 'bg-yellow-100 text-yellow-700' },
  confirmed:        { label: 'Đội đã nhận',          color: 'bg-indigo-100 text-indigo-700' },
  returned:         { label: 'Đã trả xe',            color: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Đã hủy',               color: 'bg-gray-100 text-gray-500' },
  incident_pending: { label: 'Sự cố — chờ xác nhận', color: 'bg-red-100 text-red-700' },
};

function VehiclesTable({ rows, onWarehouseConfirm, onConfirmReturn, onConfirmIncident, confirmingId, user }) {
  const canWarehouseConfirm = ['manager', 'warehouse_manager'].includes(user?.role);
  if (!rows.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Truck size={40} className="mx-auto mb-3 opacity-30" />
        <p>Chưa có lệnh điều xe nào.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Xe</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Biển số</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Đội nhận</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Ngày điều</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Kho xác nhận</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Trạng thái</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(v => {
            const isCancelledIncident = v.status === 'cancelled' && v.incident_type;
            const st = isCancelledIncident
              ? { label: 'Sự cố — đã xử lý', color: 'bg-purple-100 text-purple-700' }
              : (VDISPATCH_STATUS_LABELS[v.status] || { label: v.status, color: 'bg-gray-100 text-gray-600' });
            const isReturned = v.status === 'returned' || v.status === 'cancelled';
            const isIncident = v.status === 'incident_pending';
            return (
              <React.Fragment key={v.id}>
                <tr className={`hover:bg-gray-50 transition ${isReturned ? 'opacity-60' : ''} ${isIncident ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {VEHICLE_TYPE_LABELS[v.vehicle_type] || v.vehicle_type}
                    {v.vehicle_name && <span className="text-xs text-gray-400 ml-1">({v.vehicle_name})</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{v.plate_number || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{v.team_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmt(v.dispatched_at)}</td>
                  <td className="px-4 py-3">
                    {v.warehouse_confirmed
                      ? <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle size={12} /> {fmt(v.warehouse_confirmed_at)}</span>
                      : <span className="text-yellow-500 text-xs flex items-center gap-1"><Clock size={12} /> Chưa xác nhận</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                      {isIncident && <AlertTriangle size={11} />}
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      {canWarehouseConfirm && v.status === 'dispatched' && !v.warehouse_confirmed && (
                        <button
                          onClick={() => onWarehouseConfirm(v.id)}
                          disabled={confirmingId === v.id}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition whitespace-nowrap flex items-center gap-1"
                        >
                          <ShieldCheck size={13} />
                          {confirmingId === v.id ? '...' : 'Xác nhận bàn giao xe'}
                        </button>
                      )}
                      {canWarehouseConfirm && v.status === 'returned' && (
                        <button
                          onClick={() => onConfirmReturn(v.id)}
                          disabled={confirmingId === v.id}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
                        >
                          {confirmingId === v.id ? '...' : 'Xác nhận nhận lại xe'}
                        </button>
                      )}
                      {canWarehouseConfirm && v.status === 'incident_pending' && (
                        <button
                          onClick={() => onConfirmIncident(v)}
                          disabled={confirmingId === v.id}
                          className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 disabled:opacity-50 transition whitespace-nowrap flex items-center gap-1"
                        >
                          <AlertTriangle size={13} />
                          {confirmingId === v.id ? '...' : 'Xác nhận tình trạng'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {isIncident && (v.incident_type || v.incident_note) && (
                  <tr className="bg-red-50 border-b border-red-100">
                    <td colSpan={7} className="px-4 pb-3 pt-0">
                      <div className="flex items-start gap-2 text-xs text-red-700 bg-red-100 rounded-lg px-3 py-2">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold">Đội báo cáo: </span>
                          {v.incident_type === 'damaged' && 'Xe bị hư hỏng'}
                          {v.incident_type === 'lost' && 'Xe bị mất/thất lạc'}
                          {v.incident_note && <span className="ml-1 italic">— "{v.incident_note}"</span>}
                          {v.incident_reported_at && (
                            <span className="text-red-500 ml-2">{fmt(v.incident_reported_at)}</span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
