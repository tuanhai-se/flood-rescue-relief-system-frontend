import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Users, Truck, CheckCircle, Clock, Activity,
  TrendingUp, MapPin, CloudRain, Package, BarChart3, ArrowUp, ArrowDown,
  Thermometer, Droplets, Wind, RefreshCw, CloudLightning
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { dashboardAPI, regionAPI } from '../services/api';

function StatCard({ icon: Icon, label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    green: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-amber-500',
    purple: 'from-purple-500 to-purple-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${colors[color]} text-white`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [overview, setOverview] = useState(null);
  const [byProvince, setByProvince] = useState([]);
  const [teamStats, setTeamStats] = useState(null);
  const [resourceOverview, setResourceOverview] = useState(null);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherConfigured, setWeatherConfigured] = useState(false);
  const [weatherProvince, setWeatherProvince] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ov, bp, ts, ro, wa, provs, ws] = await Promise.allSettled([
          dashboardAPI.getOverview(),
          dashboardAPI.getRequestsByProvince(),
          dashboardAPI.getTeamStats(),
          dashboardAPI.getResourceOverview(),
          regionAPI.getWeatherAlerts({ active: true }),
          regionAPI.getProvinces(),
          regionAPI.getWeatherStatus(),
        ]);
        if (ov.status === 'fulfilled') setOverview(ov.value.data?.requests || ov.value.data);
        if (bp.status === 'fulfilled') setByProvince(bp.value.data || []);
        if (ts.status === 'fulfilled') setTeamStats(ts.value.data?.status_summary || ts.value.data);
        if (ro.status === 'fulfilled') setResourceOverview(ro.value.data);
        if (wa.status === 'fulfilled') setWeatherAlerts(wa.value.data || []);
        if (provs.status === 'fulfilled') setProvinces(provs.value.data || []);
        if (ws.status === 'fulfilled') setWeatherConfigured(ws.value.data?.configured || false);
      } catch { /* silent */ }
      setLoading(false);
    }
    load();
  }, []);

  // Load weather khi chọn tỉnh
  async function loadWeather(provinceId) {
    if (!provinceId || !weatherConfigured) return;
    setWeatherLoading(true);
    try {
      const [current, forecast] = await Promise.all([
        regionAPI.getWeatherCurrent(provinceId),
        regionAPI.getWeatherForecast(provinceId),
      ]);
      setWeatherData({ current: current.data, forecast: forecast.data });
    } catch (err) {
      console.error('Weather load error:', err);
      setWeatherData(null);
    }
    setWeatherLoading(false);
  }

  async function handleAutoSync() {
    setSyncing(true);
    try {
      const res = await regionAPI.autoSyncWeatherAlerts({});
      alert(`✅ Đã kiểm tra ${res.data.provinces_checked} tỉnh, tạo ${res.data.alerts_created} cảnh báo mới`);
      // Reload weather alerts
      const wa = await regionAPI.getWeatherAlerts({ active: true });
      setWeatherAlerts(wa.data || []);
    } catch (err) {
      alert('❌ Lỗi: ' + (err.response?.data?.error || err.message));
    }
    setSyncing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const o = overview || {};

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Xin chào, {user?.full_name} 👋
        </h1>
        <p className="text-gray-500 text-sm">Tổng quan tình hình cứu hộ lũ lụt</p>
      </div>

      {/* Active weather alerts */}
      {weatherAlerts.length > 0 && (
        <div className="space-y-2">
          {weatherAlerts.slice(0, 3).map(alert => (
            <div key={alert.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${alert.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-800' :
                  alert.severity === 'high' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                    'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}
            >
              <CloudRain size={18} />
              <span className="font-medium">{alert.title}</span>
              <span className="text-xs opacity-70">— {alert.description?.substring(0, 80)}...</span>
            </div>
          ))}
        </div>
      )}

      {/* Weather Widget - OpenWeatherMap */}
      {weatherConfigured && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudLightning size={18} className="text-blue-500" />
              <h3 className="font-semibold text-gray-800">Thời tiết thực tế</h3>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">OpenWeatherMap</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={weatherProvince}
                onChange={(e) => { setWeatherProvince(e.target.value); loadWeather(e.target.value); }}
              >
                <option value="">— Chọn tỉnh/thành —</option>
                {provinces.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {['admin', 'manager'].includes(user?.role) && (
                <button
                  onClick={handleAutoSync}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm rounded-lg border border-orange-200 transition disabled:opacity-50"
                  title="Tự động kiểm tra thời tiết miền Trung và tạo cảnh báo"
                >
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Đang sync...' : 'Auto-sync cảnh báo'}
                </button>
              )}
            </div>
          </div>

          {weatherLoading && (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-400 mt-2">Đang lấy dữ liệu thời tiết...</p>
            </div>
          )}

          {!weatherLoading && weatherData && (
            <div className="p-5 space-y-4">
              {/* Current weather */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  {weatherData.current.icon_url && (
                    <img src={weatherData.current.icon_url} alt="" className="w-16 h-16" />
                  )}
                  <div>
                    <p className="text-3xl font-bold text-gray-800">{weatherData.current.temperature}°C</p>
                    <p className="text-sm text-gray-500 capitalize">{weatherData.current.weather}</p>
                    <p className="text-xs text-gray-400">{weatherData.current.province_name}</p>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Thermometer size={14} className="text-red-400" />
                    <span className="text-gray-500">Cảm giác:</span>
                    <span className="font-medium">{weatherData.current.feels_like}°C</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Droplets size={14} className="text-blue-400" />
                    <span className="text-gray-500">Độ ẩm:</span>
                    <span className="font-medium">{weatherData.current.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Wind size={14} className="text-gray-400" />
                    <span className="text-gray-500">Gió:</span>
                    <span className="font-medium">{weatherData.current.wind_speed} m/s</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CloudRain size={14} className="text-cyan-400" />
                    <span className="text-gray-500">Mưa 1h:</span>
                    <span className="font-medium">{weatherData.current.rain_1h || 0} mm</span>
                  </div>
                </div>
              </div>

              {/* 5-day forecast */}
              {weatherData.forecast?.daily && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dự báo 5 ngày</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {weatherData.forecast.daily.slice(0, 5).map((day, i) => (
                      <div key={i} className={`text-center p-3 rounded-lg border ${day.total_rain_mm >= 50 ? 'bg-red-50 border-red-200' :
                          day.total_rain_mm >= 20 ? 'bg-orange-50 border-orange-200' :
                            'bg-gray-50 border-gray-100'
                        }`}>
                        <p className="text-xs text-gray-500 font-medium">
                          {new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </p>
                        {day.icon_url && <img src={day.icon_url} alt="" className="w-10 h-10 mx-auto" />}
                        <p className="text-sm font-bold text-gray-700">{day.temp_min}° — {day.temp_max}°</p>
                        <p className="text-[10px] text-gray-400 capitalize">{day.weather_desc}</p>
                        {day.total_rain_mm > 0 && (
                          <p className={`text-[10px] mt-0.5 font-medium ${day.total_rain_mm >= 50 ? 'text-red-600' : 'text-blue-600'
                            }`}>
                            🌧 {day.total_rain_mm} mm
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!weatherLoading && !weatherData && weatherProvince && (
            <div className="p-6 text-center text-gray-400 text-sm">
              Không thể lấy dữ liệu thời tiết. Vui lòng thử lại.
            </div>
          )}

          {!weatherProvince && (
            <div className="p-6 text-center text-gray-400 text-sm">
              👆 Chọn tỉnh/thành để xem thời tiết thực tế
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={AlertTriangle} label="Tổng yêu cầu" value={o.total_requests} color="blue" />
        <StatCard icon={Clock} label="Chờ xử lý" value={o.pending} sub="Cần xác minh" color="orange" />
        <StatCard icon={Activity} label="Đang cứu hộ" value={o.in_progress} color="purple" />
        <StatCard icon={CheckCircle} label="Hoàn thành" value={o.completed} color="green" />
        <StatCard icon={Users} label="Nạn nhân" value={o.total_victims} color="red" />
        <StatCard icon={Users} label="Đã cứu" value={o.total_rescued} color="cyan" />
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Province */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <MapPin size={18} className="text-blue-500" />
            <h3 className="font-semibold text-gray-800">Theo tỉnh/thành</h3>
          </div>
          <div className="p-5">
            {byProvince.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-3">
                {byProvince.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{p.province_name}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                          style={{ width: `${Math.min((p.total_requests / (byProvince[0]?.total_requests || 1)) * 100, 100)}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-800 w-8 text-right">{p.total_requests}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team Stats */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users size={18} className="text-purple-500" />
            <h3 className="font-semibold text-gray-800">Đội cứu hộ</h3>
          </div>
          <div className="p-5">
            {!teamStats ? (
              <p className="text-gray-400 text-sm text-center py-4">Chưa có dữ liệu</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{teamStats.available || 0}</p>
                  <p className="text-xs text-green-600">Sẵn sàng</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-700">{teamStats.on_mission || 0}</p>
                  <p className="text-xs text-orange-600">Đang nhiệm vụ</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{teamStats.total || 0}</p>
                  <p className="text-xs text-blue-600">Tổng đội</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-700">{teamStats.standby || 0}</p>
                  <p className="text-xs text-purple-600">Chờ nhiệm vụ</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resource overview */}
      {resourceOverview && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Package size={18} className="text-amber-500" />
            <h3 className="font-semibold text-gray-800">Tổng quan tài nguyên</h3>
          </div>
          <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xl font-bold text-gray-700">{resourceOverview.vehicles?.total || 0}</p>
              <p className="text-xs text-gray-500">Phương tiện ({resourceOverview.vehicles?.available || 0} sẵn sàng)</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xl font-bold text-gray-700">{resourceOverview.warehouses?.total || 0}</p>
              <p className="text-xs text-gray-500">Kho hàng</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xl font-bold text-gray-700">{resourceOverview.inventory?.total_items || 0}</p>
              <p className="text-xs text-gray-500">Loại vật phẩm</p>
            </div>
            {resourceOverview.inventory?.low_stock_count > 0 && (
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xl font-bold text-red-700">{resourceOverview.inventory?.low_stock_count}</p>
                <p className="text-xs text-red-600">⚠️ Sắp hết hàng</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
