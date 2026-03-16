import React, { useState, useEffect, useRef } from 'react';
import { dashboardAPI, resourceAPI } from '../services/api';
import { FileText, Printer, TrendingUp, Users, Truck, MapPin, Package, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { formatDate } from '../utils/helpers';

// ─── Warehouse Manager Report ─────────────────────────────────────────────────
function WarehouseReport({ printDate }) {
  const [inventory, setInventory]       = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [supplyTransfers, setSupplyTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [inv, dist, st] = await Promise.allSettled([
        resourceAPI.getInventory(),
        resourceAPI.getDistributions(),
        resourceAPI.getSupplyTransfers(),
      ]);
      if (inv.status === 'fulfilled') setInventory(inv.value.data || []);
      if (dist.status === 'fulfilled') setDistributions(dist.value.data || []);
      if (st.status === 'fulfilled') setSupplyTransfers(st.value.data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const lowStock = inventory.filter(i => i.min_threshold && i.quantity <= i.min_threshold);
  const totalIssued = distributions.filter(d => ['issued','confirmed','return_requested','partially_returned'].includes(d.status)).length;
  const totalReturned = distributions.filter(d => d.status === 'returned').length;
  const inTransit = supplyTransfers.filter(st => st.status === 'in_transit').length;
  const completedTransfers = supplyTransfers.filter(st => st.status === 'completed').length;

  // Group inventory by warehouse
  const byWarehouse = inventory.reduce((acc, item) => {
    const wName = item.warehouse_name || 'Không rõ';
    if (!acc[wName]) acc[wName] = [];
    acc[wName].push(item);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-xl shadow print:shadow-none print:rounded-none">
      {/* Header */}
      <div className="border-b-2 border-blue-700 px-8 py-6 print:px-6 print:py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
            <h2 className="text-2xl font-bold text-blue-800 print:text-xl">
              BÁO CÁO TỔNG HỢP<br />
              XUẤT NHẬP HÀNG HÓA CỨU TRỢ
            </h2>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p className="font-medium">Flood Rescue Coordination System</p>
            <p>Ngày xuất: {printDate}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 print:px-6 space-y-8">

        {/* 1. Tổng quan tồn kho */}
        <section>
          <h3 className="text-base font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
            <Package size={16} className="text-blue-600" />
            I. TỔNG QUAN TỒN KHO
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Tổng mặt hàng', value: inventory.length, color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Hàng sắp hết', value: lowStock.length, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Số kho', value: Object.keys(byWarehouse).length, color: 'text-purple-700', bg: 'bg-purple-50' },
              { label: 'Đang cấp phát', value: totalIssued, color: 'text-orange-700', bg: 'bg-orange-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-lg p-4 text-center`}>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Tồn kho theo kho */}
        {Object.entries(byWarehouse).map(([wName, items]) => (
          <section key={wName}>
            <h3 className="text-base font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
              <Package size={16} className="text-green-600" />
              {wName}
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border font-semibold">Mặt hàng</th>
                  <th className="text-center px-3 py-2 border font-semibold">Danh mục</th>
                  <th className="text-center px-3 py-2 border font-semibold">Tồn kho</th>
                  <th className="text-center px-3 py-2 border font-semibold">Đơn vị</th>
                  <th className="text-center px-3 py-2 border font-semibold">Ngưỡng tối thiểu</th>
                  <th className="text-center px-3 py-2 border font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const isLow = item.min_threshold && item.quantity <= item.min_threshold;
                  return (
                    <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 border font-medium">{item.item_name}</td>
                      <td className="px-3 py-2 border text-center text-gray-600">{item.category}</td>
                      <td className={`px-3 py-2 border text-center font-semibold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 border text-center text-gray-500">{item.unit}</td>
                      <td className="px-3 py-2 border text-center text-gray-500">{item.min_threshold ?? '—'}</td>
                      <td className="px-3 py-2 border text-center">
                        {isLow
                          ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Sắp hết</span>
                          : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Đủ hàng</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}

        {/* 3. Cấp phát vật tư gần đây */}
        <section>
          <h3 className="text-base font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
            <Truck size={16} className="text-amber-600" />
            II. CẤP PHÁT VẬT TƯ (20 gần nhất)
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { label: 'Đang cấp phát', value: totalIssued, color: 'text-orange-700' },
              { label: 'Đã hoàn trả', value: totalReturned, color: 'text-green-700' },
            ].map(s => (
              <div key={s.label} className="border rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {distributions.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border font-semibold">Hàng hóa</th>
                  <th className="text-center px-3 py-2 border font-semibold">Số lượng</th>
                  <th className="text-left px-3 py-2 border font-semibold">Kho xuất</th>
                  <th className="text-left px-3 py-2 border font-semibold">Đội nhận</th>
                  <th className="text-center px-3 py-2 border font-semibold">Trạng thái</th>
                  <th className="text-center px-3 py-2 border font-semibold">Ngày cấp</th>
                </tr>
              </thead>
              <tbody>
                {distributions.slice(0, 20).map((d, i) => (
                  <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 border font-medium">{d.item_name}</td>
                    <td className="px-3 py-2 border text-center">{d.quantity} {d.item_unit}</td>
                    <td className="px-3 py-2 border">{d.warehouse_name}</td>
                    <td className="px-3 py-2 border">{d.team_name ?? '—'}</td>
                    <td className="px-3 py-2 border text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.status === 'returned' ? 'bg-gray-100 text-gray-600' :
                        d.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        d.status === 'issued' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>{
                        d.status === 'issued' ? 'Đã cấp' :
                        d.status === 'confirmed' ? 'Đã nhận' :
                        d.status === 'returned' ? 'Đã trả' :
                        d.status === 'return_requested' ? 'Chờ trả' :
                        d.status === 'partially_returned' ? 'Trả 1 phần' : d.status
                      }</span>
                    </td>
                    <td className="px-3 py-2 border text-center text-gray-500 text-xs">{formatDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-400 py-6">Chưa có dữ liệu cấp phát.</p>
          )}
        </section>

        {/* 4. Điều chuyển vật tư liên kho */}
        <section>
          <h3 className="text-base font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-purple-600" />
            III. ĐIỀU CHUYỂN VẬT TƯ LIÊN KHO
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { label: 'Đang vận chuyển', value: inTransit, color: 'text-blue-700' },
              { label: 'Hoàn thành', value: completedTransfers, color: 'text-green-700' },
            ].map(s => (
              <div key={s.label} className="border rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {supplyTransfers.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border font-semibold">Hàng hóa</th>
                  <th className="text-center px-3 py-2 border font-semibold">Số lượng</th>
                  <th className="text-left px-3 py-2 border font-semibold">Từ kho</th>
                  <th className="text-left px-3 py-2 border font-semibold">Đến kho</th>
                  <th className="text-center px-3 py-2 border font-semibold">Trạng thái</th>
                  <th className="text-center px-3 py-2 border font-semibold">Ngày điều</th>
                </tr>
              </thead>
              <tbody>
                {supplyTransfers.slice(0, 20).map((st, i) => (
                  <tr key={st.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 border font-medium">{st.item_name}</td>
                    <td className="px-3 py-2 border text-center">{st.quantity} {st.item_unit}</td>
                    <td className="px-3 py-2 border">{st.from_warehouse_name}</td>
                    <td className="px-3 py-2 border">{st.to_warehouse_name}</td>
                    <td className="px-3 py-2 border text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        st.status === 'completed' ? 'bg-green-100 text-green-700' :
                        st.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{
                        st.status === 'in_transit' ? 'Đang chuyển' :
                        st.status === 'completed' ? 'Hoàn thành' :
                        st.status === 'cancelled' ? 'Đã hủy' : st.status
                      }</span>
                    </td>
                    <td className="px-3 py-2 border text-center text-gray-500 text-xs">{formatDate(st.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-400 py-6">Chưa có dữ liệu điều chuyển.</p>
          )}
        </section>

        {/* Footer */}
        <div className="border-t pt-4 text-xs text-gray-400 flex justify-between">
          <span>Hệ thống Điều phối Cứu hộ Cứu trợ Lũ lụt Việt Nam</span>
          <span>Xuất lúc: {printDate}</span>
        </div>

      </div>
    </div>
  );
}

// ─── General Report (Admin / Manager) ────────────────────────────────────────
function GeneralReport({ printDate }) {
  const [overview, setOverview]       = useState(null);
  const [teamStats, setTeamStats]     = useState(null);
  const [byProvince, setByProvince]   = useState([]);
  const [dailyTrend, setDailyTrend]   = useState([]);
  const [resourceUsage, setResourceUsage] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ov, ts, bp, dt, ru] = await Promise.allSettled([
          dashboardAPI.getOverview(),
          dashboardAPI.getTeamStats(),
          dashboardAPI.getByProvince(),
          dashboardAPI.getDailyTrend(),
          dashboardAPI.getResourceUsage(),
        ]);
        if (ov.status === 'fulfilled') setOverview(ov.value.data);
        if (ts.status === 'fulfilled') setTeamStats(ts.value.data?.status_summary || ts.value.data);
        if (bp.status === 'fulfilled') setByProvince(bp.value.data || []);
        if (dt.status === 'fulfilled') setDailyTrend(dt.value.data || []);
        if (ru.status === 'fulfilled') setResourceUsage(ru.value.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const req = overview?.requests || {};
  const teams = overview?.teams || {};

  return (
    <div className="bg-white rounded-xl shadow print:shadow-none print:rounded-none">
      <div className="border-b-2 border-blue-700 px-8 py-6 print:px-6 print:py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
            <h2 className="text-2xl font-bold text-blue-800 print:text-xl">
              BÁO CÁO TỔNG HỢP<br />
              HOẠT ĐỘNG CỨU HỘ – CỨU TRỢ LŨ LỤT
            </h2>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p className="font-medium">Flood Rescue Coordination System</p>
            <p>Ngày xuất: {printDate}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 print:px-6 space-y-8">
        <section>
          <h3 className="text-base font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-blue-600" />
            I. TỔNG QUAN YÊU CẦU CỨU HỘ
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Tổng yêu cầu', value: req.total_requests ?? '—', color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Đang chờ xử lý', value: req.pending ?? '—', color: 'text-yellow-700', bg: 'bg-yellow-50' },
              { label: 'Đang cứu hộ', value: (req.in_progress ?? 0) + (req.assigned ?? 0), color: 'text-orange-700', bg: 'bg-orange-50' },
              { label: 'Hoàn thành', value: req.completed ?? '—', color: 'text-green-700', bg: 'bg-green-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-lg p-4 text-center`}>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {req.cancelled !== undefined && (
            <p className="text-xs text-gray-500 mt-2">
              Đã hủy: {req.cancelled} &nbsp;|&nbsp; Từ chối: {req.rejected ?? 0}
            </p>
          )}
        </section>

        <section>
          <h3 className="text-base font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
            <Users size={16} className="text-purple-600" />
            II. TÌNH TRẠNG ĐỘI CỨU HỘ
          </h3>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Tổng đội', value: teamStats?.total ?? teams.total_teams ?? '—', color: 'text-gray-700' },
              { label: 'Sẵn sàng', value: teamStats?.available ?? '—', color: 'text-green-700' },
              { label: 'Đang nhiệm vụ', value: teamStats?.on_mission ?? '—', color: 'text-orange-700' },
              { label: 'Chờ lệnh', value: teamStats?.standby ?? '—', color: 'text-blue-700' },
              { label: 'Nghỉ', value: teamStats?.off_duty ?? '—', color: 'text-gray-500' },
            ].map(s => (
              <div key={s.label} className="border rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {byProvince.length > 0 && (
          <section>
            <h3 className="text-base font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-red-600" />
              III. PHÂN BỔ YÊU CẦU THEO TỈNH/THÀNH
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border font-semibold">Tỉnh/Thành</th>
                  <th className="text-center px-3 py-2 border font-semibold">Tổng yêu cầu</th>
                  <th className="text-center px-3 py-2 border font-semibold">Hoàn thành</th>
                  <th className="text-center px-3 py-2 border font-semibold">Tỉ lệ</th>
                  <th className="text-center px-3 py-2 border font-semibold">Tổng nạn nhân</th>
                </tr>
              </thead>
              <tbody>
                {byProvince.map((p, i) => {
                  const total = Number(p.total_requests) || 0;
                  const completed = Number(p.completed_requests) || 0;
                  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <tr key={p.province_id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 border font-medium">{p.province_name}</td>
                      <td className="px-3 py-2 border text-center">{p.total_requests}</td>
                      <td className="px-3 py-2 border text-center text-green-700">{p.completed_requests ?? 0}</td>
                      <td className="px-3 py-2 border text-center">
                        <span className={`font-medium ${rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {rate}%
                        </span>
                      </td>
                      <td className="px-3 py-2 border text-center">{p.total_victims ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 font-semibold">
                  <td className="px-3 py-2 border">Tổng cộng</td>
                  <td className="px-3 py-2 border text-center">{byProvince.reduce((s, p) => s + (p.total_requests || 0), 0)}</td>
                  <td className="px-3 py-2 border text-center text-green-700">{byProvince.reduce((s, p) => s + (p.completed_requests || 0), 0)}</td>
                  <td className="px-3 py-2 border text-center">—</td>
                  <td className="px-3 py-2 border text-center">{byProvince.reduce((s, p) => s + (p.total_victims || 0), 0)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}

        {dailyTrend.length > 0 && (
          <section>
            <h3 className="text-base font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-600" />
              IV. XU HƯỚNG YÊU CẦU 7 NGÀY GẦN NHẤT
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border font-semibold">Ngày</th>
                  <th className="text-center px-3 py-2 border font-semibold">Mới</th>
                  <th className="text-center px-3 py-2 border font-semibold">Hoàn thành</th>
                  <th className="text-center px-3 py-2 border font-semibold">Nạn nhân</th>
                </tr>
              </thead>
              <tbody>
                {dailyTrend.slice(-7).map((d, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 border">{d.date ? new Date(d.date).toLocaleDateString('vi-VN') : d.day}</td>
                    <td className="px-3 py-2 border text-center">{d.new_requests ?? d.total ?? 0}</td>
                    <td className="px-3 py-2 border text-center text-green-700">{d.completed ?? 0}</td>
                    <td className="px-3 py-2 border text-center">{d.victims ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {resourceUsage && (
          <section>
            <h3 className="text-base font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
              <Truck size={16} className="text-amber-600" />
              V. TÌNH HÌNH TÀI NGUYÊN & PHƯƠNG TIỆN
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Phương tiện</p>
                <p className="text-2xl font-bold text-blue-700">{resourceUsage.vehicles?.total ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Sẵn sàng: {resourceUsage.vehicles?.available ?? '—'} &nbsp;|&nbsp; Đang dùng: {resourceUsage.vehicles?.in_use ?? '—'}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Kho hàng</p>
                <p className="text-2xl font-bold text-purple-700">{resourceUsage.warehouses?.total ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-1">Kho hoạt động</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Hàng cứu trợ tồn kho thấp</p>
                <p className="text-2xl font-bold text-red-600">{resourceUsage.low_stock_count ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-1">Loại hàng cần bổ sung</p>
              </div>
            </div>
          </section>
        )}

        <div className="border-t pt-4 text-xs text-gray-400 flex justify-between">
          <span>Hệ thống Điều phối Cứu hộ Cứu trợ Lũ lụt Việt Nam</span>
          <span>Xuất lúc: {printDate}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ReportPage() {
  const { user } = useAuthStore();
  const isWarehouseManager = user?.role === 'warehouse_manager';
  const [printDate] = useState(new Date().toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {isWarehouseManager ? '📦 Báo cáo xuất nhập hàng hóa' : '📊 Báo cáo tổng hợp hoạt động'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isWarehouseManager ? 'Tổng hợp tồn kho – Cấp phát – Điều chuyển' : 'Cứu hộ – Cứu trợ Lũ lụt'}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <Printer size={18} /> Xuất PDF / In báo cáo
        </button>
      </div>

      {isWarehouseManager
        ? <WarehouseReport printDate={printDate} />
        : <GeneralReport printDate={printDate} />
      }

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .bg-white, .bg-white * { visibility: visible; }
          .bg-white { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>
    </div>
  );
}
