/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  FileMusic,
  Grid,
  Filter,
  Eye,
  Sliders,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Wand2,
  Music,
  Activity,
  Headphones,
  Maximize2,
  Download,
} from 'lucide-react';
import { AuditionMode, MidiNote, SongPipelineResult, StemType, midiPitchToNoteName } from '../types';
import { audioEngine } from '../lib/audioPlayer';
import { ChordProgressionStrip } from './ChordProgressionStrip';
import { AutomationLaneDrawer } from './AutomationLaneDrawer';

interface PianoRollViewProps {
  pipelineResult: SongPipelineResult | null;
  currentTime: number;
  duration: number;
  selectedStem: StemType | 'all';
  onSeek: (time: number) => void;
  auditionMode?: AuditionMode;
  onChangeAuditionMode?: (mode: AuditionMode) => void;
  onExportStemMidi?: (stem: StemType | 'all') => void;
}

export const PianoRollView: React.FC<PianoRollViewProps> = ({
  pipelineResult,
  currentTime,
  duration,
  selectedStem,
  onSeek,
  auditionMode = 'hybrid_unison',
  onChangeAuditionMode,
  onExportStemMidi,
}) => {
  const [showPurgedBleed, setShowPurgedBleed] = useState(true);
  const [showWaveformOverlay, setShowWaveformOverlay] = useState(true);
  const [showAutomationLanes, setShowAutomationLanes] = useState(true);
  const [colorMode, setColorMode] = useState<'stem' | 'role'>('stem');
  const [hoveredNote, setHoveredNote] = useState<MidiNote | null>(null);
  const [selectedNote, setSelectedNote] = useState<MidiNote | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const totalDuration = duration || pipelineResult?.metadata.duration || 30;

  // Filter notes to display with memoization
  const visibleNotes = useMemo(() => {
    if (!pipelineResult) return [];
    const allNotes = showPurgedBleed
      ? pipelineResult.midiNotes
      : pipelineResult.cleanedMidiNotes;
    return selectedStem === 'all'
      ? allNotes
      : allNotes.filter((n) => n.stem === selectedStem);
  }, [pipelineResult, showPurgedBleed, selectedStem]);

  // Pitch boundaries
  const { minPitch, maxPitch, pitchRange } = useMemo(() => {
    const pitches = visibleNotes.map((n) => n.pitch);
    const min = pitches.length > 0 ? Math.max(24, Math.min(...pitches) - 2) : 36;
    const max = pitches.length > 0 ? Math.min(96, Math.max(...pitches) + 2) : 84;
    return {
      minPitch: min,
      maxPitch: max,
      pitchRange: Math.max(12, max - min + 1),
    };
  }, [visibleNotes]);

  if (!pipelineResult) return null;

  const getStemColor = (stem: StemType, isCleaned?: boolean) => {
    if (isCleaned) return 'bg-rose-950/70 border-rose-600/80 text-rose-300 line-through opacity-60 border-dashed';
    switch (stem) {
      case 'vocals':
        return 'bg-cyan-500/80 border-cyan-300 text-cyan-950 font-bold';
      case 'bass':
        return 'bg-amber-500/80 border-amber-300 text-amber-950 font-bold';
      case 'drums':
        return 'bg-pink-500/80 border-pink-300 text-pink-950 font-bold';
      case 'guitar':
        return 'bg-emerald-500/80 border-emerald-300 text-emerald-950 font-bold';
      case 'piano':
        return 'bg-sky-500/80 border-sky-300 text-sky-950 font-bold';
      case 'other':
        return 'bg-purple-500/80 border-purple-300 text-purple-950 font-bold';
    }
  };

  const getRoleColor = (role: string, isCleaned?: boolean) => {
    if (isCleaned) return 'bg-rose-950/70 border-rose-600/80 text-rose-300 border-dashed line-through opacity-60';
    switch (role) {
      case 'foundation':
        return 'bg-amber-500/80 border-amber-300 text-amber-950 font-bold';
      case 'lead':
        return 'bg-cyan-500/80 border-cyan-300 text-cyan-950 font-bold';
      case 'texture':
        return 'bg-purple-500/80 border-purple-300 text-purple-950 font-bold';
      case 'ornament':
        return 'bg-indigo-500/80 border-indigo-300 text-indigo-950 font-bold';
      case 'percussion':
        return 'bg-pink-500/80 border-pink-300 text-pink-950 font-bold';
      default:
        return 'bg-slate-700 border-slate-500 text-white';
    }
  };

  const handleNoteClick = (e: React.MouseEvent, note: MidiNote) => {
    e.stopPropagation();
    setSelectedNote(note);
    audioEngine.playSynthesizedNote(note);
    onSeek(note.startTime);
  };

  const playheadPercent = (currentTime / totalDuration) * 100;

  // Audio waveform envelope points for visual underlay
  const waveformBars = useMemo(() => {
    const stemKey = selectedStem === 'all' ? 'vocals' : selectedStem;
    const timeline = pipelineResult.stemFeatures[stemKey]?.timeline || [];
    return timeline;
  }, [pipelineResult, selectedStem]);

  return (
    <div className="bg-[#15171C] rounded-lg border border-[#2D3139] p-4 shadow-xl select-none">
      {/* Top Controls Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-[#2D3139]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
            <Grid className="w-3.5 h-3.5 text-indigo-400" />
            Piano Roll, Harmonic Chords & CC Automation
          </h3>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            Click any note to audition synthesized pitch. Inspect audio spectral envelope underlay & continuous pitch splines.
          </p>
        </div>

        {/* View Options & Audition Mode */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase">
          {/* Audition Mode Selector */}
          {onChangeAuditionMode && (
            <div className="bg-[#0A0B0E] p-0.5 rounded border border-[#2D3139] flex items-center gap-0.5">
              <button
                onClick={() => onChangeAuditionMode('audio_only')}
                className={`px-2 py-0.5 rounded font-semibold transition ${
                  auditionMode === 'audio_only'
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Play original audio stems only"
              >
                🎧 Audio Stems
              </button>
              <button
                onClick={() => onChangeAuditionMode('synth_only')}
                className={`px-2 py-0.5 rounded font-semibold transition ${
                  auditionMode === 'synth_only'
                    ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Play Web Audio synthesizer MIDI only"
              >
                🎹 Synth MIDI
              </button>
              <button
                onClick={() => onChangeAuditionMode('hybrid_unison')}
                className={`px-2 py-0.5 rounded font-semibold transition ${
                  auditionMode === 'hybrid_unison'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Play Audio Stems and Synth MIDI in unison for phase alignment verification"
              >
                🎛️ Hybrid A/B
              </button>
            </div>
          )}

          {/* Waveform Underlay Toggle */}
          <button
            onClick={() => setShowWaveformOverlay(!showWaveformOverlay)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border transition ${
              showWaveformOverlay
                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80'
                : 'bg-[#0A0B0E] text-slate-500 border-[#2D3139] hover:text-slate-300'
            }`}
            title="Toggle spectral audio density underlay"
          >
            <Activity className="w-3 h-3" />
            <span>Waveform Underlay</span>
          </button>

          {/* Automation Lanes Toggle */}
          <button
            onClick={() => setShowAutomationLanes(!showAutomationLanes)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border transition ${
              showAutomationLanes
                ? 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                : 'bg-[#0A0B0E] text-slate-500 border-[#2D3139] hover:text-slate-300'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>CC Lanes</span>
          </button>

          {/* Color Mode Switcher */}
          <div className="bg-[#0A0B0E] p-0.5 rounded border border-[#2D3139] flex items-center gap-0.5">
            <button
              onClick={() => setColorMode('stem')}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                colorMode === 'stem' ? 'bg-[#1A1D24] text-white border border-[#2D3139]' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              By Stem
            </button>
            <button
              onClick={() => setColorMode('role')}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                colorMode === 'role' ? 'bg-[#1A1D24] text-white border border-[#2D3139]' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              By Role
            </button>
          </div>

          {/* Bleed Notes Toggle */}
          <button
            onClick={() => setShowPurgedBleed(!showPurgedBleed)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border transition ${
              showPurgedBleed
                ? 'bg-rose-950/60 text-rose-300 border-rose-800/80'
                : 'bg-[#0A0B0E] text-slate-500 border-[#2D3139] hover:text-slate-300'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>Purged Bleed ({pipelineResult.purgedNotes.length})</span>
          </button>

          {/* Quick Export Stem MIDI */}
          {onExportStemMidi && (
            <button
              onClick={() => onExportStemMidi(selectedStem)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/50 font-semibold transition"
              title={`Download MIDI for ${selectedStem === 'all' ? 'All Stems' : selectedStem}`}
            >
              <Download className="w-3 h-3" />
              <span>Export {selectedStem === 'all' ? 'Multi-Track' : selectedStem} .MID</span>
            </button>
          )}
        </div>
      </div>

      {/* Harmonic Chord Progression Strip */}
      <ChordProgressionStrip
        pipelineResult={pipelineResult}
        currentTime={currentTime}
        duration={totalDuration}
        onSeek={onSeek}
      />

      {/* Main Piano Roll Canvas container */}
      <div
        ref={containerRef}
        onClick={(e) => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const pct = Math.max(0, Math.min(1, x / rect.width));
          onSeek(pct * totalDuration);
        }}
        className="relative bg-[#0A0B0E] rounded h-72 border border-[#2D3139] overflow-hidden cursor-crosshair select-none"
      >
        {/* Spectral Waveform Underlay Canvas */}
        {showWaveformOverlay && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between opacity-20">
            {waveformBars.map((pt, i) => {
              const hPct = Math.min(100, Math.round(pt.energy * 200));
              return (
                <div
                  key={i}
                  style={{ height: `${hPct}%` }}
                  className="w-1 bg-cyan-400/80 rounded-full mx-0.5 shrink-0"
                />
              );
            })}
          </div>
        )}

        {/* Playhead Vertical Line */}
        <div
          className="absolute top-0 bottom-0 z-20 w-0.5 bg-indigo-400 shadow-[0_0_8px_#6366f1] pointer-events-none transition-all duration-75"
          style={{ left: `${playheadPercent}%` }}
        />

        {/* Pitch Horizontal Grid Lines */}
        {Array.from({ length: pitchRange }).map((_, i) => {
          const pitch = maxPitch - i;
          const isAccidental = [1, 3, 6, 8, 10].includes(pitch % 12);
          const topPercent = (i / pitchRange) * 100;
          const heightPercent = 100 / pitchRange;

          return (
            <div
              key={pitch}
              style={{ top: `${topPercent}%`, height: `${heightPercent}%` }}
              className={`absolute left-0 right-0 border-b border-[#1A1D24]/60 pointer-events-none flex items-center ${
                isAccidental ? 'bg-[#0A0B0E]' : 'bg-[#15171C]/30'
              }`}
            >
              {pitch % 12 === 0 && (
                <span className="text-[8px] font-mono text-slate-600 pl-1">
                  C{Math.floor(pitch / 12) - 1}
                </span>
              )}
            </div>
          );
        })}

        {/* Beat Grid Vertical Lines */}
        {Array.from({ length: Math.ceil(totalDuration * 2) }).map((_, i) => {
          const beatTime = i * (60 / (pipelineResult.metadata.bpm || 120));
          const leftPct = (beatTime / totalDuration) * 100;
          if (leftPct > 100) return null;

          return (
            <div
              key={i}
              style={{ left: `${leftPct}%` }}
              className={`absolute top-0 bottom-0 pointer-events-none ${
                i % 4 === 0 ? 'border-l border-[#2D3139]' : 'border-l border-[#1A1D24]/40'
              }`}
            />
          );
        })}

        {/* Render Transcribed MIDI Notes */}
        {visibleNotes.map((note) => {
          const leftPct = (note.startTime / totalDuration) * 100;
          const widthPct = Math.max(0.6, ((note.endTime - note.startTime) / totalDuration) * 100);
          const topIndex = maxPitch - note.pitch;
          const topPct = (topIndex / pitchRange) * 100;
          const heightPct = Math.max(8, 100 / pitchRange - 1);

          const isHovered = hoveredNote?.id === note.id;
          const isSelected = selectedNote?.id === note.id;
          const hasPitchBends = note.pitchBends && note.pitchBends.length > 0;
          const colorClass =
            colorMode === 'stem'
              ? getStemColor(note.stem, note.wasCleanedUp)
              : getRoleColor(note.role, note.wasCleanedUp);

          return (
            <div
              key={note.id}
              onClick={(e) => handleNoteClick(e, note)}
              onMouseEnter={() => setHoveredNote(note)}
              onMouseLeave={() => setHoveredNote(null)}
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                top: `${topPct}%`,
                height: `${heightPct}%`,
              }}
              className={`absolute rounded-sm border transition-transform cursor-pointer flex items-center justify-between px-0.5 overflow-hidden z-10 ${colorClass} ${
                isSelected
                  ? 'ring-2 ring-white scale-110 z-30 brightness-125'
                  : isHovered
                  ? 'scale-105 z-20 brightness-115 ring-1 ring-slate-300'
                  : ''
              }`}
              title={`${note.stem.toUpperCase()} [${note.noteName} (${note.pitch})] - ${note.method} - ${note.startTime.toFixed(2)}s`}
            >
              {widthPct > 2 && (
                <span className="text-[8px] font-mono font-bold truncate pointer-events-none">
                  {note.noteName}
                </span>
              )}
              {hasPitchBends && (
                <span className="text-[7px] text-amber-300 font-mono font-bold pointer-events-none" title="Continuous Pitch Bend Spline">
                  ~
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* CC Automation Lanes Drawer */}
      {showAutomationLanes && (
        <AutomationLaneDrawer
          pipelineResult={pipelineResult}
          selectedStem={selectedStem}
          currentTime={currentTime}
          duration={totalDuration}
          onSeek={onSeek}
        />
      )}

      {/* Note Inspector & Actions Footer Panel */}
      <div className="mt-2.5 p-2.5 rounded bg-[#0A0B0E] border border-[#2D3139] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
        {selectedNote || hoveredNote ? {
          ...(selectedNote || hoveredNote) && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-white flex items-center gap-1.5 uppercase">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                {(selectedNote || hoveredNote)!.stem}: <strong className="text-amber-400 font-bold">{(selectedNote || hoveredNote)!.noteName}</strong> (MIDI {(selectedNote || hoveredNote)!.pitch})
              </span>
              <span className="text-slate-500">
                TIME: <span className="text-slate-300">{(selectedNote || hoveredNote)!.startTime.toFixed(2)}s - {(selectedNote || hoveredNote)!.endTime.toFixed(2)}s</span>
              </span>
              <span className="text-slate-500">
                VELOCITY: <strong className="text-emerald-400">{(selectedNote || hoveredNote)!.dynamicVelocity || (selectedNote || hoveredNote)!.velocity}</strong>
              </span>
              {(selectedNote || hoveredNote)!.pitchBends && (selectedNote || hoveredNote)!.pitchBends!.length > 0 && (
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {(selectedNote || hoveredNote)!.pitchBends!.length} Continuous Pitch Bends
                </span>
              )}
              <span className="text-slate-500">
                ENGINE: <strong className="text-indigo-400">{(selectedNote || hoveredNote)!.method}</strong>
              </span>
              <span className="text-slate-500">
                ROLE: <strong className="text-white uppercase">{(selectedNote || hoveredNote)!.role}</strong>
              </span>
            </div>
          )
        } : (
          <div className="text-slate-500 flex items-center gap-2 text-[11px]">
            <FileMusic className="w-3.5 h-3.5 text-slate-600" />
            <span>Hover or click any MIDI note to audition pitch and inspect continuous pitch bends, dynamic velocities, and overtone harmonics.</span>
          </div>
        )}

        <div className="text-slate-500 font-mono text-[10px] shrink-0 uppercase">
          Showing <strong className="text-slate-300">{visibleNotes.length}</strong> active notes ({minPitch > 0 ? `${midiPitchToNoteName(minPitch)} - ${midiPitchToNoteName(maxPitch)}` : ''})
        </div>
      </div>
    </div>
  );
};
