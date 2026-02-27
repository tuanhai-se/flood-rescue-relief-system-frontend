// Status labels in Vietnamese
export const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  verified: 'Đã xác minh',
  assigned: 'Đã phân công',
  in_progress: 'Đang xử lý',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  rejected: 'Từ chối'
};

export const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-blue-100 text-blue-800',
  assigned: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800'
};

export const TEAM_STATUS_LABELS = {
  available: 'Sẵn sàng',
  on_mission: 'Đang nhiệm vụ',
  standby: 'Chờ',
  off_duty: 'Nghỉ'
};

export const VEHICLE_TYPES = {
  boat: 'Xuồng/Tàu',
  truck: 'Xe tải',
  car: 'Xe con',
  ambulance: 'Xe cứu thương',
  helicopter: 'Trực thăng',
  other: 'Khác'
};

export const ROLE_LABELS = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  coordinator: 'Điều phối viên',
  rescue_team: 'Đội cứu hộ'
};

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

export function getStatusBadgeClass(status) {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
}
