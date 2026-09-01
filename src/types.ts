/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StemType = 'vocals' | 'bass' | 'drums' | 'other';

export type SectionLabel = 
  | 'intro'
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'drop'
  | 'outro'
  | 'solo'
  | 'breakdown'
  | 'pre_chorus';

export type StemRole = 
  | 'foundation'
  | 'texture'
  | 'lead'
  | 'ornament'
  | 'percussion'
  | 'silent';

export type TranscriptionMethod = 
  | 'monophonic_crepe'
  | 'polyphonic_basic_pitch'
  | 'chord_harmony_detect'
  | 'onset_drum_tracking'
  | 'ornament_expressive';

export interface PitchBendPoint {
  offsetSec: number; // offset from note startTime in seconds
  semitones: number; // relative pitch deviation (-2.0 to +2.0 semitones)
}

export interface ExpressionPoint {
  offsetSec: number; // offset from note startTime in seconds
  value: number; // CC11 expression value 0-127
}

export interface AutomationPoint {
  timeSec: number;
  value: number; // 0-127 normalized
  label?: string;
}

export interface AutomationLaneData {
  type: 'pitch_bend' | 'cc74_brightness' | 'cc11_expression' | 'cc1_vibrato' | 'velocity';
  title: string;
  unit: string;
  points: AutomationPoint[];
  color: string;
}

export interface ChordSegment {
  id: string;
  startTime: number;
  endTime: number;
  chordName: string; // e.g. "Am7", "Fmaj9", "C/E", "G7sus4"
  romanNumeral: string; // e.g. "i7", "VImaj9", "I6", "V7sus"
  rootPitch: number;
  bassPitch: number;
  voicingPitches: number[];
  voicingNames: string[];
  harmonicTension: number; // 0-100%
  inversion: 'root' | '1st' | '2nd' | '3rd';
  strumDirection?: 'down' | 'up' | 'block';
}

export type DrumArticulationType =
  | 'kick_sub'
  | 'snare_center'
  | 'snare_rim'
  | 'snare_ghost'
  | 'hihat_closed'
  | 'hihat_open'
  | 'ride_cymbal'
  | 'crash_cymbal';

export type AuditionMode = 'audio_only' | 'synth_only' | 'hybrid_unison';

export interface TranscriptionAccuracyProfile {
  pitchAccuracyScore: number; // 0-100%
  transientTimingPrecisionMs: number; // e.g. 1.8ms
  harmonicOvertoneRejection: number; // 0-100%
  dynamicVelocityRangeDb: number; // e.g. 48 dB
  totalRawNotesDetected: number;
  validCleanedNotes: number;
  bleedPurgedCount: number;
  centsDetuningRms: number; // e.g. 2.4 cents
  algorithmPipeline: {
    bass: string;
    vocals: string;
    drums: string;
    other: string;
  };
}

export interface GrooveTemplate {
  swingFactor: number; // 0.5 = straight, 0.66 = triplet shuffle
  microTimingOffsetMs: number; // snare/backbeat push or pull in ms (-30 to +30)
  pocketTightness: number; // 0-100%
  description: string;
}

export interface MidiNote {
  id: string;
  stem: StemType;
  pitch: number; // MIDI pitch 0-127
  noteName: string; // e.g. "C4", "F#2"
  startTime: number; // in seconds
  endTime: number; // in seconds
  duration: number; // in seconds
  velocity: number; // 0-127
  confidence: number; // 0-1
  method: TranscriptionMethod;
  role: StemRole;
  section: SectionLabel;
  quantized: boolean;
  originalStart?: number;
  originalEnd?: number;
  wasCleanedUp?: boolean;
  cleanupReason?: string;
  pan?: number;
  pitchBends?: PitchBendPoint[];
  expressionCurve?: ExpressionPoint[];
  dynamicVelocity?: number;
  ghostNote?: boolean;
  inKeyConfidence?: number;
  articulation?: 'staccato' | 'legato' | 'accent' | 'slide' | 'vibrato' | 'standard';
  drumArticulation?: DrumArticulationType;
}

