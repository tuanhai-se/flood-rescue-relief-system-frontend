import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Phone, Send, Search, AlertTriangle, MapPin, Users, Clock, ChevronDown, 
         ChevronUp, X, Menu, Shield, Waves, Navigation, Eye } from 'lucide-react';
import { requestAPI, regionAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { STATUS_LABELS, getStatusBadgeClass, formatTimeAgo } from '../utils/helpers';

// Custom marker icon factory
function createMarkerIcon(color, size = 28) {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

// Map event handler for getting location
function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) { onLocationSelect(e.latlng); }
  });
  return null;
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom || 13, { duration: 1 }); }, [center]);
  return null;
}

export default function CitizenHome() {
  const [requests, setRequests] = useState([]);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [urgencyLevels, setUrgencyLevels] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [citizenWeather, setCitizenWeather] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showTrack, setShowTrack] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [flyToCenter, setFlyToCenter] = useState(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [form, setForm] = useState({
    citizen_name: '', citizen_phone: '', latitude: '', longitude: '',
    address: '', incident_type_id: '', urgency_level_id: '',
    description: '', victim_count: '1', support_type: '', flood_severity: '2'
  });
  const [formImages, setFormImages] = useState([]);
  const [pickerLocation, setPickerLocation] = useState(null);

  // Load initial data
  useEffect(() => {
    loadMapData();
    loadReferenceData();
    setupSocket();
  }, []);

  useEffect(() => { loadMapData(); }, [selectedProvince]);

  // Load weather khi chọn tỉnh
  useEffect(() => {
    if (selectedProvince) {
      regionAPI.getWeatherCurrent(selectedProvince)
        .then(res => setCitizenWeather(res.data))
        .catch(() => setCitizenWeather(null));
    } else {
      setCitizenWeather(null);
    }
  }, [selectedProvince]);

  async function loadMapData() {
    try {
      const params = {};
      if (selectedProvince) params.province_id = selectedProvince;
      const { data } = await requestAPI.getMapData(params);
      setRequests(data);
    } catch (e) { console.error('Failed to load map data:', e); }
  }

  async function loadReferenceData() {
    try {
      const [types, levels, provs, alerts] = await Promise.all([
        regionAPI.getIncidentTypes(),
        regionAPI.getUrgencyLevels(),
        regionAPI.getProvinces(), // FIX: Dùng DB provinces (có lat/lng và khớp với province_id)
        regionAPI.getWeatherAlerts()
      ]);
      setIncidentTypes(types.data);
      setUrgencyLevels(levels.data);
      // DB provinces có đúng id, latitude, longitude để dùng cho weather API và map filter
      setProvinces(provs.data || []);
      setWeatherAlerts(alerts.data);
    } catch (e) { console.error('Failed to load reference data:', e); }
  }

  function setupSocket() {
    const socket = getSocket();
    socket.on('new_request', (req) => {
      setRequests(prev => [req, ...prev]);
    });
    socket.on('request_updated', (updated) => {
      setRequests(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
    });
  }

  function detectGPS() {
    if (!navigator.geolocation) return alert('Trình duyệt không hỗ trợ GPS');
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setPickerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setFlyToCenter([pos.coords.latitude, pos.coords.longitude]);
        setGpsLoading(false);
      },
      () => { alert('Không thể lấy vị trí GPS. Vui lòng chọn trên bản đồ.'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleMapClick(latlng) {
    if (showForm) {
      setForm(f => ({ ...f, latitude: latlng.lat.toFixed(6), longitude: latlng.lng.toFixed(6) }));
      setPickerLocation(latlng);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.latitude || !form.longitude) return alert('Vui lòng chọn vị trí trên bản đồ hoặc bật GPS');
    
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      formImages.forEach(f => formData.append('images', f));

      const { data } = await requestAPI.create(formData);
      setSubmitResult(data);
      setShowForm(false);
      setForm({ citizen_name: '', citizen_phone: '', latitude: '', longitude: '', address: '', incident_type_id: '', urgency_level_id: '', description: '', victim_count: '1', support_type: '', flood_severity: '2' });
      setFormImages([]);
      setPickerLocation(null);
      loadMapData();
    } catch (err) {
      alert(err.response?.data?.error || 'Gửi yêu cầu thất bại. Vui lòng thử lại.');
    }
    setSubmitting(false);
  }

  const activeRequests = requests.filter(r => !['completed', 'cancelled', 'rejected'].includes(r.status));
  const completedCount = requests.filter(r => r.status === 'completed').length;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-flood-dark">
      {/* Top Bar */}
      <header className="bg-gradient-to-r from-flood-dark via-flood to-flood-dark text-white px-4 py-2 flex items-center justify-between z-50 shadow-lg border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSidebar(!showSidebar)} className="lg:hidden p-1.5 hover:bg-white/10 rounded">
            <Menu size={20} />
          </button>
          <Waves className="text-flood-accent" size={28} />
          <div>
            <h1 className="text-lg font-bold tracking-tight font-display">CỨU HỘ LŨ LỤT</h1>
            <p className="text-[10px] text-blue-300 -mt-0.5">Hệ thống Cứu hộ Cứu trợ Lũ lụt Việt Nam</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedProvince}
            onChange={(e) => {
              setSelectedProvince(e.target.value);
              const prov = provinces.find(p => p.id === parseInt(e.target.value));
              if (prov) setFlyToCenter([prov.latitude, prov.longitude]);
            }}
            className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-flood-accent focus:border-flood-accent"
          >
            <option value="">🗺️ Tất cả tỉnh/thành</option>
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <Link to="/login" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition">
            <Shield size={14} /> Đăng nhập
          </Link>
        </div>
      </header>

      {/* Weather Alert Banner */}
      {weatherAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-orange-600 text-white px-4 py-1.5 text-sm flex items-center gap-2 overflow-hidden">
          <AlertTriangle size={16} className="shrink-0 animate-pulse" />
          <div className="overflow-hidden whitespace-nowrap">
            <span className="inline-block animate-[marquee_20s_linear_infinite]">
              {weatherAlerts.map(a => `⚠️ ${a.title} — ${a.description}`).join(' | ')}
            </span>
          </div>
        </div>
      )}

      {/* Current Weather Mini Bar */}
      {citizenWeather && (
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-1.5 text-sm flex items-center gap-4">
          {citizenWeather.icon_url && (
            <img src={citizenWeather.icon_url} alt="" className="w-8 h-8 -my-1" />
          )}
          <span className="font-medium">{citizenWeather.province_name}</span>
          <span>{citizenWeather.temperature}°C</span>
          <span className="capitalize text-blue-100">{citizenWeather.weather}</span>
          <span className="text-blue-200 text-xs">💧 {citizenWeather.humidity}%</span>
          <span className="text-blue-200 text-xs">💨 {citizenWeather.wind_speed} m/s</span>
          {citizenWeather.rain_1h > 0 && (
            <span className="text-yellow-200 text-xs font-medium">🌧 Mưa: {citizenWeather.rain_1h}mm/h</span>
          )}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - Request List */}
        <aside className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 absolute lg:relative z-40 w-80 lg:w-96 h-full bg-white border-r border-gray-200 flex flex-col transition-transform duration-300`}>
          {/* Stats */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-red-600">{activeRequests.length}</p>
                <p className="text-[10px] text-gray-500">Đang xử lý</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">{completedCount}</p>
                <p className="text-[10px] text-gray-500">Hoàn thành</p>
              </div>
              <div>
                <p className="text-xl font-bold text-blue-600">{requests.length}</p>
                <p className="text-[10px] text-gray-500">Tổng cộng</p>
              </div>
            </div>
          </div>

          {/* Tracking input */}
          <div className="px-4 py-2 border-b bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text" placeholder="Nhập mã theo dõi (VD: RQ-2024-...)"
                value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)}
                className="flex-1 text-sm input-field py-1.5"
              />
              <Link to={trackingCode ? `/track/${trackingCode}` : '/track'}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center">
                <Search size={14} />
              </Link>
            </div>
          </div>

          {/* Request list */}
          <div className="flex-1 overflow-y-auto">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MapPin size={40} className="mb-2" />
                <p className="text-sm">Chưa có yêu cầu cứu hộ</p>
              </div>
            ) : (
              requests.map(req => (
                <div
                  key={req.id}
                  onClick={() => {
                    setSelectedRequest(req);
                    setFlyToCenter([req.latitude, req.longitude]);
                  }}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors
                    ${selectedRequest?.id === req.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${getStatusBadgeClass(req.status)}`}>
                          {STATUS_LABELS[req.status]}
                        </span>
                        {req.urgency_color && (
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: req.urgency_color }} />
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1 truncate">{req.description || req.incident_type || 'Yêu cầu cứu hộ'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {req.district_name && <span className="flex items-center gap-0.5"><MapPin size={10} />{req.district_name}</span>}
                        <span className="flex items-center gap-0.5"><Users size={10} />{req.victim_count} người</span>
                        <span className="flex items-center gap-0.5"><Clock size={10} />{formatTimeAgo(req.created_at)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{req.tracking_code}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[16.0544, 108.2022]}
            zoom={12}
            className="h-full w-full z-10"
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <FlyTo center={flyToCenter} zoom={14} />
            {showForm && <LocationPicker onLocationSelect={handleMapClick} />}

            {/* Request markers */}
            {requests.map(req => (
              <Marker
                key={req.id}
                position={[req.latitude, req.longitude]}
                icon={createMarkerIcon(req.urgency_color || '#3b82f6')}
                eventHandlers={{
                  click: () => { setSelectedRequest(req); }
                }}
              >
                <Popup maxWidth={300}>
                  <div className="min-w-[220px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`badge text-[10px] ${getStatusBadgeClass(req.status)}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                      <span className="text-[10px] text-gray-400">{req.tracking_code}</span>
                    </div>
                    <p className="font-semibold text-sm">{req.incident_type || 'Cứu hộ'}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{req.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>👥 {req.victim_count} người</span>
                      {req.district_name && <span>📍 {req.district_name}</span>}
                    </div>
                    {req.team_name && <p className="text-xs mt-1 text-blue-600">🚒 {req.team_name}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Location picker marker */}
            {pickerLocation && (
              <Marker
                position={[pickerLocation.lat, pickerLocation.lng]}
                icon={L.divIcon({
                  className: '',
                  html: '<div style="width:20px;height:20px;background:#dc2626;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(220,38,38,0.3);animation:emergency-pulse 1.5s infinite;"></div>',
                  iconSize: [20, 20], iconAnchor: [10, 10]
                })}
              />
            )}
          </MapContainer>

          {/* Emergency Action Buttons */}
          <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-3">
            <button
              onClick={() => { setShowForm(!showForm); setShowTrack(false); }}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-white shadow-2xl transition-all duration-300 transform hover:scale-105
                ${showForm ? 'bg-gray-700' : 'bg-gradient-to-r from-red-600 to-red-500 emergency-pulse'}`}
            >
              {showForm ? <><X size={20} /> Đóng</> : <><Send size={20} /> GỬI YÊU CẦU CỨU HỘ</>}
            </button>

            <button
              onClick={() => { setShowTrack(!showTrack); setShowForm(false); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-700 shadow-lg hover:shadow-xl transition-all font-medium border"
            >
              <Eye size={18} /> Theo dõi yêu cầu
            </button>
          </div>

          {/* Toggle sidebar button (mobile) */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="absolute top-4 left-4 z-30 lg:hidden p-2 bg-white rounded-lg shadow-lg"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Rescue Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full sm:w-[500px] max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="animate-pulse" size={24} />
                <div>
                  <h2 className="font-bold text-lg">Gửi yêu cầu cứu hộ</h2>
                  <p className="text-red-100 text-xs">Không cần đăng nhập • Thông tin được bảo mật</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* GPS Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  📍 Vị trí cần cứu hộ <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={detectGPS} disabled={gpsLoading}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm">
                    <Navigation size={16} className={gpsLoading ? 'animate-spin' : ''} />
                    {gpsLoading ? 'Đang lấy GPS...' : 'Lấy vị trí GPS'}
                  </button>
                  <span className="text-gray-400 self-center text-sm">hoặc</span>
                  <button type="button" onClick={() => alert('Nhấn vào bản đồ để chọn vị trí')}
                    className="btn-outline text-sm">Chọn trên bản đồ</button>
                </div>
                {form.latitude && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    ✅ Đã chọn: {form.latitude}, {form.longitude}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ chi tiết</label>
                <input type="text" className="input-field" placeholder="Số nhà, đường, phường/xã..."
                  value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>

              {/* Incident Type & Urgency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại sự cố</label>
                  <select className="input-field" value={form.incident_type_id}
                    onChange={e => setForm(f => ({ ...f, incident_type_id: e.target.value }))}>
                    <option value="">Chọn loại</option>
                    {incidentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ khẩn cấp</label>
                  <select className="input-field" value={form.urgency_level_id}
                    onChange={e => setForm(f => ({ ...f, urgency_level_id: e.target.value }))}>
                    <option value="">Chọn mức</option>
                    {urgencyLevels.map(l => (
                      <option key={l.id} value={l.id} style={{ color: l.color }}>
                        {'●'.repeat(l.priority_score)} {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Victim count & flood severity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số người cần cứu</label>
                  <input type="number" min="1" className="input-field"
                    value={form.victim_count} onChange={e => setForm(f => ({ ...f, victim_count: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mức ngập (1-5)</label>
                  <input type="range" min="1" max="5" className="w-full mt-2"
                    value={form.flood_severity} onChange={e => setForm(f => ({ ...f, flood_severity: e.target.value }))} />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Nhẹ</span><span>Vừa</span><span>Nặng</span><span>Rất nặng</span><span>Cực kỳ</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả tình huống</label>
                <textarea rows={3} className="input-field resize-none"
                  placeholder="Mô tả tình huống ngắn gọn: mực nước, tình trạng người dân, nhu cầu hỗ trợ..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
                  <input type="text" className="input-field" placeholder="Tên người gửi"
                    value={form.citizen_name} onChange={e => setForm(f => ({ ...f, citizen_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input type="tel" className="input-field" placeholder="09xx xxx xxx"
                    value={form.citizen_phone} onChange={e => setForm(f => ({ ...f, citizen_phone: e.target.value }))} />
                </div>
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh hiện trường (tối đa 5)</label>
                <input type="file" multiple accept="image/*" className="text-sm"
                  onChange={e => setFormImages(Array.from(e.target.files).slice(0, 5))} />
                {formImages.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">📷 {formImages.length} ảnh đã chọn</p>
                )}
              </div>

              <button type="submit" disabled={submitting || !form.latitude}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl
                           hover:from-red-700 hover:to-red-600 transition-all transform hover:scale-[1.01]
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Send size={18} />
                {submitting ? 'Đang gửi...' : 'GỬI YÊU CẦU CỨU HỘ NGAY'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Submit Success Modal */}
      {submitResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[420px] rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Gửi yêu cầu thành công!</h3>
            <p className="text-gray-600 mb-4">Yêu cầu cứu hộ của bạn đã được ghi nhận. Hệ thống sẽ phân công đội cứu hộ gần nhất.</p>
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600">Mã theo dõi của bạn:</p>
              <p className="text-2xl font-bold text-blue-700 font-mono">{submitResult.tracking_code}</p>
              <p className="text-xs text-gray-500 mt-1">Lưu lại mã này để theo dõi tiến trình cứu hộ</p>
            </div>
            <div className="flex gap-3">
              <Link to={`/track/${submitResult.tracking_code}`}
                className="flex-1 btn-primary text-center">
                Theo dõi ngay
              </Link>
              <button onClick={() => setSubmitResult(null)} className="flex-1 btn-outline">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
