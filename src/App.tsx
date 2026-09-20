/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar, TabType } from './components/Navbar';
import { TerminalView } from './components/TerminalView';
import { SchemaInspector } from './components/SchemaInspector';
import { InventoryTable } from './components/InventoryTable';
import { JqPlayground } from './components/JqPlayground';
import { AnomalyDashboard } from './components/AnomalyDashboard';
import { StoryForge } from './components/StoryForge';
import { DriveAuditor } from './components/DriveAuditor';
import { KdenliveExporter } from './components/KdenliveExporter';
import { JumbleForge } from './components/JumbleForge';
import { VoidGovernance } from './components/VoidGovernance';
import { RenderHistory } from './components/RenderHistory';
import { AIAssistantModal } from './components/AIAssistantModal';
import { FileUploadModal } from './components/FileUploadModal';
import { INITIAL_AUDIT_DATA, analyzeInventorySchema } from './data/mockInventory';
import { DIRECTORS, INITIAL_DRIVE_ASSETS } from './data/directorsData';
import { AuditRecord, SchemaAnalysis, MediaAsset, StorySegment, DirectorPersona } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('story');
  const [records, setRecords] = useState<AuditRecord[]>(INITIAL_AUDIT_DATA);
  const [schema, setSchema] = useState<SchemaAnalysis>(analyzeInventorySchema(INITIAL_AUDIT_DATA));
  const [fileInfo, setFileInfo] = useState({
    path: "/home/tim/work/enigma-pipeline/storage/audit_inventory.json",
    sizeFormatted: "3.0M",
    sizeBytes: 3145728
  });

  const [assets, setAssets] = useState<MediaAsset[]>(INITIAL_DRIVE_ASSETS);
  const [activeDirector, setActiveDirector] = useState<DirectorPersona>(DIRECTORS.chaos);
  const [timeline, setTimeline] = useState<StorySegment[]>([
    {
      id: 'seg_1',
      asset: INITIAL_DRIVE_ASSETS[0],
      track: 'A-Roll (Main)',
      startTimeSec: 0,
      durationSec: 15,
      transition: 'glitch',
      notes: 'Intro drone coastal shot in 4K'
    },
    {
      id: 'seg_2',
      asset: INITIAL_DRIVE_ASSETS[1],
      track: 'A-Roll (Main)',
      startTimeSec: 15,
      durationSec: 30,
      transition: 'sovereign_wipe',
      notes: 'Tim Master Interview'
    },
    {
      id: 'seg_3',
      asset: INITIAL_DRIVE_ASSETS[2],
      track: 'B-Roll (Overlay)',
      startTimeSec: 45,
      durationSec: 20,
      transition: 'glitch',
      notes: 'Cyberpunk Tokyo Night B-Roll'
    }
  ]);

  const [isScanningDrive, setIsScanningDrive] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filteredTableKey, setFilteredTableKey] = useState<string | undefined>(undefined);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/audit-inventory');
      if (res.ok) {
        const data = await res.json();
        if (data.schemaAnalysis) setSchema(data.schemaAnalysis);
        if (data.fileInfo) setFileInfo(data.fileInfo);
        if (data.sampleRecords && Array.isArray(data.sampleRecords)) {
          setRecords(data.sampleRecords);
        }
      }
    } catch (err) {
      console.warn("Using local default dataset fallback.");
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleFilterTableByKey = (key: string) => {
    setFilteredTableKey(key);
    setActiveTab('table');
  };

  const handleScanNewFolder = async (folderPath: string) => {
    setIsScanningDrive(true);
    try {
      const res = await fetch('/api/scan-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.assets && Array.isArray(data.assets)) {
          setAssets(prev => [...data.assets, ...prev]);
          alert(`Drive scan complete for ${folderPath}! Scanned ${data.assets.length} broadcast 4K clips from local storage.`);
        }
      } else {
        throw new Error("Failed scan response");
      }
    } catch (err) {
      // Fallback
      const newAsset: MediaAsset = {
        id: `scanned_${Date.now()}`,
        filePath: `${folderPath}/new_broll_scanned_${Math.floor(Math.random() * 900 + 100)}.mp4`,
        fileName: `new_broll_scanned_${Math.floor(Math.random() * 900 + 100)}.mp4`,
        fileSize: '512.0 MB',
        duration: '00:01:15',
        resolution: '3840x2160',
        fps: 60,
        codec: 'hevc',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
        motionEnergy: 0.82,
        audioMood: 'hype',
        bpm: 132,
        sceneCutCount: 16,
        aiTag: 'DRONE-GOLD',
        directorVibe: activeDirector.name as any,
        inTime: '00:00:00',
        outTime: '00:01:15'
      };
      setAssets(prev => [newAsset, ...prev]);
    } finally {
      setIsScanningDrive(false);
    }
  };

  const handleAddToTimeline = (asset: MediaAsset) => {
    const newSeg: StorySegment = {
      id: `seg_${Date.now()}`,
      asset,
      track: asset.aiTag.includes('INTERVIEW') ? 'A-Roll (Main)' : 'B-Roll (Overlay)',
      startTimeSec: timeline.reduce((acc, curr) => acc + curr.durationSec, 0),
      durationSec: 15,
      transition: activeDirector.id === 'chaos' ? 'glitch' : 'sovereign_wipe',
      notes: `Added from Drive Auditor (${asset.aiTag})`
    };
    setTimeline(prev => [...prev, newSeg]);
    setActiveTab('story');
  };

  const handleRoastAsset = (asset: MediaAsset) => {
    const roast = activeDirector.roastCatchphrases[Math.floor(Math.random() * activeDirector.roastCatchphrases.length)];
    alert(`🔥 ${activeDirector.name} says:\n"${roast}"\n\nClip: ${asset.fileName}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Header Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recordCount={schema.totalRecords}
        fileSizeFormatted={fileInfo.sizeFormatted}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenAI={() => setIsAIModalOpen(true)}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'story' && (
            <motion.div
              key="story"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <StoryForge
                timeline={timeline}
                availableAssets={assets}
                onUpdateTimeline={setTimeline}
                onOpenKdenliveExport={() => setActiveTab('kdenlive')}
                activeDirector={activeDirector}
                onChangeDirector={setActiveDirector}
              />
            </motion.div>
          )}

          {activeTab === 'auditor' && (
            <motion.div
              key="auditor"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <DriveAuditor
                assets={assets}
                onScanNewFolder={handleScanNewFolder}
                onAddToTimeline={handleAddToTimeline}
                onRoastAsset={handleRoastAsset}
                isScanning={isScanningDrive}
              />
            </motion.div>
          )}

          {activeTab === 'kdenlive' && (
            <motion.div
              key="kdenlive"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <KdenliveExporter
                timeline={timeline}
                director={activeDirector}
                onBack={() => setActiveTab('story')}
                onNavigateToRenders={() => setActiveTab('renders')}
              />
            </motion.div>
          )}

          {activeTab === 'jumble' && (
            <motion.div
              key="jumble"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <JumbleForge
                assets={assets}
                activeDirector={activeDirector}
                tideBpm={128}
                isBroadcasting={false}
                onGoLiveWithJumble={(canvas) => {
                  alert("📡 Broadcast feed initialized! Streaming Jumble Forge canvas to Sovereign Live output.");
                }}
              />
            </motion.div>
          )}

          {activeTab === 'governance' && (
            <motion.div
              key="governance"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <VoidGovernance
                assets={assets}
                onAddToTimeline={handleAddToTimeline}
                onRoastAsset={(asset) => {
                  alert(`🔥 AI Roast generated for ${asset.fileName}: "A classic clip destined for the Void."`);
                }}
              />
            </motion.div>
          )}

          {activeTab === 'renders' && (
            <motion.div
              key="renders"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <RenderHistory />
            </motion.div>
          )}

          {activeTab === 'terminal' && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <TerminalView
                onRunSuggestedGrep={() => {}}
                onNavigateToSchema={() => setActiveTab('schema')}
              />
            </motion.div>
          )}

          {activeTab === 'schema' && (
            <motion.div
              key="schema"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <SchemaInspector
                schema={schema}
                onFilterTableByKey={handleFilterTableByKey}
              />
            </motion.div>
          )}

          {activeTab === 'table' && (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <InventoryTable
                records={records}
                initialFilterKey={filteredTableKey}
              />
            </motion.div>
          )}

          {activeTab === 'jq' && (
            <motion.div
              key="jq"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <JqPlayground records={records} />
            </motion.div>
          )}

          {activeTab === 'health' && (
            <motion.div
              key="health"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <AnomalyDashboard
                schema={schema}
                records={records}
                onNavigateToTable={() => setActiveTab('table')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Enigma Pipeline & Sovereign Story Forge • dragon9</span>
          <span>Target File: /home/tim/work/enigma-pipeline/storage/audit_inventory.json</span>
        </div>
      </footer>

      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onRunCommand={() => {}}
      />

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={fetchInventory}
      />
    </div>
  );
}

