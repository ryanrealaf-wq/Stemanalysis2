/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Activity, Radio, Sliders, Sparkles, Volume2 } from 'lucide-react';
import { AutomationLaneData, AutomationPoint, SongPipelineResult, StemType } from '../types';

interface AutomationLaneDrawerProps {
  pipelineResult: SongPipelineResult | null;
  selectedStem: StemType | 'all';
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const AutomationLaneDrawer: React.FC<AutomationLaneDrawerProps> = ({
  pipelineResult,
  selectedStem,
  currentTime,
  duration,
  onSeek,
}) => {
  const [activeLaneType, setActiveLaneType] = useState<'pitch_bend' | 'cc74_brightness' | 'cc11_expression' | 'cc1_vibrato'>('pitch_bend');

  if (!pipelineResult || !pipelineResult.automationLanes) return null;

  const stemKey = selectedStem === 'all' ? 'vocals' : selectedStem;
  const lanes = pipelineResult.automationLanes[stemKey] || [];
  const activeLane = lanes.find((l) => l.type === activeLaneType) || lanes[0];

  const totalDuration = duration || pipelineResult.metadata.duration || 30;
  const playheadPct = (currentTime / totalDuration) * 100;

  if (!activeLane) return null;

  // Build SVG path for automation spline
  const width = 800;
  const height = 100;
  const points = activeLane.points;

  let pathD = '';
  if (points.length > 0) {
    const coords = points.map((pt) => {
      const x = (pt.timeSec / totalDuration) * width;
      const y = height - (pt.value / 127) * (height - 16) - 8;
      return { x, y };
    });

    pathD = `M ${coords[0].x} ${coords[0].y} ` + coords.slice(1).map((c) => `L ${c.x} ${c.y}`).join(' ');
  }

  return (
    <div className="bg-[#0A0B0E] rounded border border-[#2D3139] p-3 mt-3 select-none">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2.5 pb-2 border-b border-[#2D3139]">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
            Audio-Derived MIDI CC & Pitch Automation Lanes [{stemKey.toUpperCase()}]
          </span>
        </div>

        {/* Lane Selector Pills */}
        <div className="flex flex-wrap items-center gap-1">
          {lanes.map((lane) => (
            <button
              key={lane.type}
              onClick={() => setActiveLaneType(lane.type as any)}
              className={`px-2 py-1 rounded text-[10px] font-mono transition-all font-medium ${
                activeLaneType === lane.type
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/60 shadow-sm'
                  : 'bg-[#15171C] text-slate-500 border border-[#2D3139] hover:text-slate-300'
              }`}
            >
              {lane.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main SVG Curve Canvas */}
      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const pct = Math.max(0, Math.min(1, x / rect.width));
          onSeek(pct * totalDuration);
        }}
        className="relative bg-[#15171C] rounded h-24 border border-[#2D3139] overflow-hidden cursor-crosshair group"
      >
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 z-20 w-0.5 bg-indigo-400 shadow-[0_0_8px_#6366f1] pointer-events-none transition-all duration-75"
          style={{ left: `${playheadPct}%` }}
        />

        {/* Center line for Pitch Bend */}
        {activeLane.type === 'pitch_bend' && (
          <div className="absolute left-0 right-0 top-1/2 border-b border-dashed border-slate-700/60 pointer-events-none" />
        )}

        {/* Curve visualization */}
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
          {/* Gradient area under curve */}
          <defs>
            <linearGradient id={`grad_${activeLane.type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeLane.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={activeLane.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {pathD && (
            <>
              <path
                d={`${pathD} L ${width} ${height} L 0 ${height} Z`}
                fill={`url(#grad_${activeLane.type})`}
              />
              <path
                d={pathD}
                fill="none"
                stroke={activeLane.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Render individual points */}
          {points.slice(0, 80).map((pt, i) => {
            const cx = (pt.timeSec / totalDuration) * width;
            const cy = height - (pt.value / 127) * (height - 16) - 8;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="3"
                fill={activeLane.color}
                className="hover:r-5 cursor-pointer transition-all"
              >
                <title>{`${pt.timeSec.toFixed(2)}s: ${pt.label || pt.value}`}</title>
              </circle>
            );
          })}
        </svg>

        {/* Unit & Value Overlay */}
        <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-400 bg-[#0A0B0E]/80 px-1.5 py-0.5 rounded border border-[#2D3139]">
          {activeLane.unit} • {points.length} Automation Points
        </div>
      </div>
    </div>
  );
};
