
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BlockConfig, Container, ScheduleData, RTG_BLOCK_NAMES } from '../types';
import { calculateTEU } from '../App';

declare const pdfjsLib: any;
declare const Tesseract: any;
declare const html2canvas: any;

interface VesselStatisticsProps {
  containers: Container[];
  vessels: string[];
  blocks: BlockConfig[];
  onSelectVessels?: (vessels: string[]) => void;
  scheduleData: ScheduleData[]; // From App.tsx
  onScheduleUpdate: (newSchedule: ScheduleData[]) => void; // To App.tsx
}

const VesselStatistics: React.FC<VesselStatisticsProps> = ({ 
    containers, 
    vessels, 
    blocks, 
    onSelectVessels,
    scheduleData,
    onScheduleUpdate
}) => {
  const [selectedVessels, setSelectedVessels] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'filters' | 'schedule' | 'discharge' | 'load'>('filters');
  const [vesselFilterType, setVesselFilterType] = useState<'ALL' | 'SCHEDULE' | 'OTHER'>('ALL');
  
  const [selectedBlockNames, setSelectedBlockNames] = useState<Set<string>>(new Set());
  const [isBlockFilterOpen, setIsBlockFilterOpen] = useState(false);
  const blockFilterRef = useRef<HTMLTableHeaderCellElement>(null);

  const [pastedText, setPastedText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerCountRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (blocks.length > 0 && selectedBlockNames.size === 0) {
        setSelectedBlockNames(new Set(blocks.map(b => b.name)));
    }
  }, [blocks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (blockFilterRef.current && !blockFilterRef.current.contains(event.target as Node)) {
        setIsBlockFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isExportChecked, setIsExportChecked] = useState(true);
  const [isImportChecked, setIsImportChecked] = useState(true);
  const [filterExportFull, setFilterExportFull] = useState(true);
  const [filterExportEmpty, setFilterExportEmpty] = useState(true);
  const [filterImportFull, setFilterImportFull] = useState(true);
  const [filterImportEmpty, setFilterImportEmpty] = useState(true);

  const handleVesselSelection = (vessel: string) => {
    setSelectedVessels(prev =>
      prev.includes(vessel) ? prev.filter(v => v !== vessel) : [...prev, vessel]
    );
  };

  const handleExportImage = async () => {
      if (containerCountRef.current && typeof html2canvas !== 'undefined') {
          try {
              const clone = containerCountRef.current.cloneNode(true) as HTMLElement;
              clone.style.position = 'absolute';
              clone.style.left = '-9999px';
              clone.style.width = 'max-content';
              clone.style.height = 'auto';
              clone.style.maxHeight = 'none';
              clone.style.overflow = 'visible';
              document.body.appendChild(clone);
              const canvas = await html2canvas(clone, { scale: 2 });
              document.body.removeChild(clone);
              const link = document.createElement('a');
              link.href = canvas.toDataURL("image/png");
              link.download = `Vessel_Report_${new Date().toISOString().slice(0,10)}.png`;
              link.click();
          } catch (e) { alert("Export failed"); }
      }
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsParsing(true);
      setPastedText('Processing multiple files...');
      let fullExtractedText = '';

      try {
          for (let f = 0; f < files.length; f++) {
              const file = files[f];
              let text = `--- FILE: ${file.name} ---\n`;
              
              if (file.type === 'application/pdf') {
                  const arrayBuffer = await file.arrayBuffer();
                  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                  for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
                      const page = await pdf.getPage(i);
                      const content = await page.getTextContent();
                      text += content.items.map((item: any) => item.str).join(' ') + '\n';
                  }
              } else if (file.type.startsWith('image/')) {
                  const result = await Tesseract.recognize(file, 'eng');
                  text += result.data.text;
              }
              fullExtractedText += text + '\n\n';
          }
          
          setPastedText(fullExtractedText);
          parseTextAndExtractSchedule(fullExtractedText);
      } catch (error: any) {
          setPastedText(`Error: ${error.message}`);
      } finally {
          setIsParsing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const parseTextAndExtractSchedule = (text: string) => {
    const vesselMatches: { name: string; index: number }[] = [];
    vessels.forEach(v => {
        if (!v) return;
        const pattern = v.trim().split(/\s+/).join('[\\s\\r\\n]+');
        const regex = new RegExp(pattern, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) { vesselMatches.push({ name: v, index: match.index }); }
    });
    vesselMatches.sort((a, b) => a.index - b.index);

    const dataMatches: { discharge: number; load: number; index: number }[] = [];
    const disLoadRegex = /Dis\/Load[:\s]*([0-9., ]+?)\s*[\/|\\]\s*([0-9., ]+)/gi;
    let match;
    while ((match = disLoadRegex.exec(text)) !== null) {
        const cleanNumber = (s: string) => parseInt((s || '').replace(/[^\d]/g, ''), 10) || 0;
        dataMatches.push({ discharge: cleanNumber(match[1]), load: cleanNumber(match[2]), index: match.index });
    }

    const newSchedule: ScheduleData[] = [];
    dataMatches.forEach(data => {
        let bestVessel = null;
        for (let i = vesselMatches.length - 1; i >= 0; i--) {
            if (vesselMatches[i].index < data.index) {
                bestVessel = vesselMatches[i];
                break;
            }
        }
        if (bestVessel && !newSchedule.find(s => s.vesselName === bestVessel!.name)) {
            newSchedule.push({ vesselName: bestVessel.name, discharge: data.discharge, load: data.load });
        }
    });
    
    // Purge old, set new
    onScheduleUpdate(newSchedule);
    
    if (newSchedule.length > 0) {
        const foundNames = newSchedule.map(s => s.vesselName);
        setSelectedVessels(prev => Array.from(new Set([...prev, ...foundNames])));
    }
  };

  const displayedVessels = selectedVessels.filter(v => vessels.includes(v)).sort();
  const filteredVesselList = useMemo(() => vessels.filter(v => {
      const isScheduled = scheduleData.some(s => s.vesselName === v);
      if (vesselFilterType === 'SCHEDULE') return isScheduled;
      if (vesselFilterType === 'OTHER') return !isScheduled;
      return true;
  }), [vessels, vesselFilterType, scheduleData]);

  const tableData = useMemo(() => {
    const data: Record<string, any> = {};
    const totals = { c20: 0, c40: 0, teus: 0, vesselCounts: {} as any };
    displayedVessels.forEach(v => totals.vesselCounts[v] = 0);
    blocks.forEach(b => {
        data[b.name] = { c20: 0, c40: 0, teus: 0, vesselCounts: {} as any };
        displayedVessels.forEach(v => data[b.name].vesselCounts[v] = 0);
    });
    containers.forEach(c => {
        if (!c.vessel || (c.isMultiBay && c.partType === 'end')) return;
        const isExport = c.flow === 'EXPORT';
        const isFull = c.status === 'FULL';
        const isEmpty = c.status === 'EMPTY';
        let include = false;
        if (isExport) { if (isExportChecked && ((isFull && filterExportFull) || (isEmpty && filterExportEmpty))) include = true; }
        else { if (isImportChecked && ((isFull && filterImportFull) || (isEmpty && filterImportEmpty))) include = true; }
        if (!include) return;
        if (displayedVessels.includes(c.vessel) && data[c.block]) {
             const stats = data[c.block];
             stats.vesselCounts[c.vessel] = (stats.vesselCounts[c.vessel] || 0) + 1;
             if (c.size === 20) stats.c20++; else stats.c40++;
             stats.teus += calculateTEU(c);
             if (selectedBlockNames.has(c.block)) {
                totals.vesselCounts[c.vessel] = (totals.vesselCounts[c.vessel] || 0) + 1;
                if (c.size === 20) totals.c20++; else totals.c40++;
                totals.teus += calculateTEU(c);
             }
        }
    });
    return { rows: data, totals };
  }, [containers, blocks, displayedVessels, isExportChecked, isImportChecked, filterExportFull, filterExportEmpty, filterImportFull, filterImportEmpty, selectedBlockNames]);

  const visibleBlocks = blocks.filter(b => selectedBlockNames.has(b.name) && (tableData.rows[b.name]?.teus > 0));

  const dischargeAnalysis = useMemo(() => {
      const rtg = blocks.filter(b => b.machineType === 'RTG');
      const rtgCap = rtg.reduce((s, b) => s + (b.capacity || 0), 0);
      const rtgUsed = rtg.reduce((s, b) => s + containers.filter(c => c.block === b.name && !(c.isMultiBay && c.partType === 'end')).reduce((acc, c) => acc + calculateTEU(c), 0), 0);
      return { rtgCap, rtgUsed, rtgAvailable: rtgCap - rtgUsed };
  }, [blocks, containers]);

  return (
    <div className="bg-white rounded-xl shadow-lg min-h-[600px] flex flex-col overflow-hidden">
      <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50">
         {['filters', 'schedule', 'discharge', 'load'].map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-4 font-black text-xs uppercase tracking-widest ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}>
                {tab.replace('_', ' ')} {tab === 'schedule' ? `(${scheduleData.length})` : ''}
             </button>
         ))}
      </div>

      <div className="p-8">
          {activeTab === 'filters' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                <div className="space-y-6">
                  <h3 className="font-black text-slate-800 uppercase tracking-tighter italic">Vessel Control</h3>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                      {(['ALL', 'SCHEDULE', 'OTHER'] as const).map(t => (
                        <button key={t} onClick={() => setVesselFilterType(t)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${vesselFilterType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{t}</button>
                      ))}
                  </div>
                  <div className="max-h-[500px] overflow-y-auto space-y-1 pr-2 scrollbar-hide">
                    {filteredVesselList.map(v => (
                      <label key={v} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer group transition-all">
                        <input type="checkbox" checked={selectedVessels.includes(v)} onChange={() => handleVesselSelection(v)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 break-all uppercase">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-3 space-y-6">
                  <div className="flex justify-between items-center">
                      <div className="flex gap-4">
                        <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer font-black text-xs text-green-700 uppercase italic">
                                <input type="checkbox" checked={isExportChecked} onChange={e => setIsExportChecked(e.target.checked)} className="rounded" /> Export
                            </label>
                        </div>
                        <div className="bg-yellow-50 px-4 py-2 rounded-xl border border-yellow-100 flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer font-black text-xs text-yellow-700 uppercase italic">
                                <input type="checkbox" checked={isImportChecked} onChange={e => setIsImportChecked(e.target.checked)} className="rounded" /> Import
                            </label>
                        </div>
                      </div>
                      <button onClick={handleExportImage} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all">Export Report</button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm" ref={containerCountRef}>
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Block</th>
                          <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Summary</th>
                          {displayedVessels.map(v => (
                            <th key={v} className="p-5 text-[11px] font-black text-slate-900 uppercase tracking-tighter italic border-b border-slate-100 text-center">{v}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {visibleBlocks.map(block => (
                          <tr key={block.name} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-5 font-black text-slate-900">{block.name}</td>
                            <td className="p-5 text-center">
                                <div className="text-sm font-black">{tableData.rows[block.name].teus} <span className="text-[10px] text-slate-400">TEU</span></div>
                                <div className="text-[10px] font-bold text-slate-400">{tableData.rows[block.name].c20}/{tableData.rows[block.name].c40}</div>
                            </td>
                            {displayedVessels.map(v => (
                              <td key={v} className="p-5 text-center font-bold text-slate-600">{tableData.rows[block.name].vesselCounts[v] || '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
              <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                 <div className="bg-blue-600 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                     <div className="relative z-10 space-y-6">
                        <div>
                            <h3 className="text-3xl font-black uppercase italic tracking-tighter">Import Schedule Manager</h3>
                            <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mt-2">Hỗ trợ upload nhiều file PDF/Hình ảnh cùng lúc</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div 
                                className={`bg-white/10 backdrop-blur-md border-2 border-dashed border-white/30 rounded-[2rem] p-10 flex flex-col items-center justify-center h-56 transition-all hover:bg-white/20 cursor-pointer ${isParsing ? 'animate-pulse' : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {isParsing ? (
                                    <div className="text-center space-y-3">
                                        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        <span className="text-xs font-black uppercase tracking-widest">Đang phân tích...</span>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-3">
                                        <svg className="w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <span className="text-xs font-black uppercase tracking-widest block">Chọn file lịch tàu (PDF/IMG)</span>
                                        <span className="text-[10px] opacity-60 font-bold uppercase">Có thể chọn nhiều file</span>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf, image/*" multiple onChange={handleFileSelect} />
                            </div>
                            <textarea className="bg-white/5 border border-white/20 rounded-[2rem] p-6 text-[11px] font-mono text-blue-50 focus:outline-none focus:ring-2 ring-white/30 h-56 scrollbar-hide" placeholder="Nội dung trích xuất sẽ hiển thị ở đây..." value={pastedText} onChange={e => setPastedText(e.target.value)} />
                        </div>
                        <div className="flex justify-end">
                            <button onClick={() => parseTextAndExtractSchedule(pastedText)} className="bg-white text-blue-600 px-10 py-4 rounded-2xl font-black text-sm uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all">Cập nhật lịch (Xóa cũ nạp mới)</button>
                        </div>
                     </div>
                 </div>

                 <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-xl">
                     <div className="bg-slate-900 px-10 py-6 flex justify-between items-center">
                        <span className="text-white font-black uppercase tracking-widest text-xs italic">Current Live Schedule</span>
                        <span className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full">{scheduleData.length} Vessels</span>
                     </div>
                     <table className="w-full text-left">
                         <thead>
                             <tr className="bg-slate-50">
                                 <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase">Vessel Name</th>
                                 <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase text-right">Discharge</th>
                                 <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase text-right">Load</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                             {scheduleData.map((row, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50/50">
                                     <td className="px-10 py-5 uppercase italic tracking-tighter">{row.vesselName}</td>
                                     <td className="px-10 py-5 text-right text-green-600 font-black">{row.discharge}</td>
                                     <td className="px-10 py-5 text-right text-orange-600 font-black">{row.load}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
              </div>
          )}

          {activeTab === 'discharge' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                  <div className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-10">
                      <div className="space-y-2">
                          <h4 className="text-3xl font-black uppercase italic tracking-tighter leading-none">RTG Capacity Status</h4>
                          <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Phân tích khả năng tiếp nhận hàng nhập</p>
                      </div>
                      <div className="flex gap-6">
                          <div className="bg-white/10 p-6 rounded-[2rem] text-center border border-white/20 min-w-[140px]">
                              <div className="text-[10px] font-black uppercase opacity-60 mb-1">Available</div>
                              <div className="text-3xl font-black">{dischargeAnalysis.rtgAvailable}</div>
                          </div>
                          <div className="bg-white/10 p-6 rounded-[2rem] text-center border border-white/20 min-w-[140px]">
                              <div className="text-[10px] font-black uppercase opacity-60 mb-1">Occupancy</div>
                              <div className="text-3xl font-black">{Math.round((dischargeAnalysis.rtgUsed / dischargeAnalysis.rtgCap) * 100)}%</div>
                          </div>
                      </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-xl">
                      <table className="w-full text-left">
                          <thead className="bg-slate-50">
                             <tr>
                                 <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase">Vessel</th>
                                 <th className="px-10 py-5 text-right text-[10px] font-black text-slate-400 uppercase">Est. Discharge</th>
                                 <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase">RTG Feasibility</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                             {scheduleData.map((row, idx) => {
                                 const fits = row.discharge <= dischargeAnalysis.rtgAvailable;
                                 return (
                                     <tr key={idx} className="hover:bg-slate-50/50">
                                         <td className="px-10 py-5 uppercase italic tracking-tighter">{row.vesselName}</td>
                                         <td className="px-10 py-5 text-right font-black">{row.discharge}</td>
                                         <td className="px-10 py-5">
                                             <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic tracking-widest ${fits ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                 {fits ? 'Fit in RTG' : `Overflow (${row.discharge - dischargeAnalysis.rtgAvailable})`}
                                             </span>
                                         </td>
                                     </tr>
                                 );
                             })}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {activeTab === 'load' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                 {scheduleData.map((row, idx) => {
                     const threshold = Math.round(row.load / 4);
                     const relevantBlocks = blocks.filter(b => (tableData.rows[b.name]?.vesselCounts[row.vesselName] || 0) > 0);
                     return (
                         <div key={idx} className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-lg group">
                             <div className="bg-orange-600 px-10 py-6 text-white flex justify-between items-center">
                                 <h4 className="text-xl font-black uppercase italic tracking-tighter">{row.vesselName}</h4>
                                 <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Threshold (Load/4): {threshold}</div>
                             </div>
                             <div className="p-10 grid grid-cols-1 md:grid-cols-4 gap-6">
                                 {relevantBlocks.map(block => {
                                     const count = tableData.rows[block.name]?.vesselCounts[row.vesselName] || 0;
                                     const alert = count > threshold;
                                     return (
                                         <div key={block.name} className={`p-6 rounded-[2rem] border-2 transition-all ${alert ? 'bg-red-50 border-red-200 shadow-lg scale-105' : 'bg-slate-50 border-slate-100'}`}>
                                             <div className="flex justify-between items-center mb-3">
                                                 <span className="font-black text-slate-900">{block.name}</span>
                                                 {alert && <span className="bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase">Heavy Load</span>}
                                             </div>
                                             <div className="text-4xl font-black tracking-tighter text-slate-800">{count}</div>
                                             <div className="text-[9px] font-bold text-slate-400 uppercase mt-2">{alert ? `Exceeds by ${count-threshold}` : `Room left: ${threshold-count}`}</div>
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>
                     );
                 })}
              </div>
          )}
      </div>
    </div>
  );
};

export default VesselStatistics;