export interface MidiExportOptions {
  mode: 'expressive' | 'quantized_daw' | 'hybrid_adaptive';
  includePitchBends: boolean;
  includeExpressionCC: boolean;
  includeSustainPedal: boolean;
  grooveAlignment: 'drum_audio_pocket' | 'strict_grid' | 'natural_human';
  pitchBendRange: number; // default ±2 semitones
  velocityScaling: 'audio_rms_dynamic' | 'daw_normalized' | 'raw_peaks';
  keyConstraint: boolean;
}

export interface FeaturePoint {
  time: number; // in seconds
  energy: number; // 0-1 RMS
  spectralCentroid: number; // Hz (e.g. 100 - 8000 Hz)
  onsetDensity: number; // onsets per second
}

export interface CrossStemCorrelation {
  pair: string; // e.g. "vocals_other", "bass_drums"
  stemA: StemType;
  stemB: StemType;
  correlation: number; // -1 to 1
  relationshipType: 'call_and_response' | 'rhythmic_lock' | 'ducking' | 'independent';
  description: string;
}

export interface StemFeatureData {
  stem: StemType;
  timeline: FeaturePoint[];
  averageEnergy: number;
  peakEnergy: number;
  averageCentroid: number;
  averageOnsetDensity: number;
}

export interface SectionAnalysis {
  id: string;
  section: SectionLabel;
  title: string;
  startTime: number;
  endTime: number;
  musicalContext: string;
  harmonicTension: number; // 0-100%
  dynamics: 'low' | 'medium' | 'high' | 'peak';
  quantizationStrictness: number; // 0-100% (e.g. Drop: 98%, Verse: 65%, Solo/Ornament: 30%)
  stemRoles: Record<StemType, StemRole>;
  stemReasoning: Record<StemType, string>;
  keyMoments: string[];
}

export interface StemSummary {
  stem: StemType;
  name: string;
  primaryRole: StemRole;
  routingMethod: TranscriptionMethod;
  methodDescription: string;
  noteCount: number;
  purgedBleedCount: number;
  color: string;
  audioGenerated: boolean;
}

export interface SongMetadata {
  title: string;
  artist: string;
  duration: number; // in seconds
  bpm: number;
  key: string;
  timeSignature: string; // e.g. "4/4"
  separationEnsemble: {
    generalModel: string; // "HTDemucs v4 (4-stem)"
    vocalModel: string; // "BS-RoFormer / Mel-RoFormer"
    drumDenoiseModel: string; // "MDX-Drums Clean Pass"
  };
}

export interface KeyProfile {
  keyName: string;
  scaleType: string;
  rootKey: string;
  scale: string;
  scalePitches: number[];
  confidence: number;
}

export interface SongPipelineResult {
  metadata: SongMetadata;
  sections: SectionAnalysis[];
  stemFeatures: Record<StemType, StemFeatureData>;
  crossStemCorrelations: CrossStemCorrelation[];
  midiNotes: MidiNote[];
  cleanedMidiNotes: MidiNote[];
  purgedNotes: MidiNote[];
  stemSummaries: Record<StemType, StemSummary>;
  grooveTemplate?: GrooveTemplate;
  keyProfile?: KeyProfile;
  chords?: ChordSegment[];
  automationLanes?: Record<StemType, AutomationLaneData[]>;
  selectedGenreStyle?: GenreStyleId;
  geminiExecutiveSummary: string;
  arrangementCritique: string;
  mixRecommendations: string[];
  processedAt: string;
}

export function midiPitchToNoteName(pitch: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(pitch / 12) - 1;
  const note = noteNames[pitch % 12];
  return `${note}${octave}`;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isMuted: Record<StemType | 'master', boolean>;
  isSoloed: Record<StemType, boolean>;
  volume: Record<StemType | 'master', number>; // 0 to 1
  playSynthMidi: boolean; // if true, synthesizes MIDI in addition to / instead of stem audio
  activeSectionId: string | null;
  selectedStem: StemType | 'all';
}
