
import React, { useRef, useState } from 'react';
import { AppMode, User } from '../types';
import { CloudConfig } from '../services/supabaseService';

interface LayoutProps {
  children: React.ReactNode;
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  user: User;
  onLogout: () => void;
  isCloudConnected: boolean;
  onCloudConfig: (config: CloudConfig) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, mode, setMode, user, onLogout, isCloudConnected, onCloudConfig }) => {
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudInput, setCloudInput] = useState<CloudConfig>(() => {
    const saved = localStorage.getItem('yard_cloud_config_v1');
    return saved ? JSON.parse(saved) : { url: '', key: '' };
  });

  const handleCloudSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCloudConfig(cloudInput);
    setShowCloudModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans selection:bg-blue-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">PORT CONNECT</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">{user.role}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Smart Port v2.0</span>
              </div>
            </div>
          </div>

          {/* Navigation - Only for Planner */}
          {user.role === 'PLANNER' && (
            <nav className="hidden lg:flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button onClick={() => setMode('VIEWER')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${mode === 'VIEWER' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>YARD VIEW</button>
              <button onClick={() => setMode('GATE')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${mode === 'GATE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>GATE TERMINAL</button>
              <button onClick={() => setMode('YARD')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${mode === 'YARD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>YARD PLANNING</button>
            </nav>
          )}

          {/* Gate Terminal Label for Gate User */}
          {user.role === 'GATE' && (
            <div className="hidden lg:block">
              <span className="px-8 py-3 bg-blue-50 text-blue-600 rounded-2xl text-sm font-black uppercase italic tracking-tighter border border-blue-100">
                Gate Terminal Operations
              </span>
            </div>
          )}

          <div className="flex items-center gap-6">
            <button 
                onClick={() => setShowCloudModal(true)}
                className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isCloudConnected ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`}
            >
                <div className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                {isCloudConnected ? 'Cloud Synced' : 'Offline Mode'}
            </button>

            <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-black text-slate-900 uppercase tracking-tighter leading-none">{user.username}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{user.role === 'PLANNER' ? 'Administrator' : 'Operator'}</div>
              </div>
              <button 
                onClick={onLogout}
                className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-100"
                title="Đăng xuất"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {showCloudModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="bg-blue-600 p-8 text-white">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Cloud Connection Settings</h3>
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Sử dụng Supabase để đồng bộ hóa nhiều người dùng</p>
                </div>
                <form onSubmit={handleCloudSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supabase URL</label>
                        <input 
                            type="text" 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-mono text-xs"
                            placeholder="https://xxx.supabase.co"
                            value={cloudInput.url}
                            onChange={e => setCloudInput({...cloudInput, url: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supabase API Key (Anon Key)</label>
                        <input 
                            type="password" 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-mono text-xs"
                            placeholder="eyJhbG..."
                            value={cloudInput.key}
                            onChange={e => setCloudInput({...cloudInput, key: e.target.value})}
                        />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setShowCloudModal(false)} className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">Hủy</button>
                        <button type="submit" className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-white bg-blue-600 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Kết nối & Lưu</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
