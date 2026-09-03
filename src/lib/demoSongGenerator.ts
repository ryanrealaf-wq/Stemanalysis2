/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Synthesizes a full-frequency 6-stem polyphonic demo track ("Cosmic Funk Groove")
 * using Web Audio OfflineAudioContext.
 * Generates rich musical material across vocals/lead, bass, drums, guitar, piano, and atmospheric synths.
 */
export async function generateDemoAudioBuffer(durationSeconds = 12): Promise<AudioBuffer> {
  const sampleRate = 44100;
  const numChannels = 2;
  const length = Math.floor(sampleRate * durationSeconds);
  const offlineCtx = new OfflineAudioContext(numChannels, length, sampleRate);

  const bpm = 118;
  const beatSec = 60 / bpm;
  const totalBeats = Math.floor(durationSeconds / beatSec);

  // Master bus
  const masterBus = offlineCtx.createGain();
  masterBus.gain.value = 0.85;
  masterBus.connect(offlineCtx.destination);

  // 1. DRUMS SYNTHESIS (Kick, Snare, Hi-Hats)
  for (let beat = 0; beat < totalBeats; beat++) {
    const time = beat * beatSec;

    // Kick Drum on beat 0 and 2 of each 4-beat bar
    if (beat % 2 === 0 && time + 0.3 < durationSeconds) {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

      gain.gain.setValueAtTime(0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

      osc.connect(gain);
      gain.connect(masterBus);
      osc.start(time);
      osc.stop(time + 0.3);
    }

    // Snare Drum on beat 1 and 3 of each 4-beat bar
    if (beat % 2 === 1 && time + 0.25 < durationSeconds) {
      // Body tone
      const osc = offlineCtx.createOscillator();
      const oscGain = offlineCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
      oscGain.gain.setValueAtTime(0.4, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(oscGain);
      oscGain.connect(masterBus);
      osc.start(time);
      osc.stop(time + 0.2);

      // Snare snap noise
      const noiseBuffer = offlineCtx.createBuffer(1, Math.floor(sampleRate * 0.2), sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.04));
      }
      const noiseSource = offlineCtx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = offlineCtx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1200;

      const noiseGain = offlineCtx.createGain();
      noiseGain.gain.setValueAtTime(0.5, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterBus);
      noiseSource.start(time);
    }

    // Hi-Hat on 8th notes
    for (let sub = 0; sub < 2; sub++) {
      const hatTime = time + (sub * beatSec) / 2;
      if (hatTime + 0.06 >= durationSeconds) break;

      const hatBuffer = offlineCtx.createBuffer(1, Math.floor(sampleRate * 0.05), sampleRate);
      const data = hatBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.012));
      }
      const hatSource = offlineCtx.createBufferSource();
      hatSource.buffer = hatBuffer;

      const hatFilter = offlineCtx.createBiquadFilter();
      hatFilter.type = 'highpass';
      hatFilter.frequency.value = 7500;

      const hatGain = offlineCtx.createGain();
      hatGain.gain.value = sub === 0 ? 0.22 : 0.15;

      hatSource.connect(hatFilter);
      hatFilter.connect(hatGain);
      hatGain.connect(masterBus);
      hatSource.start(hatTime);
    }
  }

  // 2. BASSLINE SYNTHESIS (Monophonic Funky Root-Fifth Motion)
  const bassNotes = [
    { pitch: 41, name: 'F1', freq: 43.65, dur: 0.35 },
    { pitch: 44, name: 'Ab1', freq: 51.91, dur: 0.25 },
    { pitch: 46, name: 'Bb1', freq: 58.27, dur: 0.3 },
    { pitch: 48, name: 'C2', freq: 65.41, dur: 0.45 },
  ];

  for (let bar = 0; bar < Math.ceil(totalBeats / 4); bar++) {
    for (let idx = 0; idx < bassNotes.length; idx++) {
      const note = bassNotes[idx];
      const time = (bar * 4 + idx) * beatSec;
      if (time + note.dur >= durationSeconds) break;

      const osc = offlineCtx.createOscillator();
      const subOsc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      const filter = offlineCtx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.value = note.freq;

      subOsc.type = 'sine';
      subOsc.frequency.value = note.freq;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, time);
      filter.frequency.exponentialRampToValueAtTime(140, time + note.dur);
      filter.Q.value = 2.5;

      gain.gain.setValueAtTime(0.55, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + note.dur);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(masterBus);

      osc.start(time);
      subOsc.start(time);
      osc.stop(time + note.dur);
      subOsc.stop(time + note.dur);
    }
  }

  // 3. ELECTRIC GUITAR (Funky Strum Plucks)
  const guitarVoicings = [
    [53, 56, 60, 63], // Fm7 (F3, Ab3, C4, Eb4)
    [56, 60, 63, 67], // Abmaj7 (Ab3, C4, Eb4, G4)
    [58, 61, 65, 68], // Bbm7 (Bb3, Db4, F4, Ab4)
    [60, 64, 67, 70], // C7 (C4, E4, G4, Bb4)
  ];

  for (let bar = 0; bar < Math.ceil(totalBeats / 4); bar++) {
    for (let chordIdx = 0; chordIdx < guitarVoicings.length; chordIdx++) {
      const voicing = guitarVoicings[chordIdx];
      // Play on upbeat (and of 1, and of 3)
      const hitTimes = [
        (bar * 4 + chordIdx) * beatSec + beatSec * 0.5,
        (bar * 4 + chordIdx) * beatSec + beatSec * 0.75,
      ];

      for (const time of hitTimes) {
        if (time + 0.2 >= durationSeconds) break;

        voicing.forEach((midi, stringIdx) => {
          const strumOffset = stringIdx * 0.012; // 12ms per string strum simulation
          const noteTime = time + strumOffset;
          const freq = 440 * Math.pow(2, (midi - 69) / 12);

          const osc = offlineCtx.createOscillator();
          const filter = offlineCtx.createBiquadFilter();
          const gain = offlineCtx.createGain();

          osc.type = 'triangle';
          osc.frequency.value = freq;

          filter.type = 'bandpass';
          filter.frequency.value = 1800;
          filter.Q.value = 1.8;

          gain.gain.setValueAtTime(0.12, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterBus);

          osc.start(noteTime);
          osc.stop(noteTime + 0.2);
        });
      }
    }
  }

  // 4. ACOUSTIC PIANO (Rich Chord Triads)
  const pianoChords = [
    [65, 68, 72], // F minor (F4, Ab4, C5)
    [68, 72, 75], // Ab major (Ab4, C5, Eb5)
    [70, 73, 77], // Bb minor (Bb4, Db5, F5)
    [72, 76, 79], // C major (C5, E5, G5)
  ];

  for (let bar = 0; bar < Math.ceil(totalBeats / 4); bar++) {
    for (let chordIdx = 0; chordIdx < pianoChords.length; chordIdx++) {
      const chord = pianoChords[chordIdx];
      const time = (bar * 4 + chordIdx) * beatSec;
      if (time + 0.8 >= durationSeconds) break;

      chord.forEach((midi) => {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const osc = offlineCtx.createOscillator();
        const hammerOsc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        hammerOsc.type = 'triangle';
        hammerOsc.frequency.value = freq * 2;

        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.75);

        osc.connect(gain);
        hammerOsc.connect(gain);
        gain.connect(masterBus);

        osc.start(time);
        hammerOsc.start(time);
        osc.stop(time + 0.8);
        hammerOsc.stop(time + 0.8);
      });
    }
  }

  // 5. VOCALS / LEAD MELODY (Pentatonic Phrase with Vibrato)
  const vocalMotif = [
    { pitch: 65, freq: 349.23, timeOffset: 0.0, dur: 0.45 },
    { pitch: 68, freq: 415.3, timeOffset: 0.5, dur: 0.4 },
    { pitch: 70, freq: 466.16, timeOffset: 1.0, dur: 0.65 },
    { pitch: 72, freq: 523.25, timeOffset: 1.8, dur: 0.8 },
    { pitch: 70, freq: 466.16, timeOffset: 2.7, dur: 0.4 },
    { pitch: 68, freq: 415.3, timeOffset: 3.2, dur: 0.7 },
  ];

  for (let bar = 0; bar < Math.ceil(totalBeats / 4); bar++) {
    const barStart = bar * 4 * beatSec;
    for (const note of vocalMotif) {
      const time = barStart + note.timeOffset * beatSec;
      if (time + note.dur >= durationSeconds) break;

      const osc = offlineCtx.createOscillator();
      const formantFilter = offlineCtx.createBiquadFilter();
      const gain = offlineCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.freq, time);

      // Subtle vocal vibrato after 100ms
      const lfo = offlineCtx.createOscillator();
      const lfoGain = offlineCtx.createGain();
      lfo.frequency.value = 5.2; // 5.2 Hz vibrato
      lfoGain.gain.setValueAtTime(0, time);
      lfoGain.gain.linearRampToValueAtTime(4.5, time + 0.2);
      lfo.connect(osc.frequency);
      lfo.start(time);
      lfo.stop(time + note.dur);

      formantFilter.type = 'peaking';
      formantFilter.frequency.value = 2400;
      formantFilter.gain.value = 6;
      formantFilter.Q.value = 2.0;

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.22, time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + note.dur);

      osc.connect(formantFilter);
      formantFilter.connect(gain);
      gain.connect(masterBus);

      osc.start(time);
      osc.stop(time + note.dur);
    }
  }

  // 6. OTHER / SYNTH ATMOSPHERE (Stereo Pad Chord Wash)
  const padOsc1 = offlineCtx.createOscillator();
  const padOsc2 = offlineCtx.createOscillator();
  const padFilter = offlineCtx.createBiquadFilter();
  const padGain = offlineCtx.createGain();

  padOsc1.type = 'sawtooth';
  padOsc1.frequency.value = 174.61; // F3
  padOsc2.type = 'sawtooth';
  padOsc2.frequency.value = 175.2; // slightly detuned for chorus width

  padFilter.type = 'lowpass';
  padFilter.frequency.setValueAtTime(800, 0);
  padFilter.frequency.linearRampToValueAtTime(1400, durationSeconds * 0.5);
  padFilter.frequency.linearRampToValueAtTime(700, durationSeconds);

  padGain.gain.setValueAtTime(0.01, 0);
  padGain.gain.linearRampToValueAtTime(0.12, 1.5);
  padGain.gain.setValueAtTime(0.12, durationSeconds - 1.0);
  padGain.gain.linearRampToValueAtTime(0.001, durationSeconds);

  padOsc1.connect(padFilter);
  padOsc2.connect(padFilter);
  padFilter.connect(padGain);
  padGain.connect(masterBus);

  padOsc1.start(0);
  padOsc2.start(0);
  padOsc1.stop(durationSeconds);
  padOsc2.stop(durationSeconds);

  // Render to AudioBuffer
  return await offlineCtx.startRendering();
}
