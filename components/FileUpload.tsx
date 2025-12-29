
import React, { useRef } from 'react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    event.target.value = '';
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
      />
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-4 px-10 py-6 bg-slate-900 text-white rounded-[2rem] shadow-2xl hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed transition-all active:scale-95 group"
      >
        {isLoading ? (
          <>
            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-black uppercase italic tracking-widest">ĐANG XỬ LÝ & PURGE DỮ LIỆU CŨ...</span>
          </>
        ) : (
          <>
            <div className="bg-blue-600 p-2 rounded-xl group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <span className="text-sm font-black uppercase italic tracking-widest">UPLOAD EXCEL TỒN BÃI MỚI (PHỤC HỒI DỮ LIỆU)</span>
          </>
        )}
      </button>
    </div>
  );
};

export default FileUpload;
