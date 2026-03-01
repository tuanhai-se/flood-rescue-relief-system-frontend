import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname.startsWith('/dashboard')) window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// === AUTH ===
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/password', data),
};

// === REQUESTS ===
export const requestAPI = {
  create: (formData) => api.post('/requests', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  track: (code) => api.get(`/requests/track/${code}`),
  trackNotifications: (code) => api.get(`/requests/track/${code}/notifications`),
  confirmRescue: (code) => api.put(`/requests/track/${code}/confirm`),
  getMapData: (params) => api.get('/requests/map', { params }),
  getAll: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  getStats: () => api.get('/requests/stats/overview'),
  verify: (id, data) => api.put(`/requests/${id}/verify`, data),
  reject: (id, data) => api.put(`/requests/${id}/reject`, data),
  assign: (id, data) => api.put(`/requests/${id}/assign`, data),
  updateStatus: (id, data) => api.put(`/requests/${id}/status`, data),
  // FIX: route PUT /requests/:id/cancel đã được thêm vào backend
  cancel: (id) => api.put(`/requests/${id}/cancel`),
  suggestTeam: (id) => api.get(`/requests/${id}/suggest-team`),
};

// === MISSIONS ===
export const missionAPI = {
  getAll: (params) => api.get('/missions', { params }),
  getById: (id) => api.get(`/missions/${id}`),
  updateStatus: (id, data) => api.put(`/missions/${id}/status`, data),
  // FIX: backend dùng PUT (đã sửa từ POST)
  submitResult: (id, formData) => api.put(`/missions/${id}/result`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getLogs: (id) => api.get(`/missions/${id}/logs`),
};

// === TEAMS ===
export const teamAPI = {
  getAll: (params) => api.get('/teams', { params }),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  updateLocation: (id, data) => api.put(`/teams/${id}/location`, data),
  addMember: (id, data) => api.post(`/teams/${id}/members`, data),
  // FIX: backend xóa theo membership ID, không phải user ID
  removeMember: (id, memberId) => api.delete(`/teams/${id}/members/${memberId}`),
  // FIX: route /teams/:id/status đã được thêm vào backend
  updateStatus: (id, data) => api.put(`/teams/${id}/status`, data),
};

// === RESOURCES ===
export const resourceAPI = {
  getVehicles: (params) => api.get('/resources/vehicles', { params }),
  createVehicle: (data) => api.post('/resources/vehicles', data),
  updateVehicle: (id, data) => api.put(`/resources/vehicles/${id}`, data),
  getWarehouses: () => api.get('/resources/warehouses'),
  createWarehouse: (data) => api.post('/resources/warehouses', data),
  getInventory: (params) => api.get('/resources/inventory', { params }),
  updateInventory: (id, data) => api.put(`/resources/inventory/${id}`, data),
  getReliefItems: () => api.get('/resources/relief-items'),
  getDistributions: (params) => api.get('/resources/distributions', { params }),
  createDistribution: (data) => api.post('/resources/distributions', data),
  // === Vehicle Requests (Manager xin điều phối phương tiện) ===
  getVehicleRequests: (params) => api.get('/resources/vehicle-requests', { params }),
  createVehicleRequest: (data) => api.post('/resources/vehicle-requests', data),
  updateVehicleRequestStatus: (id, data) => api.put(`/resources/vehicle-requests/${id}/status`, data),
};

// === REGIONS ===
export const regionAPI = {
  getAll: () => api.get('/regions'),
  // DB provinces (cho admin/seed)
  getProvinces: (params) => api.get('/regions/provinces', { params }),
  getDistricts: (params) => api.get('/regions/districts', { params }),
  getWards: (params) => api.get('/regions/wards', { params }),
  // Vietnam Open API (63 tỉnh/thành — dùng cho dropdowns)
  getVnProvinces: () => api.get('/regions/vn/provinces'),
  getVnDistricts: (province_code) => api.get('/regions/vn/districts', { params: { province_code } }),
  getVnWards: (district_code) => api.get('/regions/vn/wards', { params: { district_code } }),
  getIncidentTypes: () => api.get('/regions/incident-types'),
  getUrgencyLevels: () => api.get('/regions/urgency-levels'),
  getWeatherAlerts: (params) => api.get('/regions/weather-alerts', { params }),
  createWeatherAlert: (data) => api.post('/regions/weather-alerts', data),
  createIncidentType: (data) => api.post('/regions/incident-types', data),
  createUrgencyLevel: (data) => api.post('/regions/urgency-levels', data),
  // --- Weather API (OpenWeatherMap) ---
  getWeatherStatus: () => api.get('/regions/weather-status'),
  getWeatherCurrent: (provinceId) => api.get(`/regions/weather-current/${provinceId}`),
  getWeatherForecast: (provinceId) => api.get(`/regions/weather-forecast/${provinceId}`),
  getWeatherMulti: (provinceIds) => api.get('/regions/weather-multi', { params: { province_ids: provinceIds.join(',') } }),
  autoSyncWeatherAlerts: (data) => api.post('/regions/weather-alerts/auto-sync', data),
};

// === USERS ===
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id) => api.put(`/users/${id}/reset-password`),
  toggleActive: (id) => api.put(`/users/${id}/toggle-active`),
  getCoordinators: () => api.get('/users/coordinators'),
  getCoordinatorRegions: (id) => api.get(`/users/${id}/coordinator-regions`),
  addCoordinatorRegion: (id, data) => api.post(`/users/${id}/coordinator-regions`, data),
  updateCoordinatorRegion: (id, regionId, data) => api.put(`/users/${id}/coordinator-regions/${regionId}`, data),
  removeCoordinatorRegion: (id, regionId) => api.delete(`/users/${id}/coordinator-regions/${regionId}`),
};

// === DASHBOARD ===
export const dashboardAPI = {
  getOverview: (params) => api.get('/dashboard/overview', { params }),
  getRequestsByProvince: (params) => api.get('/dashboard/by-province', { params }),
  // FIX: endpoint đã được thêm vào backend
  getTeamStats: (params) => api.get('/dashboard/team-stats', { params }),
  // FIX: endpoint đã được thêm vào backend
  getResourceOverview: () => api.get('/dashboard/resource-overview'),
  getCoordinatorWorkload: (params) => api.get('/dashboard/coordinator-workload', { params }),
  // FIX: endpoint đã được thêm vào backend
  getWeatherImpact: () => api.get('/dashboard/weather-impact'),
  getHeatmap: (params) => api.get('/dashboard/heatmap', { params }),
  getByProvince: (params) => api.get('/dashboard/by-province', { params }),
  getDailyTrend: (params) => api.get('/dashboard/daily-trend', { params }),
  getResponseTime: (params) => api.get('/dashboard/response-time', { params }),
  getResourceUsage: () => api.get('/dashboard/resource-usage'),
};

// === NOTIFICATIONS ===
export const notificationAPI = {
  getMine: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  create: (data) => api.post('/notifications', data),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// === CONFIG ===
export const configAPI = {
  getAll: () => api.get('/config'),
  get: (key) => api.get(`/config/${key}`),
  set: (key, data) => api.put(`/config/${key}`, data),
};

// === AUDIT LOGS ===
export const auditLogAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
  getActions: () => api.get('/audit-logs/actions'),
};

export default api;
