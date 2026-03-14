import React, { useState, useEffect } from "react";
import { ClipboardList, Search, RefreshCw } from "lucide-react";
import { auditLogAPI } from "../services/api";
import { formatDate } from "../utils/helpers";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: "", page: 1 });

  useEffect(() => {
    load();
  }, [filters.page, filters.action]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await auditLogAPI.getAll(filters);
      setLogs(data?.data || []);
    } catch {
      /* silent */
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ClipboardList size={22} className="text-gray-500" /> Nhật ký hoạt
          động
        </h1>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw size={14} /> Tải lại
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Lọc theo hành động..."
            value={filters.action}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                action: e.target.value,
                page: 1,
              }))
            }
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Thời gian</th>
                <th className="px-4 py-3 text-left">Người dùng</th>
                <th className="px-4 py-3 text-left">Hành động</th>
                <th className="px-4 py-3 text-left">Đối tượng</th>
                <th className="px-4 py-3 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-gray-400"
                  >
                    Đang tải...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-gray-400"
                  >
                    Chưa có nhật ký
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {log.full_name || log.user_id || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.entity_type && (
                        <span>
                          {log.entity_type} #{log.entity_id}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                      {log.ip_address}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
