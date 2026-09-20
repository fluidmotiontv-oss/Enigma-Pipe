import React from 'react';
import { Terminal, Database, Search, Cpu, AlertTriangle, Upload, Sparkles, Server, Code, Film, HardDrive, Clapperboard, Flame, Radio, ShieldCheck } from 'lucide-react';

export type TabType = 'terminal' | 'schema' | 'table' | 'jq' | 'health' | 'story' | 'auditor' | 'kdenlive' | 'jumble' | 'governance' | 'renders' | 'ai';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  recordCount: number;
  fileSizeFormatted: string;
  onOpenUpload: () => void;
  onOpenAI: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  recordCount,
  fileSizeFormatted,
  onOpenUpload,
  onOpenAI
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & File Badge */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-white">Enigma Pipeline</span>
                <span className="px-2 py-0.5 text-xs font-mono bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 font-bold flex items-center gap-1">
                  <span>⚡ dragon9</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span className="text-emerald-400 font-medium">audit_inventory.json</span>
                <span>•</span>
                <span>{fileSizeFormatted}</span>
                <span>•</span>
                <span>{recordCount.toLocaleString()} records</span>
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('story')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'story'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-amber-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clapperboard className="w-4 h-4" />
              <span>Story Forge</span>
              <span className="text-[9px] bg-slate-950 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/40">
                AI Director
              </span>
            </button>

            <button
              onClick={() => setActiveTab('auditor')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'auditor'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Drive Auditor</span>
            </button>

            <button
              onClick={() => setActiveTab('kdenlive')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'kdenlive'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>4K Kdenlive</span>
            </button>

            <button
              onClick={() => setActiveTab('jumble')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'jumble'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Radio className="w-4 h-4 text-rose-400" />
              <span>Jumble Forge</span>
              <span className="text-[9px] bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/40">
                Chaos
              </span>
            </button>

            <button
              onClick={() => setActiveTab('governance')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'governance'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-cyan-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Void Governance</span>
            </button>

            <button
              onClick={() => setActiveTab('renders')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'renders'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Film className="w-4 h-4 text-emerald-400" />
              <span>Render Archive</span>
            </button>

            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'terminal'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>CLI</span>
            </button>

            <button
              onClick={() => setActiveTab('schema')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'schema'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Schema</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Inventory</span>
            </button>

            <button
              onClick={() => setActiveTab('jq')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'jq'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>JQ Query</span>
            </button>

            <button
              onClick={() => setActiveTab('health')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'health'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Health</span>
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
              title="Import or paste JSON file"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import JSON</span>
            </button>

            <button
              onClick={onOpenAI}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white rounded-lg shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Director</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden flex items-center gap-1 py-2 border-t border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('story')}
            className={`px-2.5 py-1 rounded font-bold whitespace-nowrap ${activeTab === 'story' ? 'bg-amber-500 text-slate-950' : 'text-amber-300'}`}
          >
            Story Forge
          </button>
          <button
            onClick={() => setActiveTab('auditor')}
            className={`px-2.5 py-1 rounded font-bold whitespace-nowrap ${activeTab === 'auditor' ? 'bg-indigo-600 text-white' : 'text-indigo-300'}`}
          >
            Drive Auditor
          </button>
          <button
            onClick={() => setActiveTab('kdenlive')}
            className={`px-2.5 py-1 rounded font-bold whitespace-nowrap ${activeTab === 'kdenlive' ? 'bg-emerald-600 text-white' : 'text-emerald-400'}`}
          >
            4K Kdenlive
          </button>
          <button
            onClick={() => setActiveTab('jumble')}
            className={`px-2.5 py-1 rounded font-bold whitespace-nowrap ${activeTab === 'jumble' ? 'bg-rose-600 text-white' : 'text-rose-400'}`}
          >
            🎲 Jumble
          </button>
          <button
            onClick={() => setActiveTab('governance')}
            className={`px-2.5 py-1 rounded font-bold whitespace-nowrap ${activeTab === 'governance' ? 'bg-cyan-600 text-white' : 'text-cyan-400'}`}
          >
            🛡️ Governance
          </button>
          <button
            onClick={() => setActiveTab('renders')}
            className={`px-2.5 py-1 rounded font-bold whitespace-nowrap ${activeTab === 'renders' ? 'bg-emerald-600 text-white' : 'text-emerald-400'}`}
          >
            🎬 Renders
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'terminal' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            CLI
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'schema' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Schema
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Table
          </button>
          <button
            onClick={() => setActiveTab('jq')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'jq' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            JQ
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'health' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Health
          </button>
        </div>
      </div>
    </header>
  );
};
