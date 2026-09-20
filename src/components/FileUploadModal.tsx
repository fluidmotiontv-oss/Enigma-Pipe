import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setJsonText(text);
        setErrorMsg('');
      } catch (err: any) {
        setErrorMsg('Failed to read selected file.');
      }
    };
    reader.readAsText(file);
  };

  const submitJson = async () => {
    if (!jsonText.trim()) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const parsed = JSON.parse(jsonText);
      const res = await fetch('/api/audit-inventory/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsed })
      });
      const data = await res.json();

      if (data.success) {
        onUploadSuccess();
        onClose();
      } else {
        setErrorMsg(data.error || 'Failed to update audit inventory dataset.');
      }
    } catch (err: any) {
      setErrorMsg('Invalid JSON format. Please verify syntax.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Import Custom Audit Inventory</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        </div>

        {/* File Drag Area */}
        <div className="space-y-3">
          <label className="block p-6 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl bg-slate-950 text-center cursor-pointer transition-colors">
            <FileText className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            <span className="text-xs font-semibold text-slate-200 block">Click to select JSON file</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Supports .json audit logs up to 10MB</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-slate-500 text-[10px] uppercase font-semibold">Or paste raw JSON</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Paste JSON array or object here..."
            rows={6}
            className="w-full bg-slate-950 text-slate-200 font-mono text-xs rounded-lg p-3 border border-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
          >
            Cancel
          </button>
          <button
            onClick={submitJson}
            disabled={loading || !jsonText.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors"
          >
            {loading ? 'Processing...' : 'Load Inventory'}
          </button>
        </div>
      </div>
    </div>
  );
};
