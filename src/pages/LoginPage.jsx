import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Waves, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch { /* error set in store */ }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1e3a] via-[#152d4f] to-[#0a1628] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-2xl mb-4">
            <Waves className="text-cyan-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Hệ thống Cứu hộ Lũ lụt</h1>
          <p className="text-blue-300/60 text-sm mt-1">Đăng nhập để quản lý & điều phối</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/[0.07] backdrop-blur-xl rounded-2xl p-8 border border-white/10">
          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/[0.07] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition"
                placeholder="admin"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.07] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition pr-12"
                  placeholder="••••••"
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-xl hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><LogIn size={18} /> Đăng nhập</>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-gray-500">
            Test: admin / 123456
          </p>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-blue-400/60 hover:text-blue-300 transition">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
