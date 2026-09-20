import React, { useState } from 'react';
import { Search, CheckCircle2, XCircle, Key, Layers, Info, Filter, ArrowRight } from 'lucide-react';
import { SchemaAnalysis } from '../types';

interface SchemaInspectorProps {
  schema: SchemaAnalysis;
  onFilterTableByKey: (key: string) => void;
}

export const SchemaInspector: React.FC<SchemaInspectorProps> = ({ schema, onFilterTableByKey }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredKeys = schema.keyOccurrences.filter(k =>
    k.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* High-Level Mystery Resolution Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-xs font-semibold text-red-400 mb-2">
              <XCircle className="w-3.5 h-3.5" />
              <span>Query Result: grep -c "path" = 0</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Audit Inventory Schema Key Breakdown</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Analysis of <span className="text-white font-mono font-medium">audit_inventory.json</span> (3.0 MB, {schema.totalRecords} records). The literal string <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">"path"</code> does not exist as a standalone key in this inventory.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider block">Target Path Keys Found</span>
            <div className="flex items-center gap-2 text-emerald-400 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-bold">file_path</span>
              <span className="text-slate-500">({schema.totalRecords} records, 100%)</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-400 font-mono">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="font-bold">storage_uri</span>
              <span className="text-slate-500">({schema.totalRecords} records, 100%)</span>
            </div>
          </div>
        </div>

        {/* Quick Key Search Comparison Card */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-950 rounded-xl border border-red-500/20">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Searched Key</div>
            <div className="text-lg font-mono font-bold text-red-400 mt-1">"path"</div>
            <div className="text-2xl font-bold text-slate-100 mt-2">0 matches</div>
            <p className="text-xs text-slate-500 mt-1">Key does not exist in schema</p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/30">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actual Local Path Key</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-1">"file_path"</div>
            <div className="text-2xl font-bold text-white mt-2">{schema.totalRecords} matches</div>
            <p className="text-xs text-slate-400 mt-1">Contains absolute POSIX storage path</p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-indigo-500/30">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cloud URI Key</div>
            <div className="text-lg font-mono font-bold text-indigo-400 mt-1">"storage_uri"</div>
            <div className="text-2xl font-bold text-white mt-2">{schema.totalRecords} matches</div>
            <p className="text-xs text-slate-400 mt-1">Contains Google Cloud Storage URI</p>
          </div>
        </div>
      </div>

      {/* Key Occurrences Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-base">Detected JSON Top-Level Keys</h3>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              {filteredKeys.length} keys
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search keys or types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Key Name</th>
                <th className="py-3 px-4">Data Type</th>
                <th className="py-3 px-4">Frequency</th>
                <th className="py-3 px-4">Sample Value</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {filteredKeys.map((item) => (
                <tr key={item.key} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className={`font-bold ${item.key === 'file_path' || item.key === 'storage_uri' ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {item.key}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-indigo-300 rounded text-[10px]">
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-300 font-sans text-xs">{item.percentage}% ({item.count})</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 truncate max-w-xs font-mono text-[11px]">
                    {item.sampleValues.join(', ') || '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      onClick={() => onFilterTableByKey(item.key)}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 ml-auto transition-colors"
                    >
                      <span>Filter</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
