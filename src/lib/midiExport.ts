/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MidiExportOptions, MidiNote, StemType } from '../types';

/**
 * Encodes variable-length quantity for MIDI standard
 */
function writeVarLength(value: number): number[] {
  let buffer = value & 0x7f;
  const bytes: number[] = [];

  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= 0x80;
    buffer += value & 0x7f;
  }

  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }

  return bytes;
}

/**
 * Writes 32-bit number big endian
 */
function write32(val: number): number[] {
  return [(val >> 24) & 0xff, (val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff];
}

/**
 * Writes 16-bit number big endian
 */
function write16(val: number): number[] {
  return [(val >> 8) & 0xff, val & 0xff];
}

/**
 * Writes string to byte array
 */
function writeString(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xff);
  }
  return bytes;
}

interface MidiEventInternal {
  tick: number;
  type: 'noteOn' | 'noteOff' | 'pitchBend' | 'controlChange' | 'programChange' | 'meta';
  channel: number;
  pitch?: number;
  velocity?: number;
  programNumber?: number;
  controller?: number;
  value?: number;
  pitchBendValue?: number; // 0 to 16383, 8192 is center
  metaBytes?: number[];
}

export const DEFAULT_EXPORT_OPTIONS: MidiExportOptions = {
  mode: 'expressive',
  includePitchBends: true,
  includeExpressionCC: true,
  includeSustainPedal: true,
  grooveAlignment: 'drum_audio_pocket',
  pitchBendRange: 2,
  velocityScaling: 'audio_rms_dynamic',
  keyConstraint: false,
};

/**
 * Generates Standard MIDI File format 1 (multi-track) with high-fidelity pitch bend, CC expression, and velocity
 */
export function generateMidiFile(
  notes: MidiNote[],
  bpm: number = 120,
  trackFilter?: StemType,
  options: Partial<MidiExportOptions> = DEFAULT_EXPORT_OPTIONS
): Uint8Array {
  const exportOpts: MidiExportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const ticksPerQuarterNote = 480;
  const safeBpm = Math.max(20, Math.min(300, bpm));
  const secondsPerBeat = 60 / safeBpm;
  const secondsToTicks = (seconds: number) => Math.round((seconds / secondsPerBeat) * ticksPerQuarterNote);

  // Determine tracks to create
  const stemChannels: Record<StemType, number> = {
    vocals: 0,
    bass: 1,
    drums: 9, // Channel 10 in 1-based indexing for General MIDI drums
    other: 2,
  };

  const stemsToInclude: StemType[] = trackFilter 
    ? [trackFilter] 
    : (['drums', 'bass', 'other', 'vocals'] as StemType[]);

  const tracksBytes: number[][] = [];

  // Track 0: Tempo and Time Signature meta track
  const tempoMicros = Math.round(60000000 / safeBpm);
  const tempoTrackEvents: MidiEventInternal[] = [
    {
      tick: 0,
      type: 'meta',
      channel: 0,
      metaBytes: [0xff, 0x51, 0x03, (tempoMicros >> 16) & 0xff, (tempoMicros >> 8) & 0xff, tempoMicros & 0xff], // Set Tempo
    },
    {
      tick: 0,
      type: 'meta',
      channel: 0,
      metaBytes: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08], // 4/4 Time Signature
    },
    {
      tick: 0,
      type: 'meta',
      channel: 0,
      metaBytes: [0xff, 0x03, ...writeVarLength(11), ...writeString('Tempo Track')],
    },
  ];

  // Convert tempo track to bytes
  const tempoTrackBytes = encodeTrackEvents(tempoTrackEvents);
  tracksBytes.push(tempoTrackBytes);

  // Generate track for each stem
  for (const stem of stemsToInclude) {
    const stemNotes = notes.filter((n) => n.stem === stem);
    const channel = stemChannels[stem];
    const events: MidiEventInternal[] = [];

    // Track Name Meta Event
    const stemName = stem.toUpperCase();
    events.push({
      tick: 0,
      type: 'meta',
      channel,
      metaBytes: [0xff, 0x03, ...writeVarLength(stemName.length), ...writeString(stemName)],
    });

    // Program Change / Instrument selection
    let programNumber = 0;
    if (stem === 'bass') programNumber = 33; // Electric Bass (finger)
    else if (stem === 'vocals') programNumber = 54; // Synth Voice
    else if (stem === 'other') programNumber = 4; // Electric Piano / Poly Synth
    else if (stem === 'drums') programNumber = 0; // Standard Drum Kit

    events.push({
      tick: 0,
      type: 'programChange',
      channel,
      programNumber,
    });

    // Set Pitch Bend Sensitivity (RPN 0,0) if pitch bends enabled
    if (exportOpts.includePitchBends && stem !== 'drums') {
      events.push(
        { tick: 0, type: 'controlChange', channel, controller: 101, value: 0 }, // RPN MSB
        { tick: 0, type: 'controlChange', channel, controller: 100, value: 0 }, // RPN LSB
        { tick: 0, type: 'controlChange', channel, controller: 6, value: exportOpts.pitchBendRange } // Data Entry MSB
      );
    }

    for (const note of stemNotes) {
      const startTick = Math.max(0, secondsToTicks(note.startTime));
      const endTick = Math.max(startTick + 1, secondsToTicks(note.endTime));
      
      // Determine velocity scaling
      let velocity = note.velocity || 90;
      if (exportOpts.velocityScaling === 'audio_rms_dynamic' && note.dynamicVelocity) {
        velocity = note.dynamicVelocity;
      } else if (exportOpts.velocityScaling === 'daw_normalized') {
        velocity = Math.min(120, Math.max(80, Math.round(velocity * 0.9 + 10)));
      }
      velocity = Math.min(127, Math.max(1, Math.round(velocity)));

      const pitch = Math.min(127, Math.max(0, Math.round(note.pitch)));

      // Note On
      events.push({
        tick: startTick,
        type: 'noteOn',
        channel,
        pitch,
        velocity,
      });

      // Insert Pitch Bend Events if enabled
      if (exportOpts.includePitchBends && note.pitchBends && note.pitchBends.length > 0 && stem !== 'drums') {
        for (const pb of note.pitchBends) {
          const pbTick = Math.max(startTick, Math.min(endTick - 1, secondsToTicks(note.startTime + pb.offsetSec)));
          const normalized = Math.max(-1.0, Math.min(1.0, pb.semitones / exportOpts.pitchBendRange));
          const pbVal = Math.round(8192 + normalized * 8191);
          events.push({
            tick: pbTick,
            type: 'pitchBend',
            channel,
            pitchBendValue: Math.max(0, Math.min(16383, pbVal)),
          });
        }
        // Reset pitch bend to center at end of note
        events.push({
          tick: endTick,
          type: 'pitchBend',
          channel,
          pitchBendValue: 8192,
        });
      }

      // Insert CC11 Expression Events if available and enabled
      if (exportOpts.includeExpressionCC && note.expressionCurve && note.expressionCurve.length > 0) {
        for (const exp of note.expressionCurve) {
          const expTick = Math.max(startTick, Math.min(endTick, secondsToTicks(note.startTime + exp.offsetSec)));
          events.push({
            tick: expTick,
            type: 'controlChange',
            channel,
            controller: 11,
            value: Math.max(0, Math.min(127, Math.round(exp.value))),
          });
        }
      }

      // Note Off
      events.push({
        tick: endTick,
        type: 'noteOff',
        channel,
        pitch,
        velocity: 0,
      });
    }

    // Sort events deterministically: by tick, with meta/program/CC before noteOn, and noteOff before noteOn at identical ticks
    events.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.type === 'meta' && b.type !== 'meta') return -1;
      if (b.type === 'meta' && a.type !== 'meta') return 1;
      if (a.type === 'programChange' && b.type !== 'programChange') return -1;
      if (b.type === 'programChange' && a.type !== 'programChange') return 1;
      if (a.type === 'controlChange' && b.type === 'noteOn') return -1;
      if (a.type === 'pitchBend' && b.type === 'noteOn') return -1;
      if (a.type === 'noteOff' && b.type === 'noteOn') return -1;
      if (a.type === 'noteOn' && b.type === 'noteOff') return 1;
      return 0;
    });

    const trackBytes = encodeTrackEvents(events);
    tracksBytes.push(trackBytes);
  }

  // Header chunk: "MThd", length 6, format 1, numTracks, ticksPerQuarterNote
  const totalTracks = tracksBytes.length;
  const header = [
    ...writeString('MThd'),
    ...write32(6),
    ...write16(1), // Format 1 (multi-track synchronous)
    ...write16(totalTracks),
    ...write16(ticksPerQuarterNote),
  ];

  const fullMidi = [...header];
  for (const tBytes of tracksBytes) {
    fullMidi.push(...tBytes);
  }

  return new Uint8Array(fullMidi);
}

