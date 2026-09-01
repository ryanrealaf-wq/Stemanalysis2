/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Activity,
  Zap,
  BarChart3,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { SongPipelineResult, StemType } from '../types';

interface FeatureAnalyticsPanelProps {
  pipelineResult: SongPipelineResult | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const FeatureAnalyticsPanel: React.FC<FeatureAnalyticsPanelProps> = ({
  pipelineResult,
  currentTime,
  duration,
  onSeek,
}) => {
  const [metric, setMetric] = useState<'energy' | 'spectralCentroid' | 'onsetDensity'>('energy');

  if (!pipelineResult) return null;

  const { stemFeatures, metadata } = pipelineResult;
  const totalDuration = duration || metadata.duration || 30;

  const stems: { type: StemType; label: string; stroke: string; fill: string }[] = [
    { type: 'vocals', label: 'Vocals', stroke: '#22d3ee', fill: 'rgba(34, 211, 238, 0.1)' },
    { type: 'bass', label: 'Bass', stroke: '#fbbf24', fill: 'rgba(251, 191, 36, 0.1)' },
    { type: 'drums', label: 'Drums', stroke: '#f472b6', fill: 'rgba(244, 114, 182, 0.1)' },
    { type: 'guitar', label: 'Guitar', stroke: '#34d399', fill: 'rgba(52, 211, 153, 0.1)' },
    { type: 'piano', label: 'Piano', stroke: '#38bdf8', fill: 'rgba(56, 189, 248, 0.1)' },
    { type: 'other', label: 'Other', stroke: '#c084fc', fill: 'rgba(192, 132, 252, 0.1)' },
  ];

  // SVG Chart rendering helper
  const renderSvgCurve = (stem: StemType, strokeColor: string, fillColor: string) => {
    const data = stemFeatures[stem]?.timeline || [];
    if (data.length === 0) return null;

    const width = 800;
    const height = 140;

    let maxVal = 1;
    if (metric === 'energy') maxVal = 1.0;
    else if (metric === 'spectralCentroid') maxVal = 8000;
    else if (metric === 'onsetDensity') maxVal = 12;

    const points = data.map((d, i) => {
      const x = (d.time / totalDuration) * width;
      const val = d[metric];
      const normVal = Math.min(1, Math.max(0, val / maxVal));
      const y = height - normVal * (height - 10) - 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathData = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
    const lineData = `M ${points.join(' L ')}`;

    return (
      <g key={stem}>
        <path d={pathData} fill={fillColor} />
        <path d={lineData} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  };

  const playheadPercent = (currentTime / totalDuration) * 100;

  return (
    <div className="bg-[#15171C] rounded-lg border border-[#2D3139] p-4 shadow-xl select-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#2D3139]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Extracted Audio Feature Time-Series Curves (Step 3)
          </h3>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            Compact numerical summaries feeding Gemini reasoning and the cross-stem bleed filter.
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center gap-1 bg-[#0A0B0E] p-0.5 rounded border border-[#2D3139] text-[10px] font-mono uppercase">
          <button
            onClick={() => setMetric('energy')}
            className={`px-2.5 py-0.5 rounded font-semibold transition ${
              metric === 'energy'
                ? 'bg-[#1A1D24] text-white border border-[#2D3139]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            RMS Energy
          </button>
          <button
            onClick={() => setMetric('spectralCentroid')}
            className={`px-2.5 py-0.5 rounded font-semibold transition ${
              metric === 'spectralCentroid'
                ? 'bg-[#1A1D24] text-white border border-[#2D3139]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Centroid (Hz)
          </button>
          <button
            onClick={() => setMetric('onsetDensity')}
            className={`px-2.5 py-0.5 rounded font-semibold transition ${
              metric === 'onsetDensity'
                ? 'bg-[#1A1D24] text-white border border-[#2D3139]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Onset Density
          </button>
        </div>
      </div>

      {/* Interactive SVG Chart Container */}
      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const pct = Math.max(0, Math.min(1, x / rect.width));
          onSeek(pct * totalDuration);
        }}
        className="relative bg-[#0A0B0E] rounded-md p-3 border border-[#2D3139] cursor-pointer overflow-hidden select-none"
      >
        {/* Playhead Indicator */}
        <div
          className="absolute top-0 bottom-0 z-20 w-0.5 bg-amber-400 shadow-[0_0_8px_#f59e0b] pointer-events-none"
          style={{ left: `${playheadPercent}%` }}
        />

        <svg viewBox="0 0 800 140" className="w-full h-32 overflow-visible" preserveAspectRatio="none">
          {/* Background Grid Lines */}
          <line x1="0" y1="35" x2="800" y2="35" stroke="#1A1D24" strokeDasharray="3 3" />
          <line x1="0" y1="70" x2="800" y2="70" stroke="#1A1D24" strokeDasharray="3 3" />
          <line x1="0" y1="105" x2="800" y2="105" stroke="#1A1D24" strokeDasharray="3 3" />

          {/* Stem Curves */}
          {stems.map((s) => renderSvgCurve(s.type, s.stroke, s.fill))}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono mt-2.5 pt-2 border-t border-[#2D3139]">
          <div className="flex items-center gap-3">
            {stems.map((s) => (
              <span key={s.type} className="flex items-center gap-1 font-semibold uppercase" style={{ color: s.stroke }}>
                <span className="w-2.5 h-0.5 rounded" style={{ backgroundColor: s.stroke }} />
                {s.label}
              </span>
            ))}
          </div>

          <span className="text-[10px] font-mono text-slate-500">
            {currentTime.toFixed(2)}s / {totalDuration.toFixed(2)}s
          </span>
        </div>
      </div>

      {/* Advanced Audio DSP Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {/* Groove & Micro-Timing Pocket */}
        <div className="bg-[#0A0B0E] p-3 rounded border border-[#2D3139] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Drum Onset Groove & Pocket
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1A1D24] text-indigo-300 border border-[#2D3139]">
              {pipelineResult.grooveTemplate ? `${pipelineResult.grooveTemplate.grooveName} (${Math.round(pipelineResult.grooveTemplate.swingFactor * 100)}% Swing)` : 'Straight 16th'}
            </span>
          </div>

          <p className="text-[11px] font-mono text-slate-400">
            {pipelineResult.grooveTemplate?.description || 'Audio transient analysis extracts micro-timing delays for authentic human groove alignment.'}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-mono">
            <div className="bg-[#15171C] p-2 rounded border border-[#2D3139]">
              <span className="text-slate-500 block">Snare Micro-Pocket</span>
              <strong className="text-white">
                {pipelineResult.grooveTemplate?.microTimingOffsetMs ? `${pipelineResult.grooveTemplate.microTimingOffsetMs > 0 ? '+' : ''}${pipelineResult.grooveTemplate.microTimingOffsetMs}ms (laid back)` : '0.0ms (dead center)'}
              </strong>
            </div>
            <div className="bg-[#15171C] p-2 rounded border border-[#2D3139]">
              <span className="text-slate-500 block">Quantization Snapping</span>
              <strong className="text-emerald-400">Groove-Preserving 1/16th</strong>
            </div>
          </div>
        </div>

        {/* Audio Key & Harmonic Scale Profile */}
        <div className="bg-[#0A0B0E] p-3 rounded border border-[#2D3139] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3 text-emerald-400" />
              Detected Key & Pitch Chromagram
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1A1D24] text-emerald-300 border border-[#2D3139]">
              {pipelineResult.keyProfile ? `${pipelineResult.keyProfile.keyName} ${pipelineResult.keyProfile.scaleType}` : metadata.key || 'C Major'}
            </span>
          </div>

          <p className="text-[11px] font-mono text-slate-400">
            Krumhansl-Schmuckler chromagram analysis validates transcribed pitch classes against modal scale profiles.
          </p>

          <div className="pt-1">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1">
              <span>Pitch Class Distribution (C to B)</span>
              <span className="text-emerald-400 font-bold">
                {pipelineResult.keyProfile ? `${Math.round(pipelineResult.keyProfile.confidence * 100)}% Confidence` : 'Auto-detected'}
              </span>
            </div>
            <div className="flex gap-1 h-6 items-end">
              {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((pitch, idx) => {
                const pitchClasses = pipelineResult.keyProfile?.scalePitches || [0, 2, 4, 5, 7, 9, 11];
                const inKey = pitchClasses.includes(idx);
                const height = inKey ? '100%' : '35%';
                return (
                  <div
                    key={pitch}
                    className="flex-1 rounded-sm transition-all"
                    style={{
                      height,
                      backgroundColor: inKey ? '#10b981' : '#2D3139',
                      opacity: inKey ? 0.9 : 0.4,
                    }}
                    title={`${pitch}: ${inKey ? 'Diatonic / In Scale' : 'Passing / Tension'}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
