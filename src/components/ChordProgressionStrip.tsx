/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Music, Play, Sparkles, Volume2 } from 'lucide-react';
import { ChordSegment, SongPipelineResult } from '../types';
import { audioEngine } from '../lib/audioPlayer';

interface ChordProgressionStripProps {
  pipelineResult: SongPipelineResult | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const ChordProgressionStrip: React.FC<ChordProgressionStripProps> = ({
  pipelineResult,
  currentTime,
  duration,
  onSeek,
}) => {
  if (!pipelineResult || !pipelineResult.chords || pipelineResult.chords.length === 0) {
    return null;
  }

  const chords = pipelineResult.chords;
  const totalDuration = duration || pipelineResult.metadata.duration || 30;

  const playChordVoicing = (chord: ChordSegment) => {
    // Play each note in the voicing staggered slightly for natural strum
    chord.voicingPitches.forEach((pitch, idx) => {
      const delayMs = chord.strumDirection === 'down' ? idx * 28 : (chord.voicingPitches.length - 1 - idx) * 28;
      window.setTimeout(() => {
        audioEngine.playSynthesizedNote({
          id: `chord_audition_${chord.id}_${idx}`,
          stem: 'other',
          pitch,
          noteName: chord.voicingNames[idx] || 'C4',
          startTime: 0,
          endTime: 0.8,
          duration: 0.8,
          velocity: 95,
          confidence: 1,
          method: 'chord_harmony_detect',
          role: 'texture',
          section: 'verse',
          quantized: true,
        });
      }, delayMs);
    });
  };

  return (
    <div className="bg-[#0A0B0E] rounded border border-[#2D3139] p-2.5 mb-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Music className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
            Harmonic Chord Progressions & Voicing Lead Sheet
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
            {pipelineResult.keyProfile ? `${pipelineResult.keyProfile.keyName} ${pipelineResult.keyProfile.scaleType}` : 'Modal Harmony'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
          Click any chord to audition voice-led strumming
        </span>
      </div>

      {/* Chord Blocks Horizontal Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {chords.map((chord) => {
          const isActive = currentTime >= chord.startTime && currentTime < chord.endTime;

          return (
            <div
              key={chord.id}
              onClick={() => {
                onSeek(chord.startTime);
                playChordVoicing(chord);
              }}
              className={`flex-1 min-w-[110px] p-2 rounded border cursor-pointer transition-all ${
                isActive
                  ? 'bg-indigo-950/70 border-indigo-400 ring-1 ring-indigo-400 shadow-md brightness-110'
                  : 'bg-[#15171C] border-[#2D3139] hover:border-slate-500 hover:bg-[#1A1D24]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-white tracking-wide">
                  {chord.chordName}
                </span>
                <span className="text-[9px] font-mono text-indigo-300 font-bold bg-[#0A0B0E] px-1 py-0.5 rounded border border-[#2D3139]">
                  {chord.romanNumeral}
                </span>
              </div>

              {/* Voicing notes pills */}
              <div className="flex flex-wrap gap-1 mb-1.5">
                {chord.voicingNames.map((name, i) => (
                  <span
                    key={i}
                    className="text-[8px] font-mono px-1 py-0.2 rounded bg-[#0A0B0E] text-slate-400 border border-[#2D3139]"
                  >
                    {name}
                  </span>
                ))}
              </div>

              {/* Tension Meter & Inversion */}
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1 border-t border-[#2D3139]/60">
                <span className="truncate">
                  {chord.inversion === 'root' ? 'Root Pos' : '1st Inversion'}
                </span>
                <span className="text-amber-400 font-bold">
                  {chord.harmonicTension}% Tension
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
