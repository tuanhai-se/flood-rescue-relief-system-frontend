import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  Phone,
  Send,
  Search,
  AlertTriangle,
  MapPin,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Menu,
  Shield,
  Waves,
  Navigation,
  Eye,
} from "lucide-react";
import { requestAPI, regionAPI, resourceAPI } from "../services/api";
import { getSocket } from "../services/socket";
import {
  STATUS_LABELS,
  getStatusBadgeClass,
  formatTimeAgo,
} from "../utils/helpers";

// Status-based colors for map markers
const STATUS_MARKER_COLORS = {
  pending: "#eab308", // yellow
  verified: "#3b82f6", // blue
  assigned: "#8b5cf6", // purple
  in_progress: "#f97316", // orange
  completed: "#22c55e", // green
  cancelled: "#6b7280", // gray
  rejected: "#6b7280", // gray
};

function getStatusMarkerColor(status) {
  return STATUS_MARKER_COLORS[status] || "#3b82f6";
}

// Custom marker icon factory
function createMarkerIcon(color, size = 28) {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Warehouse marker — hình ghim bản đồ (pin), khác hoàn toàn với chấm tròn của request
function createWarehouseIcon(type) {
  const isCentral = type === "central";
  // Kho trung tâm: đỏ tươi (nổi nhất trên nền map) | Kho vệ tinh: vàng cam
  const fill = isCentral ? "#dc2626" : "#f59e0b";
  const stroke = isCentral ? "#991b1b" : "#b45309";
  const w = isCentral ? 32 : 24;
  const h = isCentral ? 44 : 34;
  const r = w / 2;
  const label = isCentral ? "🏛" : "📦";
  const fsize = isCentral ? 14 : 11;

  // SVG: hình tròn phía trên + đuôi nhọn phía dưới (giống Google Maps pin)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <circle cx="${r}" cy="${r}" r="${r - 1.5}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
    <polygon points="${r - 6},${w - 4} ${r},${h - 1} ${r + 6},${w - 4}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round"/>
    <text x="${r}" y="${r + fsize * 0.4}" text-anchor="middle" dominant-baseline="middle" font-size="${fsize}">${label}</text>
  </svg>`;

  return L.divIcon({
    className: "",
    html: `<div style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4))">${svg}</div>`,
    iconSize: [w, h],
    iconAnchor: [r, h], // neo tại đầu nhọn
    popupAnchor: [0, -h + 4],
  });
}

// Map event handler for getting location
function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 13, { duration: 1 });
  }, [center]);
  return null;
}

