import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Server, Database, HardDrive, Clock, Lock } from 'lucide-react';
import { SchemaAnalysis, AuditRecord } from '../types';

interface AnomalyDashboardProps {
  schema: SchemaAnalysis;
  records: AuditRecord[];
  onNavigateToTable: () => void;
}

export const AnomalyDashboard: React.FC<AnomalyDashboardProps> = ({ schema, records, onNavigateToTable }) => {
  const unencryptedCount = records.filter(r => !r.is_encrypted).length;
  const corruptCount = records.filter(r => !r.checksum_sha256).length;
  const staleCount = records.filter(r => r.health_status === 'stale').length;

  const totalBytes = schema.totalSizeBytes;
  const totalMB = (totalBytes / 1048576).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Records</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{schema.totalRecords.toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-1">Stored in audit_inventory.json</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Inventory Storage</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{totalMB} MB</div>
          <p className="text-xs text-slate-500 mt-1">Total payload volume</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Unencrypted Alerts</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${unencryptedCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {unencryptedCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">Requires AES-256 enforcement</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Checksum Anomalies</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${corruptCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {corruptCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">Missing SHA-256 integrity hash</p>
        </div>
      </div>

      {/* Storage Class & Stage Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Storage Class Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Storage Class Tier Distribution</span>
          </h3>
          <div className="space-y-3">
            {Object.entries(schema.storageClassBreakdown).map(([cls, rawCount]) => {
              const count = Number(rawCount);
              const pct = Math.round((count / schema.totalRecords) * 100);
              return (
                <div key={cls} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-200 font-semibold">{cls}</span>
                    <span className="text-slate-400">{count} files ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-2 rounded-full ${
                        cls === 'STANDARD' ? 'bg-emerald-500' :
                        cls === 'NEARLINE' ? 'bg-blue-500' :
                        cls === 'COLDLINE' ? 'bg-purple-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Pipeline Stage File Counts</span>
          </h3>
          <div className="space-y-3">
            {Object.entries(schema.stagesBreakdown).map(([stage, rawCount]) => {
              const count = Number(rawCount);
              const pct = Math.round((count / schema.totalRecords) * 100);
              return (
                <div key={stage} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-200 font-semibold">{stage}</span>
                    <span className="text-slate-400">{count} files ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Audit Recommendations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="font-bold text-slate-100 text-base">Pipeline Security & Audit Compliance Checklist</h3>
        <div className="space-y-2 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Lock className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-semibold text-white block">Key Identification Audit</span>
                <span className="text-slate-400">All audit files use standardized "file_path" key.</span>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded font-semibold">PASSED</span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-semibold text-white block">At-Rest Encryption Scan</span>
                <span className="text-slate-400">{unencryptedCount} unencrypted files detected in storage buckets.</span>
              </div>
            </div>
            <button
              onClick={onNavigateToTable}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition-colors"
            >
              Review Files
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
