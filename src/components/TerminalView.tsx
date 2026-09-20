import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Play, AlertCircle, ArrowRight, CornerDownLeft, RefreshCw, Copy, Check } from 'lucide-react';
import { TerminalOutputLine } from '../types';

interface TerminalViewProps {
  onRunSuggestedGrep: (suggested: string) => void;
  onNavigateToSchema: () => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ onRunSuggestedGrep, onNavigateToSchema }) => {
  const [inputCommand, setInputCommand] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<TerminalOutputLine[]>([
    {
      id: 'init-1',
      type: 'input',
      text: 'ls -lh ~/work/enigma-pipeline/storage/audit_inventory.json',
      timestamp: '22:31:02'
    },
    {
      id: 'init-2',
      type: 'output',
      text: '-rw-rw-r-- 1 tim tim 3.0M Jul 29 22:31 /home/tim/work/enigma-pipeline/storage/audit_inventory.json'
    },
    {
      id: 'init-3',
      type: 'input',
      text: 'grep -c "path" ~/work/enigma-pipeline/storage/audit_inventory.json',
      timestamp: '22:31:18'
    },
    {
      id: 'init-4',
      type: 'output',
      text: '0'
    },
    {
      id: 'init-5',
      type: 'hint',
      text: '⚠️ DIAGNOSTIC NOTICE: "grep -c "path"" returned 0 because the field key in audit_inventory.json is named "file_path" and "storage_uri", not "path".',
      actionHint: {
        label: 'Run: grep -c "file_path"',
        command: 'grep -c "file_path" ~/work/enigma-pipeline/storage/audit_inventory.json'
      }
    }
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([
    'ls -lh ~/work/enigma-pipeline/storage/audit_inventory.json',
    'grep -c "path" ~/work/enigma-pipeline/storage/audit_inventory.json'
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Maximum lines to maintain in state to avoid DOM/memory bloat
  const MAX_HISTORY_LINES = 150;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+L to clear screen
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      setHistory([]);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputCommand(commandHistory[nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInputCommand('');
      } else {
        setHistoryIndex(nextIndex);
        setInputCommand(commandHistory[nextIndex] || '');
      }
    }
  };

  const executeCommand = async (cmdToRun?: string) => {
    const cmd = cmdToRun || inputCommand;
    if (!cmd.trim()) return;

    setCommandHistory(prev => [...prev.filter(c => c !== cmd), cmd]);
    setHistoryIndex(-1);

    const inputLine: TerminalOutputLine = {
      id: Date.now().toString(),
      type: 'input',
      text: cmd,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
    };

    setHistory(prev => {
      const next = [...prev, inputLine];
      return next.slice(-MAX_HISTORY_LINES);
    });

    if (!cmdToRun) setInputCommand('');
    setLoading(true);

    try {
      const res = await fetch('/api/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();

      if (data.lines && Array.isArray(data.lines)) {
        setHistory(prev => {
          const next = [...prev, ...data.lines];
          return next.slice(-MAX_HISTORY_LINES);
        });
      } else if (data.output !== undefined) {
        setHistory(prev => {
          const next = [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              type: data.exitCode === 0 ? 'output' : 'error',
              text: data.output
            }
          ];
          return next.slice(-MAX_HISTORY_LINES);
        });
      }
    } catch (err) {
      setHistory(prev => {
        const next = [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            type: 'error',
            text: 'Failed to connect to local dragon9 CLI backend server.'
          }
        ];
        return next.slice(-MAX_HISTORY_LINES);
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const copySession = () => {
    const text = history.map(h => `${h.type === 'input' ? 'tim@dragon9:~$ ' : ''}${h.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining the grep issue */}
      <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 text-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-100 text-sm">
              Why did <code className="bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-300 font-mono">grep -c "path"</code> return 0?
            </h3>
            <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
              In JSON audit files, field keys are exact identifiers. Searching for the string <code className="font-mono text-amber-200">"path"</code> failed because the Enigma Pipeline schema uses <code className="font-mono text-emerald-300">"file_path"</code> and <code className="font-mono text-emerald-300">"storage_uri"</code>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => executeCommand('grep -c "file_path" ~/work/enigma-pipeline/storage/audit_inventory.json')}
            className="px-3 py-1.5 text-xs font-mono font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>grep -c "file_path"</span>
          </button>
          <button
            onClick={onNavigateToSchema}
            className="px-3 py-1.5 text-xs font-medium bg-amber-900/60 hover:bg-amber-900 border border-amber-600/40 text-amber-200 rounded-lg flex items-center gap-1 transition-colors"
          >
            <span>View Full Schema</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden font-mono text-xs sm:text-sm">
        {/* Terminal Header */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
            <span className="text-slate-400 font-sans text-xs font-medium ml-2 flex items-center gap-1">
              <TerminalIcon className="w-3.5 h-3.5" />
              tim@dragon9: ~/work/enigma-pipeline/storage
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={copySession}
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
              title="Copy Terminal Logs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setHistory([])}
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
              title="Clear Terminal"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal Screen Body */}
        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto font-mono leading-relaxed select-text">
          {history.map((line) => (
            <div key={line.id}>
              {line.type === 'input' && (
                <div className="flex items-center text-slate-200 gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">tim@dragon9:~$&nbsp;</span>
                  <span className="text-emerald-200">{line.text}</span>
                  {line.timestamp && <span className="text-slate-600 text-[10px] ml-auto">{line.timestamp}</span>}
                </div>
              )}

              {line.type === 'output' && (
                <div className="text-slate-300 whitespace-pre-wrap pl-4 border-l-2 border-slate-700 my-1 py-0.5">
                  {line.text}
                </div>
              )}

              {line.type === 'error' && (
                <div className="text-red-400 whitespace-pre-wrap pl-4 border-l-2 border-red-800 my-1 py-0.5 bg-red-950/20">
                  {line.text}
                </div>
              )}

              {line.type === 'hint' && (
                <div className="my-2 p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-lg text-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs">{line.text}</div>
                  {line.actionHint && (
                    <button
                      onClick={() => executeCommand(line.actionHint!.command)}
                      className="px-2.5 py-1 text-xs font-sans font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded border border-indigo-400/30 shrink-0 self-start sm:self-auto flex items-center gap-1 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      <span>{line.actionHint.label}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="text-slate-500 flex items-center gap-2 py-1">
              <span className="animate-pulse">●</span>
              <span>Executing pipeline command...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeCommand();
          }}
          className="bg-slate-900 border-t border-slate-800 px-4 py-3 flex items-center gap-2"
        >
          <span className="text-emerald-400 font-bold shrink-0">tim@dragon9:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type bash command (e.g., grep -c 'file_path', schema-check, jq, help)..."
            className="flex-1 bg-transparent text-slate-100 focus:outline-none placeholder:text-slate-600 font-mono text-sm"
          />
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">↑/↓ history • Ctrl+L clear</span>
          <button
            type="submit"
            disabled={loading || !inputCommand.trim()}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded text-xs font-sans font-medium flex items-center gap-1 transition-colors"
          >
            <span>Run</span>
            <CornerDownLeft className="w-3 h-3" />
          </button>
        </form>
      </div>

      {/* Preset Command Shortcuts */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Preset CLI Diagnostics</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-mono">
          <button
            onClick={() => executeCommand('grep -c "file_path" ~/work/enigma-pipeline/storage/audit_inventory.json')}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left rounded text-emerald-400 hover:border-emerald-500/40 transition-colors"
          >
            grep -c "file_path"
            <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Count file_path matches</span>
          </button>

          <button
            onClick={() => executeCommand('schema-check')}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left rounded text-indigo-400 hover:border-indigo-500/40 transition-colors"
          >
            schema-check
            <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Run full JSON key analysis</span>
          </button>

          <button
            onClick={() => executeCommand('jq ".[] | .storage_class" | sort | uniq -c')}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left rounded text-purple-400 hover:border-purple-500/40 transition-colors"
          >
            jq ".storage_class"
            <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Break down storage classes</span>
          </button>

          <button
            onClick={() => executeCommand('head ~/work/enigma-pipeline/storage/audit_inventory.json')}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left rounded text-slate-300 hover:border-slate-700 transition-colors"
          >
            head audit_inventory.json
            <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Inspect first 2 JSON objects</span>
          </button>

          <button
            onClick={() => executeCommand('du -sh ~/work/enigma-pipeline/storage/audit_inventory.json')}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left rounded text-slate-300 hover:border-slate-700 transition-colors"
          >
            du -sh audit_inventory.json
            <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Check disk usage (3.0M)</span>
          </button>

          <button
            onClick={() => executeCommand('help')}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left rounded text-amber-400 hover:border-amber-500/40 transition-colors"
          >
            help
            <span className="block text-[10px] text-slate-500 font-sans mt-0.5">List available commands</span>
          </button>
        </div>
      </div>
    </div>
  );
};
