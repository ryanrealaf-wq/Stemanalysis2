/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MidiNote, SectionAnalysis, SongMetadata, StemFeatureData, StemSummary, StemType } from '../types';
import { midiPitchToNoteName } from './transcriptionEngine';

export interface DemoSongDefinition {
  id: string;
  metadata: SongMetadata;
  genre: string;
  description: string;
  generateNotes: () => MidiNote[];
  generateSections: () => SectionAnalysis[];
}

export const DEMO_SONGS: DemoSongDefinition[] = [
  {
    id: 'neon-horizon',
    genre: 'Synthwave / Electronic Pop',
    description: 'Dynamic 124 BPM track featuring a hard synth drop, driving 16th bassline, vocoder lead, and gated 80s drums.',
    metadata: {
      title: 'Neon Horizon',
      artist: 'Aetheria Wave',
      duration: 32, // 32 seconds demo clip
      bpm: 124,
      key: 'F Minor',
      timeSignature: '4/4',
      separationEnsemble: {
        generalModel: 'HTDemucs v4 (4-stem split)',
        vocalModel: 'BS-RoFormer Vocal Precision',
        drumDenoiseModel: 'MDX-Drums Clean Pass',
      },
    },
    generateSections: () => [
      {
        id: 'sec-intro',
        section: 'intro',
        title: 'Intro Build',
        startTime: 0,
        endTime: 8,
        musicalContext: 'Atmospheric pad textures filter in with light hi-hat accents before the main rhythm section engages.',
        harmonicTension: 30,
        dynamics: 'low',
        quantizationStrictness: 75,
        stemRoles: {
          vocals: 'texture',
          bass: 'silent',
          drums: 'percussion',
          other: 'texture',
        },
        stemReasoning: {
          vocals: 'Vocoded background hums acting as harmonic ambience rather than lead narrative.',
          bass: 'Tacet during intro to maximize impact when the drop bass enters.',
          drums: 'Sparse 8th-note closed hi-hats setting tempo without kick or snare weight.',
          other: 'Main Fm-Db-Ab-Eb chord progression slowly sweeping high-cut cutoff frequency.',
        },
        keyMoments: ['Cutoff sweep filter opening at 0:04', 'Pre-drop snare roll riser at 0:07'],
      },
      {
        id: 'sec-verse',
        section: 'verse',
        title: 'Verse 1',
        startTime: 8,
        endTime: 16,
        musicalContext: 'Tight groove establishes the narrative: rolling monophonic bassline supports emotional vocal phrasing.',
        harmonicTension: 45,
        dynamics: 'medium',
        quantizationStrictness: 65,
        stemRoles: {
          vocals: 'lead',
          bass: 'foundation',
          drums: 'percussion',
          other: 'texture',
        },
        stemReasoning: {
          vocals: 'Expressive lead vocal with human vibrato and micro-timing (quantization relaxed to 65%).',
          bass: 'Monophonic octave pumping bassline locked with 4-on-the-floor kick.',
          drums: 'Classic synthwave beat: punchy kick on 1 and 3, gated snare on 2 and 4.',
          other: 'Arpeggiated counter-melody responding in vocal gaps.',
        },
        keyMoments: ['Vocal phrase entrance at 0:08', 'Synthy fill ornament at 0:14'],
      },
      {
        id: 'sec-drop',
        section: 'drop',
        title: 'Main Drop / Chorus',
        startTime: 16,
        endTime: 26,
        musicalContext: 'Peak sonic density: 100% strictness alignment ensures hard-hitting syncopation and maximum impact.',
        harmonicTension: 88,
        dynamics: 'peak',
        quantizationStrictness: 98,
        stemRoles: {
          vocals: 'lead',
          bass: 'foundation',
          drums: 'percussion',
          other: 'texture',
        },
        stemReasoning: {
          vocals: 'Layered anthem hook singing the main title motif with octave vocal doublings.',
          bass: 'Aggressive sawtooth bass doubling the kick drum rhythm with 16th-note syncopation.',
          drums: 'Full ensemble drums with open hi-hat offbeats, crash cymbals, and driving snare.',
          other: 'Supersaw chords filling the stereo field with maximum harmonic thickness.',
        },
        keyMoments: ['Impact crash and sub drop at 0:16', 'Double-time snare fill at 0:24'],
      },
      {
        id: 'sec-outro',
        section: 'outro',
        title: 'Outro / Wind Down',
        startTime: 26,
        endTime: 32,
        musicalContext: 'Decrescendo down into sustained chords with ornament vocal ad-libs.',
        harmonicTension: 20,
        dynamics: 'low',
        quantizationStrictness: 50,
        stemRoles: {
          vocals: 'ornament',
          bass: 'foundation',
          drums: 'percussion',
          other: 'texture',
        },
        stemReasoning: {
          vocals: 'Free-form vocal ad-libs and vocal runs (flagged as ornament, bypassing strict quantization).',
          bass: 'Sustained root notes on downbeats.',
          drums: 'Stripped down to kick and ghost rimshots.',
          other: 'Fading reverb tail of the final tonic chord.',
        },
        keyMoments: ['Melismatic vocal run at 0:28', 'Final sustained chord ring out at 0:31'],
      },
    ],
    generateNotes: () => {
      const notes: MidiNote[] = [];
      const bpm = 124;
      const beatSec = 60 / bpm;
      let idCounter = 1;

      const addNote = (
        stem: StemType,
        pitch: number,
        startBeat: number,
        durBeats: number,
        velocity: number,
        role: MidiNote['role'],
        section: MidiNote['section'],
        method: MidiNote['method'],
        confidence = 0.95,
        pan = 0
      ) => {
        const startTime = startBeat * beatSec;
        const endTime = (startBeat + durBeats) * beatSec;
        notes.push({
          id: `note-${idCounter++}`,
          stem,
          pitch,
          noteName: midiPitchToNoteName(pitch),
          startTime: Number(startTime.toFixed(4)),
          endTime: Number(endTime.toFixed(4)),
          duration: Number((endTime - startTime).toFixed(4)),
          velocity,
          confidence,
          method,
          role,
          section,
          quantized: false,
          pan,
        });
      };

      // Intro (beats 0 - 16, time 0 - 7.74s)
      // Drums: Hi-hats
      for (let b = 0; b < 16; b += 0.5) {
        addNote('drums', 42, b, 0.25, 75, 'percussion', 'intro', 'onset_drum_tracking', 0.9, 0.2);
      }
      // Other: Pads (Fm, Db, Ab, Eb)
      addNote('other', 53, 0, 4, 80, 'texture', 'intro', 'chord_harmony_detect', 0.98, -0.3); // F3
      addNote('other', 56, 0, 4, 75, 'texture', 'intro', 'chord_harmony_detect', 0.98, 0.3);  // Ab3
      addNote('other', 60, 0, 4, 75, 'texture', 'intro', 'chord_harmony_detect', 0.98, 0);    // C4

      addNote('other', 49, 4, 4, 80, 'texture', 'intro', 'chord_harmony_detect', 0.98, -0.3); // Db3
      addNote('other', 53, 4, 4, 75, 'texture', 'intro', 'chord_harmony_detect', 0.98, 0.3);  // F3
      addNote('other', 56, 4, 4, 75, 'texture', 'intro', 'chord_harmony_detect', 0.98, 0);    // Ab3

      addNote('other', 44, 8, 4, 80, 'texture', 'intro', 'chord_harmony_detect', 0.98, -0.3); // Ab2
      addNote('other', 48, 8, 4, 75, 'texture', 'intro', 'chord_harmony_detect', 0.98, 0.3);  // C3
      addNote('other', 51, 8, 4, 75, 'texture', 'intro', 'chord_harmony_detect', 0.98, 0);    // Eb3

      addNote('other', 51, 12, 3.5, 85, 'texture', 'intro', 'chord_harmony_detect', 0.98, 0); // Eb3
      addNote('other', 55, 12, 3.5, 80, 'texture', 'intro', 'chord_harmony_detect', 0.98, 0.2); // G3

      // Verse 1 (beats 16.5 - 33, time 8 - 16s)
      // Drums: 4-on-floor kick, snare on 2 and 4, 16th hats
      for (let b = 16; b < 32; b += 1) {
        addNote('drums', 36, b, 0.3, 105, 'percussion', 'verse', 'onset_drum_tracking', 0.98, 0);
        if (b % 2 === 1) {
          addNote('drums', 38, b, 0.3, 110, 'percussion', 'verse', 'onset_drum_tracking', 0.98, 0);
        }
        addNote('drums', 42, b + 0.5, 0.2, 80, 'percussion', 'verse', 'onset_drum_tracking', 0.92, 0.15);
      }

      // Bass: Monophonic pYIN/CREPE 16th groove on F1 / C2 / Db2
      const bassVersePitches = [29, 29, 41, 29, 29, 29, 41, 29, 25, 25, 37, 25, 27, 27, 39, 27];
      for (let i = 0; i < 32; i++) {
        const pitch = bassVersePitches[i % bassVersePitches.length];
        const b = 16 + i * 0.5;
        addNote('bass', pitch, b, 0.35, 95 + (i % 2 === 0 ? 10 : 0), 'foundation', 'verse', 'monophonic_crepe', 0.94, 0);
      }

      // Vocals: Lead melody (Basic Pitch polyphonic / monophonic melody)
      const vocalMelody = [
        { pitch: 65, start: 16.5, dur: 1.2, vel: 92 }, // F4
        { pitch: 68, start: 18.0, dur: 0.8, vel: 96 }, // Ab4
        { pitch: 67, start: 19.0, dur: 1.5, vel: 90 }, // G4
        { pitch: 65, start: 21.0, dur: 1.0, vel: 88 }, // F4
        { pitch: 63, start: 22.5, dur: 0.9, vel: 94 }, // Eb4
        { pitch: 65, start: 24.0, dur: 2.0, vel: 100 }, // F4
        { pitch: 68, start: 26.5, dur: 1.2, vel: 98 }, // Ab4
        { pitch: 70, start: 28.0, dur: 0.8, vel: 102 }, // Bb4
        { pitch: 72, start: 29.0, dur: 2.2, vel: 108 }, // C5
      ];
      for (const vm of vocalMelody) {
        addNote('vocals', vm.pitch, vm.start, vm.dur, vm.vel, 'lead', 'verse', 'polyphonic_basic_pitch', 0.95, 0);
      }

      // Drop / Chorus (beats 33 - 53.7, time 16 - 26s)
      for (let b = 33; b < 53; b += 1) {
        addNote('drums', 36, b, 0.35, 120, 'percussion', 'drop', 'onset_drum_tracking', 0.99, 0);
        addNote('drums', 46, b + 0.5, 0.4, 95, 'percussion', 'drop', 'onset_drum_tracking', 0.96, -0.2); // Open Hat
        if (b % 2 === 1) {
          addNote('drums', 38, b, 0.35, 125, 'percussion', 'drop', 'onset_drum_tracking', 0.99, 0); // Snare
        }
      }

      // Drop Supersaw and Bass
      for (let b = 33; b < 53; b += 2) {
        const root = b % 8 === 1 ? 29 : b % 8 === 3 ? 25 : b % 8 === 5 ? 32 : 27; // F, Db, Ab, Eb
        addNote('bass', root, b, 1.8, 115, 'foundation', 'drop', 'monophonic_crepe', 0.99, 0);
        addNote('bass', root + 12, b + 0.5, 0.4, 110, 'foundation', 'drop', 'monophonic_crepe', 0.97, 0);

        // Chords in 'other'
        addNote('other', root + 24, b, 1.8, 110, 'texture', 'drop', 'chord_harmony_detect', 0.98, -0.4);
        addNote('other', root + 28, b, 1.8, 105, 'texture', 'drop', 'chord_harmony_detect', 0.98, 0.4);
        addNote('other', root + 31, b, 1.8, 108, 'texture', 'drop', 'chord_harmony_detect', 0.98, 0);
      }

      // Chorus Vocal Anthem
      const chorusVocals = [
        { pitch: 72, start: 33.0, dur: 1.5, vel: 115 }, // C5
        { pitch: 75, start: 35.0, dur: 1.8, vel: 120 }, // Eb5
        { pitch: 72, start: 37.0, dur: 1.2, vel: 110 }, // C5
        { pitch: 70, start: 38.5, dur: 1.0, vel: 105 }, // Bb4
        { pitch: 68, start: 40.0, dur: 2.0, vel: 118 }, // Ab4
        { pitch: 72, start: 42.5, dur: 1.5, vel: 120 }, // C5
        { pitch: 77, start: 44.5, dur: 2.2, vel: 125 }, // F5 (Peak!)
        { pitch: 75, start: 47.0, dur: 1.8, vel: 115 }, // Eb5
        { pitch: 72, start: 49.0, dur: 3.0, vel: 112 }, // C5
      ];
      for (const cv of chorusVocals) {
        addNote('vocals', cv.pitch, cv.start, cv.dur, cv.vel, 'lead', 'drop', 'polyphonic_basic_pitch', 0.98, 0);
      }

      // Outro (beats 54 - 66, time 26 - 32s)
      addNote('other', 53, 54, 8, 70, 'texture', 'outro', 'chord_harmony_detect', 0.95, -0.2);
      addNote('other', 56, 54, 8, 65, 'texture', 'outro', 'chord_harmony_detect', 0.95, 0.2);
      addNote('other', 60, 54, 8, 68, 'texture', 'outro', 'chord_harmony_detect', 0.95, 0);
      addNote('bass', 29, 54, 6, 80, 'foundation', 'outro', 'monophonic_crepe', 0.96, 0);

      // Ornament Vocal Ad-libs in Outro (Unquantized Expressive Runs)
      const vocalAdlibs = [
        { pitch: 72, start: 54.32, dur: 0.42, vel: 78 },
        { pitch: 70, start: 54.81, dur: 0.38, vel: 82 },
        { pitch: 68, start: 55.24, dur: 0.65, vel: 85 },
        { pitch: 65, start: 56.12, dur: 1.84, vel: 75 },
        { pitch: 68, start: 58.45, dur: 0.52, vel: 80 },
        { pitch: 67, start: 59.02, dur: 0.48, vel: 78 },
        { pitch: 65, start: 59.58, dur: 2.45, vel: 70 },
      ];
      for (const ad of vocalAdlibs) {
        addNote('vocals', ad.pitch, ad.start, ad.dur, ad.vel, 'ornament', 'outro', 'ornament_expressive', 0.92, 0);
      }

      // Add a few deliberate bleed / false positive notes that will be purged by Step 8 Cross-Stem Cleanup!
      // Stray bass pitch during intro silence:
      addNote('bass', 72, 1.2, 0.4, 30, 'foundation', 'intro', 'monophonic_crepe', 0.35, 0);
      addNote('bass', 68, 2.5, 0.3, 25, 'foundation', 'intro', 'monophonic_crepe', 0.28, 0);
      // Stray vocal note during drum fill gap:
      addNote('vocals', 40, 15.2, 0.2, 20, 'lead', 'verse', 'polyphonic_basic_pitch', 0.22, 0);

      return notes;
    },
  },
  {
    id: 'velvet-groove',
    genre: 'Funk / Neo-Soul Groove',
    description: '108 BPM syncopated groove with dynamic call-and-response between vocal riffs and clavinet/bass, punchy drum break.',
    metadata: {
      title: 'Velvet Groove',
      artist: 'Soul Dynamics',
      duration: 30,
      bpm: 108,
      key: 'E Minor / Dorian',
      timeSignature: '4/4',
      separationEnsemble: {
        generalModel: 'HTDemucs v4 (4-stem split)',
        vocalModel: 'Mel-RoFormer Vocals v2',
        drumDenoiseModel: 'MDX-Drums Clean Pass',
      },
    },
    generateSections: () => [
      {
        id: 'sec-groove-intro',
        section: 'intro',
        title: 'Drum & Bass Groove',
        startTime: 0,
        endTime: 7,
        musicalContext: 'Syncopated drum break and slap bass establish the rhythmic anchor and modal foundation.',
        harmonicTension: 25,
        dynamics: 'medium',
        quantizationStrictness: 80,
        stemRoles: {
          vocals: 'silent',
          bass: 'foundation',
          drums: 'percussion',
          other: 'silent',
        },
        stemReasoning: {
          vocals: 'Tacet to allow rhythmic pocket to settle.',
          bass: 'Slap & pop monophonic bassline hitting Em7 syncopations.',
          drums: 'Tight funk groove with ghost notes and syncopated snare on 2-and.',
          other: 'Tacet until verse.',
        },
        keyMoments: ['Drum break roll into bass slap entrance at 0:02'],
      },
      {
        id: 'sec-groove-verse',
        section: 'verse',
        title: 'Call & Response Verse',
        startTime: 7,
        endTime: 18,
        musicalContext: 'Vocal lead phrases trade space with funky electric piano chords in true call-and-response fashion.',
        harmonicTension: 50,
        dynamics: 'medium',
        quantizationStrictness: 60,
        stemRoles: {
          vocals: 'lead',
          bass: 'foundation',
          drums: 'percussion',
          other: 'texture',
        },
        stemReasoning: {
          vocals: 'Soulful lead vocal singing on beats 1 and 2, resting on 3 and 4.',
          bass: 'Grounding the tonic Em9 chord with octave jumps.',
          drums: 'Continuous locked groove with ride cymbal tap.',
          other: 'Clavinet stabs fired precisely during vocal rests (detected as Call-and-Response correlation).',
        },
        keyMoments: ['Call & response interchange at 0:09 and 0:13'],
      },
      {
        id: 'sec-groove-chorus',
        section: 'chorus',
        title: 'Full Funk Chorus',
        startTime: 18,
        endTime: 30,
        musicalContext: 'All stems engage with maximum groove cohesion and backing vocal harmonies.',
        harmonicTension: 75,
        dynamics: 'high',
        quantizationStrictness: 90,
        stemRoles: {
          vocals: 'lead',
          bass: 'foundation',
          drums: 'percussion',
          other: 'texture',
        },
        stemReasoning: {
          vocals: 'Harmonized vocal hook singing the main refrain.',
          bass: 'Walking bass passing tones connecting Em7 to Am7 to Bm7.',
          drums: 'Open hi-hat wash and energetic backbeat.',
          other: 'Lush Rhodes chord voicings with stereo tremolo.',
        },
        keyMoments: ['Chorus harmonic lift at 0:18', 'Bass fill walk-down at 0:26'],
      },
    ],
    generateNotes: () => {
      const notes: MidiNote[] = [];
      const bpm = 108;
      const beatSec = 60 / bpm;
      let idCounter = 1;

      const addNote = (
        stem: StemType,
        pitch: number,
        startBeat: number,
        durBeats: number,
        velocity: number,
        role: MidiNote['role'],
        section: MidiNote['section'],
        method: MidiNote['method'],
        confidence = 0.95,
        pan = 0
      ) => {
        const startTime = startBeat * beatSec;
        const endTime = (startBeat + durBeats) * beatSec;
        notes.push({
          id: `vg-note-${idCounter++}`,
          stem,
          pitch,
          noteName: midiPitchToNoteName(pitch),
          startTime: Number(startTime.toFixed(4)),
          endTime: Number(endTime.toFixed(4)),
          duration: Number((endTime - startTime).toFixed(4)),
          velocity,
          confidence,
          method,
          role,
          section,
          quantized: false,
          pan,
        });
      };

      // Drums Funk Groove
      for (let b = 0; b < 54; b += 1) {
        addNote('drums', 36, b, 0.25, 108, 'percussion', b < 12 ? 'intro' : b < 32 ? 'verse' : 'chorus', 'onset_drum_tracking', 0.98, 0);
        if (b % 2 === 1) {
          addNote('drums', 38, b, 0.25, 115, 'percussion', b < 12 ? 'intro' : b < 32 ? 'verse' : 'chorus', 'onset_drum_tracking', 0.98, 0);
        }
        addNote('drums', 42, b + 0.25, 0.15, 75, 'percussion', b < 12 ? 'intro' : b < 32 ? 'verse' : 'chorus', 'onset_drum_tracking', 0.9, 0.2);
        addNote('drums', 42, b + 0.75, 0.15, 85, 'percussion', b < 12 ? 'intro' : b < 32 ? 'verse' : 'chorus', 'onset_drum_tracking', 0.9, -0.2);
      }

      // Bass Funk Line (Em - D - C - B)
      const bassNotes = [28, 28, 40, 28, 31, 33, 35, 28]; // E1, E1, E2, E1, G1, A1, B1, E1
      for (let i = 0; i < 54; i++) {
        const p = bassNotes[i % bassNotes.length];
        const b = i * 0.75;
        if (b < 54) {
          addNote('bass', p, b, 0.45, 100, 'foundation', b < 12 ? 'intro' : b < 32 ? 'verse' : 'chorus', 'monophonic_crepe', 0.95, 0);
        }
      }

      // Verse Vocals (Call) & Clavinet (Response)
      for (let bar = 3; bar < 8; bar++) {
        const startBeat = bar * 4;
        // Vocal Call on beats 1 - 2
        addNote('vocals', 64, startBeat + 0.5, 0.8, 95, 'lead', 'verse', 'polyphonic_basic_pitch', 0.96, 0); // E4
        addNote('vocals', 67, startBeat + 1.5, 0.9, 98, 'lead', 'verse', 'polyphonic_basic_pitch', 0.96, 0); // G4

        // Clavinet Response on beats 3 - 4
        addNote('other', 52, startBeat + 2.5, 0.4, 90, 'texture', 'verse', 'chord_harmony_detect', 0.94, -0.3); // E3
        addNote('other', 55, startBeat + 2.5, 0.4, 88, 'texture', 'verse', 'chord_harmony_detect', 0.94, 0.3);  // G3
        addNote('other', 59, startBeat + 3.0, 0.6, 92, 'texture', 'verse', 'chord_harmony_detect', 0.94, 0);    // B3
      }

      // Chorus Vocals
      const chorusVocals = [
        { pitch: 71, start: 33, dur: 1.2, vel: 110 }, // B4
        { pitch: 69, start: 34.5, dur: 0.8, vel: 105 }, // A4
        { pitch: 67, start: 35.5, dur: 1.5, vel: 108 }, // G4
        { pitch: 64, start: 37.5, dur: 2.0, vel: 112 }, // E4
        { pitch: 71, start: 41, dur: 1.2, vel: 110 },
        { pitch: 74, start: 42.5, dur: 1.4, vel: 120 }, // D5
        { pitch: 76, start: 44.5, dur: 2.5, vel: 124 }, // E5
      ];
      for (const cv of chorusVocals) {
        addNote('vocals', cv.pitch, cv.start, cv.dur, cv.vel, 'lead', 'chorus', 'polyphonic_basic_pitch', 0.97, 0);
      }

      return notes;
    },
  },
];
