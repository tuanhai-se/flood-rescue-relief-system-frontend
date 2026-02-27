import React, { useState, useEffect } from 'react';
import { resourceAPI, regionAPI, teamAPI } from '../services/api';
import { VEHICLE_TYPES, formatDate } from '../utils/helpers';
import { Truck, Warehouse, Package, Plus, Edit2, RefreshCw, X, Save, Send, ClipboardList, CheckCircle, XCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';

const TABS = [
  { key: 'vehicles', label: 'Phương tiện', icon: Truck, roles: ['admin', 'manager', 'coordinator'] },
  { key: 'warehouses', label: 'Kho hàng', icon: Warehouse, roles: ['admin', 'manager', 'coordinator'] },
  { key: 'inventory', label: 'Tồn kho', icon: Package, roles: ['admin', 'manager', 'coordinator'] },
  { key: 'distributions', label: 'Phân phối cứu trợ', icon: Send, roles: ['admin', 'manager'] },
  { key: 'vehicle_requests', label: 'Yêu cầu điều xe', icon: ClipboardList, roles: ['admin', 'manager', 'coordinator'] },
];

const VEHICLE_TYPE_LABELS = {
  boat: '🚤 Xuồng/Tàu',
  truck: '🚛 Xe tải',
  car: '🚗 Xe con',
  helicopter: '🚁 Trực thăng',
  ambulance: '🚑 Xe cứu thương',
  other: '🚙 Khác',
};

const SOURCE_TYPE_LABELS = {
  purchase: '🛒 Mua mới',
  borrow_local: '🤝 Mượn trong tỉnh',
  borrow_external: '📦 Mượn từ khu vực khác',
};

const VEHICLE_STATUS_BADGE = {
  available:   'bg-green-100 text-green-700',
  in_use:      'bg-orange-100 text-orange-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  retired:     'bg-gray-100 text-gray-500',
};

const VREQ_STATUS_BADGE = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-blue-100 text-blue-700',
  fulfilled: 'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};
const VREQ_STATUS_LABELS = {
  pending: 'Chờ duyệt', approved: 'Đã duyệt', fulfilled: 'Đã cấp xe',
  rejected: 'Từ chối', cancelled: 'Đã hủy',
};

export default function ResourcesPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('vehicles');
  const [vehicles, setVehicles] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('');
  const [formData, setFormData] = useState({});
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [distributions, setDistributions] = useState([]);
  const [reliefItems, setReliefItems] = useState([]);
  const [showDistForm, setShowDistForm] = useState(false);
  const [distForm, setDistForm] = useState({ warehouse_id: '', item_id: '', quantity: '', request_id: '', notes: '' });
  const [distSaving, setDistSaving] = useState(false);
  // Vehicle requests state
  const [vehicleRequests, setVehicleRequests] = useState([]);
  const [teams, setTeams] = useState([]);
  const [showVReqForm, setShowVReqForm] = useState(false);
  const [vReqForm, setVReqForm] = useState({
    vehicle_type: 'boat', quantity: 1, destination_team_id: '',
    source_type: 'borrow_local', source_region: '', expected_date: '', return_date: '', notes: ''
  });
  const [vReqSaving, setVReqSaving] = useState(false);

  useEffect(() => {
    regionAPI.getProvinces().then(r => setProvinces(r.data || [])).catch(() => {});
    teamAPI.getAll().then(r => setTeams(r.data?.data || r.data || [])).catch(() => {});
  }, []);

  useEffect(() => { loadData(); }, [tab, filterWarehouse]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'vehicles') {
        const { data } = await resourceAPI.getVehicles();
        setVehicles(data || []);
      } else if (tab === 'warehouses') {
        const { data } = await resourceAPI.getWarehouses();
        setWarehouses(data || []);
      } else if (tab === 'inventory') {
        const params = filterWarehouse ? { warehouse_id: filterWarehouse } : {};
        const [invRes, whRes] = await Promise.all([resourceAPI.getInventory(params), resourceAPI.getWarehouses()]);
        setInventory(invRes.data || []);
        setWarehouses(whRes.data || []);
      } else if (tab === 'distributions') {
        const [distRes, whRes, itemsRes] = await Promise.all([
          resourceAPI.getDistributions(filterWarehouse ? { warehouse_id: filterWarehouse } : {}),
          resourceAPI.getWarehouses(),
          resourceAPI.getReliefItems()
        ]);
        setDistributions(distRes.data || []);
        setWarehouses(whRes.data || []);
        setReliefItems(itemsRes.data || []);
      } else if (tab === 'vehicle_requests') {
        const { data } = await resourceAPI.getVehicleRequests();
        setVehicleRequests(data || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = (type) => {
    setFormType(type);
    setEditId(null);
    if (type === 'vehicle') setFormData({ name: '', plate_number: '', type: 'boat', capacity: 0, province_id: '' });
    else setFormData({ name: '', address: '', province_id: '', capacity_tons: 0, phone: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (formType === 'vehicle') {
        if (editId) await resourceAPI.updateVehicle(editId, formData);
        else await resourceAPI.createVehicle(formData);
      } else {
        await resourceAPI.createWarehouse(formData);
      }
      setShowForm(false);
      loadData();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setSaving(false); }
  };

  const updateInventoryQty = async (id, quantity) => {
    try {
      await resourceAPI.updateInventory(id, { quantity });
      loadData();
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">📦 Quản lý Tài nguyên</h1>
        <button onClick={loadData} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {TABS.filter(t => !t.roles || t.roles.includes(user?.role)).map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* VEHICLES */}
          {tab === 'vehicles' && (
            <div>
              <div className="flex justify-end mb-3">
                <button onClick={() => openCreate('vehicle')}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Thêm phương tiện
                </button>
              </div>
              {vehicles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Chưa có phương tiện nào.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">Tên</th>
                        <th className="text-left px-4 py-2.5 font-medium">Loại</th>
                        <th className="text-left px-4 py-2.5 font-medium">Biển số</th>
                        <th className="text-left px-4 py-2.5 font-medium">Tỉnh</th>
                        <th className="text-left px-4 py-2.5 font-medium">Đội</th>
                        <th className="text-left px-4 py-2.5 font-medium">Trạng thái</th>
                        <th className="text-left px-4 py-2.5 font-medium">Sức chứa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {vehicles.map(v => (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{v.name}</td>
                          <td className="px-4 py-3">{VEHICLE_TYPES[v.type] || v.type}</td>
                          <td className="px-4 py-3 font-mono text-xs">{v.plate_number || '—'}</td>
                          <td className="px-4 py-3">{v.province_name}</td>
                          <td className="px-4 py-3">{v.team_name || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${VEHICLE_STATUS_BADGE[v.status] || 'bg-gray-100'}`}>
                              {v.status === 'available' ? 'Sẵn sàng' : v.status === 'in_use' ? 'Đang dùng' : v.status === 'maintenance' ? 'Bảo trì' : 'Ngưng'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{v.capacity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* WAREHOUSES */}
          {tab === 'warehouses' && (
            <div>
              <div className="flex justify-end mb-3">
                <button onClick={() => openCreate('warehouse')}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Thêm kho
                </button>
              </div>
              {warehouses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Chưa có kho nào.</div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {warehouses.map(w => (
                    <div key={w.id} className="bg-white border rounded-xl p-4">
                      <h3 className="font-bold text-gray-800">{w.name}</h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>📍 {w.address || w.province_name}</p>
                        <p>📏 Sức chứa: {w.capacity_tons} tấn</p>
                        {w.manager_name && <p>👤 Quản lý: {w.manager_name}</p>}
                        {w.phone && <p>📞 {w.phone}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INVENTORY */}
          {tab === 'inventory' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <select className="px-3 py-2 text-sm border rounded-lg"
                  value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}>
                  <option value="">Tất cả kho</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              {inventory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Không có dữ liệu tồn kho.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">Kho</th>
                        <th className="text-left px-4 py-2.5 font-medium">Vật phẩm</th>
                        <th className="text-left px-4 py-2.5 font-medium">Danh mục</th>
                        <th className="text-right px-4 py-2.5 font-medium">Số lượng</th>
                        <th className="text-left px-4 py-2.5 font-medium">Đơn vị</th>
                        <th className="text-right px-4 py-2.5 font-medium">Ngưỡng tối thiểu</th>
                        <th className="text-left px-4 py-2.5 font-medium">Cập nhật</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {inventory.map(item => {
                        const isLow = item.quantity <= item.min_threshold;
                        return (
                          <tr key={item.id} className={isLow ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-3">{item.warehouse_name}</td>
                            <td className="px-4 py-3 font-medium">
                              {item.item_name}
                              {isLow && <span className="ml-2 text-xs text-red-600">⚠️ Thiếu</span>}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className="px-2 py-0.5 rounded bg-gray-100">{item.category}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold">
                              {Number(item.quantity).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">{item.unit}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{Number(item.min_threshold).toLocaleString()}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{item.last_restocked ? formatDate(item.last_restocked) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DISTRIBUTIONS */}
          {tab === 'distributions' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <select className="px-3 py-2 text-sm border rounded-lg"
                  value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}>
                  <option value="">Tất cả kho</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <button onClick={() => { setShowDistForm(true); setDistForm({ warehouse_id: '', item_id: '', quantity: '', request_id: '', notes: '' }); }}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Ghi nhận phân phối
                </button>
              </div>
              {distributions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Chưa có lịch sử phân phối.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">Thời gian</th>
                        <th className="text-left px-4 py-2.5 font-medium">Kho</th>
                        <th className="text-left px-4 py-2.5 font-medium">Vật phẩm</th>
                        <th className="text-right px-4 py-2.5 font-medium">Số lượng</th>
                        <th className="text-left px-4 py-2.5 font-medium">Cho yêu cầu</th>
                        <th className="text-left px-4 py-2.5 font-medium">Người thực hiện</th>
                        <th className="text-left px-4 py-2.5 font-medium">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {distributions.map(d => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs text-gray-500">{formatDate(d.created_at)}</td>
                          <td className="px-4 py-3">{d.warehouse_name}</td>
                          <td className="px-4 py-3 font-medium">
                            {d.item_name}
                            <span className="text-xs text-gray-400 ml-1">({d.category})</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-orange-600">
                            -{Number(d.quantity).toLocaleString()} {d.item_unit}
                          </td>
                          <td className="px-4 py-3">
                            {d.tracking_code ? (
                              <span className="font-mono text-xs text-blue-600">{d.tracking_code}</span>
                            ) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs">{d.distributed_by_name}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{d.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* VEHICLE REQUESTS */}
          {tab === 'vehicle_requests' && (
            <div>
              <div className="flex justify-end mb-3">
                <button onClick={() => setShowVReqForm(true)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Yêu cầu điều xe
                </button>
              </div>
              {vehicleRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Chưa có yêu cầu điều xe nào.</div>
              ) : (
                <div className="space-y-3">
                  {vehicleRequests.map(vr => (
                    <div key={vr.id} className="bg-white border rounded-xl p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-800 text-sm">
                              {VEHICLE_TYPE_LABELS[vr.vehicle_type] || vr.vehicle_type} × {vr.quantity}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${VREQ_STATUS_BADGE[vr.status]}`}>
                              {VREQ_STATUS_LABELS[vr.status]}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                            <p>🏃 Đội nhận: <span className="font-medium text-gray-800">{vr.destination_team_name || '—'}</span></p>
                            <p>📦 Nguồn: <span className="font-medium">{SOURCE_TYPE_LABELS[vr.source_type] || vr.source_type}</span></p>
                            {vr.source_region && <p>🗺️ Khu vực: {vr.source_region}</p>}
                            {vr.expected_date && <p>📅 Ngày cần: {vr.expected_date?.split('T')[0]}</p>}
                            {vr.return_date && <p>🔄 Ngày trả: {vr.return_date?.split('T')[0]}</p>}
                            <p className="col-span-2">👤 Người yêu cầu: {vr.requested_by_name}</p>
                            {vr.approved_by_name && <p>✅ Người duyệt: {vr.approved_by_name}</p>}
                          </div>
                          {vr.notes && (
                            <p className="mt-2 text-sm text-gray-500 italic border-l-2 border-gray-200 pl-2">{vr.notes}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-400">{formatDate(vr.created_at)}</p>
                        </div>
                        {/* Admin/Manager có thể duyệt nếu đang pending */}
                        {vr.status === 'pending' && ['admin', 'manager'].includes(user?.role) && (
                          <div className="flex flex-col gap-2 shrink-0">
                            <button onClick={async () => {
                              if (!window.confirm('Duyệt yêu cầu này?')) return;
                              await resourceAPI.updateVehicleRequestStatus(vr.id, { status: 'approved' });
                              loadData();
                            }} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">
                              <CheckCircle className="w-3.5 h-3.5" /> Duyệt
                            </button>
                            <button onClick={async () => {
                              const reason = window.prompt('Lý do từ chối (tùy chọn):');
                              await resourceAPI.updateVehicleRequestStatus(vr.id, { status: 'rejected', notes: reason || '' });
                              loadData();
                            }} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                              <XCircle className="w-3.5 h-3.5" /> Từ chối
                            </button>
                          </div>
                        )}
                        {/* Đánh dấu đã cấp xe */}
                        {vr.status === 'approved' && ['admin', 'manager'].includes(user?.role) && (
                          <button onClick={async () => {
                            await resourceAPI.updateVehicleRequestStatus(vr.id, { status: 'fulfilled' });
                            loadData();
                          }} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0">
                            <Truck className="w-3.5 h-3.5" /> Đã cấp xe
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{formType === 'vehicle' ? 'Thêm phương tiện' : 'Thêm kho hàng'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Tên *</label>
                <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.name}
                  onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tỉnh *</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.province_id}
                  onChange={e => setFormData(d => ({ ...d, province_id: e.target.value }))}>
                  <option value="">Chọn tỉnh</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {formType === 'vehicle' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Loại</label>
                      <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.type}
                        onChange={e => setFormData(d => ({ ...d, type: e.target.value }))}>
                        {Object.entries(VEHICLE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Biển số</label>
                      <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.plate_number}
                        onChange={e => setFormData(d => ({ ...d, plate_number: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Sức chứa (người)</label>
                    <input type="number" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.capacity}
                      onChange={e => setFormData(d => ({ ...d, capacity: parseInt(e.target.value) || 0 }))} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Địa chỉ</label>
                    <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.address}
                      onChange={e => setFormData(d => ({ ...d, address: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Sức chứa (tấn)</label>
                      <input type="number" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.capacity_tons}
                        onChange={e => setFormData(d => ({ ...d, capacity_tons: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">SĐT</label>
                      <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.phone}
                        onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}
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

      {/* Distribution Form Modal */}
      {showDistForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDistForm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">📦 Ghi nhận phân phối cứu trợ</h2>
              <button onClick={() => setShowDistForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Kho xuất *</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={distForm.warehouse_id}
                  onChange={e => setDistForm(d => ({ ...d, warehouse_id: e.target.value }))}>
                  <option value="">Chọn kho</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Vật phẩm *</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={distForm.item_id}
                  onChange={e => setDistForm(d => ({ ...d, item_id: e.target.value }))}>
                  <option value="">Chọn vật phẩm</option>
                  {reliefItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit}) — {i.category}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Số lượng xuất *</label>
                <input type="number" min="1" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={distForm.quantity}
                  onChange={e => setDistForm(d => ({ ...d, quantity: e.target.value }))} placeholder="VD: 50" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Mã yêu cầu cứu hộ (nếu có)</label>
                <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={distForm.request_id}
                  onChange={e => setDistForm(d => ({ ...d, request_id: e.target.value }))} placeholder="VD: 1 (ID yêu cầu)" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Ghi chú</label>
                <textarea className="w-full mt-1 px-3 py-2 border rounded-lg text-sm resize-none h-16" value={distForm.notes}
                  onChange={e => setDistForm(d => ({ ...d, notes: e.target.value }))} placeholder="Ghi chú phân phối..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowDistForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={async () => {
                if (!distForm.warehouse_id || !distForm.item_id || !distForm.quantity) return alert('Vui lòng điền đầy đủ thông tin.');
                setDistSaving(true);
                try {
                  await resourceAPI.createDistribution({
                    warehouse_id: parseInt(distForm.warehouse_id),
                    item_id: parseInt(distForm.item_id),
                    quantity: parseFloat(distForm.quantity),
                    request_id: distForm.request_id ? parseInt(distForm.request_id) : null,
                    notes: distForm.notes || null
                  });
                  setShowDistForm(false);
                  loadData();
                  alert('✅ Ghi nhận phân phối thành công! Tồn kho đã tự động trừ.');
                } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
                finally { setDistSaving(false); }
              }} disabled={distSaving}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                <Send className="w-4 h-4" /> {distSaving ? 'Đang lưu...' : 'Xuất kho'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Vehicle Request Form Modal */}
      {showVReqForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowVReqForm(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">🚤 Yêu cầu điều phối phương tiện</h2>
              <button onClick={() => setShowVReqForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Loại phương tiện *</label>
                  <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={vReqForm.vehicle_type}
                    onChange={e => setVReqForm(f => ({ ...f, vehicle_type: e.target.value }))}>
                    {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Số lượng *</label>
                  <input type="number" min="1" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    value={vReqForm.quantity} onChange={e => setVReqForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Đội nhận phương tiện *</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={vReqForm.destination_team_id}
                  onChange={e => setVReqForm(f => ({ ...f, destination_team_id: e.target.value }))}>
                  <option value="">Chọn đội cứu hộ...</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Nguồn phương tiện *</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={vReqForm.source_type}
                  onChange={e => setVReqForm(f => ({ ...f, source_type: e.target.value, source_region: '' }))}>
                  {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {vReqForm.source_type === 'borrow_external' && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Khu vực/Tỉnh cung cấp *</label>
                  <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="VD: Đà Nẵng, Bộ Quốc phòng..."
                    value={vReqForm.source_region}
                    onChange={e => setVReqForm(f => ({ ...f, source_region: e.target.value }))} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Ngày cần có</label>
                  <input type="date" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    value={vReqForm.expected_date}
                    onChange={e => setVReqForm(f => ({ ...f, expected_date: e.target.value }))} />
                </div>
                {vReqForm.source_type !== 'purchase' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Ngày trả</label>
                    <input type="date" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      value={vReqForm.return_date}
                      onChange={e => setVReqForm(f => ({ ...f, return_date: e.target.value }))} />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Ghi chú / Mục đích sử dụng</label>
                <textarea className="w-full mt-1 px-3 py-2 border rounded-lg text-sm resize-none h-20"
                  placeholder="Mô tả tình hình, lý do cần xe, khu vực triển khai..."
                  value={vReqForm.notes}
                  onChange={e => setVReqForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowVReqForm(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Hủy</button>
              <button disabled={vReqSaving || !vReqForm.destination_team_id}
                onClick={async () => {
                  if (!vReqForm.destination_team_id) return alert('Vui lòng chọn đội nhận xe.');
                  if (vReqForm.source_type === 'borrow_external' && !vReqForm.source_region) {
                    return alert('Vui lòng nhập khu vực cung cấp xe.');
                  }
                  setVReqSaving(true);
                  try {
                    await resourceAPI.createVehicleRequest(vReqForm);
                    setShowVReqForm(false);
                    setVReqForm({ vehicle_type: 'boat', quantity: 1, destination_team_id: '', source_type: 'borrow_local', source_region: '', expected_date: '', return_date: '', notes: '' });
                    setTab('vehicle_requests');
                    loadData();
                    alert('✅ Đã gửi yêu cầu điều xe thành công!');
                  } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
                  finally { setVReqSaving(false); }
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                <Send className="w-4 h-4" /> {vReqSaving ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
