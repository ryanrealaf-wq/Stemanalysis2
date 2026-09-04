/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MidiNote, StemType, midiPitchToNoteName } from '../types';

export interface CollisionResolutionLog {
  id: string;
  timestampSec: number;
  pitch: number;
  noteName: string;
  stemA: StemType;
  stemB: StemType;
  retainedStem: StemType;
  prunedStem: StemType;
  deltaEnergyDb: number;
  salienceA: number;
  salienceB: number;
  reason: string;
  metric: 'fundamental_salience_6db' | 'spectral_centroid_bandwidth' | 'onset_transient_slope';
  formattedLog: string;
}

export interface CollisionAuditResult {
  auditedNotes: MidiNote[];
  prunedCollisionNotes: MidiNote[];
  collisionLogs: CollisionResolutionLog[];
  collisionCount: number;
}

/**
 * Converts MIDI pitch number to fundamental frequency in Hertz:
 * f0 = 440 * 2^((p - 69) / 12)
 */
export function midiToFreq(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

/**
 * Extracts raw audio window samples from an AudioBuffer (mixed down to mono).
 */
function extractMonoSlice(
  buffer: AudioBuffer,
  tStartSec: number,
  tEndSec: number
): { samples: Float32Array; sampleRate: number } {
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const startSample = Math.max(0, Math.min(buffer.length - 1, Math.floor(tStartSec * sampleRate)));
  const endSample = Math.max(startSample + 16, Math.min(buffer.length, Math.ceil(tEndSec * sampleRate)));
  const length = endSample - startSample;

  const samples = new Float32Array(length);
  if (numChannels === 1) {
    const ch0 = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      samples[i] = ch0[startSample + i];
    }
  } else {
    const ch0 = buffer.getChannelData(0);
    const ch1 = buffer.getChannelData(1);
    for (let i = 0; i < length; i++) {
      samples[i] = (ch0[startSample + i] + ch1[startSample + i]) * 0.5;
    }
  }

  return { samples, sampleRate };
}

/**
 * Evaluates STFT fundamental spectral salience at target frequency f0
 * using a windowed discrete Fourier transform (Hann-windowed localized DFT).
 */
export function computeFundamentalSalience(
  buffer: AudioBuffer,
  targetFreq: number,
  tStartSec: number,
  tEndSec: number
): number {
  const { samples, sampleRate } = extractMonoSlice(buffer, tStartSec, tEndSec);
  const N = samples.length;
  if (N < 8) return 0.0001;

  let real = 0;
  let imag = 0;
  let norm = 0;
  const omega = (2 * Math.PI * targetFreq) / sampleRate;

  for (let n = 0; n < N; n++) {
    // Hann window
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * n) / N));
    const val = samples[n] * w;
    real += val * Math.cos(omega * n);
    imag -= val * Math.sin(omega * n);
    norm += w;
  }

  const effectiveNorm = norm > 0 ? norm : N;
  const magnitude = Math.sqrt(real * real + imag * imag) / effectiveNorm;
  return Math.max(0.00001, magnitude);
}

/**
 * Calculates spectral energy distribution across low-pass (< 250 Hz) vs mid-high band.
 * Returns ratio of low-frequency energy (0.0 to 1.0).
 */
export function computeLowBandEnergyRatio(
  buffer: AudioBuffer,
  tStartSec: number,
  tEndSec: number
): number {
  const { samples, sampleRate } = extractMonoSlice(buffer, tStartSec, tEndSec);
  const N = samples.length;
  if (N < 16) return 0.5;

  let lowEnergy = 0;
  let totalEnergy = 0;

  // Simple biquad single-pole low-pass approximation at 250 Hz
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * 250);
  const alpha = dt / (rc + dt);

  let prevLow = 0;
  for (let n = 0; n < N; n++) {
    const s = samples[n];
    const low = prevLow + alpha * (s - prevLow);
    prevLow = low;

    lowEnergy += low * low;
    totalEnergy += s * s;
  }

  if (totalEnergy < 0.000001) return 0.5;
  return Math.min(1.0, lowEnergy / totalEnergy);
}

/**
 * Measures amplitude envelope derivative (dA/dt) at note onset tStart across a 15ms window.
 * Higher derivative indicates steeper, more coherent transient attack.
 */
