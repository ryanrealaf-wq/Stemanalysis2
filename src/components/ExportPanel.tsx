/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  FileMusic,
  FileCode,
  CheckCircle2,
  Layers,
  Sparkles,
  X,
  Radio,
  Sliders,
  Activity as WaveIcon,
} from 'lucide-react';
import { MidiExportOptions, SongPipelineResult, StemType } from '../types';
import { DEFAULT_EXPORT_OPTIONS, downloadMidiBlob, generateMidiFile } from '../lib/midiExport';

interface ExportPanelProps {
  pipelineResult: SongPipelineResult | null;
  onClose: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  pipelineResult,
  onClose,
}) => {
  if (!pipelineResult) return null;

  const { metadata, cleanedMidiNotes, sections, geminiExecutiveSummary, stemSummaries, grooveTemplate, keyProfile } = pipelineResult;

  const [exportOptions, setExportOptions] = useState<MidiExportOptions>({
    ...DEFAULT_EXPORT_OPTIONS,
  });

  const handleExportFullMidi = () => {
    const bytes = generateMidiFile(cleanedMidiNotes, metadata.bpm, undefined, exportOptions);
    const suffix = exportOptions.mode === 'expressive' ? 'expressive' : 'quantized';
    const filename = `${metadata.title.toLowerCase().replace(/\s+/g, '_')}_${suffix}_multitrack.mid`;
    downloadMidiBlob(bytes, filename);
  };

  const handleExportStemMidi = (stem: StemType) => {
    const bytes = generateMidiFile(cleanedMidiNotes, metadata.bpm, stem, exportOptions);
    const filename = `${metadata.title.toLowerCase().replace(/\s+/g, '_')}_${stem}_${exportOptions.mode}.mid`;
    downloadMidiBlob(bytes, filename);
  };

  const handleExportGeminiJson = () => {
    const exportData = {
      project: 'StemFlow AI Audio Intelligence',
      song: metadata,
      geminiExecutiveSummary,
      arrangementAnalysis: pipelineResult.arrangementCritique,
      mixRecommendations: pipelineResult.mixRecommendations,
      sections,
      stemSummaries,
      grooveTemplate,
      keyProfile,
      crossStemInteractions: pipelineResult.crossStemCorrelations,
      transcribedNotesCount: cleanedMidiNotes.length,
      purgedFalsePositivesCount: pipelineResult.purgedNotes.length,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.title.toLowerCase().replace(/\s+/g, '_')}_analysis_report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMidiNotesJson = () => {
    const blob = new Blob([JSON.stringify(cleanedMidiNotes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.title.toLowerCase().replace(/\s+/g, '_')}_midi_notes.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stemsList: { type: StemType; label: string; icon: string; filename: string }[] = [
    { type: 'vocals', label: 'Vocals Track (Pitch Bends + CC11)', icon: '🎤', filename: 'vocals' },
    { type: 'bass', label: 'Bass Track (Monophonic CREPE/pYIN)', icon: '🎸', filename: 'bass' },
    { type: 'drums', label: 'Drums Track (Micro-timing Groove)', icon: '🥁', filename: 'drums' },
    { type: 'other', label: 'Other/Keys Track (Chord Detection)', icon: '🎹', filename: 'other' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0B0E]/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#15171C] border border-[#2D3139] rounded-lg max-w-2xl w-full p-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2D3139]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                Export Standard MIDI & Audio Analysis
              </h2>
              <p className="text-[11px] font-mono text-slate-500">
                SMF Format 1 multi-track with audio-derived pitch bends, dynamics & groove
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-white hover:bg-[#0A0B0E] transition border border-transparent hover:border-[#2D3139]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Expressive Audio Analysis Export Options */}
        <div className="mb-4 p-3.5 rounded bg-[#0A0B0E] border border-[#2D3139] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-indigo-400" />
              Audio DSP Expression Tuning
            </span>
            {keyProfile && (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#1A1D24] text-emerald-400 border border-[#2D3139]">
                Detected Key: {keyProfile.keyName} ({keyProfile.scaleType})
              </span>
            )}
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setExportOptions((prev) => ({ ...prev, mode: 'expressive', includePitchBends: true, includeExpressionCC: true }))}
              className={`p-2 rounded border text-left transition text-xs font-mono ${
                exportOptions.mode === 'expressive'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                  : 'bg-[#15171C] border-[#2D3139] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold">✨ Expressive Lead</div>
              <div className="text-[9px] text-slate-500">Continuous Pitch Bend & CC11 Dynamics</div>
            </button>

            <button
              onClick={() => setExportOptions((prev) => ({ ...prev, mode: 'quantized_daw', includePitchBends: false, includeExpressionCC: false }))}
              className={`p-2 rounded border text-left transition text-xs font-mono ${
                exportOptions.mode === 'quantized_daw'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                  : 'bg-[#15171C] border-[#2D3139] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold">🎛️ Clean DAW Grid</div>
              <div className="text-[9px] text-slate-500">Strict Snapping & Normalized Velocity</div>
            </button>

            <button
              onClick={() => setExportOptions((prev) => ({ ...prev, mode: 'hybrid_adaptive', includePitchBends: true, includeExpressionCC: false }))}
              className={`p-2 rounded border text-left transition text-xs font-mono ${
                exportOptions.mode === 'hybrid_adaptive'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                  : 'bg-[#15171C] border-[#2D3139] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold">⚡ Hybrid Adaptive</div>
              <div className="text-[9px] text-slate-500">Section-Adaptive Expression</div>
            </button>
          </div>

          {/* Toggle Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-1">
            <label className="flex items-center gap-2 cursor-pointer bg-[#15171C] p-2 rounded border border-[#2D3139]">
              <input
                type="checkbox"
                checked={exportOptions.includePitchBends}
                onChange={(e) => setExportOptions((prev) => ({ ...prev, includePitchBends: e.target.checked }))}
                className="accent-indigo-500 rounded"
              />
              <span>14-Bit Pitch Bends (Slides & Vibrato)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-[#15171C] p-2 rounded border border-[#2D3139]">
              <input
                type="checkbox"
                checked={exportOptions.includeExpressionCC}
                onChange={(e) => setExportOptions((prev) => ({ ...prev, includeExpressionCC: e.target.checked }))}
                className="accent-indigo-500 rounded"
              />
              <span>CC11 Expression Curves (Vocal Swells)</span>
            </label>
          </div>

          {/* Velocity & Pitch Bend Range Controls */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">Velocity Mapping</label>
              <select
                value={exportOptions.velocityScaling}
                onChange={(e) => setExportOptions((prev) => ({ ...prev, velocityScaling: e.target.value as any }))}
                className="w-full bg-[#15171C] border border-[#2D3139] rounded p-1.5 text-xs font-mono text-white"
              >
                <option value="audio_rms_dynamic">Audio RMS & Attack Peak Dynamics</option>
                <option value="daw_normalized">DAW Normalized (90-115 Velocity)</option>
                <option value="raw_peaks">Raw Transcription Peaks</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">Pitch Bend Range (Semitones)</label>
              <select
                value={exportOptions.pitchBendRange}
                onChange={(e) => setExportOptions((prev) => ({ ...prev, pitchBendRange: Number(e.target.value) }))}
                className="w-full bg-[#15171C] border border-[#2D3139] rounded p-1.5 text-xs font-mono text-white"
              >
                <option value={2}>±2 Semitones (Standard DAW Default)</option>
                <option value={5}>±5 Semitones (Wide Vocal Glissando)</option>
                <option value={12}>±12 Semitones (Full Octave Pitch Dive)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Master Multi-Track Download Button */}
        <div className="mb-4 p-3.5 rounded bg-[#0A0B0E] border border-[#2D3139]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#1A1D24] text-indigo-400 font-bold border border-[#2D3139]">
                DAW Ready ({exportOptions.mode.toUpperCase()})
              </span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mt-1.5">
                Full Song Aligned Multi-Track MIDI (.mid)
              </h3>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                All 4 stems aligned to {metadata.bpm} BPM grid with embedded pitch bends, CC11 dynamics, and groove template.
              </p>
            </div>

            <button
              onClick={handleExportFullMidi}
              className="px-3.5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold tracking-wider hover:brightness-110 transition flex items-center gap-1.5 shrink-0 uppercase border border-indigo-400/40"
            >
              <Download className="w-3.5 h-3.5" />
              Download .MID
            </button>
          </div>
        </div>

        {/* Individual Stems MIDI Downloads */}
        <div className="space-y-2 mb-4">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
            Individual Stem MIDI Files
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stemsList.map((s) => {
              const summary = stemSummaries[s.type];
              return (
                <div
                  key={s.type}
                  className="p-2.5 rounded bg-[#0A0B0E] border border-[#2D3139] flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <span className="text-xs font-bold text-white block truncate uppercase font-mono">
                      {s.icon} {s.label.split(' ')[0]}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {summary?.noteCount || 0} notes • {summary?.routingMethod || 'MIDI'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleExportStemMidi(s.type)}
                    className="p-1.5 rounded bg-[#1A1D24] text-indigo-400 hover:bg-indigo-600 hover:text-white border border-[#2D3139] transition text-xs shrink-0"
                    title={`Download ${s.label} MIDI`}
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Intelligence Data & Notes JSON Export */}
        <div className="space-y-2 pt-3 border-t border-[#2D3139]">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
            Intelligence Reports & Raw JSON Data
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={handleExportGeminiJson}
              className="p-2.5 rounded bg-[#0A0B0E] border border-[#2D3139] hover:border-slate-600 text-left transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block uppercase font-mono">
                    Gemini Analysis Report (.json)
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block">
                    Reasoning, sections, groove & key profile
                  </span>
                </div>
              </div>
              <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>

            <button
              onClick={handleExportMidiNotesJson}
              className="p-2.5 rounded bg-[#0A0B0E] border border-[#2D3139] hover:border-slate-600 text-left transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileMusic className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block uppercase font-mono">
                    Transcribed Notes (.json)
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block">
                    Pitches, bends, CC11 curves & velocities
                  </span>
                </div>
              </div>
              <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
