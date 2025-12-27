import React from 'react';
import { Container } from '../types';
import ContainerCell from './ContainerCell';

interface BayViewProps {
  bayNumber: number;
  containers: Container[];
  rowsPerBay: number;
  tiersPerBay: number;
  highlightedContainerIds: Set<string>;
  selectedVessels: string[];
  filterColors: string[];
  flowFilter: 'ALL' | 'EXPORT' | 'IMPORT' | 'EMPTY';
}

const BayView: React.FC<BayViewProps> = ({ bayNumber, containers, rowsPerBay, tiersPerBay, highlightedContainerIds, selectedVessels, filterColors, flowFilter }) => {
  const containerMap = new Map<string, Container>();
  containers.forEach(c => containerMap.set(`${c.row}-${c.tier}`, c));

  const rows = Array.from({ length: rowsPerBay }, (_, i) => i + 1); // [1, 2, 3, 4, 5, 6] - Horizontal Axis
  const tiers = Array.from({ length: tiersPerBay }, (_, i) => i + 1); // [1, 2, 3, 4, 5, 6]
  const reversedTiers = [...tiers].reverse(); // [6, 5, 4, 3, 2, 1] - Vertical Axis (for top-to-bottom rendering)
  
  // Grid columns are now rows (horizontal axis)
  const gridColsClass = `grid-cols-${rowsPerBay}`;

  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <div className={`grid ${gridColsClass} gap-px bg-slate-400 border border-slate-400`}>
        {/* Outer loop for visual rows (Container Tiers, top-to-bottom) */}
        {reversedTiers.map(tierNumber =>
          /* Inner loop for visual columns (Container Rows, left-to-right) */
          rows.map(rowNumber => {
            const container = containerMap.get(`${rowNumber}-${tierNumber}`);
            const isHighlighted = container ? highlightedContainerIds.has(container.id) : false;
            return (
              <ContainerCell 
                key={`${rowNumber}-${tierNumber}`} 
                container={container} 
                isHighlighted={isHighlighted}
                selectedVessels={selectedVessels}
                filterColors={filterColors}
                flowFilter={flowFilter}
              />
            );
          })
        )}
      </div>
      <div className="text-[10px] font-semibold mt-1 text-slate-600">{bayNumber.toString().padStart(2, '0')}</div>
    </div>
  );
};


interface YardRowViewProps {
  label: string;
  containers: Container[];
  totalBays: number;
  rowsPerBay: number;
  tiersPerBay: number;
  highlightedContainerIds: Set<string>;
  selectedVessels: string[];
  filterColors: string[];
  flowFilter: 'ALL' | 'EXPORT' | 'IMPORT' | 'EMPTY';
}

const YardRowView: React.FC<YardRowViewProps> = ({ label, containers, totalBays, rowsPerBay, tiersPerBay, highlightedContainerIds, selectedVessels, filterColors, flowFilter }) => {
  // Generate odd-numbered bays from 1 up to the max calculated from totalBays
  const bays = Array.from({ length: totalBays }, (_, i) => i * 2 + 1);

  const containersByBay = new Map<number, Container[]>();
  containers.forEach(c => {
    if (!containersByBay.has(c.bay)) {
      containersByBay.set(c.bay, []);
    }
    containersByBay.get(c.bay)!.push(c);
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-slate-700 mb-4">{`Block ${label}`}</h2>
      <div className="flex space-x-1 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
        {bays.map(bayNumber => {
          return (
             <React.Fragment key={bayNumber}>
                <BayView
                  bayNumber={bayNumber}
                  containers={containersByBay.get(bayNumber) || []}
                  rowsPerBay={rowsPerBay}
                  tiersPerBay={tiersPerBay}
                  highlightedContainerIds={highlightedContainerIds}
                  selectedVessels={selectedVessels}
                  filterColors={filterColors}
                  flowFilter={flowFilter}
                />
             </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default YardRowView;