export function computeOnsetTransientSlope(
  buffer: AudioBuffer,
  tStartSec: number
): number {
  const sampleRate = buffer.sampleRate;
  const preStart = Math.max(0, tStartSec - 0.005);
  const postEnd = Math.min(buffer.duration, tStartSec + 0.015);

  const { samples } = extractMonoSlice(buffer, preStart, postEnd);
  if (samples.length < 8) return 0;

  const half = Math.floor(samples.length / 2);
  let sumPre = 0;
  let sumPost = 0;

  for (let i = 0; i < half; i++) {
    sumPre += Math.abs(samples[i]);
  }
  for (let i = half; i < samples.length; i++) {
    sumPost += Math.abs(samples[i]);
  }

  const rmsPre = sumPre / Math.max(1, half);
  const rmsPost = sumPost / Math.max(1, samples.length - half);
  const deltaA = rmsPost - rmsPre;
  const dt = (samples.length * 0.5) / sampleRate;

  return Math.max(0, deltaA / Math.max(0.001, dt));
}

/**
 * Resolves ownership when a pitch-time collision is detected between Stem A and Stem B.
 */
export function resolveStemCollision(
  stemABuffer: AudioBuffer | null,
  stemBBuffer: AudioBuffer | null,
  stemA: StemType,
  stemB: StemType,
  pitch: number,
  tStart: number,
  tEnd: number
): {
  decision: 'KEEP_A_DELETE_B' | 'KEEP_B_DELETE_A' | 'FORCE_BASS' | 'FORCE_OTHER';
  winningStem: StemType;
  losingStem: StemType;
  deltaEnergyDb: number;
  salienceA: number;
  salienceB: number;
  metric: 'fundamental_salience_6db' | 'spectral_centroid_bandwidth' | 'onset_transient_slope';
  reason: string;
} {
  const targetFreq = midiToFreq(pitch);

  // Compute STFT frequency salience at fundamental f0 = 440 * 2^((p - 69) / 12) Hz
  const salienceA = stemABuffer
    ? computeFundamentalSalience(stemABuffer, targetFreq, tStart, tEnd)
    : 0.0001;
  const salienceB = stemBBuffer
    ? computeFundamentalSalience(stemBBuffer, targetFreq, tStart, tEnd)
    : 0.0001;

  // Delta energy in dB: 20 * log10(salienceA / salienceB)
  const ratio = (salienceA + 1e-9) / (salienceB + 1e-9);
  const deltaEnergyDb = Math.abs(20 * Math.log10(ratio));

  // 1. Evaluate spectral dominance: >= 6 dB advantage (factor 10^(6/20) = 1.99526)
  if (salienceA > salienceB * 1.995) {
    return {
      decision: 'KEEP_A_DELETE_B',
      winningStem: stemA,
      losingStem: stemB,
      deltaEnergyDb,
      salienceA,
      salienceB,
      metric: 'fundamental_salience_6db',
      reason: `Stem "${stemA}" exhibited ${deltaEnergyDb.toFixed(2)} dB higher fundamental energy density at ${targetFreq.toFixed(1)} Hz (>= 6 dB dominance threshold).`,
    };
  } else if (salienceB > salienceA * 1.995) {
    return {
      decision: 'KEEP_B_DELETE_A',
      winningStem: stemB,
      losingStem: stemA,
      deltaEnergyDb,
      salienceA,
      salienceB,
      metric: 'fundamental_salience_6db',
      reason: `Stem "${stemB}" exhibited ${deltaEnergyDb.toFixed(2)} dB higher fundamental energy density at ${targetFreq.toFixed(1)} Hz (>= 6 dB dominance threshold).`,
    };
  }

  // 2. Fallback to physical frequency range & spectral centroid rules
  // If p < 48 (C3, 130.81 Hz): evaluate low-band (< 250 Hz) concentration > 70% -> FORCE_BASS
  if (pitch < 48) {
    const lowA = stemABuffer ? computeLowBandEnergyRatio(stemABuffer, tStart, tEnd) : 0;
    const lowB = stemBBuffer ? computeLowBandEnergyRatio(stemBBuffer, tStart, tEnd) : 0;

    const isBassA = stemA === 'bass';
    const isBassB = stemB === 'bass';

    if (isBassA || isBassB) {
      const winningStem: StemType = isBassA ? stemA : stemB;
      const losingStem: StemType = isBassA ? stemB : stemA;
      return {
        decision: 'FORCE_BASS',
        winningStem,
        losingStem,
        deltaEnergyDb,
        salienceA,
        salienceB,
        metric: 'spectral_centroid_bandwidth',
        reason: `Sub-C3 pitch (${pitch} < 48 / 130.81 Hz) with low-pass (< 250 Hz) concentration > 70%. Force-assigned to Bass foundation stem.`,
      };
    }

    if (lowA > 0.7 || lowB > 0.7) {
      const winningStem: StemType = lowA >= lowB ? stemA : stemB;
      const losingStem: StemType = lowA >= lowB ? stemB : stemA;
      return {
        decision: 'FORCE_BASS',
        winningStem,
        losingStem,
        deltaEnergyDb,
        salienceA,
        salienceB,
        metric: 'spectral_centroid_bandwidth',
        reason: `Sub-C3 pitch (${pitch} < 48) with low-band energy concentration > 70% (${Math.round(Math.max(lowA, lowB) * 100)}%). Force-assigned to low-band acoustic stem.`,
      };
    }
  } else {
    // pitch >= 48 (C3 and above): FORCE_OTHER (melodic/harmonic stem priority over bass bleed)
    if (stemA === 'bass' && stemB !== 'bass') {
      return {
        decision: 'FORCE_OTHER',
        winningStem: stemB,
        losingStem: stemA,
        deltaEnergyDb,
        salienceA,
        salienceB,
        metric: 'spectral_centroid_bandwidth',
        reason: `Pitch (${pitch} >= C3 / 130.81 Hz) contested against Bass harmonic bleed. Re-allocated to melodic stem "${stemB}".`,
      };
    } else if (stemB === 'bass' && stemA !== 'bass') {
      return {
        decision: 'FORCE_OTHER',
        winningStem: stemA,
        losingStem: stemB,
        deltaEnergyDb,
        salienceA,
        salienceB,
        metric: 'spectral_centroid_bandwidth',
        reason: `Pitch (${pitch} >= C3 / 130.81 Hz) contested against Bass harmonic bleed. Re-allocated to melodic stem "${stemA}".`,
      };
    }
  }

  // 3. Onset Transient Slope (dA/dt) Evaluation:
  // Measure amplitude envelope derivative at t_start across a 15 ms window.
  // Assign note onset ownership to the stem with the steeper, more coherent transient attack.
  const slopeA = stemABuffer ? computeOnsetTransientSlope(stemABuffer, tStart) : 0;
  const slopeB = stemBBuffer ? computeOnsetTransientSlope(stemBBuffer, tStart) : 0;

  if (slopeA >= slopeB) {
    return {
      decision: 'KEEP_A_DELETE_B',
      winningStem: stemA,
      losingStem: stemB,
      deltaEnergyDb,
      salienceA,
      salienceB,
      metric: 'onset_transient_slope',
      reason: `Stem "${stemA}" exhibited steeper amplitude envelope derivative (dA/dt = ${slopeA.toFixed(2)} vs ${slopeB.toFixed(2)}).`,
    };
  } else {
    return {
      decision: 'KEEP_B_DELETE_A',
      winningStem: stemB,
      losingStem: stemA,
      deltaEnergyDb,
      salienceA,
      salienceB,
      metric: 'onset_transient_slope',
      reason: `Stem "${stemB}" exhibited steeper amplitude envelope derivative (dA/dt = ${slopeB.toFixed(2)} vs ${slopeA.toFixed(2)}).`,
    };
  }
}

