

import React, { useState } from 'react';
import { BlockConfig } from '../types';

interface BlockConfiguratorProps {
  blocks: BlockConfig[];
  onAddBlock: (newBlock: Omit<BlockConfig, 'isDefault'>) => void;
  onUpdateBlock: (updatedBlock: BlockConfig) => void;
  onRemoveBlock: (blockName: string) => void;
}

const BlockConfigurator: React.FC<BlockConfiguratorProps> = ({ blocks, onAddBlock, onUpdateBlock, onRemoveBlock }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingBlockName, setEditingBlockName] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  
  const [newBlock, setNewBlock] = useState({
    name: '',
    blockType: 'GRID' as 'GRID' | 'HEAP',
    totalBays: '35',
    rowsPerBay: '6',
    tiersPerBay: '6',
    capacity: '',
    group: 'GP',
    machineType: 'RS' as 'RTG' | 'RS',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewBlock(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (block: BlockConfig) => {
    setDeleteConfirmation(null); // Clear any pending delete
    setNewBlock({
      name: block.name,
      blockType: block.blockType || 'GRID',
      totalBays: block.totalBays.toString(),
      rowsPerBay: block.rowsPerBay.toString(),
      tiersPerBay: block.tiersPerBay.toString(),
      capacity: block.capacity ? block.capacity.toString() : '',
      group: block.group || 'GP',
      machineType: block.machineType || 'RS',
    });
    setEditingBlockName(block.name);
    if (!isOpen) setIsOpen(true);
  };

  const requestDelete = (blockName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmation(blockName);
  };

  const confirmDelete = (blockName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemoveBlock(blockName);
    setDeleteConfirmation(null);
    if (editingBlockName === blockName) {
        handleCancel();
    }
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmation(null);
  };

  const handleCancel = () => {
    setNewBlock({ name: '', blockType: 'GRID', totalBays: '35', rowsPerBay: '6', tiersPerBay: '6', capacity: '', group: 'GP', machineType: 'RS' });
    setEditingBlockName(null);
    setDeleteConfirmation(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validations
    const capacity = parseInt(newBlock.capacity, 10);
    const totalBays = parseInt(newBlock.totalBays, 10);
    const rowsPerBay = parseInt(newBlock.rowsPerBay, 10);
    const tiersPerBay = parseInt(newBlock.tiersPerBay, 10);

    if (!newBlock.name.trim() || !newBlock.group.trim() || isNaN(capacity) || capacity < 1) {
       alert('Please provide Name, Group and valid Capacity.');
       return;
    }
    
    if (newBlock.blockType === 'GRID') {
        if (isNaN(totalBays) || isNaN(rowsPerBay) || isNaN(tiersPerBay) || totalBays < 1 || rowsPerBay < 1 || tiersPerBay < 1) {
            alert('Please provide valid dimensions (Bays, Rows, Tiers) for Grid blocks.');
            return;
        }
    }

    const blockData = {
        name: editingBlockName ? editingBlockName : newBlock.name.trim().toUpperCase(),
        blockType: newBlock.blockType,
        totalBays: newBlock.blockType === 'GRID' ? totalBays : 0,
        rowsPerBay: newBlock.blockType === 'GRID' ? rowsPerBay : 0,
        tiersPerBay: newBlock.blockType === 'GRID' ? tiersPerBay : 0,
        capacity,
        group: newBlock.group.trim(),
        machineType: newBlock.machineType,
    };

    if (editingBlockName) {
        // Update existing block
        const originalBlock = blocks.find(b => b.name === editingBlockName);
        if (originalBlock) {
             onUpdateBlock({
                ...blockData,
                isDefault: originalBlock.isDefault,
             });
        }
        handleCancel();
    } else {
        // Add new block
        onAddBlock(blockData);
        setNewBlock({ name: '', blockType: 'GRID', totalBays: '35', rowsPerBay: '6', tiersPerBay: '6', capacity: '', group: 'GP', machineType: 'RS' }); // Reset form
    }
  };

  // Helper to calculate theoretical max slots
  const theoreticalMax = newBlock.blockType === 'GRID'
    ? parseInt(newBlock.totalBays || '0', 10) * 
      parseInt(newBlock.rowsPerBay || '0', 10) * 
      parseInt(newBlock.tiersPerBay || '0', 10)
    : 'N/A';
  
  return (
    <div className="bg-white rounded-xl shadow-lg mb-6">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-lg font-semibold text-slate-700 hover:bg-slate-50 rounded-t-xl focus:outline-none"
      >
        <span>Yard Config {editingBlockName && '(Editing)'}</span>
        <svg
          className={`h-6 w-6 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form to add/update block */}
            <div>
              <h3 className="font-bold text-slate-800 mb-2">
                {editingBlockName ? `Edit Block ${editingBlockName}` : 'Add New Block/Zone'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                
                {/* Type Selection */}
                <div className="flex space-x-4 mb-2">
                   <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="blockType" 
                        value="GRID" 
                        checked={newBlock.blockType === 'GRID'} 
                        onChange={handleInputChange} 
                        disabled={!!editingBlockName} // Disable changing type on edit for simplicity
                      />
                      <span className="text-sm font-medium text-slate-700">Standard Grid</span>
                   </label>
                   <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="blockType" 
                        value="HEAP" 
                        checked={newBlock.blockType === 'HEAP'} 
                        onChange={handleInputChange} 
                        disabled={!!editingBlockName}
                      />
                      <span className="text-sm font-medium text-slate-700">Heap / Zone</span>
                   </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-slate-600">Name</label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={newBlock.name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                        placeholder="e.g. G2 or APR01"
                        required
                        disabled={!!editingBlockName} 
                      />
                    </div>
                     <div>
                      <label htmlFor="group" className="block text-sm font-medium text-slate-600">Group</label>
                      <select name="group" id="group" value={newBlock.group} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                          <option value="GP">GP (General)</option>
                          <option value="REEFER">REEFER</option>
                          <option value="RỖNG">EMPTY (RỖNG)</option>
                          <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label htmlFor="machineType" className="block text-sm font-medium text-slate-600">Machine Type</label>
                        <select name="machineType" id="machineType" value={newBlock.machineType} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="RS">RS (Reach Stacker/Xe nâng)</option>
                            <option value="RTG">RTG</option>
                        </select>
                    </div>
                    <div>
                        <div className="flex justify-between items-center">
                            <label htmlFor="capacity" className="block text-sm font-medium text-slate-600">Capacity</label>
                            {newBlock.blockType === 'GRID' && <span className="text-[10px] text-slate-400">Slots: {theoreticalMax}</span>}
                        </div>
                        <input type="number" name="capacity" id="capacity" value={newBlock.capacity} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. 676" min="1" required />
                    </div>
                </div>

                {newBlock.blockType === 'GRID' && (
                    <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                        <div>
                            <label htmlFor="totalBays" className="block text-xs font-bold text-slate-500 uppercase">Bays</label>
                            <input type="number" name="totalBays" id="totalBays" value={newBlock.totalBays} onChange={handleInputChange} className="mt-1 block w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-blue-500" min="1" />
                        </div>
                        <div>
                            <label htmlFor="rowsPerBay" className="block text-xs font-bold text-slate-500 uppercase">Rows</label>
                            <input type="number" name="rowsPerBay" id="rowsPerBay" value={newBlock.rowsPerBay} onChange={handleInputChange} className="mt-1 block w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-blue-500" min="1" />
                        </div>
                        <div>
                            <label htmlFor="tiersPerBay" className="block text-xs font-bold text-slate-500 uppercase">Tiers</label>
                            <input type="number" name="tiersPerBay" id="tiersPerBay" value={newBlock.tiersPerBay} onChange={handleInputChange} className="mt-1 block w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-blue-500" min="1" />
                        </div>
                    </div>
                )}
                
                <div className="flex space-x-2 pt-2">
                     <button
                        type="submit"
                        className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                        {editingBlockName ? 'Update' : 'Add'}
                    </button>
                    {editingBlockName && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex-none px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                    )}
                </div>
              </form>
            </div>

            {/* List of current blocks */}
            <div>
              <h3 className="font-bold text-slate-800 mb-2">Current Blocks & Zones</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {blocks.map(block => (
                  <div key={block.name} className={`flex justify-between items-center p-2 rounded-md transition-colors ${editingBlockName === block.name ? 'bg-blue-50 border border-blue-200' : 'bg-slate-100 hover:bg-slate-200'}`}>
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-800">{block.name}</span>
                            {block.blockType === 'HEAP' && <span className="text-[10px] px-1 bg-amber-200 text-amber-800 rounded font-bold">HEAP</span>}
                        </div>
                        <div className="text-xs text-slate-500 flex flex-col">
                            <span>{block.group} • <span className="font-bold">{block.machineType || 'RS'}</span></span>
                            <span>
                                {block.capacity} TEUs
                                {block.blockType === 'GRID' && ` • ${block.totalBays}B x ${block.rowsPerBay}R x ${block.tiersPerBay}T`}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {deleteConfirmation === block.name ? (
                        <div className="flex items-center space-x-2 animate-fadeIn">
                            <button
                                type="button"
                                onClick={(e) => confirmDelete(block.name, e)}
                                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 shadow-sm"
                            >
                                Confirm
                            </button>
                            <button
                                type="button"
                                onClick={cancelDelete}
                                className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 shadow-sm"
                            >
                                Cancel
                            </button>
                        </div>
                      ) : (
                        <>
                           <button
                              type="button"
                              onClick={() => handleEdit(block)}
                              className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-100 rounded transition-colors"
                              title={`Edit block ${block.name}`}
                           >
                              <svg className="h-5 w-5 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                           </button>
                          <button
                              type="button"
                              onClick={(e) => requestDelete(block.name, e)}
                              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-100 rounded transition-colors"
                              title={`Delete block ${block.name}`}
                          >
                              <svg className="h-5 w-5 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockConfigurator;
