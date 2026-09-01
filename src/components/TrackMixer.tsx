/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  Disc,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Download,
} from 'lucide-react';
import { SongPipelineResult, StemType } from '../types';

interface TrackMixerProps {
  pipelineResult: SongPipelineResult | null;
  volume: Record<StemType | 'master', number>;
  isMuted: Record<StemType | 'master', boolean>;
  isSoloed: Record<StemType, boolean>;
  pan: Record<StemType, number>;
  selectedStem: StemType | 'all';
  onVolumeChange: (stem: StemType | 'master', val: number) => void;
  onPanChange: (stem: StemType, val: number) => void;
  onToggleMute: (stem: StemType | 'master') => void;
  onToggleSolo: (stem: StemType) => void;
  onSelectStemFilter: (stem: StemType | 'all') => void;
  onExportStemMidi?: (stem: StemType) => void;
  onExportAllMidi?: () => void;
}

export const TrackMixer: React.FC<TrackMixerProps> = ({
  pipelineResult,
  volume,
  isMuted,
  isSoloed,
  pan,
  selectedStem,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  onSelectStemFilter,
  onExportStemMidi,
  onExportAllMidi,
}) => {
  const stems: { type: StemType; label: string; icon: string; color: string; bgGlow: string }[] = [
    { type: 'vocals', label: 'Vocals', icon: '🎤', color: 'text-cyan-400 border-cyan-700/50 bg-cyan-950/30', bgGlow: 'hover:border-cyan-500/60' },
    { type: 'bass', label: 'Bass', icon: '🎸', color: 'text-amber-400 border-amber-700/50 bg-amber-950/30', bgGlow: 'hover:border-amber-500/60' },
    { type: 'drums', label: 'Drums', icon: '🥁', color: 'text-pink-400 border-pink-700/50 bg-pink-950/30', bgGlow: 'hover:border-pink-500/60' },
    { type: 'guitar', label: 'Guitar', icon: '🎸', color: 'text-emerald-400 border-emerald-700/50 bg-emerald-950/30', bgGlow: 'hover:border-emerald-500/60' },
    { type: 'piano', label: 'Piano', icon: '🎹', color: 'text-sky-400 border-sky-700/50 bg-sky-950/30', bgGlow: 'hover:border-sky-500/60' },
    { type: 'other', label: 'Other', icon: '🎛️', color: 'text-purple-400 border-purple-700/50 bg-purple-950/30', bgGlow: 'hover:border-purple-500/60' },
  ];

  return (
    <div className="bg-[#15171C] rounded-lg border border-[#2D3139] p-4 shadow-xl select-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#2D3139]">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
            HTDemucs 6-Stem Mixer & Dispatcher
          </h3>
        </div>

        {/* Stem Filter Quick Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-[#0A0B0E] p-0.5 rounded border border-[#2D3139] text-[10px] font-mono uppercase">
          <button
            onClick={() => onSelectStemFilter('all')}
            className={`px-2 py-0.5 rounded font-semibold transition ${
              selectedStem === 'all'
                ? 'bg-[#1A1D24] text-white border border-[#2D3139]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            All Tracks
          </button>
          {stems.map((s) => (
            <button
              key={s.type}
              onClick={() => onSelectStemFilter(s.type)}
              className={`px-2 py-0.5 rounded font-semibold transition flex items-center gap-1 ${
                selectedStem === s.type
                  ? 'bg-[#1A1D24] text-white border border-[#2D3139]'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 6 Stems + Master Mixer Channel Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
        {stems.map((stemObj) => {
          const stem = stemObj.type;
          const summary = pipelineResult?.stemSummaries[stem];

          return (
            <div
              key={stem}
              onClick={() => onSelectStemFilter(selectedStem === stem ? 'all' : stem)}
              className={`p-3 rounded border transition-all cursor-pointer flex flex-col justify-between ${
                selectedStem === stem
                  ? 'bg-[#1A1D24] border-indigo-500 ring-1 ring-indigo-500/40 shadow-md'
                  : 'bg-[#0A0B0E] border-[#2D3139] hover:border-slate-600'
              }`}
            >
              {/* Header: Name, Icon, Role */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{stemObj.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase">{stemObj.label}</h4>
                      <span className={`text-[8px] uppercase font-mono px-1 py-0.2 rounded border ${stemObj.color}`}>
                        {summary?.primaryRole || 'Analyzed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Routing Method Badge */}
                <div className="mb-2 p-1 rounded bg-[#15171C] border border-[#2D3139]">
                  <span className="text-[8px] text-slate-500 block font-mono uppercase">Routing Engine:</span>
                  <span className="text-[9px] font-bold text-slate-300 truncate block font-mono">
                    {summary?.methodDescription || 'Neural Model'}
                  </span>
                </div>
              </div>

              {/* Faders & Controls */}
              <div className="space-y-2">
                {/* Solo / Mute Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSolo(stem);
                    }}
                    className={`flex-1 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider transition ${
                      isSoloed[stem]
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-[#15171C] text-slate-400 hover:text-white border border-[#2D3139]'
                    }`}
                  >
                    SOLO
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMute(stem);
                    }}
                    className={`flex-1 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider transition ${
                      isMuted[stem]
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-[#15171C] text-slate-400 hover:text-white border border-[#2D3139]'
                    }`}
                  >
                    MUTE
                  </button>
                </div>

                {/* Volume Slider */}
                <div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-0.5">
                    <span>VOL</span>
                    <span className="text-slate-300">{Math.round((volume[stem] || 0.8) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume[stem] ?? 0.8}
                    onChange={(e) => {
                      e.stopPropagation();
                      onVolumeChange(stem, parseFloat(e.target.value));
                    }}
                    className="w-full h-1 bg-[#1A1D24] rounded appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Pan Slider */}
                <div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-0.5">
                    <span>PAN</span>
                    <span className="text-slate-300">
                      {(pan[stem] || 0) === 0 ? 'C' : (pan[stem] || 0) < 0 ? `L${Math.abs(Math.round((pan[stem] || 0) * 100))}` : `R${Math.round((pan[stem] || 0) * 100)}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={pan[stem] ?? 0}
                    onChange={(e) => {
                      e.stopPropagation();
                      onPanChange(stem, parseFloat(e.target.value));
                    }}
                    className="w-full h-1 bg-[#1A1D24] rounded appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                {/* Note & Bleed Stats */}
                <div className="pt-1.5 border-t border-[#2D3139] flex items-center justify-between text-[9px] font-mono text-slate-500">
                  <span>{summary?.noteCount || 0} notes</span>
                  <span className="text-amber-400 font-bold">-{summary?.purgedBleedCount || 0} bleed</span>
                </div>

                {/* Individual Stem MIDI Export Button */}
                {onExportStemMidi && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportStemMidi(stem);
                    }}
                    className="w-full mt-1.5 py-1 px-2 rounded bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/40 text-indigo-300 hover:text-white text-[10px] font-mono font-medium flex items-center justify-center gap-1.5 transition active:scale-95"
                    title={`Export ${stemObj.label} as .MID file`}
                  >
                    <Download className="w-3 h-3 text-indigo-400" />
                    <span>Export {stemObj.label} MIDI</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Master Output Channel */}
        <div className="p-3 rounded border border-[#2D3139] bg-[#0A0B0E] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🎛️</span>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Master Mix</h4>
                  <span className="text-[8px] uppercase font-mono px-1 py-0.2 rounded border text-indigo-400 border-indigo-700/50 bg-indigo-950/30">
                    Stereo Out
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-2 p-1 rounded bg-[#15171C] border border-[#2D3139]">
              <span className="text-[8px] text-slate-500 block font-mono uppercase">Summed Grid:</span>
              <span className="text-[9px] font-bold text-indigo-300 block font-mono">
                {pipelineResult?.metadata.bpm || 120} BPM • 4/4
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onToggleMute('master')}
              className={`w-full py-0.5 rounded text-[10px] font-mono font-bold tracking-wider transition ${
                isMuted.master
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-[#15171C] text-slate-400 hover:text-white border border-[#2D3139]'
              }`}
            >
              MUTE MASTER
            </button>

            <div>
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-0.5">
                <span>MASTER VOL</span>
                <span className="text-slate-300">{Math.round((volume.master || 0.85) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume.master ?? 0.85}
                onChange={(e) => onVolumeChange('master', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#1A1D24] rounded appearance-none cursor-pointer accent-indigo-400"
              />
            </div>

            <div className="pt-1.5 border-t border-[#2D3139] text-[9px] text-slate-500 flex items-center justify-between font-mono">
              <span>TOTAL NOTES</span>
              <span className="text-indigo-400 font-bold">{pipelineResult?.cleanedMidiNotes.length || 0}</span>
            </div>

            {/* Master All Stems MIDI Export Button */}
            {onExportAllMidi && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExportAllMidi();
                }}
                className="w-full mt-1.5 py-1 px-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition active:scale-95"
                title="Export all stem tracks as Multi-Track .MID Bundle"
              >
                <Download className="w-3 h-3" />
                <span>Export All MIDI (.mid)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
