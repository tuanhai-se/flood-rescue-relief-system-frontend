import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { configAPI } from '../services/api';

export default function ConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [editValues, setEditValues] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await configAPI.getAll();
      setConfigs(data || []);
      const vals = {};
      (data || []).forEach(c => { vals[c.config_key] = c.config_value; });
      setEditValues(vals);
    } catch { /* silent */ }
    setLoading(false);
  }

  async function handleSave(key) {
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await configAPI.set(key, { config_value: editValues[key] });
    } catch { /* silent */ }
    setSaving(prev => ({ ...prev, [key]: false }));
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Settings size={22} className="text-gray-500" /> Cấu hình hệ thống
        </h1>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 transition">
          <RefreshCw size={14} /> Tải lại
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm divide-y">
        {configs.map(c => (
          <div key={c.id || c.config_key} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-mono text-sm text-gray-800">{c.config_key}</p>
              {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editValues[c.config_key] || ''}
                onChange={e => setEditValues(prev => ({ ...prev, [c.config_key]: e.target.value }))}
                className="w-48 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                onClick={() => handleSave(c.config_key)}
                disabled={saving[c.config_key] || editValues[c.config_key] === c.config_value}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-30 transition"
              >
                {saving[c.config_key] ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              </button>
            </div>
          </div>
        ))}
        {configs.length === 0 && (
          <div className="px-6 py-10 text-center text-gray-400">Chưa có cấu hình</div>
        )}
      </div>
    </div>
  );
}
