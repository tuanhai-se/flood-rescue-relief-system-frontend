import React, { useState, useEffect, useRef } from 'react';
import { dashboardAPI } from '../services/api';
import { FileText, Printer, TrendingUp, Users, Truck, MapPin, Clock, CheckCircle } from 'lucide-react';

export default function ReportPage() {
  const [overview, setOverview] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [byProvince, setByProvince] = useState([]);
  const [dailyTrend, setDailyTrend] = useState([]);
  const [resourceUsage, setResourceUsage] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printDate] = useState(new Date().toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }));
  const reportRef = useRef(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ov, ts, bp, dt, ru, rt] = await Promise.allSettled([
          dashboardAPI.getOverview(),
          dashboardAPI.getTeamStats(),
          dashboardAPI.getByProvince(),
          dashboardAPI.getDailyTrend(),
          dashboardAPI.getResourceUsage(),
          dashboardAPI.getResponseTime(),
        ]);
        if (ov.status === 'fulfilled') setOverview(ov.value.data);
        if (ts.status === 'fulfilled') setTeamStats(ts.value.data?.status_summary || ts.value.data);
        if (bp.status === 'fulfilled') setByProvince(bp.value.data || []);
        if (dt.status === 'fulfilled') setDailyTrend(dt.value.data || []);
        if (ru.status === 'fulfilled') setResourceUsage(ru.value.data);
        if (rt.status === 'fulfilled') setResponseTime(rt.value.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const req = overview?.requests || {};
  const teams = overview?.teams || {};

  return (
    <div>
      {/* Toolbar — ẩn khi in */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-800">📊 Báo cáo tổng hợp hoạt động</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cứu hộ – Cứu trợ Lũ lụt</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <Printer size={18} /> Xuất PDF / In báo cáo
        </button>
      </div>

      {/* ===== NỘI DUNG BÁO CÁO ===== */}
      <div ref={reportRef} className="bg-white rounded-xl shadow print:shadow-none print:rounded-none">

        {/* Header báo cáo */}
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

          {/* 1. TỔNG QUAN YÊU CẦU CỨU HỘ */}
          <section>
            <h3 className="text-base font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              I. TỔNG QUAN YÊU CẦU CỨU HỘ
            </h3>
            <div className="grid grid-cols-4 gap-4 print:grid-cols-4">
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

          {/* 2. ĐỘI CỨU HỘ */}
          <section>
            <h3 className="text-base font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
              <Users size={16} className="text-purple-600" />
              II. TÌNH TRẠNG ĐỘI CỨU HỘ
            </h3>
            <div className="grid grid-cols-5 gap-3 print:grid-cols-5">
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

          {/* 3. THỐNG KÊ THEO TỈNH */}
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
                    const rate = p.total_requests > 0
                      ? Math.round((p.completed_requests / p.total_requests) * 100)
                      : 0;
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
                    <td className="px-3 py-2 border text-center">
                      {byProvince.reduce((s, p) => s + (p.total_requests || 0), 0)}
                    </td>
                    <td className="px-3 py-2 border text-center text-green-700">
                      {byProvince.reduce((s, p) => s + (p.completed_requests || 0), 0)}
                    </td>
                    <td className="px-3 py-2 border text-center">—</td>
                    <td className="px-3 py-2 border text-center">
                      {byProvince.reduce((s, p) => s + (p.total_victims || 0), 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>
          )}

          {/* 4. XU HƯỚNG THEO NGÀY */}
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

          {/* 5. TÀI NGUYÊN CỨU TRỢ */}
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
                    Sẵn sàng: {resourceUsage.vehicles?.available ?? '—'} &nbsp;|&nbsp;
                    Đang dùng: {resourceUsage.vehicles?.in_use ?? '—'}
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

          {/* 6. THỜI GIAN PHẢN HỒI */}
          {responseTime && (
            <section>
              <h3 className="text-base font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-cyan-600" />
                VI. THỜI GIAN PHẢN HỒI TRUNG BÌNH
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-cyan-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-cyan-700">{responseTime.avg_verify_minutes ?? '—'} phút</p>
                  <p className="text-xs text-gray-600 mt-1">Thời gian xác minh TB</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-700">{responseTime.avg_assign_minutes ?? '—'} phút</p>
                  <p className="text-xs text-gray-600 mt-1">Thời gian phân công TB</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{responseTime.avg_complete_minutes ?? '—'} phút</p>
                  <p className="text-xs text-gray-600 mt-1">Thời gian hoàn thành TB</p>
                </div>
              </div>
            </section>
          )}

          {/* Footer */}
          <div className="border-t pt-4 text-xs text-gray-400 flex justify-between">
            <span>Hệ thống Điều phối Cứu hộ Cứu trợ Lũ lụt Việt Nam</span>
            <span>Xuất lúc: {printDate}</span>
          </div>

        </div>
      </div>

      {/* Print styles */}
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
