import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, Lock, Unlock, AlertCircle, CheckCircle2, FileText, ChevronLeft, ChevronRight, Eye, Copy, Check, Download, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronDown, FileSpreadsheet, Database } from 'lucide-react';
import { AuditRecord } from '../types';

interface InventoryTableProps {
  records: AuditRecord[];
  initialFilterKey?: string;
}

type SortField = 'record_id' | 'file_path' | 'size_bytes' | 'pipeline_stage' | 'storage_class' | 'health_status' | 'created_at';
type SortDirection = 'asc' | 'desc';

export const InventoryTable: React.FC<InventoryTableProps> = ({ records, initialFilterKey }) => {
  const [searchTerm, setSearchTerm] = useState(initialFilterKey ? `file_path:` : '');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedStorageClass, setSelectedStorageClass] = useState<string>('all');
  const [selectedHealth, setSelectedHealth] = useState<string>('all');
  const [onlyUnencrypted, setOnlyUnencrypted] = useState(false);
  const [sortField, setSortField] = useState<SortField>('record_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);
  const [copied, setCopied] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredRecords = useMemo(() => {
    const list = records.filter((r) => {
      // Stage filter
      if (selectedStage !== 'all' && r.pipeline_stage !== selectedStage) return false;
      // Storage class filter
      if (selectedStorageClass !== 'all' && r.storage_class !== selectedStorageClass) return false;
      // Health filter
      if (selectedHealth !== 'all' && r.health_status !== selectedHealth) return false;
      // Unencrypted only filter
      if (onlyUnencrypted && r.is_encrypted) return false;

      // Text search
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();

      return (
        r.record_id.toLowerCase().includes(term) ||
        r.file_path.toLowerCase().includes(term) ||
        r.storage_uri.toLowerCase().includes(term) ||
        r.owner_service.toLowerCase().includes(term) ||
        (r.metadata?.format || '').toLowerCase().includes(term) ||
        r.checksum_sha256.toLowerCase().includes(term)
      );
    });

    // Sorting
    return list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'size_bytes') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [records, searchTerm, selectedStage, selectedStorageClass, selectedHealth, onlyUnencrypted, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  const copyJsonRecord = (record: AuditRecord) => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCsv = (mode: 'filtered' | 'total') => {
    const targetRecords = mode === 'filtered' ? filteredRecords : records;
    if (targetRecords.length === 0) return;

    const headers = [
      'record_id',
      'file_path',
      'storage_uri',
      'size_bytes',
      'size_human',
      'checksum_sha256',
      'pipeline_stage',
      'storage_class',
      'owner_service',
      'created_at',
      'last_modified',
      'is_encrypted',
      'retention_days',
      'health_status',
      'format',
      'compression',
      'record_count',
      'partition_key',
      'tags'
    ];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = targetRecords.map((r) => [
      escapeCsv(r.record_id),
      escapeCsv(r.file_path),
      escapeCsv(r.storage_uri),
      escapeCsv(r.size_bytes),
      escapeCsv(formatSize(r.size_bytes)),
      escapeCsv(r.checksum_sha256),
      escapeCsv(r.pipeline_stage),
      escapeCsv(r.storage_class),
      escapeCsv(r.owner_service),
      escapeCsv(r.created_at),
      escapeCsv(r.last_modified),
      escapeCsv(r.is_encrypted ? 'true' : 'false'),
      escapeCsv(r.retention_days),
      escapeCsv(r.health_status),
      escapeCsv(r.metadata?.format || ''),
      escapeCsv(r.metadata?.compression || 'none'),
      escapeCsv(r.metadata?.record_count ?? ''),
      escapeCsv(r.metadata?.partition_key || ''),
      escapeCsv((r.tags || []).join(';'))
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = mode === 'filtered'
      ? `audit_inventory_filtered_${targetRecords.length}_records_${dateStr}.csv`
      : `audit_inventory_total_${targetRecords.length}_records_${dateStr}.csv`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setShowExportMenu(false);
    setExportNotice(`Exported ${targetRecords.length} ${mode === 'filtered' ? 'filtered' : 'total'} records to ${filename}`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const exportJson = (mode: 'filtered' | 'total') => {
    const targetRecords = mode === 'filtered' ? filteredRecords : records;
    if (targetRecords.length === 0) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = mode === 'filtered'
      ? `audit_inventory_filtered_${targetRecords.length}_records_${dateStr}.json`
      : `audit_inventory_total_${targetRecords.length}_records_${dateStr}.json`;
    const blob = new Blob([JSON.stringify(targetRecords, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setShowExportMenu(false);
    setExportNotice(`Exported ${targetRecords.length} ${mode === 'filtered' ? 'filtered' : 'total'} records to ${filename}`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by file_path, uri, service, checksum..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 text-slate-200 text-xs rounded-lg pl-9 pr-8 py-2 border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-200"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Stage Selector */}
            <select
              value={selectedStage}
              onChange={(e) => {
                setSelectedStage(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Stages</option>
              <option value="raw_ingest">raw_ingest</option>
              <option value="transformation">transformation</option>
              <option value="feature_store">feature_store</option>
              <option value="staging">staging</option>
              <option value="archived">archived</option>
            </select>

            {/* Storage Class Selector */}
            <select
              value={selectedStorageClass}
              onChange={(e) => {
                setSelectedStorageClass(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Storage Tiers</option>
              <option value="STANDARD">STANDARD</option>
              <option value="NEARLINE">NEARLINE</option>
              <option value="COLDLINE">COLDLINE</option>
              <option value="ARCHIVE">ARCHIVE</option>
            </select>

            {/* Health Selector */}
            <select
              value={selectedHealth}
              onChange={(e) => {
                setSelectedHealth(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Health</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="corrupt">Corrupt</option>
              <option value="stale">Stale</option>
            </select>

            <button
              onClick={() => setOnlyUnencrypted(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                onlyUnencrypted
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Unlock className="w-3 h-3" />
              <span>Unencrypted Only</span>
            </button>

            {/* Export CSV and Data Controls */}
            <div className="relative inline-block" ref={exportMenuRef}>
              <div className="inline-flex rounded-lg shadow-sm">
                <button
                  id="btn-export-csv-main"
                  onClick={() => exportCsv('filtered')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-l-lg border border-indigo-500 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  title={`Export CSV: ${filteredRecords.length !== records.length ? 'filtered' : 'all'} (${filteredRecords.length}) records to CSV`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                  <span className="ml-0.5 px-1.5 py-0.2 bg-indigo-800/80 rounded text-[10px] font-mono border border-indigo-400/30">
                    {filteredRecords.length}
                  </span>
                </button>
                <button
                  id="btn-export-csv-dropdown"
                  onClick={() => setShowExportMenu(prev => !prev)}
                  className="px-2 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-r-lg border-y border-r border-indigo-500 text-xs transition-colors flex items-center justify-center"
                  title="Export options: Filtered vs Total dataset CSV"
                  aria-label="Export options menu"
                  aria-expanded={showExportMenu}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Dropdown Menu */}
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 py-1.5 text-xs">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CSV Data Export</p>
                    <p className="text-[11px] text-slate-500">Structured tabular format for Excel, Python & BigQuery</p>
                  </div>

                  <div className="p-1.5 space-y-1">
                    <button
                      id="btn-export-csv-filtered"
                      onClick={() => exportCsv('filtered')}
                      disabled={filteredRecords.length === 0}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-600/20 text-slate-200 hover:text-indigo-300 transition-colors flex items-center justify-between group disabled:opacity-40"
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
                        <div>
                          <div className="font-semibold text-xs text-white">Export Filtered CSV</div>
                          <div className="text-[10px] text-slate-400">Current filters & search</div>
                        </div>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 group-hover:bg-indigo-500/30 group-hover:text-indigo-200">
                        {filteredRecords.length} rows
                      </span>
                    </button>

                    <button
                      id="btn-export-csv-total"
                      onClick={() => exportCsv('total')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-600/20 text-slate-200 hover:text-emerald-300 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300" />
                        <div>
                          <div className="font-semibold text-xs text-white">Export Total Inventory CSV</div>
                          <div className="text-[10px] text-slate-400">All audit records across pipeline</div>
                        </div>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 group-hover:bg-emerald-500/30 group-hover:text-emerald-200">
                        {records.length} rows
                      </span>
                    </button>
                  </div>

                  <div className="pt-1.5 mt-1 border-t border-slate-800 p-1.5 space-y-1">
                    <button
                      id="btn-export-json-filtered"
                      onClick={() => exportJson('filtered')}
                      disabled={filteredRecords.length === 0}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-between group disabled:opacity-40"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs">Export Filtered JSON</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">
                        {filteredRecords.length}
                      </span>
                    </button>

                    <button
                      id="btn-export-json-total"
                      onClick={() => exportJson('total')}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs">Export Total JSON</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">
                        {records.length}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-semibold select-none">
              <tr>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('record_id')}>
                  <div className="flex items-center gap-1">
                    <span>Record ID</span>
                    {sortField === 'record_id' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                    ) : <ArrowUpDown className="w-3 h-3 text-slate-600" />}
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('file_path')}>
                  <div className="flex items-center gap-1">
                    <span>File Path (Key: file_path)</span>
                    {sortField === 'file_path' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                    ) : <ArrowUpDown className="w-3 h-3 text-slate-600" />}
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('pipeline_stage')}>
                  <div className="flex items-center gap-1">
                    <span>Stage</span>
                    {sortField === 'pipeline_stage' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                    ) : <ArrowUpDown className="w-3 h-3 text-slate-600" />}
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('storage_class')}>
                  <div className="flex items-center gap-1">
                    <span>Storage Tier</span>
                    {sortField === 'storage_class' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                    ) : <ArrowUpDown className="w-3 h-3 text-slate-600" />}
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('size_bytes')}>
                  <div className="flex items-center gap-1">
                    <span>Size</span>
                    {sortField === 'size_bytes' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                    ) : <ArrowUpDown className="w-3 h-3 text-slate-600" />}
                  </div>
                </th>
                <th className="py-3 px-4">Encryption</th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('health_status')}>
                  <div className="flex items-center gap-1">
                    <span>Health</span>
                    {sortField === 'health_status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                    ) : <ArrowUpDown className="w-3 h-3 text-slate-600" />}
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {paginatedRecords.map((r) => (
                <tr key={r.record_id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-indigo-400">{r.record_id}</td>
                  <td className="py-3 px-4 max-w-md truncate text-slate-200" title={r.file_path}>
                    {r.file_path}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-950 text-slate-300 border border-slate-800">
                      {r.pipeline_stage}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      r.storage_class === 'STANDARD' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      r.storage_class === 'NEARLINE' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                      r.storage_class === 'COLDLINE' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {r.storage_class}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{formatSize(r.size_bytes)}</td>
                  <td className="py-3 px-4">
                    {r.is_encrypted ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                        <Lock className="w-3.5 h-3.5" />
                        <span>AES-256</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 text-[11px] font-semibold">
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unencrypted</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-fit ${
                      r.health_status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' :
                      r.health_status === 'corrupt' ? 'bg-red-500/10 text-red-400' :
                      r.health_status === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {r.health_status === 'healthy' && <CheckCircle2 className="w-3 h-3" />}
                      {r.health_status === 'corrupt' && <AlertCircle className="w-3 h-3" />}
                      <span>{r.health_status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedRecord(r)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1 ml-auto font-sans transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View JSON</span>
                    </button>
                  </td>
                </tr>
              ))}

              {paginatedRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    No matching audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              Showing <span className="text-white font-medium">{filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
              <span className="text-white font-medium">{Math.min(currentPage * pageSize, filteredRecords.length)}</span> of{' '}
              <span className="text-white font-medium">{filteredRecords.length}</span> entries
              {filteredRecords.length !== records.length && (
                <span className="text-slate-500 ml-1">
                  (filtered from {records.length} total)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <span className="text-slate-500">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-950 text-slate-300 border border-slate-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="hidden md:flex items-center gap-2 border-l border-slate-800 pl-3">
              <span className="text-slate-500 text-[11px]">CSV:</span>
              <button
                id="btn-footer-export-filtered-csv"
                onClick={() => exportCsv('filtered')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium hover:underline flex items-center gap-1"
                title="Download CSV of current filtered records"
              >
                <Download className="w-3 h-3" />
                <span>Filtered ({filteredRecords.length})</span>
              </button>
              <span className="text-slate-700">•</span>
              <button
                id="btn-footer-export-total-csv"
                onClick={() => exportCsv('total')}
                className="text-[11px] text-slate-400 hover:text-slate-200 font-medium hover:underline flex items-center gap-1"
                title="Download CSV of all records"
              >
                <span>Total ({records.length})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-300 disabled:opacity-40 hover:bg-slate-800 text-[11px] font-mono"
              title="First Page"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 disabled:opacity-40 hover:bg-slate-800"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 disabled:opacity-40 hover:bg-slate-800"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-300 disabled:opacity-40 hover:bg-slate-800 text-[11px] font-mono"
              title="Last Page"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Record JSON Inspector Drawer/Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Audit Record Detail</span>
                  <span className="font-mono text-xs text-indigo-400">({selectedRecord.record_id})</span>
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyJsonRecord(selectedRecord)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 text-slate-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-200 space-y-2 border border-slate-800">
              <pre className="whitespace-pre-wrap">{JSON.stringify(selectedRecord, null, 2)}</pre>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Toast Notification */}
      {exportNotice && (
        <div
          id="export-toast-notification"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-indigo-500/50 text-indigo-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-mono"
        >
          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white">CSV Export Ready</div>
            <div className="text-[11px] text-slate-400">{exportNotice}</div>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="text-slate-500 hover:text-slate-300 ml-2 p-1"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
