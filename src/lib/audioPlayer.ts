/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MidiNote, StemType } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private stemGains: Record<StemType, GainNode> = {} as any;
  private stemPanners: Record<StemType, StereoPannerNode> = {} as any;
  private stemBuffers: Record<StemType, AudioBuffer | null> = {
    vocals: null,
    bass: null,
    drums: null,
    guitar: null,
    piano: null,
    other: null,
  };
  private stemSources: Record<StemType, AudioBufferSourceNode | null> = {
    vocals: null,
    bass: null,
    drums: null,
    guitar: null,
    piano: null,
    other: null,
  };

  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;
  private duration = 0;
  private notes: MidiNote[] = [];
  private scheduledTimeouts: number[] = [];
  private onTimeUpdateCallback: ((time: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private animationFrameId: number | null = null;
  private playMidiSynth = true;

  constructor() {
    // Lazy init on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);

      const stems: StemType[] = ['vocals', 'bass', 'drums', 'guitar', 'piano', 'other'];
      for (const s of stems) {
        const gain = this.ctx.createGain();
        gain.gain.value = 0.8;
        const panner = this.ctx.createStereoPanner();
        gain.connect(panner);
        panner.connect(this.masterGain);
        this.stemGains[s] = gain;
        this.stemPanners[s] = panner;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getContext(): AudioContext {
    this.initContext();
    return this.ctx!;
  }

  public setSongData(duration: number, notes: MidiNote[], stemBuffers?: Record<StemType, AudioBuffer>) {
    this.duration = duration;
    this.notes = notes;
    if (stemBuffers) {
      this.stemBuffers = stemBuffers;
    }
  }

  public setStemBuffers(stemBuffers: Record<StemType, AudioBuffer>) {
    this.stemBuffers = stemBuffers;
  }

  public setVolume(stem: StemType | 'master', vol: number) {
    this.initContext();
    if (!this.ctx) return;
    const safeVol = typeof vol === 'number' && !isNaN(vol) ? vol : 0.85;
    const clamped = Math.max(0, Math.min(1, safeVol));
    const now = this.ctx.currentTime;
    if (stem === 'master') {
      if (this.masterGain) {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(clamped, now, 0.015);
      }
    } else {
      if (this.stemGains[stem]) {
        this.stemGains[stem].gain.cancelScheduledValues(now);
        this.stemGains[stem].gain.setTargetAtTime(clamped, now, 0.015);
      }
    }
  }

  public setPan(stem: StemType, panVal: number) {
    this.initContext();
    if (!this.ctx) return;
    const safePan = typeof panVal === 'number' && !isNaN(panVal) ? panVal : 0;
    const clamped = Math.max(-1, Math.min(1, safePan));
    const now = this.ctx.currentTime;
    if (this.stemPanners[stem]) {
      this.stemPanners[stem].pan.cancelScheduledValues(now);
      this.stemPanners[stem].pan.setTargetAtTime(clamped, now, 0.015);
    }
  }

  public setMuteSolo(muted: Record<StemType, boolean>, soloed: Record<StemType, boolean>) {
    this.initContext();
    const safeSoloed = soloed || {};
    const safeMuted = muted || {};
    const anySolo = Object.values(safeSoloed).some((v) => Boolean(v));
    const stems: StemType[] = ['vocals', 'bass', 'drums', 'guitar', 'piano', 'other'];

    for (const s of stems) {
      if (!this.stemGains[s]) continue;
      let effectiveGain = 0.8;
      if (anySolo) {
        effectiveGain = safeSoloed[s] ? 0.8 : 0.0;
      } else if (safeMuted[s]) {
        effectiveGain = 0.0;
      }
      this.stemGains[s].gain.setTargetAtTime(effectiveGain, this.ctx!.currentTime, 0.02);
    }
  }

  public setPlayMidiSynth(val: boolean) {
    this.playMidiSynth = val;
    if (this.isPlaying) {
      if (!val) {
        this.clearScheduledNotes();
      } else {
        const currentPos = this.ctx ? Math.max(0, this.ctx.currentTime - this.startTime) : 0;
        this.scheduleNotes(currentPos);
      }
    }
  }

  public setAudioStemsAudible(audible: boolean) {
    this.initContext();
    const stems: StemType[] = ['vocals', 'bass', 'drums', 'guitar', 'piano', 'other'];
    const gainVal = audible ? 0.8 : 0.0;
    for (const s of stems) {
      if (this.stemGains[s]) {
        this.stemGains[s].gain.setTargetAtTime(gainVal, this.ctx!.currentTime, 0.02);
      }
    }
  }

  public updateNotes(notes: MidiNote[]) {
    this.notes = notes;
    if (this.isPlaying && this.playMidiSynth) {
      this.clearScheduledNotes();
      const currentPos = this.ctx ? Math.max(0, this.ctx.currentTime - this.startTime) : 0;
      this.scheduleNotes(currentPos);
    }
  }

  public play(fromTime?: number) {
    this.initContext();
    if (!this.ctx) return;

    if (this.isPlaying) {
      this.stop();
    }

    const startFrom = fromTime !== undefined ? fromTime : this.pauseOffset;
    if (startFrom >= this.duration && this.duration > 0) {
      this.pauseOffset = 0;
      return this.play(0);
    }

    this.isPlaying = true;
    this.startTime = this.ctx.currentTime - startFrom;
    this.pauseOffset = startFrom;

    // Start Stem Audio Sources if available
    const stems: StemType[] = ['vocals', 'bass', 'drums', 'guitar', 'piano', 'other'];
    for (const s of stems) {
      const buffer = this.stemBuffers[s];
      if (buffer) {
        try {
          const src = this.ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(this.stemGains[s]);
          const offset = Math.max(0, startFrom);
          const durationRemaining = Math.max(0, buffer.duration - offset);
          if (durationRemaining > 0) {
            src.start(0, offset, durationRemaining);
            this.stemSources[s] = src;
          }
        } catch (err) {
          console.warn(`Error starting buffer for stem ${s}:`, err);
        }
      }
    }

    // Schedule Synth MIDI events
    this.clearScheduledNotes();
    if (this.playMidiSynth) {
      this.scheduleNotes(startFrom);
    }

    // Start animation loop for playhead position updates
    this.startTracking();
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.stopSources();
    this.clearScheduledNotes();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.ctx) {
      this.pauseOffset = this.ctx.currentTime - this.startTime;
    }
  }

  public stop() {
    this.isPlaying = false;
    this.pauseOffset = 0;
    this.stopSources();
    this.clearScheduledNotes();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(0);
    }
  }

  public seek(targetTime: number) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
    }
    this.pauseOffset = Math.max(0, Math.min(this.duration, targetTime));
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(this.pauseOffset);
    }
    if (wasPlaying) {
      this.play(this.pauseOffset);
    }
  }

  public getCurrentTime(): number {
    if (!this.isPlaying || !this.ctx) return this.pauseOffset;
    return Math.max(0, this.ctx.currentTime - this.startTime);
  }

  public onTimeUpdate(cb: (time: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  public onEnded(cb: () => void) {
    this.onEndedCallback = cb;
  }

  private stopSources() {
    const stems: StemType[] = ['vocals', 'bass', 'drums', 'guitar', 'piano', 'other'];
    for (const s of stems) {
      if (this.stemSources[s]) {
        try {
          this.stemSources[s]!.stop();
          this.stemSources[s]!.disconnect();
        } catch {
          // ignore already stopped
        }
        this.stemSources[s] = null;
      }
    }
  }

  private clearScheduledNotes() {
    for (const id of this.scheduledTimeouts) {
      window.clearTimeout(id);
    }
    this.scheduledTimeouts = [];
  }

  private startTracking() {
    const update = () => {
      if (!this.isPlaying || !this.ctx) return;
      const cur = this.ctx.currentTime - this.startTime;
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(Math.min(cur, this.duration));
      }

      if (this.duration > 0 && cur >= this.duration) {
        this.stop();
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
        return;
      }

      this.animationFrameId = requestAnimationFrame(update);
    };
    this.animationFrameId = requestAnimationFrame(update);
  }

  private scheduleNotes(startOffset: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const activeNotes = this.notes.filter((n) => !n.wasCleanedUp && n.endTime > startOffset);

    for (const note of activeNotes) {
      const triggerDelay = Math.max(0, (note.startTime - startOffset) * 1000);
      const noteDuration = Math.max(0.06, note.endTime - Math.max(note.startTime, startOffset));

      if (note.startTime >= startOffset) {
        const timeoutId = window.setTimeout(() => {
          if (!this.isPlaying || !this.ctx) return;
          this.playSynthesizedNote(note, noteDuration);
        }, triggerDelay);
        this.scheduledTimeouts.push(timeoutId);
      }
    }
  }

  /**
   * Real-time synthesis of individual notes based on stem role and pitch
   */
  public playSynthesizedNote(note: MidiNote, noteDurationSec?: number) {
    this.initContext();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = noteDurationSec || Math.max(0.08, note.duration || note.endTime - note.startTime);
    const dest = this.stemGains[note.stem] || this.masterGain;
    const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
    const velNorm = (note.velocity || 90) / 127;

    if (note.stem === 'drums') {
      this.playDrumSynth(note.pitch, velNorm, dest);
    } else if (note.stem === 'bass') {
      this.playBassSynth(freq, dur, velNorm, dest);
    } else if (note.stem === 'vocals') {
      this.playLeadSynth(freq, dur, velNorm, dest);
    } else if (note.stem === 'guitar') {
      this.playGuitarSynth(freq, dur, velNorm, dest);
    } else if (note.stem === 'piano') {
      this.playPianoSynth(freq, dur, velNorm, dest);
    } else {
      this.playPadSynth(freq, dur, velNorm, dest);
    }
  }

  private playGuitarSynth(freq: number, dur: number, vel: number, dest: GainNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 2.0, now); // Octave overtone

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(6000, freq * 5), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 1.5), now + dur);

    // Pluck attack & exponential acoustic decay
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35 * vel, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur + 0.05);
    osc2.stop(now + dur + 0.05);
  }

  private playPianoSynth(freq: number, dur: number, vel: number, dest: GainNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.002, now); // Micro-detune for acoustic piano warmth

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(4500, freq * 3.5), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(100, freq * 1.1), now + dur);

    // Piano hammer strike & gentle decay
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.38 * vel, now + 0.012);
    gain.gain.setValueAtTime(0.25 * vel, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur + 0.05);
    osc2.stop(now + dur + 0.05);
  }

  private playBassSynth(freq: number, dur: number, vel: number, dest: GainNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 0.5, now); // Sub octave

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(2200, freq * 4), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 1.2), now + dur);
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.45 * vel, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur + 0.05);
    osc2.stop(now + dur + 0.05);
  }

  private playLeadSynth(freq: number, dur: number, vel: number, dest: GainNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    // Vibrato
    vibrato.frequency.value = 5.5; // Hz
    vibratoGain.gain.value = freq * 0.015;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(Math.min(4500, freq * 2), now);
    filter.Q.value = 2.5;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.3 * vel, now + 0.02);
    gain.gain.setValueAtTime(0.25 * vel, now + Math.max(0.03, dur - 0.05));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    vibrato.start(now);
    osc.start(now);
    vibrato.stop(now + dur + 0.05);
    osc.stop(now + dur + 0.05);
  }

  private playPadSynth(freq: number, dur: number, vel: number, dest: GainNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.004, now); // Detuned

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22 * vel, now + 0.06);
    gain.gain.setValueAtTime(0.18 * vel, now + Math.max(0.07, dur - 0.08));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur + 0.05);
    osc2.stop(now + dur + 0.05);
  }

  private playDrumSynth(pitch: number, vel: number, dest: GainNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Standard General MIDI Drum mappings:
    // 35/36 = Bass/Kick, 38/40 = Snare, 42/44 = Closed Hi-Hat/Pedal, 46 = Open Hi-Hat, 49/51 = Crash/Ride, 41-48 = Toms
    if (pitch === 35 || pitch === 36) {
      // 808 Kick Drum
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);

      gain.gain.setValueAtTime(0.7 * vel, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (pitch === 38 || pitch === 40) {
      // Snare Drum (Noise burst + tonal body)
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1000;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4 * vel, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(dest);

      // Body
      const osc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      bodyGain.gain.setValueAtTime(0.4 * vel, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(bodyGain);
      bodyGain.connect(dest);

      noise.start(now);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      // Hi-Hat / Cymbal
      const dur = pitch === 46 || pitch === 49 || pitch === 51 ? 0.35 : 0.06;
      const bufferSize = ctx.sampleRate * dur;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7500;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25 * vel, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      noise.start(now);
    }
  }

}

export const audioEngine = new AudioEngine();
