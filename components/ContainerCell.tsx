import React from 'react';
import { Container } from '../types';

interface ContainerCellProps {
  container?: Container;
  isHighlighted?: boolean;
  selectedVessels: string[];
  filterColors: string[];
  flowFilter: 'ALL' | 'EXPORT' | 'IMPORT' | 'EMPTY';
}

const ownerColors: { [key: string]: string } = {
  'MAERSK': 'bg-sky-400 text-white',
  'MSC': 'bg-yellow-400 text-black',
  'CMA': 'bg-blue-600 text-white',
  'COSCO': 'bg-blue-800 text-white',
  'HAPAG': 'bg-orange-500 text-white',
  'ONE': 'bg-pink-500 text-white',
  'EVERGREEN': 'bg-green-600 text-white',
  'OOCL': 'bg-amber-400 text-black',
  'ZIM': 'bg-gray-700 text-white',
  'WAN HAI': 'bg-red-600 text-white',
};
const defaultOwnerColor = 'bg-slate-500 text-white';
const mutedVesselColor = 'bg-slate-300';


const getColorForOwner = (owner: string): string => {
  if (!owner) return defaultOwnerColor;
  const upperOwner = owner.toUpperCase();
  for (const key in ownerColors) {
    if (upperOwner.includes(key)) {
      return ownerColors[key];
    }
  }
  return defaultOwnerColor;
};

const ContainerCell: React.FC<ContainerCellProps> = ({ container, isHighlighted, selectedVessels, filterColors, flowFilter }) => {
  // Empty slot
  if (!container) {
    return (
      <div 
        className="w-5 h-5 border-t border-l border-slate-300 bg-slate-200/80 flex-shrink-0 relative overflow-hidden" 
        title="Empty Slot"
      >
         <svg className="absolute w-full h-full text-slate-400/50" stroke="currentColor" strokeWidth="0.5">
          <line x1="0" y1="0" x2="100%" y2="100%" />
          <line x1="100%" y1="0" x2="0" y2="100%" />
        </svg>
      </div>
    );
  }

  let tooltipText = `Container: ${container.id}\nOwner: ${container.owner}\nLocation: ${container.location} (${container.size}')`;
  if (container.vessel) {
    tooltipText += `\nVessel: ${container.vessel}`;
  }
  if (container.flow) {
      tooltipText += `\nFlow: ${container.flow}`;
  }
  if (container.status) {
      tooltipText += `\nStatus: ${container.status}`;
  }
  
  const baseClasses = "w-5 h-5 border-t border-l border-gray-900/20 flex-shrink-0 flex items-center justify-center cursor-pointer transition-transform duration-150 relative";
  const scaleClass = isHighlighted ? 'scale-150 z-20' : 'hover:scale-125 hover:z-10';
  const highlightClass = isHighlighted ? 'ring-4 ring-lime-400 ring-offset-2 ring-offset-white' : '';

  // --- Filtering Logic ---
  
  // Export: F/E + Export Flow (Show if flow is Export, regardless of status)
  const isExport = container.flow === 'EXPORT';
  
  // Import: F/E + Import Flow (Show if flow is Import, regardless of status)
  const isImport = container.flow === 'IMPORT';
  
  // Empty: Empty Status (Show if status is Empty, regardless of flow)
  const isEmpty = container.status === 'EMPTY';

  let matchesFlow = true;
  if (flowFilter === 'EXPORT' && !isExport) matchesFlow = false;
  if (flowFilter === 'IMPORT' && !isImport) matchesFlow = false;
  if (flowFilter === 'EMPTY' && !isEmpty) matchesFlow = false;

  let colorClass = '';

  // If filtered out by Flow/Status, use muted color immediately (and potentially prevent vessel logic)
  if (!matchesFlow) {
      colorClass = mutedVesselColor;
  } else {
      // It matches the Flow filter (or Flow filter is ALL).
      // Now decide the color based on Vessel Filter and Flow Color rules.
      
      const activeVesselFilters = selectedVessels.some(v => v !== '');

      if (activeVesselFilters) {
          // Priority 1: Vessel Filter is Active
          const vesselIndex = selectedVessels.indexOf(container.vessel || '');
          if (vesselIndex !== -1) {
              // Matches specific vessel -> Use specific filter color
              colorClass = filterColors[vesselIndex] || defaultOwnerColor;
          } else {
              // Vessel filter active, but this container doesn't match -> Mute
              colorClass = mutedVesselColor;
          }
      } else {
          // Priority 2: No Vessel Filter active -> Use Flow Colors or Default Owner Colors
          if (flowFilter === 'EXPORT') {
              colorClass = 'bg-green-500 text-white';
          } else if (flowFilter === 'IMPORT') {
              colorClass = 'bg-yellow-400 text-black';
          } else if (flowFilter === 'EMPTY') {
              colorClass = 'bg-sky-400 text-white';
          } else {
              // Flow filter is ALL. Fallback to normal view.
              // Force Blue for Empty containers for visibility
              if (container.status === 'EMPTY') {
                  colorClass = 'bg-sky-400 text-white';
              } else if (container.isMultiBay && container.partType === 'start') {
                  colorClass = 'bg-blue-500';
              } else {
                  colorClass = getColorForOwner(container.owner);
              }
          }
      }
  }


  // Special render for 'end' part of 40' container to just act as a placeholder visual
  if (container.isMultiBay && container.partType === 'end') {
     // If the 'start' part is visible (matches filters), this should probably be visible too with generic styling
     // Re-evaluating visibility based on the computed colorClass above. 
     // If colorClass is mutedVesselColor, it's hidden/muted.
     
     if (colorClass !== mutedVesselColor) {
        return (
            <div
                className={`${baseClasses} bg-black text-white ${scaleClass} ${highlightClass}`}
                title={tooltipText}
            >
                <svg className="absolute w-full h-full" stroke="white" strokeWidth="1.5">
                    <line x1="10%" y1="10%" x2="90%" y2="90%" />
                    <line x1="90%" y1="10%" x2="10%" y2="90%" />
                </svg>
            </div>
        );
     } else {
         // If filtered out, it becomes muted gray
         return (
            <div
              className={`${baseClasses} ${mutedVesselColor} ${scaleClass} ${highlightClass}`}
              title={tooltipText}
            >
            </div>
          );
     }
  }

  return (
    <div
      className={`${baseClasses} ${colorClass} ${scaleClass} ${highlightClass}`}
      title={tooltipText}
    >
    </div>
  );
};

export default ContainerCell;