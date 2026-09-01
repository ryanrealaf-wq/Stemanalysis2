/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle,
  Loader2,
  Layers,
  Activity,
  Brain,
  GitFork,
  FileMusic,
  Grid,
  Filter,
  Download,
  Sparkles,
} from 'lucide-react';

export interface PipelineStep {
  id: number;
  title: string;
  shortDesc: string;
  icon: React.ElementType;
  techBadge: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 1,
    title: 'Input Audio Ingestion',
    shortDesc: 'Master audio loaded and decoded in Web Audio context',
    icon: Layers,
    techBadge: 'Web Audio PCM',
  },
  {
    id: 2,
    title: 'Multi-Band DSP Stem Separation',
    shortDesc: 'Frequency crossover filter graph & formant isolation',
    icon: Layers,
    techBadge: 'DSP Crossover Matrix',
  },
  {
    id: 3,
    title: 'DSP Feature Extraction',
    shortDesc: 'Energy RMS, Spectral Centroid, Onset Density & Correlation',
    icon: Activity,
    techBadge: '4D Time-Series DSP',
  },
  {
    id: 4,
    title: 'Gemini Functional Analysis',
    shortDesc: 'Section segmentation, stem role tagging & musical reasoning',
    icon: Brain,
    techBadge: 'Gemini 3.7 Flash',
  },
  {
    id: 5,
    title: 'Adaptive Routing Logic',
    shortDesc: 'YIN bass, salience lead, chord texture, drum onsets',
    icon: GitFork,
    techBadge: 'Role-Based Routing',
  },
  {
    id: 6,
    title: 'Stem Transcription',
    shortDesc: 'Pitch contouring & velocity mapping per stem',
    icon: FileMusic,
    techBadge: 'Multi-Model MIDI',
  },
  {
    id: 7,
    title: 'Alignment & Quantization',
    shortDesc: 'Section-aware grid snapping (Drops: 98%, Verses: 65%)',
    icon: Grid,
    techBadge: 'Dynamic Grid Sync',
  },
  {
    id: 8,
    title: 'Cross-Stem Bleed Cleanup',
    shortDesc: 'Energy-curve gating purges false positives & ghost notes',
    icon: Filter,
    techBadge: 'Spectral Bleed Gate',
  },
  {
    id: 9,
    title: 'Aligned Multi-Track Output',
    shortDesc: 'Interactive timeline, MIDI export & Gemini commentary',
    icon: Download,
    techBadge: 'SMF MIDI Format 1',
  },
];

interface PipelineProgressProps {
  currentStep: number; // 0 to 9 (0 = idle, 1..9 = in progress / completed)
  isProcessing: boolean;
  activeMessage: string;
}

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  currentStep,
  isProcessing,
  activeMessage,
}) => {
  return (
    <div className="bg-[#15171C] rounded-lg border border-[#2D3139] p-4 shadow-xl select-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#2D3139]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              9-Stage Audio Intelligence & Transcription Pipeline
            </h3>
            {isProcessing && (
              <span className="flex items-center gap-1 text-[10px] font-mono uppercase font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Step {currentStep}/9
              </span>
            )}
            {!isProcessing && currentStep === 9 && (
              <span className="flex items-center gap-1 text-[10px] font-mono uppercase font-bold text-green-400 bg-green-950/40 px-2 py-0.5 rounded border border-green-900/50">
                <CheckCircle className="w-3 h-3" />
                Aligned & Ready
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            {isProcessing ? activeMessage : 'Ensemble decomposition complete: stems tagged by Gemini, quant-aligned, and bleed-purged.'}
          </p>
        </div>
      </div>

      {/* 9-Step High Density Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2">
        {PIPELINE_STEPS.map((step) => {
          const isDone = currentStep > step.id || (currentStep === 9 && !isProcessing);
          const isCurrent = isProcessing && currentStep === step.id;
          const isPending = currentStep < step.id && !(currentStep === 9 && !isProcessing);

          return (
            <div
              key={step.id}
              className={`p-2 rounded border transition-all relative flex flex-col justify-between ${
                isDone
                  ? 'bg-[#0A0B0E] border-green-900/50 text-green-400'
                  : isCurrent
                  ? 'bg-[#1A1D24] border-indigo-500 shadow-sm shadow-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40'
                  : 'bg-[#0A0B0E] border-[#2D3139] text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isDone
                      ? 'bg-green-900/30 text-green-400 border border-green-800/40'
                      : isCurrent
                      ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/50'
                      : 'bg-[#1A1D24] text-slate-500 border border-[#2D3139]'
                  }`}
                >
                  0{step.id}
                </span>

                {isDone && <CheckCircle className="w-3 h-3 text-green-400" />}
                {isCurrent && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
                {isPending && <div className="w-1.5 h-1.5 rounded-full bg-[#2D3139]" />}
              </div>

              <div className="my-1">
                <h4 className="text-[11px] font-bold truncate text-white leading-tight">{step.title}</h4>
                <p className="text-[9px] text-slate-400 line-clamp-2 leading-tight mt-0.5">
                  {step.shortDesc}
                </p>
              </div>

              <span
                className={`text-[8px] font-mono uppercase tracking-tight truncate px-1 py-0.5 rounded border mt-1 ${
                  isDone
                    ? 'bg-green-950/20 text-green-400 border-green-900/40'
                    : isCurrent
                    ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/50'
                    : 'bg-[#0A0B0E] text-slate-500 border-[#2D3139]'
                }`}
              >
                {step.techBadge}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
