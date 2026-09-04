/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Brain,
  Sparkles,
  GitFork,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  Music2,
  Sliders,
} from 'lucide-react';
import { SectionAnalysis, SongPipelineResult } from '../types';

interface GeminiInsightsPanelProps {
  pipelineResult: SongPipelineResult | null;
  onSelectSection: (sec: SectionAnalysis) => void;
  activeSection: SectionAnalysis | null;
}

export const GeminiInsightsPanel: React.FC<GeminiInsightsPanelProps> = ({
  pipelineResult,
  onSelectSection,
  activeSection,
}) => {
  if (!pipelineResult) return null;

  const {
    sections,
    geminiExecutiveSummary,
    arrangementCritique,
    mixRecommendations,
    crossStemCorrelations,
    stemSummaries,
    metadata,
  } = pipelineResult;

  const routingRules = [
    {
      role: 'Foundation / Bass',
      model: 'Monophonic Sub-harmonic YIN & Autocorrelation',
      rationale: 'Tracks continuous fundamental frequency (F0) curves with parabolic peak interpolation to prevent octave jumps.',
      color: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
    },
    {
      role: 'Lead / Vocal & Guitar Solo',
      model: 'Spectral Salience & Formant Pitch Tracker',
      rationale: 'Extracts melodic note onsets, vocal formant pitch changes, and 14-bit microtonal pitch bends.',
      color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
    },
    {
      role: 'Guitar / Riffs & Chords',
      model: 'Polyphonic Salience & Strum Voicing Engine',
      rationale: 'Captures dynamic guitar strums, arpeggios, and pluck transients while filtering bleed.',
      color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    },
    {
      role: 'Piano / Acoustic Harmony',
      model: 'Acoustic Triad & Multi-Voice Chord Detector',
      rationale: 'Transcribes complex polyphonic keyboard voicings, hammer strike attacks, and voice leading.',
      color: 'border-sky-500/40 text-sky-300 bg-sky-500/10',
    },
    {
      role: 'Texture / Pads & Synths',
      model: 'Chord & Harmony Voicing Detector',
      rationale: 'Identifies harmonic blocks and atmospheric triads instead of noisy individual triggers.',
      color: 'border-purple-500/40 text-purple-300 bg-purple-500/10',
    },
    {
      role: 'Drums / Percussion',
      model: 'Multi-Band Spectral Flux Transient Decomposition',
      rationale: 'Pitch-independent transient attack detection (Sub=Kick 36, Mid=Snare 38, High=Hi-Hat 42).',
      color: 'border-pink-500/40 text-pink-300 bg-pink-500/10',
    },
    {
      role: 'Ornament / Ad-libs',
      model: 'Expressive Micro-timing Preserver',
      rationale: 'Bypasses rigid beat-grid quantization to preserve human vocal vibrato, melismas, and drum fills.',
      color: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Executive Breakdown Card */}
      <div className="bg-[#15171C] rounded-lg border border-[#2D3139] p-4 shadow-xl select-none">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#2D3139]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold">
              <Brain className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
                Gemini Functional Analysis & Musical Reasoning
              </h3>
              <p className="text-[11px] font-mono text-slate-500">
                Reasoning about musical purpose, role allocation, and dynamic tension across time windows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pipelineResult.detectedSubgenre && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono uppercase font-bold">
                <span>Subgenre: {pipelineResult.detectedSubgenre.replace('_', ' ')}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0A0B0E] border border-[#2D3139] text-indigo-400 text-[10px] font-mono uppercase">
              <Sparkles className="w-3 h-3" />
              <span>AI Studio Reasoning Engine</span>
            </div>
          </div>
        </div>

        {/* Executive Summary Paragraph */}
        <div className="p-3 rounded bg-[#0A0B0E] border border-[#2D3139] text-slate-300 text-xs leading-relaxed mb-3 font-mono">
          <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Activity className="w-3 h-3" /> Overarching Arrangement Architecture
          </h4>
          <p className="text-slate-300 text-xs leading-relaxed font-sans">
            {geminiExecutiveSummary}
          </p>
          <p className="text-slate-500 text-xs leading-relaxed font-sans mt-2">
            {arrangementCritique}
          </p>
        </div>

        {/* Section Cards */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
            Section-by-Section Functional Attribution
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {sections.map((sec) => {
              const isSelected = activeSection?.id === sec.id;
              return (
                <div
                  key={sec.id}
                  onClick={() => onSelectSection(sec)}
                  className={`p-3 rounded border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1A1D24] border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                      : 'bg-[#0A0B0E] border-[#2D3139] hover:border-slate-600 hover:bg-[#1A1D24]/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase">{sec.title}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1A1D24] text-slate-400 border border-[#2D3139]">
                        {sec.startTime}s - {sec.endTime}s
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[9px] font-mono uppercase">
                      <span className="text-indigo-400">Tension {sec.harmonicTension}%</span>
                      <span className="text-slate-300 font-bold">{sec.quantizationStrictness}% Snap</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-tight mb-2 font-sans">
                    {sec.musicalContext}
                  </p>

                  <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono pt-1.5 border-t border-[#2D3139]">
                    <div>
                      <span className="text-slate-500 text-[9px] uppercase block">Vocals:</span>
                      <span className="font-bold text-cyan-400 uppercase">{sec.stemRoles.vocals || 'silent'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] uppercase block">Bass:</span>
                      <span className="font-bold text-amber-400 uppercase">{sec.stemRoles.bass || 'silent'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] uppercase block">Drums:</span>
                      <span className="font-bold text-pink-400 uppercase">{sec.stemRoles.drums || 'silent'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] uppercase block">Guitar:</span>
                      <span className="font-bold text-emerald-400 uppercase">{sec.stemRoles.guitar || 'silent'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] uppercase block">Piano:</span>
                      <span className="font-bold text-sky-400 uppercase">{sec.stemRoles.piano || 'silent'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] uppercase block">Other:</span>
                      <span className="font-bold text-purple-400 uppercase">{sec.stemRoles.other || 'silent'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Adaptive Routing Rules & Cross-Stem Correlation Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Adaptive Routing Rules */}
        <div className="lg:col-span-7 bg-[#15171C] rounded-lg border border-[#2D3139] p-4 shadow-xl select-none">
          <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-[#2D3139]">
            <GitFork className="w-3.5 h-3.5 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
              Adaptive Transcription Routing Logic (Step 5)
            </h3>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mb-2.5">
            Stems are routed to dedicated transcription models based on their Gemini functional label:
          </p>

          <div className="space-y-2">
            {routingRules.map((rule, idx) => (
              <div key={idx} className="p-2.5 rounded bg-[#0A0B0E] border border-[#2D3139] text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${rule.color}`}>
                    {rule.role}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-300">{rule.model}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight mt-1 font-sans">
                  {rule.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-Stem Relationships & Mix Recommendations */}
        <div className="lg:col-span-5 space-y-4">
          {/* Call-and-Response & Cross-Stem Correlation */}
          <div className="bg-[#15171C] rounded-lg border border-[#2D3139] p-4 shadow-xl select-none">
            <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-[#2D3139]">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                Cross-Stem Interplay & Call-Response
              </h3>
            </div>

            <div className="space-y-2">
              {crossStemCorrelations.map((corr, idx) => (
                <div key={idx} className="p-2.5 rounded bg-[#0A0B0E] border border-[#2D3139] text-xs font-mono">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white uppercase text-[11px]">
                      {corr.stemA} ↔ {corr.stemB}
                    </span>
                    <span className="text-[9px] text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-800/40 uppercase">
                      {corr.relationshipType.replace('_', ' ')} (r={corr.correlation})
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight mt-1 font-sans">
                    {corr.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mix Advice */}
          <div className="bg-[#15171C] rounded-lg border border-[#2D3139] p-4 shadow-xl select-none">
            <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-[#2D3139]">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                Production & Mix Insights
              </h3>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-300">
              {mixRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 bg-[#0A0B0E] p-2 rounded border border-[#2D3139] text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                  <span className="leading-tight text-slate-300 font-sans">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
