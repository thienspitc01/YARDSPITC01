
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Container, ParseStats, BlockConfig, BlockStats, RTG_BLOCK_NAMES, AppMode, ContainerRequest, ScheduleData, PlanningSettings } from './types';
import { parseExcelFile } from './services/excelService';
import FileUpload from './components/FileUpload';
import YardRowView from './components/YardRowView';
import HeapBlockView from './components/HeapBlockView';
import BlockConfigurator from './components/BlockConfigurator';
import VesselStatistics from './components/VesselStatistics';
import YardStatistics from './components/YardStatistics';
import DwellTimeStatistics from './components/DwellTimeStatistics';
import Layout from './components/Layout';
import GateForm from './components/GateForm';
import YardDashboard from './components/YardDashboard';
import { startAlarm, stopAlarm } from './services/audioService';
import { initSupabase, syncTable, fetchTableData, subscribeToChanges, CloudConfig } from './services/supabaseService';

const STORAGE_KEYS = {
  CONTAINERS: 'yard_containers_v1',
  STATS: 'yard_stats_v1',
  VESSELS: 'yard_vessels_v1',
  BLOCK_CONFIGS: 'yardBlockConfigs_v5',
  REQUESTS: 'port_requests_v1',
  SCHEDULE: 'yard_schedule_data_v1',
  PLANNING_SETTINGS: 'planning_settings_v19',
  CLOUD_CONFIG: 'yard_cloud_config_v1'
};

const getMachineType = (name: string): 'RTG' | 'RS' => {
    return RTG_BLOCK_NAMES.includes(name.toUpperCase()) ? 'RTG' : 'RS';
};

export const calculateTEU = (container: Container): number => {
    if (container.iso && container.iso.length > 0) {
      const code = container.iso.trim().toUpperCase();
      const prefix = code.charAt(0);
      if (prefix === '1' || prefix === '2') return 1;
      if (prefix === '4' || prefix === 'L') return 2;
    }
    if (container.size >= 40) return 2;
    return 1;
};