export default function CitizenHome() {
  const [requests, setRequests] = useState([]);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [urgencyLevels, setUrgencyLevels] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [citizenWeather, setCitizenWeather] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showTrack, setShowTrack] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [flyToCenter, setFlyToCenter] = useState(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [pickingFromMap, setPickingFromMap] = useState(false);
  const [trackTab, setTrackTab] = useState("phone");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupResults, setLookupResults] = useState(null); // null = chưa tìm
  const [lookupLoading, setLookupLoading] = useState(false);
  const [sidebarPhoneResults, setSidebarPhoneResults] = useState(null);
  const [sidebarSearching, setSidebarSearching] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [showWarehouses, setShowWarehouses] = useState(true);

  const [form, setForm] = useState({
    citizen_name: "",
    citizen_phone: "",
    latitude: "",
    longitude: "",
    address: "",
    incident_type_id: "",
    urgency_level_id: "",
    description: "",
    victim_count: "1",
    support_type: "",
    flood_severity: "2",
    geo_province_name: "",
    geo_district_name: "",
  });
  const [formImages, setFormImages] = useState([]);
  const [pickerLocation, setPickerLocation] = useState(null);

  // Load initial data
  useEffect(() => {
    loadMapData();
    loadReferenceData();
    setupSocket();
  }, []);

  useEffect(() => {
    loadMapData();
  }, [selectedProvince]);

  // Load weather khi chọn tỉnh
  useEffect(() => {
    if (selectedProvince) {
      regionAPI
        .getWeatherCurrent(selectedProvince)
        .then((res) => setCitizenWeather(res.data))
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
    } catch (e) {
      console.error("Failed to load map data:", e);
    }
  }

  async function loadReferenceData() {
    try {
      const [types, levels, provs, alerts, whs] = await Promise.all([
        regionAPI.getIncidentTypes(),
        regionAPI.getUrgencyLevels(),
        regionAPI.getProvinces(),
        regionAPI.getWeatherAlerts(),
        resourceAPI.getWarehousesMap(),
      ]);
      setIncidentTypes(types.data);
      setUrgencyLevels(levels.data);
      setProvinces(provs.data || []);
      setWeatherAlerts(alerts.data);
      setWarehouses(whs.data || []);
    } catch (e) {
      console.error("Failed to load reference data:", e);
    }
  }

  function setupSocket() {
    const socket = getSocket();
    socket.on("new_request", (req) => {
      setRequests((prev) => [req, ...prev]);
    });
    socket.on("request_updated", (updated) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
      );
    });
  }

  function matchProvinceName(nominatimName) {
    if (!nominatimName || !provinces.length) return nominatimName;
    const norm = (s) =>
      s
        .toLowerCase()
        .replace(/thành phố|tỉnh|tp\.|tp /gi, "")
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
        .replace(/[èéẹẻẽêềếệểễ]/g, "e")
        .replace(/[ìíịỉĩ]/g, "i")
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
        .replace(/[ùúụủũưừứựửữ]/g, "u")
        .replace(/[ỳýỵỷỹ]/g, "y")
        .replace(/đ/g, "d")
        .trim();
    const key = norm(nominatimName);
    const found = provinces.find(
      (p) => norm(p.name).includes(key) || key.includes(norm(p.name)),
    );
    return found ? found.name : nominatimName;
  }

  async function reverseGeocodeAddress(lat, lng) {
    try {
      const base = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`;
      const opts = {
        headers: { "User-Agent": "FloodRescueApp/1.0" },
        signal: AbortSignal.timeout(6000),
      };
      // zoom=6 → tỉnh/thành phố (đủ tin cậy cho Việt Nam)
      // Dữ liệu quận/phường của Nominatim không chính xác cho VN nên chỉ lấy tỉnh
      const r6 = await fetch(`${base}&zoom=6`, opts).then((r) => r.json());
      const a6 = r6?.address || {};
      const province = a6.state || a6.city || a6.province || "";
      return { province, district: "" };
    } catch {}
    return null;
  }

  function detectGPS() {
    if (!navigator.geolocation) return alert("Trình duyệt không hỗ trợ GPS");
    setGpsLoading(true);

    const safetyTimer = setTimeout(() => {
      setGpsLoading(false);
      alert(
        "Hết thời gian chờ GPS. Vui lòng thử lại hoặc chọn vị trí trên bản đồ.",
      );
    }, 12000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(safetyTimer);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy; // meters
        setGpsLoading(false);
        if (accuracy > 2000) {
          // GPS không đủ chính xác (thường xảy ra trên máy tính) → tự mở map picker
          // Vẫn set center bản đồ về vùng đó để user dễ tìm, nhưng không lưu tọa độ
          setFlyToCenter([lat, lng]);
          setPickingFromMap(true);
          alert(
            `GPS máy tính kém chính xác (sai số ~${Math.round(accuracy / 1000)}km).\nVui lòng nhấp chọn đúng vị trí của bạn trên bản đồ.`,
          );
          return;
        }
        // GPS đủ chính xác (điện thoại hoặc máy tính có GPS chip)
        setForm((f) => ({
          ...f,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }));
        setPickerLocation({ lat, lng });
        setFlyToCenter([lat, lng]);
        reverseGeocodeAddress(lat, lng).then((geo) => {
          if (geo)
            setForm((f) => ({
              ...f,
              geo_province_name: matchProvinceName(geo.province),
              geo_district_name: geo.district,
            }));
        });
      },
      (err) => {
        clearTimeout(safetyTimer);
        const msgs = {
          1: "Bạn đã từ chối quyền GPS. Vui lòng cấp quyền trong cài đặt trình duyệt hoặc chọn vị trí trên bản đồ.",
          2: "Không thể xác định vị trí GPS. Vui lòng chọn vị trí trên bản đồ.",
          3: "Hết thời gian chờ GPS. Vui lòng thử lại hoặc chọn vị trí trên bản đồ.",
        };
        alert(
          msgs[err.code] ||
            "Không thể lấy vị trí GPS. Vui lòng chọn trên bản đồ.",
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  function handleMapClick(latlng) {
    if (showForm || pickingFromMap) {
      setForm((f) => ({
        ...f,
        latitude: latlng.lat.toFixed(6),
        longitude: latlng.lng.toFixed(6),
      }));
      setPickerLocation(latlng);
      if (pickingFromMap) setPickingFromMap(false);
      reverseGeocodeAddress(latlng.lat, latlng.lng).then((geo) => {
        if (geo)
          setForm((f) => ({
            ...f,
            geo_province_name: matchProvinceName(geo.province),
            geo_district_name: geo.district,
          }));
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.latitude || !form.longitude)
      return alert("Vui lòng chọn vị trí trên bản đồ hoặc bật GPS");
    if (!form.citizen_name.trim())
      return alert("Vui lòng nhập họ tên người gửi");
    if (!form.citizen_phone.trim())
      return alert("Vui lòng nhập số điện thoại liên hệ");
    if (!form.incident_type_id) return alert("Vui lòng chọn loại sự cố");
    if (!form.urgency_level_id) return alert("Vui lòng chọn mức độ khẩn cấp");
    if (!form.address.trim())
      return alert("Vui lòng nhập địa chỉ chi tiết (số nhà, đường,...)");
    if (!form.victim_count || parseInt(form.victim_count) < 1)
      return alert("Vui lòng nhập số người cần cứu");

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) formData.append(k, v);
      });
      formImages.forEach((f) => formData.append("images", f));

      const { data } = await requestAPI.create(formData);
      setSubmitResult(data);
      setShowForm(false);
      setForm({
        citizen_name: "",
        citizen_phone: "",
        latitude: "",
        longitude: "",
        address: "",
        incident_type_id: "",
        urgency_level_id: "",
        description: "",
        victim_count: "1",
        support_type: "",
        flood_severity: "2",
        geo_province_name: "",
        geo_district_name: "",
      });
      setFormImages([]);
      setPickerLocation(null);
      loadMapData();
    } catch (err) {
      alert(
        err.response?.data?.error || "Gửi yêu cầu thất bại. Vui lòng thử lại.",
      );
    }
    setSubmitting(false);
  }

  async function handleSidebarSearch() {
    const val = trackingCode.trim();
    if (!val) {
      setSidebarPhoneResults(null);
      return;
    }
    // Nếu bắt đầu bằng RQ- → navigate to track page
    if (val.toUpperCase().startsWith("RQ-")) {
      window.location.href = `/track/${val}`;
      return;
    }
    // Ngược lại → tìm theo SĐT
    setSidebarSearching(true);
    try {
      const { data } = await requestAPI.lookupByPhone(val);
      setSidebarPhoneResults(data);
    } catch {
      setSidebarPhoneResults([]);
    }
    setSidebarSearching(false);
  }

  async function lookupByPhone() {
    if (!lookupPhone.trim()) return;
    setLookupLoading(true);
    try {
      const { data } = await requestAPI.lookupByPhone(lookupPhone.trim());
      setLookupResults(data);
    } catch {
      setLookupResults([]);
    }
    setLookupLoading(false);
  }

  const activeRequests = requests.filter(
    (r) => !["completed", "cancelled", "rejected"].includes(r.status),
  );
  const completedCount = requests.filter(
    (r) => r.status === "completed",
  ).length;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-flood-dark">
      {/* Top Bar */}
      <header className="bg-gradient-to-r from-flood-dark via-flood to-flood-dark text-white px-4 py-2 flex items-center justify-between z-50 shadow-lg border-b border-white/10 relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden p-1.5 hover:bg-white/10 rounded"
          >
            <Menu size={20} />
          </button>
          <Waves className="text-flood-accent" size={28} />
          <div>
            <h1 className="text-lg font-bold tracking-tight font-display">
              CỨU HỘ LŨ LỤT
            </h1>
            <p className="text-[10px] text-blue-300 -mt-0.5">
              Hệ thống Cứu hộ Cứu trợ Lũ lụt Việt Nam
            </p>
          </div>
        </div>

        {/* Center CTA */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setShowTrack(false);
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-200 hover:scale-105
              ${showForm ? "bg-gray-600" : "bg-gradient-to-r from-red-600 to-red-500 emergency-pulse"}`}
          >
            {showForm ? (
              <>
                <X size={16} /> Đóng
              </>
            ) : (
              <>
                <Send size={16} /> GỬI YÊU CẦU CỨU HỘ
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedProvince}
            onChange={(e) => {
              setSelectedProvince(e.target.value);
              const prov = provinces.find(
                (p) => p.id === parseInt(e.target.value),
              );
              if (prov) setFlyToCenter([prov.latitude, prov.longitude]);
            }}
            className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-flood-accent focus:border-flood-accent [&>option]:text-gray-900 [&>option]:bg-white"
          >
            <option value="">🗺️ Tất cả tỉnh/thành</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <Link
            to="/login"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
          >
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
              {weatherAlerts
                .map((a) => `⚠️ ${a.title} — ${a.description}`)
                .join(" | ")}
            </span>
          </div>
        </div>
      )}

      {/* Current Weather Mini Bar */}
      {citizenWeather && (
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-1.5 text-sm flex items-center gap-4">
          {citizenWeather.icon_url && (
            <img
              src={citizenWeather.icon_url}
              alt=""
              className="w-8 h-8 -my-1"
            />
          )}
          <span className="font-medium">{citizenWeather.province_name}</span>
          <span>{citizenWeather.temperature}°C</span>
          <span className="capitalize text-blue-100">
            {citizenWeather.weather}
          </span>
          <span className="text-blue-200 text-xs">
            💧 {citizenWeather.humidity}%
          </span>
          <span className="text-blue-200 text-xs">
            💨 {citizenWeather.wind_speed} m/s
          </span>
          {citizenWeather.rain_1h > 0 && (
            <span className="text-yellow-200 text-xs font-medium">
              🌧 Mưa: {citizenWeather.rain_1h}mm/h
            </span>
          )}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - Request List */}
        <aside
          className={`${showSidebar ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 absolute lg:relative z-40 w-80 lg:w-96 h-full bg-white border-r border-gray-200 flex flex-col transition-transform duration-300`}
        >
          {/* Stats */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-red-600">
                  {activeRequests.length}
                </p>
                <p className="text-[10px] text-gray-500">Đang xử lý</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">
                  {completedCount}
                </p>
                <p className="text-[10px] text-gray-500">Hoàn thành</p>
              </div>
              <div>
                <p className="text-xl font-bold text-blue-600">
                  {requests.length}
                </p>
                <p className="text-[10px] text-gray-500">Tổng cộng</p>
              </div>
            </div>
          </div>

          {/* Tracking input */}
          <div className="px-4 py-2 border-b bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập mã (RQ-...) hoặc số điện thoại"
                value={trackingCode}
                onChange={(e) => {
                  setTrackingCode(e.target.value);
                  if (!e.target.value) setSidebarPhoneResults(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSidebarSearch()}
                className="flex-1 text-sm input-field py-1.5"
              />
              <button
                onClick={handleSidebarSearch}
                disabled={sidebarSearching}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {sidebarSearching ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search size={14} />
                )}
              </button>
            </div>
            {/* Phone search results */}
            {sidebarPhoneResults !== null && (
              <div className="mt-2">
                {sidebarPhoneResults.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">
                    Không tìm thấy yêu cầu nào
                  </p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {sidebarPhoneResults.map((r) => (
                      <Link
                        key={r.tracking_code}
                        to={`/track/${r.tracking_code}`}
                        className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-blue-50 text-xs"
                      >
                        <span className="font-mono text-blue-700">
                          {r.tracking_code}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full font-medium ${getStatusBadgeClass(r.status)}`}
                        >
                          {STATUS_LABELS[r.status]}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Request list */}
          <div className="flex-1 overflow-y-auto">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MapPin size={40} className="mb-2" />
                <p className="text-sm">Chưa có yêu cầu cứu hộ</p>
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => {
                    setSelectedRequest(req);
                    setFlyToCenter([req.latitude, req.longitude]);
                  }}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors
                    ${selectedRequest?.id === req.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`badge ${getStatusBadgeClass(req.status)}`}
                        >
                          {STATUS_LABELS[req.status]}
                        </span>
                        {req.urgency_color && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: req.urgency_color }}
                          />
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1 truncate">
                        {req.description ||
                          req.incident_type ||
                          "Yêu cầu cứu hộ"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {req.district_name && (
                          <span className="flex items-center gap-0.5">
                            <MapPin size={10} />
                            {req.district_name}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Users size={10} />
                          {req.victim_count} người
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} />
                          {formatTimeAgo(req.created_at)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {req.tracking_code}
                    </span>
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
              attribution="&copy; OpenStreetMap"
            />
            <FlyTo center={flyToCenter} zoom={14} />
            {(showForm || pickingFromMap) && (
              <LocationPicker onLocationSelect={handleMapClick} />
            )}

            {/* Request markers — chỉ hiện active, ẩn đã hoàn thành/hủy/từ chối */}
            {requests
              .filter(
                (r) =>
                  ![
                    "completed",
                    "cancelled",
                    "rejected",
                    "citizen_confirmed",
                    "closed",
                  ].includes(r.status),
              )
              .map((req) => (
                <Marker
                  key={req.id}
                  position={[req.latitude, req.longitude]}
                  icon={createMarkerIcon(getStatusMarkerColor(req.status))}
                  eventHandlers={{
                    click: () => {
                      setSelectedRequest(req);
                    },
                  }}
                >
                  <Popup maxWidth={280} className="rescue-popup">
                    <div className="min-w-[240px] font-sans">
                      {/* Status + code */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusBadgeClass(req.status)}`}
                        >
                          {STATUS_LABELS[req.status]}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono tracking-wide">
                          {req.tracking_code}
                        </span>
                      </div>

                      {/* Incident type */}
                      <p className="font-bold text-sm text-gray-800">
                        {req.incident_type || "Cứu hộ"}
                      </p>

                      {/* Description */}
                      {req.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {req.description}
                        </p>
                      )}

                      <div className="border-t border-gray-100 mt-2 pt-2 space-y-1.5">
                        {/* Location + victims */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users size={11} className="text-gray-400" />{" "}
                            {req.victim_count} người
                          </span>
                          {req.district_name && (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} className="text-gray-400" />{" "}
                              {req.district_name}
                            </span>
                          )}
                        </div>

                        {/* Sender info */}
                        {req.citizen_name && (
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                              <span className="text-[11px] text-blue-700 font-bold">
                                {req.citizen_name[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-700 truncate">
                                {req.citizen_name}
                              </p>
                              {req.citizen_phone && (
                                <p className="text-[10px] text-gray-400">
                                  {req.citizen_phone}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Team */}
                        {req.team_name && (
                          <p className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                            <span>🚒</span> {req.team_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Warehouse markers */}
            {showWarehouses &&
              warehouses.map((w) => (
                <Marker
                  key={`wh-${w.id}`}
                  position={[w.latitude, w.longitude]}
                  icon={createWarehouseIcon(w.warehouse_type)}
                >
                  <Popup maxWidth={260}>
                    <div className="font-sans min-w-[220px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${w.warehouse_type === "central" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {w.warehouse_type === "central"
                            ? "🏛 Kho trung tâm"
                            : "📦 Kho vệ tinh"}
                        </span>
                      </div>
                      <p className="font-bold text-sm text-gray-800">
                        {w.name}
                      </p>
                      {w.address && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          📍 {w.address}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {w.province_name}
                      </p>
                      {w.capacity_tons > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          📏 Sức chứa: {w.capacity_tons} tấn
                        </p>
                      )}
                      <button
                        onClick={() => {
                          const dest = `${w.latitude},${w.longitude}`;
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`,
                                  "_blank",
                                );
                              },
                              () => {
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
                                  "_blank",
                                );
                              },
                            );
                          } else {
                            window.open(
                              `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
                              "_blank",
                            );
                          }
                        }}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 rounded-lg transition"
                      >
                        🗺️ Chỉ đường đến đây
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Location picker marker */}
            {pickerLocation && (
              <Marker
                position={[pickerLocation.lat, pickerLocation.lng]}
                icon={L.divIcon({
                  className: "",
                  html: '<div style="width:20px;height:20px;background:#dc2626;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(220,38,38,0.3);animation:emergency-pulse 1.5s infinite;"></div>',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                })}
              />
            )}
          </MapContainer>

          {/* Warehouse toggle + legend */}
          <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
            <button
              onClick={() => setShowWarehouses((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium shadow-lg border transition ${showWarehouses ? "bg-white text-gray-800 border-gray-200" : "bg-gray-700 text-white border-gray-600"}`}
            >
              <span>🏭</span> {showWarehouses ? "Ẩn kho" : "Hiện kho"}
            </button>
            {showWarehouses && warehouses.length > 0 && (
              <div className="bg-white/95 rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-xs space-y-1.5">
                <p className="font-semibold text-gray-600 mb-1">Kho cứu trợ</p>
                <div className="flex items-center gap-2">
                  <svg
                    width="14"
                    height="20"
                    viewBox="0 0 32 44"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="16"
                      cy="16"
                      r="14.5"
                      fill="#dc2626"
                      stroke="#991b1b"
                      strokeWidth="2.5"
                    />
                    <polygon
                      points="10,28 16,43 22,28"
                      fill="#dc2626"
                      stroke="#991b1b"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-gray-700">
                    Kho trung tâm (
                    {
                      warehouses.filter((w) => w.warehouse_type === "central")
                        .length
                    }
                    )
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    width="11"
                    height="16"
                    viewBox="0 0 24 34"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10.5"
                      fill="#f59e0b"
                      stroke="#b45309"
                      strokeWidth="2"
                    />
                    <polygon
                      points="7,21 12,33 17,21"
                      fill="#f59e0b"
                      stroke="#b45309"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-gray-700">
                    Kho vệ tinh (
                    {
                      warehouses.filter((w) => w.warehouse_type !== "central")
                        .length
                    }
                    )
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Map picking mode banner */}
          {pickingFromMap && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium pointer-events-auto">
              <MapPin size={18} className="animate-bounce shrink-0" />
              <span>Nhấn vào vị trí cần cứu hộ trên bản đồ</span>
              <button
                onClick={() => setPickingFromMap(false)}
                className="ml-1 hover:text-blue-200"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Track Request Floating Panel */}
          {showTrack && (
            <div className="absolute bottom-36 right-6 z-30 bg-white rounded-2xl shadow-2xl p-4 w-80 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                  <Eye size={15} /> Theo dõi yêu cầu cứu hộ
                </h3>
                <button
                  onClick={() => {
                    setShowTrack(false);
                    setLookupResults(null);
                    setLookupPhone("");
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex rounded-lg bg-gray-100 p-0.5 mb-3">
                <button
                  onClick={() => setTrackTab("code")}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition
                    ${trackTab === "code" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Mã theo dõi
                </button>
                <button
                  onClick={() => setTrackTab("phone")}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition
                    ${trackTab === "phone" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Số điện thoại
                </button>
              </div>

              {trackTab === "code" ? (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập mã (RQ-2024-...)"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      className="flex-1 text-sm input-field py-2"
                      autoFocus
                    />
                    <Link
                      to={trackingCode ? `/track/${trackingCode}` : "#"}
                      onClick={(e) => {
                        if (!trackingCode) e.preventDefault();
                      }}
                      className={`px-3 py-2 rounded-lg text-sm flex items-center transition
                        ${trackingCode ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-400 pointer-events-none"}`}
                    >
                      <Search size={14} />
                    </Link>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Mã theo dõi có dạng RQ-YYYY-XXXXXX
                  </p>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="Nhập số điện thoại..."
                      value={lookupPhone}
                      onChange={(e) => setLookupPhone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && lookupByPhone()}
                      className="flex-1 text-sm input-field py-2"
                      autoFocus
                    />
                    <button
                      onClick={lookupByPhone}
                      disabled={lookupLoading || !lookupPhone.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {lookupLoading ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Search size={14} />
                      )}
                    </button>
                  </div>

                  {lookupResults !== null && lookupResults.length === 0 && (
                    <p className="text-xs text-gray-400 mt-3 text-center">
                      Không tìm thấy yêu cầu nào với SĐT này
                    </p>
                  )}

                  {lookupResults && lookupResults.length > 0 && (
                    <div className="mt-3 space-y-2 max-h-52 overflow-y-auto">
                      {lookupResults.map((r) => (
                        <Link
                          key={r.tracking_code}
                          to={`/track/${r.tracking_code}`}
                          className="block p-2.5 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-medium text-blue-700">
                              {r.tracking_code}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getStatusBadgeClass(r.status)}`}
                            >
                              {STATUS_LABELS[r.status]}
                            </span>
                          </div>
                          {r.description && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {r.description}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {formatTimeAgo(r.created_at)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Emergency Action Buttons */}
          <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-3">
            <button
              onClick={() => {
                setShowForm(!showForm);
                setShowTrack(false);
              }}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-white shadow-2xl transition-all duration-300 transform hover:scale-105
                ${showForm ? "bg-gray-700" : "bg-gradient-to-r from-red-600 to-red-500 emergency-pulse"}`}
            >
              {showForm ? (
                <>
                  <X size={20} /> Đóng
                </>
              ) : (
                <>
                  <Send size={20} /> GỬI YÊU CẦU CỨU HỘ
                </>
              )}
            </button>

            <button
              onClick={() => {
                setShowTrack(!showTrack);
                setShowForm(false);
              }}
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
      {showForm && !pickingFromMap && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full sm:w-[520px] max-h-[92vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-500 text-white px-6 py-4 rounded-t-3xl sm:rounded-t-2xl flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="animate-pulse" size={22} />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">
                    Gửi yêu cầu cứu hộ
                  </h2>
                  <p className="text-red-100 text-[11px]">
                    Không cần đăng nhập • Miễn phí • Bảo mật
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-white/20 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto flex-1 p-5 space-y-4"
            >
              {/* === SECTION 1: VỊ TRÍ === */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={13} /> Vị trí cần cứu hộ{" "}
                  <span className="text-red-500">*</span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={detectGPS}
                    disabled={gpsLoading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60"
                  >
                    <Navigation
                      size={15}
                      className={gpsLoading ? "animate-spin" : ""}
                    />
                    {gpsLoading ? "Đang lấy GPS..." : "Lấy vị trí GPS"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickingFromMap(true)}
                    className="px-4 py-2.5 bg-white border border-blue-200 text-blue-700 text-sm font-medium rounded-xl hover:bg-blue-50 transition"
                  >
                    Chọn trên bản đồ
                  </button>
                </div>
                {form.latitude ? (
                  <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <MapPin
                      size={13}
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <div className="text-xs">
                      {form.geo_district_name || form.geo_province_name ? (
                        <span className="text-green-700 font-semibold">
                          {[form.geo_district_name, form.geo_province_name]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">
                          Đang xác định địa chỉ...
                        </span>
                      )}
                      <span className="text-gray-400 ml-1 block">
                        {form.latitude}, {form.longitude}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-blue-400 text-center">
                    Nhấn GPS hoặc chọn điểm trên bản đồ
                  </p>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Địa chỉ chi tiết (số nhà, đường,...){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="VD: 45 Nguyễn Huệ, phường 1..."
                    value={form.address}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* === SECTION 2: THÔNG TIN SỰ CỐ === */}
              <div className="bg-orange-50 rounded-xl p-4 space-y-3 border border-orange-100">
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={13} /> Thông tin sự cố
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Loại sự cố <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input-field text-sm"
                      value={form.incident_type_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          incident_type_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">-- Chọn loại --</option>
                      {incidentTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Mức độ khẩn cấp <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input-field text-sm"
                      value={form.urgency_level_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          urgency_level_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">-- Chọn mức --</option>
                      {urgencyLevels.map((l, i) => (
                        <option key={l.id} value={l.id}>
                          {"●".repeat(urgencyLevels.length - i)} {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Số người cần cứu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input-field text-sm"
                      value={form.victim_count}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, victim_count: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Mức ngập:{" "}
                      <span className="font-bold text-orange-600">
                        Cấp {form.flood_severity}/5
                      </span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      className="w-full mt-2"
                      value={form.flood_severity}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          flood_severity: e.target.value,
                        }))
                      }
                    />
                    <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                      <span>Nhẹ</span>
                      <span>Vừa</span>
                      <span>Nặng</span>
                      <span>Rất nặng</span>
                      <span>Cực kỳ</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Mô tả tình huống (không bắt buộc)
                  </label>
                  <textarea
                    rows={3}
                    className="input-field text-sm resize-none"
                    placeholder="Mô tả ngắn: mực nước, tình trạng sức khỏe, nhu cầu hỗ trợ..."
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* === SECTION 3: THÔNG TIN LIÊN HỆ === */}
              <div className="bg-purple-50 rounded-xl p-4 space-y-3 border border-purple-100">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={13} /> Thông tin liên hệ
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Họ tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      placeholder="Họ và tên"
                      value={form.citizen_name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, citizen_name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      className="input-field text-sm"
                      placeholder="09xx xxx xxx"
                      value={form.citizen_phone}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          citizen_phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Ảnh hiện trường (tối đa 5 ảnh)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="text-xs w-full"
                    onChange={(e) =>
                      setFormImages(Array.from(e.target.files).slice(0, 5))
                    }
                  />
                  {formImages.length > 0 && (
                    <p className="text-xs text-purple-600 mt-1">
                      📷 Đã chọn {formImages.length} ảnh
                    </p>
                  )}
                </div>
              </div>

              {/* Required note */}
              <p className="text-[11px] text-gray-400 text-center">
                Các trường có dấu{" "}
                <span className="text-red-500 font-bold">*</span> là bắt buộc
              </p>

              <button
                type="submit"
                disabled={submitting || !form.latitude}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold rounded-xl
                           hover:from-red-700 hover:to-orange-600 transition-all shadow-lg shadow-red-500/25
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                <Send size={18} />
                {submitting ? "Đang gửi yêu cầu..." : "GỬI YÊU CẦU CỨU HỘ NGAY"}
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
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Gửi yêu cầu thành công!
            </h3>
            <p className="text-gray-600 mb-4">
              Yêu cầu cứu hộ của bạn đã được ghi nhận. Hệ thống sẽ phân công đội
              cứu hộ gần nhất.
            </p>
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600">Mã theo dõi của bạn:</p>
              <p className="text-2xl font-bold text-blue-700 font-mono">
                {submitResult.tracking_code}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Lưu lại mã này để theo dõi tiến trình cứu hộ
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to={`/track/${submitResult.tracking_code}`}
                className="flex-1 btn-primary text-center"
              >
                Theo dõi ngay
              </Link>
              <button
                onClick={() => setSubmitResult(null)}
                className="flex-1 btn-outline"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
