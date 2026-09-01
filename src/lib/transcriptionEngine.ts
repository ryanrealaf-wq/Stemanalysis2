/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GrooveTemplate, MidiNote, SectionAnalysis, StemFeatureData, StemRole, StemType, TranscriptionMethod } from '../types';

/**
 * Returns human-readable musical note name (e.g. 60 -> "C4", 61 -> "C#4")
 */
export function midiPitchToNoteName(pitch: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(pitch / 12) - 1;
  const name = noteNames[pitch % 12];
  return `${name}${octave}`;
}

/**
 * Assigns transcription method based on stem role and musical section function
 */
export function determineRoutingMethod(stem: StemType, role: StemRole, isOrnamentSection: boolean): TranscriptionMethod {
  if (stem === 'drums') {
    return 'onset_drum_tracking';
  }
  if (isOrnamentSection || role === 'ornament') {
    return 'ornament_expressive';
  }
  if (role === 'foundation' || stem === 'bass') {
    return 'monophonic_autocorrelation';
  }
  if (stem === 'piano') {
    return 'chord_harmony_detect';
  }
  if (stem === 'guitar') {
    return role === 'lead' ? 'polyphonic_salience' : 'chord_harmony_detect';
  }
  if (role === 'lead' || stem === 'vocals') {
    return 'polyphonic_salience';
  }
  if (role === 'texture' || stem === 'other') {
    return 'chord_harmony_detect';
  }
  return 'polyphonic_salience';
}

/**
 * Quantizes a timestamp to the closest musical grid subdivision with optional swing and pocket offset
 * Strictness: 0 (keep original) to 1.0 (100% hard snap)
 */
export function quantizeTime(
  timeSec: number,
  bpm: number,
  subdivision: 8 | 16 | 32 = 16,
  strictness: number = 0.9,
  groove?: GrooveTemplate
): number {
  const safeBpm = Math.max(20, Math.min(300, bpm));
  const beatDuration = 60 / safeBpm;
  const gridStepSec = beatDuration / (subdivision / 4); // 16th note = 0.25 beat

  // Base mathematical grid
  const slotIndex = Math.round(timeSec / gridStepSec);
  let targetGridTime = slotIndex * gridStepSec;

  // Apply audio-extracted groove swing if applicable
  if (groove && subdivision === 16) {
    const sixteenthInBeat = Math.abs(slotIndex % 4);
    if (sixteenthInBeat === 1 || sixteenthInBeat === 3) {
      // Swung 16th notes
      const swingOffsetSec = (groove.swingFactor - 0.5) * (gridStepSec * 1.5);
      targetGridTime += swingOffsetSec;
    }
    // Apply micro-timing pocket offset (snare push/pull in seconds)
    if (groove.microTimingOffsetMs !== 0) {
      targetGridTime += groove.microTimingOffsetMs / 1000;
    }
  }

  // Interpolate between original time and target grid time based on strictness
  const finalTime = timeSec + (targetGridTime - timeSec) * Math.max(0, Math.min(1, strictness));
  return Number(finalTime.toFixed(4));
}

/**
 * Performs adaptive alignment, dynamic quantization, harmonic validation, and cross-stem cleanup
 */