const DEFAULT_BLOCKS: BlockConfig[] = [
    { name: 'A1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'B1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'C1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'D1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'A2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'B2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'C2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'D2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'E1', capacity: 600, group: 'GP', isDefault: true, totalBays: 28, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'F1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'G1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'H1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'E2', capacity: 598, group: 'GP', isDefault: true, totalBays: 28, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'F2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'G2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'H2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'A0', capacity: 650, group: 'RỖNG', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'H0', capacity: 650, group: 'RỖNG', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'I0', capacity: 650, group: 'RỖNG', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'N1', capacity: 376, group: 'GP', isDefault: true, totalBays: 20, rowsPerBay: 6, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'N2', capacity: 344, group: 'GP', isDefault: true, totalBays: 20, rowsPerBay: 6, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'N3', capacity: 408, group: 'GP', isDefault: true, totalBays: 20, rowsPerBay: 6, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'N4', capacity: 162, group: 'GP', isDefault: true, totalBays: 10, rowsPerBay: 5, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'N5', capacity: 160, group: 'GP', isDefault: true, totalBays: 10, rowsPerBay: 5, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'Z2', capacity: 516, group: 'GP', isDefault: true, totalBays: 25, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'Z1', capacity: 126, group: 'GP', isDefault: true, totalBays: 10, rowsPerBay: 5, tiersPerBay: 3, blockType: 'GRID' },
    { name: 'I1', capacity: 504, group: 'GP', isDefault: true, totalBays: 25, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'I2', capacity: 336, group: 'GP', isDefault: true, totalBays: 20, rowsPerBay: 6, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'E2-B', capacity: 192, group: 'GP', isDefault: true, totalBays: 12, rowsPerBay: 5, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'R1', capacity: 650, group: 'REEFER', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'R3', capacity: 450, group: 'REEFER', isDefault: true, totalBays: 25, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'R4', capacity: 259, group: 'REEFER', isDefault: true, totalBays: 15, rowsPerBay: 6, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'R2', capacity: 400, group: 'REEFER', isDefault: true, totalBays: 20, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'B0', capacity: 1144, group: 'RỖNG', isDefault: true, totalBays: 40, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'C0', capacity: 940, group: 'RỖNG', isDefault: true, totalBays: 35, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'D0', capacity: 940, group: 'RỖNG', isDefault: true, totalBays: 35, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'E0', capacity: 840, group: 'RỖNG', isDefault: true, totalBays: 32, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'L0', capacity: 940, group: 'RỖNG', isDefault: true, totalBays: 35, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'M0', capacity: 940, group: 'RỖNG', isDefault: true, totalBays: 35, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'M1', capacity: 1128, group: 'GP', isDefault: true, totalBays: 40, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'L1', capacity: 1128, group: 'GP', isDefault: true, totalBays: 40, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'K1', capacity: 378, group: 'GP', isDefault: true, totalBays: 20, rowsPerBay: 6, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'APR01', capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'APR02', capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'APRON', capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'MNR',   capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'WAS',   capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
].map((b: any): BlockConfig => {
    if (b.blockType === 'HEAP') return b as BlockConfig;
    return { ...b, machineType: getMachineType(b.name), blockType: 'GRID' } as BlockConfig;
});

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('VIEWER');
  const [cloudConfig, setCloudConfig] = useState<CloudConfig | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLOUD_CONFIG);
    return saved ? JSON.parse(saved) : null;
  });
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  const [requests, setRequests] = useState<ContainerRequest[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [schedule, setSchedule] = useState<ScheduleData[]>([]);
  const [blockConfigs, setBlockConfigs] = useState<BlockConfig[]>(DEFAULT_BLOCKS);

  // Initialize Supabase and Subscriptions
  useEffect(() => {
    if (cloudConfig) {
      const client = initSupabase(cloudConfig);
      if (client) {
        setIsCloudConnected(true);
        localStorage.setItem(STORAGE_KEYS.CLOUD_CONFIG, JSON.stringify(cloudConfig));
        
        // Initial Fetch
        const loadCloudData = async () => {
          const cloudRequests = await fetchTableData('yard_requests');
          if (cloudRequests.length > 0) setRequests(cloudRequests);
          
          const cloudSchedule = await fetchTableData('yard_schedule');
          if (cloudSchedule.length > 0) setSchedule(cloudSchedule);
          
          const cloudContainers = await fetchTableData('yard_containers');
          if (cloudContainers.length > 0) setContainers(cloudContainers);
        };
        loadCloudData();

        // Subscriptions
        const reqSub = subscribeToChanges('yard_requests', (data) => {
          setRequests(prev => {
            const index = prev.findIndex(r => r.id === data.id);
            if (index > -1) {
              const next = [...prev];
              next[index] = data;
              return next;
            }
            return [...prev, data];
          });
        });

        const schedSub = subscribeToChanges('yard_schedule', (data) => {
          setSchedule(prev => {
             const index = prev.findIndex(s => s.vesselName === data.vesselName);
             if (index > -1) {
               const next = [...prev];
               next[index] = data;
               return next;
             }
             return [...prev, data];
          });
        });

        return () => {
          reqSub?.unsubscribe();
          schedSub?.unsubscribe();
        };
      }
    } else {
        // Fallback to local storage if no cloud
        const r = localStorage.getItem(STORAGE_KEYS.REQUESTS);
        if (r) setRequests(JSON.parse(r));
        const c = localStorage.getItem(STORAGE_KEYS.CONTAINERS);
        if (c) setContainers(JSON.parse(c));
        const s = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
        if (s) setSchedule(JSON.parse(s));
        const b = localStorage.getItem(STORAGE_KEYS.BLOCK_CONFIGS);
        if (b) setBlockConfigs(JSON.parse(b));
    }
  }, [cloudConfig]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ParseStats | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [view, setView] = useState<'map' | 'stats' | 'vessel_stats' | 'dwell_stats'>('map');
  const [isoTypeFilter, setIsoTypeFilter] = useState<'ALL' | 'DRY' | 'REEFER'>('ALL');
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'EXPORT' | 'IMPORT' | 'EMPTY'>('ALL');
  const [vessels, setVessels] = useState<string[]>([]);
  const [selectedVessels, setSelectedVessels] = useState<string[]>(['', '', '']);

  // Sync to Cloud/Local
  useEffect(() => {
    if (!isCloudConnected) {
      localStorage.setItem(STORAGE_KEYS.BLOCK_CONFIGS, JSON.stringify(blockConfigs));
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
      localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
    }
  }, [blockConfigs, requests, schedule, isCloudConnected]);

  // Sync chuông báo động
  useEffect(() => {
    let shouldAlarm = false;
    if (mode === 'YARD') {
      shouldAlarm = requests.some(r => r.status === 'pending' && !r.acknowledgedByYard);
    } else if (mode === 'GATE') {
      shouldAlarm = requests.some(r => r.status === 'assigned' && !r.acknowledgedByGate);
    }
    if (shouldAlarm) startAlarm(); else stopAlarm();
  }, [requests, mode]);

  const handleGateSubmit = (data: Omit<ContainerRequest, 'id' | 'status' | 'timestamp'>) => {
    const newRequest: ContainerRequest = {
      ...data,
      id: `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'pending',
      timestamp: Date.now(),
      acknowledgedByYard: false,
      acknowledgedByGate: false
    };
    setRequests(prev => [...prev, newRequest]);
    if (isCloudConnected) syncTable('yard_requests', newRequest.id, newRequest);
  };

  const handleYardAssign = (requestId: string, location: string) => {
    setRequests(prev => {
      const updated = prev.map(req => 
        req.id === requestId 
          ? { ...req, status: 'assigned', assignedLocation: location, acknowledgedByGate: false } 
          : req
      );
      const req = updated.find(r => r.id === requestId);
      if (req && isCloudConnected) syncTable('yard_requests', req.id, req);
      return updated;
    });
  };

  const handleAcknowledge = (requestId: string, target: 'gate' | 'yard') => {
    setRequests(prev => {
      const updated = prev.map(req => {
        if (req.id === requestId) {
          return target === 'gate' 
            ? { ...req, acknowledgedByGate: true }
            : { ...req, acknowledgedByYard: true };
        }
        return req;
      });
      const req = updated.find(r => r.id === requestId);
      if (req && isCloudConnected) syncTable('yard_requests', req.id, req);
      return updated;
    });
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const { containers: parsedData, stats: parseStats, vessels: parsedVessels } = await parseExcelFile(file);
      setContainers(parsedData);
      setStats(parseStats);
      setVessels(parsedVessels);
      
      if (isCloudConnected) {
        // Only sync a subset or warn user because full yard map can be massive
        // For now, sync all as requested for "many people to see"
        alert("Đang tải dữ liệu bãi lên Cloud... Có thể mất vài giây.");
        for (let i = 0; i < parsedData.length; i += 500) {
            const chunk = parsedData.slice(i, i + 500);
            await syncTable('yard_containers', `BATCH-${i}`, chunk);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    if (window.confirm('Xóa toàn bộ dữ liệu hiện tại?')) {
        setContainers([]);
        setRequests([]);
        setSchedule([]);
        localStorage.clear();
        window.location.reload();
    }
  };

  const containersByBlock = useMemo(() => {
    return containers.reduce((acc, container) => {
        let blockName = container.block;
        if (!acc[blockName]) acc[blockName] = [];
        acc[blockName].push(container);
        return acc;
    }, {} as Record<string, Container[]>);
  }, [containers]);

  const highlightedContainerIds = useMemo(() => {
    const trimmedSearch = searchTerm.trim().toUpperCase();
    if (!trimmedSearch) return new Set<string>();
    return new Set(containers.filter(c => 
        c.id.toUpperCase().includes(trimmedSearch) || 
        c.location.toUpperCase().includes(trimmedSearch.replace(/-/g, ''))
    ).map(c => c.id));
  }, [searchTerm, containers]);

  const processedStats = useMemo(() => {
    const statsMap: Record<string, BlockStats> = {};
    blockConfigs.forEach(block => {
      statsMap[block.name] = {
        name: block.name,
        group: block.group || 'GP',
        capacity: block.capacity || 0,
        exportFullTeus: 0,
        importFullTeus: 0,
        emptyTeus: 0,
        exportFullCount: 0,
        importFullCount: 0,
        emptyCount: 0
      };
    });

    containers.forEach(c => {
      const blockStats = statsMap[c.block];
      if (!blockStats) return;
      if (c.isMultiBay && c.partType === 'end') return;
      const teus = calculateTEU(c);
      if (c.status === 'EMPTY') { blockStats.emptyCount++; blockStats.emptyTeus += teus; }
      else if (c.flow === 'EXPORT') { blockStats.exportFullCount++; blockStats.exportFullTeus += teus; }
      else { blockStats.importFullCount++; blockStats.importFullTeus += teus; }
    });
    return Object.values(statsMap);
  }, [containers, blockConfigs]);

  return (
    <Layout 
      mode={mode} 
      setMode={setMode} 
      isCloudConnected={isCloudConnected}
      onCloudConfig={(config) => setCloudConfig(config)}
    >
      {mode === 'GATE' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 italic uppercase tracking-tighter">Gate Terminal</h2>
            <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full shadow-lg shadow-blue-200"></div>
          </div>
          <GateForm onSubmit={handleGateSubmit} requests={requests} onAcknowledge={(id) => handleAcknowledge(id, 'gate')} />
        </div>
      )}

      {mode === 'YARD' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <YardDashboard 
            requests={requests} 
            onAssign={handleYardAssign} 
            containers={containers}
            schedule={schedule}
            blocks={blockConfigs}
            onAcknowledge={(id) => handleAcknowledge(id, 'yard')}
          />
        </div>
      )}

      {mode === 'VIEWER' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { id: 'map', label: 'Yard Map', icon: 'M9 20l-5.447-2.724A2 2 0 013 15.382V6.618a2 2 0 011.553-1.944L9 2l6 3 5.447-2.724A2 2 0 0121 4.618v8.764a2 2 0 01-1.553 1.944L15 18l-6 2z' },
                    { id: 'stats', label: 'Yard Stats', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                    { id: 'vessel_stats', label: 'Vessel Stats', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { id: 'dwell_stats', label: 'Dwell Time', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
                ].map((tab) => (
                    <button key={tab.id} onClick={() => setView(tab.id as any)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 flex-shrink-0 shadow-sm ${view === tab.id ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
                        {tab.label}
                    </button>
                ))}
            </div>

            {view === 'map' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 w-full">
                            <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
                        </div>
                        {stats && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-1">
                                <div className="font-black text-slate-400 uppercase tracking-widest mb-1">Import Status</div>
                                <div className="flex justify-between gap-8">
                                    <span className="text-slate-500">Containers:</span>
                                    <span className="font-bold text-slate-900">{stats.createdContainers.toLocaleString()}</span>
                                </div>
                                <button onClick={handleClearData} className="text-red-500 hover:text-red-700 font-black uppercase text-[9px] mt-2 block tracking-tighter underline">Xóa Dữ Liệu</button>
                            </div>
                        )}
                    </div>
                  </div>

                  {containers.length > 0 ? (
                    <div className="space-y-8 pb-20">
                        {blockConfigs.map(block => {
                            const blockContainers = containersByBlock[block.name] || [];
                            return block.blockType === 'HEAP' ? (
                                <HeapBlockView key={block.name} label={block.name} containers={blockContainers} capacity={block.capacity || 100} highlightedContainerIds={highlightedContainerIds} selectedVessels={selectedVessels} filterColors={['bg-sky-500', 'bg-lime-500', 'bg-amber-500']} flowFilter={flowFilter} />
                            ) : (
                                <YardRowView key={block.name} label={block.name} containers={blockContainers} totalBays={block.totalBays} rowsPerBay={block.rowsPerBay} tiersPerBay={block.tiersPerBay} highlightedContainerIds={highlightedContainerIds} selectedVessels={selectedVessels} filterColors={['bg-sky-500', 'bg-lime-500', 'bg-amber-500']} flowFilter={flowFilter} />
                            );
                        })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
                        <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">No Data Loaded</h3>
                    </div>
                  )}
                </div>
            )}

            {view === 'stats' && <YardStatistics data={processedStats} containers={containers} blocks={blockConfigs} isoTypeFilter={isoTypeFilter} onFilterChange={setIsoTypeFilter} />}
            {view === 'vessel_stats' && <VesselStatistics containers={containers} vessels={vessels} blocks={blockConfigs} onSelectVessels={setSelectedVessels} />}
            {view === 'dwell_stats' && <DwellTimeStatistics containers={containers} />}
        </div>
      )}
    </Layout>
  );
};

export default App;
