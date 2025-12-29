
import React from 'react';

interface EmergencyModalProps {
  title: string;
  message: string;
  onAcknowledge: () => void;
  type?: 'danger' | 'info';
}

const EmergencyModal: React.FC<EmergencyModalProps> = ({ title, message, onAcknowledge, type = 'danger' }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      {/* Background Flashing Overlay */}
      <div className={`absolute inset-0 animate-pulse-fast ${type === 'danger' ? 'bg-red-600' : 'bg-blue-600'}`}></div>
      
      {/* Content Card */}
      <div className="relative bg-white w-full max-w-4xl mx-4 p-12 rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] border-[12px] border-white/20 animate-in zoom-in-95 duration-300 text-center space-y-10">
        <div className={`mx-auto w-32 h-32 rounded-full flex items-center justify-center mb-8 ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          <svg className="w-20 h-20 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>

        <div className="space-y-4">
          <h2 className={`text-6xl font-black uppercase italic tracking-tighter ${type === 'danger' ? 'text-red-600' : 'text-blue-600'}`}>
            {title}
          </h2>
          <p className="text-2xl font-bold text-slate-800 uppercase tracking-tight">
            {message}
          </p>
        </div>

        <div className="pt-8">
          <button 
            onClick={onAcknowledge}
            className={`w-full py-10 rounded-[2.5rem] text-3xl font-black uppercase italic tracking-tighter shadow-2xl transition-all active:scale-95 border-b-[10px] ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white border-red-900' : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-900'}`}
          >
            XÁC NHẬN ĐÃ NHẬN THÔNG TIN
          </button>
        </div>

        <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em] animate-pulse">
          Hệ thống sẽ không tắt báo động cho đến khi bạn xác nhận
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-fast {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-fast {
          animation: pulse-fast 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}} />
    </div>
  );
};

export default EmergencyModal;
