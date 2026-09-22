import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  MapPin, 
  Calendar, 
  Truck, 
  ShieldCheck,
  Clock,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { Vehicle, Transporter } from '../types';
import { parseVehicleFile, parseTextOrCsvVehicles, ParsedVehicleRow } from '../services/documentParserService';
import { downloadBulkVehicleExcelTemplate } from '../services/excelExportService';

// ==========================================
// 1. BULK VEHICLE IMPORT MODAL (Excel / Word / CSV)
// ==========================================

interface BulkVehicleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parsedList: Partial<Vehicle>[]) => void;
  transporters: Transporter[];
}

export const BulkVehicleImportModal: React.FC<BulkVehicleImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  transporters
}) => {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<Partial<Vehicle>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadExcelSample = () => {
    downloadBulkVehicleExcelTemplate();
  };

  const handleDownloadSample = () => {
    const sampleHeaders = 'RegistrationNumber,Category,Type,Size,EngineNo,ChassisNo,TransporterBrokerName,DriverName,DriverCnic,DriverContact,ExpiryDate';
    const sampleData = [
      sampleHeaders,
      'TLP-101,Bonded Carrier,Flatbed,40ft,ENG-99881,CHS-44332,Naveed Goods Forwarding,Mohammad Tariq,42101-1234567-1,0300-1122334,2026-12-31',
      'KBL-505,Afghan Transit,Lowbed,45ft,ENG-55443,CHS-88771,Khyber Logistics,Gul Khan,17301-7654321-3,0333-9988776,2026-11-30',
      'TIR-808,TIR,Container Carrier,40ft,ENG-11223,CHS-99001,Indus International,Rashid Ali,35201-9988776-5,0321-4455667,2027-01-15'
    ].join('\n');

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'DPL_Bulk_Vehicle_Registration_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsvContent = (content: string) => {
    setError(null);
    try {
      const rows = parseTextOrCsvVehicles(content);
      if (rows.length === 0) {
        setError('No valid vehicle records could be extracted.');
      } else {
        setDetectedFormat('CSV_TEXT');
        setParsedRows(rows);
      }
    } catch (err: any) {
      setError(`Failed to parse CSV: ${err.message || err}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setIsParsing(true);

    try {
      const result = await parseVehicleFile(file);
      if (result.error) {
        setError(result.error);
        setParsedRows([]);
      } else if (result.rows.length === 0) {
        setError(`No vehicle records could be identified in "${file.name}". Please ensure your file has columns like Registration Number, Category, Type, Driver, etc.`);
        setParsedRows([]);
      } else {
        setDetectedFormat(result.fileType);
        setParsedRows(result.rows);
      }
    } catch (err: any) {
      setError(`Failed to read file: ${err.message || err}`);
      setParsedRows([]);
    } finally {
      setIsParsing(false);
      try { e.target.value = ''; } catch (_) {}
    }
  };

  const handleApply = () => {
    if (parsedRows.length === 0) {
      if (csvText.trim()) {
        parseCsvContent(csvText);
      } else {
        setError('Please upload an Excel (.xlsx), Word (.docx), or CSV file or paste vehicle rows.');
        return;
      }
    }
    if (parsedRows.length > 0) {
      onImport(parsedRows);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="glass-card w-full max-w-3xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-950/95 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bulk Vehicle Fleet Import</h3>
              <p className="text-xs text-gray-400">Full compatibility with Excel (.xlsx, .xls), Word (.docx), and CSV files</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Action to download templates */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-emerald-300 block">Download Official Fleet Import Templates</span>
              <p className="text-[11px] text-emerald-200/80">
                Prepared with standard fields: Registration No, Category, Type, Size, Engine, Chassis, Driver, CNIC, Expiry Date
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadExcelSample}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <FileSpreadsheet size={14} />
                <span>Excel Template (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/10 transition-colors"
              >
                <Download size={13} />
                <span>CSV Template</span>
              </button>
            </div>
          </div>

          {/* File Upload Box */}
          <div className="border-2 border-dashed border-white/20 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-colors bg-white/[0.02]">
            <input
              type="file"
              accept=".xlsx, .xls, .xlsm, .docx, .csv, .txt, .tsv"
              onChange={handleFileUpload}
              className="hidden"
              id="bulk-vehicle-file-input"
            />
            <label htmlFor="bulk-vehicle-file-input" className="cursor-pointer flex flex-col items-center gap-2.5">
              {isParsing ? (
                <Loader2 className="text-emerald-400 animate-spin" size={34} />
              ) : (
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-400" size={30} />
                  <FileText className="text-blue-400" size={30} />
                </div>
              )}
              <div>
                <span className="text-sm font-semibold text-white block">
                  {fileName ? fileName : 'Upload Excel (.xlsx), Word (.docx), or CSV file'}
                </span>
                <span className="text-xs text-gray-400 mt-1 block">
                  Supports .xlsx, .xls, .docx tables/lists, and .csv with automatic column recognition
                </span>
              </div>
              {detectedFormat && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Format Detected: {detectedFormat === 'EXCEL' ? 'Excel Spreadsheet (.xlsx)' : detectedFormat === 'DOCX' ? 'Word Document (.docx)' : 'CSV / Text File'}
                </span>
              )}
            </label>
          </div>

          {/* Or Paste Raw Text */}
          <div className="space-y-2">
            <label className="text-xs text-gray-300 font-semibold block">Or Paste CSV / Tab-Delimited Vehicle Rows Directly:</label>
            <textarea
              rows={3}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                if (e.target.value.trim()) {
                  parseCsvContent(e.target.value);
                }
              }}
              placeholder="TLP-101,Bonded Carrier,Flatbed,40ft,ENG-99881,CHS-44332,Naveed Goods,Tariq,42101-1234567-1,0300-1122334,2026-12-31"
              className="w-full glass-input rounded-xl p-3 text-xs font-mono outline-none border border-white/10"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={14} /> Ready to Import: {parsedRows.length} Vehicles
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-white/10 rounded-xl custom-scrollbar">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-white/5 uppercase text-[10px] text-gray-400 sticky top-0">
                    <tr>
                      <th className="p-2.5">Vehicle Reg No</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Transporter / Broker</th>
                      <th className="p-2.5">Driver</th>
                      <th className="p-2.5">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parsedRows.slice(0, 15).map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-2.5 font-mono font-bold text-white">{row.registrationNumber}</td>
                        <td className="p-2.5">{row.category} ({row.size})</td>
                        <td className="p-2.5">{row.brokerName || row.transporterName}</td>
                        <td className="p-2.5">{row.driverName}</td>
                        <td className="p-2.5 font-mono text-gray-400">{row.validationExpiryDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 15 && (
                <p className="text-[11px] text-gray-500 text-center">+ {parsedRows.length - 15} more records</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={parsedRows.length === 0 || isParsing}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/30"
          >
            <CheckCircle size={14} />
            <span>Confirm & Import ({parsedRows.length} Vehicles)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. VEHICLE ONLINE AT STATION MODAL
// ==========================================

interface VehicleOnlineModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onConfirm: (vehicleId: number, station: string, destination: string) => void;
}

const TERMINAL_OPTIONS = [
  'Karachi Port Trust (KPT) - East Wharf',
  'Karachi Port Trust (KPT) - West Wharf',
  'Port Muhammad Bin Qasim (PQ) - QICT',
  'SAPT (South Asia Pakistan Terminals)',
  'Lahore Dry Port - Mughalpura',
  'Prem Nagar Dry Port (PNDP) - Lahore',
  'Faisalabad Dry Port',
  'Multan Dry Port',
  'Sialkot / Sambrial Dry Port',
  'Peshawar Dry Port (Aman Garh)',
  'Quetta NLC Dry Port',
  'Taftan Customs Station (Iran Border)',
  'Torkham Border Post (Afghan Transit)',
  'Chaman Border Post (Afghan Transit)'
];

export const VehicleOnlineModal: React.FC<VehicleOnlineModalProps> = ({
  isOpen,
  vehicle,
  onClose,
  onConfirm
}) => {
  const [station, setStation] = useState(TERMINAL_OPTIONS[0]);
  const [destination, setDestination] = useState('Lahore Dry Port');

  if (!isOpen || !vehicle) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-950/95 space-y-5 p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Mark Vehicle Online</h3>
              <p className="text-xs text-gray-400 font-mono">{vehicle.registrationNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Current Terminal / Station Availability:</label>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="w-full glass-input rounded-xl p-2.5 text-xs text-white border border-white/10 bg-slate-900"
            >
              {TERMINAL_OPTIONS.map((term, i) => (
                <option key={i} value={term} className="bg-slate-900 text-white">{term}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1">Target Loading Route / Destination:</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Lahore Dry Port, Peshawar, Faisalabad"
              className="w-full glass-input rounded-xl p-2.5 text-xs text-white border border-white/10 bg-slate-900"
            />
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-emerald-300">
            <p>This vehicle will be visible to Dispatchers and Operations as <strong>ONLINE & READY</strong> for container case assignment at <strong>{station}</strong>.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(vehicle.id, station, destination)}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
          >
            <CheckCircle size={14} />
            <span>Mark Online Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. VEHICLE 6-MONTH RENEWAL REQUEST MODAL
// ==========================================

interface VehicleRenewalModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onConfirmRenewal: (vehicleId: number, newExpiryDate: string, docUrl?: string) => void;
}

export const VehicleRenewalModal: React.FC<VehicleRenewalModalProps> = ({
  isOpen,
  vehicle,
  onClose,
  onConfirmRenewal
}) => {
  const [renewalDoc, setRenewalDoc] = useState('');
  const [docName, setDocName] = useState('');
  const [renewalMonths, setRenewalMonths] = useState(6);

  if (!isOpen || !vehicle) return null;

  // Calculate new expiry date
  const computeNewExpiry = () => {
    const baseDate = vehicle.validationExpiryDate && new Date(vehicle.validationExpiryDate).getTime() > Date.now()
      ? new Date(vehicle.validationExpiryDate)
      : new Date();
    baseDate.setMonth(baseDate.getMonth() + renewalMonths);
    return baseDate.toISOString().slice(0, 10);
  };

  const newExpiryDate = computeNewExpiry();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setRenewalDoc(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-950/95 space-y-5 p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Request Vehicle Renewal</h3>
              <p className="text-xs text-gray-400 font-mono">{vehicle.registrationNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="bg-white/5 p-3 rounded-xl space-y-1.5 border border-white/10">
            <div className="flex justify-between">
              <span className="text-gray-400">Current Expiry:</span>
              <span className="font-mono text-yellow-400 font-bold">{vehicle.validationExpiryDate || 'Expired'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Extension Period:</span>
              <span className="text-white font-semibold">+6 Months</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-1.5">
              <span className="text-emerald-400 font-bold">New Validity Expiry:</span>
              <span className="font-mono text-emerald-400 font-bold">{newExpiryDate}</span>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1">Attach Vehicle Fitness / Route Permit / Tax Token:</label>
            <div className="border border-dashed border-white/20 hover:border-purple-500/50 rounded-xl p-4 text-center cursor-pointer">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="renewal-doc-upload"
              />
              <label htmlFor="renewal-doc-upload" className="cursor-pointer flex flex-col items-center gap-1">
                <UploadCloud className="text-purple-400" size={24} />
                <span className="text-xs text-white">{docName || 'Click to upload fitness / permit proof'}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirmRenewal(vehicle.id, newExpiryDate, renewalDoc)}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
          >
            <ShieldCheck size={14} />
            <span>Approve & Extend 6 Months</span>
          </button>
        </div>
      </div>
    </div>
  );
};
