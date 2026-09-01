/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Play,
  Pause,
  Square,
  Sparkles,
  Layers,
  Cpu,
  Download,
  Music2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SongPipelineResult } from '../types';

interface HeaderProps {
  pipelineResult: SongPipelineResult | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playSynthMidi: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onTogglePlaySynthMidi: () => void;
  onOpenExport: () => void;
  onSelectTrackModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pipelineResult,
  isPlaying,
  currentTime,
  duration,
  playSynthMidi,
  onTogglePlay,
  onStop,
  onTogglePlaySynthMidi,
  onOpenExport,
  onSelectTrackModal,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const metadata = pipelineResult?.metadata;

  return (
    <header className="sticky top-0 z-40 bg-[#15171C]/95 backdrop-blur-md border-b border-[#2D3139] px-4 py-2.5 sm:px-6 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Project Info */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded flex items-center justify-center font-bold text-white text-lg shadow-md shadow-indigo-600/30">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white font-semibold text-base leading-tight uppercase tracking-wider">
                  StemFlow AI
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 uppercase">
                  v4.2
                </span>
              </div>
              <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                <span>Advanced Stem Decomposition & MIDI</span>
              </p>
            </div>
          </div>

          {/* Quick Track Select button on mobile */}
          <button
            onClick={onSelectTrackModal}
            className="md:hidden px-2.5 py-1 rounded bg-[#1A1D24] text-[10px] font-mono text-slate-300 border border-[#2D3139] hover:bg-slate-800 transition uppercase tracking-wider"
          >
            Track Select
          </button>
        </div>

        {/* Center Transport & Track Telemetry */}
        <div className="flex items-center gap-3 sm:gap-5">
          {metadata && (
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">Loaded Audio</span>
              <span className="text-xs text-indigo-400 font-mono italic truncate max-w-[180px]">
                {metadata.title}.wav
              </span>
            </div>
          )}

          {metadata && <div className="hidden lg:block h-6 w-px bg-[#2D3139]" />}

          {/* Tempo Badge */}
          {metadata && (
            <div className="hidden sm:flex flex-col items-center px-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">Tempo</span>
              <span className="text-sm font-bold text-white tabular-nums font-mono">
                {metadata.bpm.toFixed(1)} <span className="text-[9px] text-slate-500 uppercase">BPM</span>
              </span>
            </div>
          )}

          {metadata && <div className="hidden sm:block h-6 w-px bg-[#2D3139]" />}

          {/* Transport Controls */}
          <div className="flex items-center gap-2 bg-[#0A0B0E] px-3 py-1 rounded border border-[#2D3139]">
            <button
              onClick={onStop}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1A1D24] transition"
              title="Stop & Reset to 0:00"
            >
              <Square className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onTogglePlay}
              disabled={!pipelineResult}
              className={`w-7 h-7 rounded flex items-center justify-center transition font-bold ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            <div className="px-2 text-center min-w-[70px]">
              <span className="font-mono text-xs font-bold text-white tabular-nums block">
                {formatTime(currentTime)}
              </span>
              <span className="text-[9px] text-slate-500 block font-mono">
                / {formatTime(duration)}
              </span>
            </div>

            <div className="h-4 w-px bg-[#2D3139]" />

            {/* Synthesizer vs Audio Stems Toggle */}
            <button
              onClick={onTogglePlaySynthMidi}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition ${
                playSynthMidi
                  ? 'bg-purple-900/30 text-purple-300 border border-purple-700/50'
                  : 'bg-[#1A1D24] text-slate-400 hover:text-slate-200 border border-[#2D3139]'
              }`}
              title="Toggle MIDI Synthesizer vs Separated Stem Audio"
            >
              <Music2 className="w-3 h-3" />
              <span className="hidden sm:inline">{playSynthMidi ? 'Synth On' : 'Stems Only'}</span>
            </button>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={onSelectTrackModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1A1D24] text-xs font-mono uppercase tracking-wider text-slate-300 border border-[#2D3139] hover:bg-[#2D3139] hover:text-white transition"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Load Track</span>
          </button>

          <button
            onClick={onOpenExport}
            disabled={!pipelineResult}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-mono uppercase tracking-wider font-semibold text-white shadow-md shadow-indigo-600/20 hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export MIDI Bundle</span>
          </button>
        </div>
      </div>
    </header>
  );
};
