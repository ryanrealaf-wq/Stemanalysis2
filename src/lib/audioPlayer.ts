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
    other: null,
  };
  private stemSources: Record<StemType, AudioBufferSourceNode | null> = {
    vocals: null,
    bass: null,
    drums: null,
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

      const stems: StemType[] = ['vocals', 'bass', 'drums', 'other'];
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
    const clamped = Math.max(0, Math.min(1, vol));
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
    const clamped = Math.max(-1, Math.min(1, panVal));
    const now = this.ctx.currentTime;
    if (this.stemPanners[stem]) {
      this.stemPanners[stem].pan.cancelScheduledValues(now);
      this.stemPanners[stem].pan.setTargetAtTime(clamped, now, 0.015);
    }
  }

  public setMuteSolo(muted: Record<StemType, boolean>, soloed: Record<StemType, boolean>) {
    this.initContext();
    const anySolo = Object.values(soloed).some((v) => v);
    const stems: StemType[] = ['vocals', 'bass', 'drums', 'other'];

    for (const s of stems) {
      if (!this.stemGains[s]) continue;
      let effectiveGain = 0.8;
      if (anySolo) {
        effectiveGain = soloed[s] ? 0.8 : 0.0;
      } else if (muted[s]) {
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
    const stems: StemType[] = ['vocals', 'bass', 'drums', 'other'];
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
    const stems: StemType[] = ['vocals', 'bass', 'drums', 'other'];
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
    const stems: StemType[] = ['vocals', 'bass', 'drums', 'other'];
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
    } else {
      this.playPadSynth(freq, dur, velNorm, dest);
    }
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

  /**
   * Synthesizes audio buffers for all 4 stems so that isolated real audio tracks can be played
   */
  public generateStemAudioBuffers(duration: number, bpm: number, notes: MidiNote[]): Promise<Record<StemType, AudioBuffer>> {
    this.initContext();
    const ctx = this.ctx!;
    const stems: StemType[] = ['vocals', 'bass', 'drums', 'other'];
    const sampleRate = 22050; // optimized sample rate for fast rendering
    const length = Math.max(1, Math.round(duration * sampleRate));

    return new Promise((resolve) => {
      const result: Record<StemType, AudioBuffer> = {} as any;

      for (const stem of stems) {
        const audioBuffer = ctx.createBuffer(2, length, sampleRate);
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);
        const stemNotes = notes.filter((n) => n.stem === stem && !n.wasCleanedUp);

        for (const note of stemNotes) {
          const startSample = Math.floor(note.startTime * sampleRate);
          const endSample = Math.min(length, Math.floor(note.endTime * sampleRate));
          const noteDur = (endSample - startSample) / sampleRate;
          if (startSample >= length || endSample <= startSample) continue;

          const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
          const vel = (note.velocity || 90) / 127;
          const pan = note.pan !== undefined ? note.pan : (stem === 'bass' ? 0 : stem === 'vocals' ? 0 : stem === 'other' ? 0.25 : -0.15);
          const leftVol = Math.cos(((pan + 1) * Math.PI) / 4);
          const rightVol = Math.sin(((pan + 1) * Math.PI) / 4);

          for (let i = startSample; i < endSample; i++) {
            const t = (i - startSample) / sampleRate;
            const progress = t / noteDur;
            let sampleVal = 0;

            if (stem === 'drums') {
              if (note.pitch === 36 || note.pitch === 35) {
                // Kick
                const sweepFreq = 150 * Math.exp(-t * 24) + 40;
                sampleVal = Math.sin(2 * Math.PI * sweepFreq * t) * Math.exp(-t * 12);
              } else if (note.pitch === 38 || note.pitch === 40) {
                // Snare
                const noise = (Math.random() * 2 - 1) * Math.exp(-t * 18);
                const tone = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 22);
                sampleVal = (noise * 0.7 + tone * 0.5);
              } else {
                // Hat
                sampleVal = (Math.random() * 2 - 1) * Math.exp(-t * 45);
              }
            } else if (stem === 'bass') {
              const saw = 2 * ((t * freq) % 1) - 1;
              const sineSub = Math.sin(2 * Math.PI * (freq * 0.5) * t);
              sampleVal = (saw * 0.4 + sineSub * 0.6) * Math.exp(-progress * 2.2);
            } else if (stem === 'vocals') {
              const saw = 2 * ((t * freq) % 1) - 1;
              const formant = Math.sin(2 * Math.PI * freq * 2.5 * t);
              sampleVal = (saw * 0.6 + formant * 0.4) * (1 - Math.exp(-t * 40)) * Math.exp(-progress * 1.5);
            } else {
              // Other (Pads / Keys)
              const tri = 2 * Math.abs(2 * ((t * freq) % 1) - 1) - 1;
              const detune = Math.sin(2 * Math.PI * (freq * 1.005) * t);
              sampleVal = (tri * 0.5 + detune * 0.5) * (1 - Math.exp(-t * 25)) * (1 - progress * 0.7);
            }

            const amp = sampleVal * vel * 0.28;
            leftChannel[i] += amp * leftVol;
            rightChannel[i] += amp * rightVol;
          }
        }

        result[stem] = audioBuffer;
      }

      this.stemBuffers = result;
      resolve(result);
    });
  }
}

export const audioEngine = new AudioEngine();