function encodeTrackEvents(events: MidiEventInternal[]): number[] {
  const trackData: number[] = [];
  let lastTick = 0;

  for (const ev of events) {
    const delta = Math.max(0, ev.tick - lastTick);
    lastTick = ev.tick;

    trackData.push(...writeVarLength(delta));

    if (ev.type === 'noteOn') {
      trackData.push(0x90 | (ev.channel & 0x0f), (ev.pitch ?? 60) & 0x7f, (ev.velocity ?? 90) & 0x7f);
    } else if (ev.type === 'noteOff') {
      trackData.push(0x80 | (ev.channel & 0x0f), (ev.pitch ?? 60) & 0x7f, 0x00);
    } else if (ev.type === 'controlChange') {
      trackData.push(0xb0 | (ev.channel & 0x0f), (ev.controller ?? 0) & 0x7f, (ev.value ?? 0) & 0x7f);
    } else if (ev.type === 'pitchBend') {
      const val = ev.pitchBendValue ?? 8192;
      const lsb = val & 0x7f;
      const msb = (val >> 7) & 0x7f;
      trackData.push(0xe0 | (ev.channel & 0x0f), lsb, msb);
    } else if (ev.type === 'programChange') {
      trackData.push(0xc0 | (ev.channel & 0x0f), (ev.programNumber ?? 0) & 0x7f);
    } else if (ev.type === 'meta' && ev.metaBytes) {
      trackData.push(...ev.metaBytes);
    }
  }

  // End of Track meta event: delta 0x00, 0xFF, 0x2F, length 0x00
  trackData.push(0x00, 0xff, 0x2f, 0x00);

  // Wrap in "MTrk" chunk
  return [
    ...writeString('MTrk'),
    ...write32(trackData.length),
    ...trackData,
  ];
}

/**
 * Triggers a browser file download of the MIDI Uint8Array
 */
export function downloadMidiBlob(data: Uint8Array, filename: string) {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.mid') ? filename : `${filename}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