export function processMidiAlignmentAndCleanup(
  rawNotes: MidiNote[],
  sections: SectionAnalysis[],
  bpm: number,
  stemFeatures: Record<StemType, StemFeatureData>,
  groove?: GrooveTemplate,
  keyScalePitches?: number[]
): {
  cleanedNotes: MidiNote[];
  purgedNotes: MidiNote[];
  allNotes: MidiNote[];
} {
  const processedNotes: MidiNote[] = [];
  const purgedNotes: MidiNote[] = [];

  for (const note of rawNotes) {
    // 1. Identify which section this note falls into
    const section = sections.find((s) => note.startTime >= s.startTime && note.startTime < s.endTime) || sections[0];
    const sectionStrictness = (section?.quantizationStrictness ?? 80) / 100;
    const isOrnament = note.role === 'ornament' || note.method === 'ornament_expressive';
    const isDrop = section?.section === 'drop';

    // 2. Determine effective quantization strictness
    const effectiveStrictness = isOrnament ? 0.15 : (isDrop ? 0.98 : sectionStrictness);

    // 3. Perform Alignment & Groove Quantization
    const origStart = note.startTime;
    const origEnd = note.endTime;
    const duration = Math.max(0.06, origEnd - origStart);

    let quantizedStart = origStart;
    let quantizedEnd = origEnd;

    if (effectiveStrictness > 0.05) {
      quantizedStart = quantizeTime(origStart, bpm, 16, effectiveStrictness, groove);
      const quantizedDuration = quantizeTime(duration, bpm, 16, effectiveStrictness * 0.65);
      quantizedEnd = quantizedStart + Math.max(0.06, quantizedDuration);
    }

    // 4. Cross-Stem Cleanup & Harmonic Validation
    const featureData = stemFeatures[note.stem];
    let isBleedOrGhost = false;
    let cleanupReason = '';

    if (featureData && featureData.timeline.length > 0) {
      // Find nearest feature timeline points for note duration
      const relevantPoints = featureData.timeline.filter(
        (p) => p.time >= origStart - 0.25 && p.time <= origEnd + 0.25
      );

      const maxEnergyInWindow = relevantPoints.length > 0
        ? Math.max(...relevantPoints.map((p) => p.energy))
        : 0.5;

      const avgEnergyOverall = featureData.averageEnergy || 0.1;
      const energyThreshold = Math.max(0.015, avgEnergyOverall * 0.12);

      // Condition A: False positive pitch in silent or low-energy stem window
      if (maxEnergyInWindow < energyThreshold && note.stem !== 'drums') {
        isBleedOrGhost = true;
        cleanupReason = `Stem energy (${maxEnergyInWindow.toFixed(3)}) below silence threshold (${energyThreshold.toFixed(3)}) — rejected cross-stem spill.`;
      }

      // Condition B: Bass sub-octave jitter or vocal bleed in bass channel
      if (note.stem === 'bass' && note.pitch > 62 && maxEnergyInWindow < avgEnergyOverall * 0.4) {
        isBleedOrGhost = true;
        cleanupReason = `High pitch (${midiPitchToNoteName(note.pitch)}) in bass stem with low energy — rejected bleed artifact.`;
      }

      // Condition C: Stray low-confidence drum onsets
      if (note.stem === 'drums' && note.confidence < 0.25) {
        isBleedOrGhost = true;
        cleanupReason = 'Onset peak transient confidence below 0.25 threshold.';
      }
    }

    // 5. Harmonic Scale Validation (flag out-of-scale notes if harmonic tension is low)
    let inKeyConfidence = 1.0;
    if (keyScalePitches && keyScalePitches.length > 0 && note.stem !== 'drums') {
      const pitchClass = note.pitch % 12;
      const isInKey = keyScalePitches.includes(pitchClass);
      const sectionTension = section?.harmonicTension || 40;

      if (!isInKey) {
        // If tension is high, it's likely an intentional jazz/blues passing note
        if (sectionTension < 45 && note.confidence < 0.75) {
          isBleedOrGhost = true;
          cleanupReason = `Dissonant note ${midiPitchToNoteName(note.pitch)} out of detected scale in low-tension section (${sectionTension}%).`;
        } else {
          inKeyConfidence = 0.65;
        }
      }
    }

    const processedNote: MidiNote = {
      ...note,
      startTime: quantizedStart,
      endTime: quantizedEnd,
      duration: Number((quantizedEnd - quantizedStart).toFixed(4)),
      quantized: effectiveStrictness > 0.05,
      originalStart: origStart,
      originalEnd: origEnd,
      wasCleanedUp: isBleedOrGhost,
      cleanupReason: isBleedOrGhost ? cleanupReason : undefined,
      inKeyConfidence,
    };

    if (isBleedOrGhost) {
      purgedNotes.push(processedNote);
    } else {
      processedNotes.push(processedNote);
    }
  }

  // 6. Monophonic Voice-Leading Cleanup (prevent overlapping notes in bass and monophonic lead)
  const sortedCleaned = [...processedNotes].sort((a, b) => a.startTime - b.startTime);
  const monophonicStems: StemType[] = ['bass'];

  for (const stem of monophonicStems) {
    const stemNotes = sortedCleaned.filter((n) => n.stem === stem);
    for (let i = 0; i < stemNotes.length - 1; i++) {
      const current = stemNotes[i];
      const next = stemNotes[i + 1];
      if (current.endTime > next.startTime) {
        current.endTime = Number((next.startTime - 0.01).toFixed(4));
        current.duration = Number((current.endTime - current.startTime).toFixed(4));
      }
    }
  }

  return {
    cleanedNotes: sortedCleaned,
    purgedNotes,
    allNotes: [...sortedCleaned, ...purgedNotes],
  };
}