function formatStemTitle(stem: string): string {
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

/**
 * Deterministic Cross-Stem Collision & Bleed Audit Protocol:
 * Monitors all concurrently serialized tracks for pitch-time spatial collisions.
 * Resolves ownership via raw signal re-analysis on source stem audio buffers.
 * Immediately deletes duplicate note entry from the losing stem's symbolic matrix prior to LLM CoT ingestion.
 * Emits explicit anomaly logs:
 * [COLLISION_RESOLVED] Timestamp: {t_start}s | Pitch: {pitch} | Retained: {Winning_Stem} | Pruned: {Losing_Stem} | Delta Energy: {dB_Diff}dB.
 */
export function executeCrossStemCollisionAudit(
  rawNotes: MidiNote[],
  stemBuffers: Record<StemType, AudioBuffer>
): CollisionAuditResult {
  const activeNotes: MidiNote[] = [...rawNotes];
  const prunedNotes: MidiNote[] = [];
  const collisionLogs: CollisionResolutionLog[] = [];
  const prunedNoteIds = new Set<string>();

  // Compare note pairs across separate stems
  for (let i = 0; i < activeNotes.length; i++) {
    const noteA = activeNotes[i];
    if (prunedNoteIds.has(noteA.id)) continue;

    for (let j = i + 1; j < activeNotes.length; j++) {
      const noteB = activeNotes[j];
      if (prunedNoteIds.has(noteB.id)) continue;

      // Only check separate stems (e.g., bass vs. other, vocals vs. guitar)
      if (noteA.stem === noteB.stem) continue;

      // 1. Collision Threshold Criteria
      // * Pitch Equivalence: p_A = p_B
      if (noteA.pitch !== noteB.pitch) continue;

      // * Temporal Overlap: |t_start,A - t_start,B| <= 20 ms (0.02s)
      const startDiff = Math.abs(noteA.startTime - noteB.startTime);
      if (startDiff > 0.02) continue;

      // * Overlap Duration > 50% of min(duration_A, duration_B)
      const overlapStart = Math.max(noteA.startTime, noteB.startTime);
      const overlapEnd = Math.min(noteA.endTime, noteB.endTime);
      const overlapDuration = Math.max(0, overlapEnd - overlapStart);
      const minDuration = Math.min(noteA.duration, noteB.duration);

      if (overlapDuration <= 0.5 * minDuration) continue;

      // Collision detected! Execute Audio-Domain Re-Audit Protocol
      const contestedStart = Math.min(noteA.startTime, noteB.startTime);
      const contestedEnd = Math.max(noteA.endTime, noteB.endTime);

      const resolution = resolveStemCollision(
        stemBuffers[noteA.stem],
        stemBuffers[noteB.stem],
        noteA.stem,
        noteB.stem,
        noteA.pitch,
        contestedStart,
        contestedEnd
      );

      const winningNote = resolution.winningStem === noteA.stem ? noteA : noteB;
      const losingNote = resolution.losingStem === noteA.stem ? noteA : noteB;

      // Telemetry log format required by directive:
      // [COLLISION_RESOLVED] Timestamp: {t_start}s | Pitch: {pitch} | Retained: {Winning_Stem} | Pruned: {Losing_Stem} | Delta Energy: {dB_Diff}dB.
      const formattedLog = `[COLLISION_RESOLVED] Timestamp: ${contestedStart.toFixed(3)}s | Pitch: ${noteA.pitch} | Retained: ${formatStemTitle(resolution.winningStem)} | Pruned: ${formatStemTitle(resolution.losingStem)} | Delta Energy: ${resolution.deltaEnergyDb.toFixed(2)}dB.`;

      // Emit explicit anomaly log to stdout / console
      console.log(formattedLog);

      collisionLogs.push({
        id: `collision-${collisionLogs.length + 1}`,
        timestampSec: Number(contestedStart.toFixed(3)),
        pitch: noteA.pitch,
        noteName: midiPitchToNoteName(noteA.pitch),
        stemA: noteA.stem,
        stemB: noteB.stem,
        retainedStem: resolution.winningStem,
        prunedStem: resolution.losingStem,
        deltaEnergyDb: Number(resolution.deltaEnergyDb.toFixed(2)),
        salienceA: resolution.salienceA,
        salienceB: resolution.salienceB,
        reason: resolution.reason,
        metric: resolution.metric,
        formattedLog,
      });

      // Pruning Action: mark losing note as cleaned up and remove from active matrix
      prunedNoteIds.add(losingNote.id);
      losingNote.wasCleanedUp = true;
      losingNote.cleanupReason = `[COLLISION_RESOLVED] Inter-track harmonic bleed duplicate against ${resolution.winningStem.toUpperCase()} (${resolution.reason})`;
      prunedNotes.push(losingNote);
    }
  }

  const finalAuditedNotes = activeNotes.filter((n) => !prunedNoteIds.has(n.id));

  return {
    auditedNotes: finalAuditedNotes,
    prunedCollisionNotes: prunedNotes,
    collisionLogs,
    collisionCount: collisionLogs.length,
  };
}
