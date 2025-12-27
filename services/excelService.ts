
import { Container, ParseResult, ParseStats } from '../types';

declare const XLSX: any;

const findColumnValue = (row: any, possibleKeys: string[]): any => {
    const rowKeys = Object.keys(row);
    for (const key of rowKeys) {
        const lowerKey = key.toLowerCase().trim();
        if (possibleKeys.includes(lowerKey)) return row[key];
    }
    for (const key of rowKeys) {
        const lowerKey = key.toLowerCase().trim();
        if (possibleKeys.some(pk => pk.length > 1 && lowerKey.includes(pk))) return row[key];
    }
    return undefined;
};

export const parseExcelFile = (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const stats: ParseStats = { totalRows: json.length, createdContainers: 0, skippedRows: 0 };
        const vesselSet = new Set<string>();
        
        const containers: Container[] = json.flatMap((row): Container[] => {
          const idVal = findColumnValue(row, ['số cont', 'container', 'container number', 'cont', 'id', 'no', 'số']);
          if (!idVal) { stats.skippedRows++; return []; }
          const id = idVal.toString().trim();
          if (id.toLowerCase().includes('total') || id.toLowerCase().includes('tổng')) return [];

          const owner = findColumnValue(row, ['hãng khai thác', 'chủ hàng', 'owner', 'operator']) || 'Unknown';
          const vessel = findColumnValue(row, ['tên tàu', 'vessel']);
          if (vessel) vesselSet.add(vessel.toString().trim());

          const transshipmentPort = findColumnValue(row, ['cảng đích', 'pod', 'port', 'đích', 'transshipment'])?.toString().trim();

          // XỬ LÝ TRỌNG LƯỢNG & CHUẨN HÓA ĐƠN VỊ V9.1
          const weightVal = findColumnValue(row, ['trọng lượng', 'weight', 'gross weight', 'tấn', 'gw']);
          let weight = 0;
          if (weightVal !== undefined && weightVal !== null) {
              let weightStr = String(weightVal).trim();
              
              // Nếu có dấu phẩy và KHÔNG có dấu chấm (VD: 9,13) -> Thay phẩy bằng chấm
              if (weightStr.includes(',') && !weightStr.includes('.')) {
                  weightStr = weightStr.replace(/,/g, '.');
              } else {
                  // Nếu có cả hai hoặc chỉ có dấu chấm (VD: 9,130.00 hoặc 9130.00) 
                  // thì coi phẩy là phân cách hàng nghìn (xóa đi)
                  weightStr = weightStr.replace(/,/g, '');
              }

              // Loại bỏ các ký tự không phải số/chấm (VD: "kg", "tấn")
              const cleanWeightStr = weightStr.replace(/[^0-9.]/g, '');
              weight = parseFloat(cleanWeightStr) || 0;
              
              // LOGIC CHUẨN HÓA: Nếu > 100, mặc định là KG -> Đổi sang Tấn
              // VD: 9130 kg -> 9.13 Tấn. Nếu là 9.13 Tấn thì giữ nguyên.
              if (weight > 100) {
                  weight = weight / 1000;
              }
          }

          const isoVal = findColumnValue(row, ['loại iso', 'iso code', 'iso', 'type', 'mã']);
          const iso = isoVal ? String(isoVal).trim().toUpperCase() : undefined;
          
          let size: 20 | 40 = 20;
          const sizeVal = findColumnValue(row, ['size', 'sz', 'length']);
          if (sizeVal) {
             const num = parseInt(String(sizeVal).replace(/\D/g, ''));
             if (num === 40 || num === 45) size = 40;
          } else if (iso && (iso.startsWith('4') || iso.startsWith('L'))) {
             size = 40;
          }

          const statusRaw = findColumnValue(row, ['f/e', 'fe', 'full/empty', 'trạng thái', 'status']);
          const statusVal = (statusRaw || '').toString().trim().toLowerCase();
          let status: 'FULL' | 'EMPTY' = 'FULL';
          if (statusVal === 'e' || statusVal === 'mt' || statusVal.includes('empty') || statusVal.includes('rỗng')) {
              status = 'EMPTY';
          }

          const flowVal = (findColumnValue(row, ['hướng', 'flow', 'category', 'cat', 'type']) || '').toString().trim().toLowerCase();
          let flow: 'IMPORT' | 'EXPORT' | 'STORAGE' | undefined;
          if (flowVal.includes('ex') || flowVal.includes('xuất')) flow = 'EXPORT';
          else if (flowVal.includes('im') || flowVal.includes('nhập')) flow = 'IMPORT';

          const locationRaw = findColumnValue(row, ['vị trí trên bãi', 'vị trí', 'location']);
          let block = 'UNK', bay = 0, rowNum = 0, tier = 0, isUnmapped = true;

          if (typeof locationRaw === 'string' && locationRaw.trim() !== '') {
             const loc = locationRaw.trim().replace(/\s/g, '');
             const parts = loc.split('-');
             if (parts.length === 4) {
                 [block, bay, rowNum, tier] = [parts[0].toUpperCase(), parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3])];
                 isUnmapped = false;
             }
          }

          const commonData = { 
              id, location: locationRaw?.toString().trim() || 'Unmapped', block, row: rowNum, tier, 
              owner, vessel: vessel?.toString().trim(), status, flow, 
              transshipmentPort, weight, size, iso
          };

          if (!isUnmapped) {
              if (bay % 2 === 0) {
                stats.createdContainers++;
                return [
                  { ...commonData, bay: bay - 1, size: 40, isMultiBay: true, partType: 'start' },
                  { ...commonData, bay: bay + 1, size: 40, isMultiBay: true, partType: 'end' }
                ];
              } else {
                stats.createdContainers++;
                return [{ ...commonData, bay, size: 20, isMultiBay: false }];
              }
          } else {
              stats.createdContainers++;
              return [{ ...commonData, bay: 0, isMultiBay: false }];
          }
        });
        
        resolve({ containers, stats, vessels: Array.from(vesselSet).sort() });
      } catch (error) { reject(error); }
    };
    reader.readAsBinaryString(file);
  });
};
