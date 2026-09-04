# StemFlow AI — Comprehensive System Specification & Architecture Manual

> **StemFlow AI** is a professional-grade, browser-native audio workstation combining multi-band DSP stem separation, real-time feature extraction, deterministic cross-stem collision auditing, Google Gemini LLM arrangement intelligence, and high-accuracy MIDI transcription.

---

## 1. Executive Summary & Core Mission

Standard audio-to-MIDI converters suffer from three fatal flaws when dealing with complex polyphonic master recordings:
1. **Harmonic Bleed & Ghost Notes**: Bleed between isolated stems causes notes from the bass or drums to appear erroneously in melodic tracks.
2. **Context-Blind Quantization**: Traditional tools apply uniform grid quantization, destroying organic human swing and ornamentations.
3. **Absence of Musical Role Intelligence**: Conventional DSP cannot distinguish whether an acoustic element is a foundational bassline, a passing ornament, a melodic lead, or ambient texture.

**StemFlow AI** solves this through a hybrid architecture:
- **Client-Side DSP Engine**: Rapid, local multi-band crossover splitting, real-time STFT salience extraction, autocorrelation pitch tracking, and Web Audio multi-stem synthesis.
- **Deterministic Audio-Domain Collision Pass**: A mathematical gate placed between raw transcription serialization and cognitive processing that inspects physical frequency energy and transient slopes to eliminate ghost bleed notes.
- **Server-Side Gemini LLM Orchestration**: Multi-modal reasoning using `gemini-2.5-flash` / `gemini-3.7-flash` to evaluate time-series energy, spectral centroids, and cross-stem correlation, outputting section-by-section functional roles, quantization policies, and harmonic tension profiles.
- **Synchronized Multitrack Workstation**: An aligned timeline, interactive piano roll with ghost-note filtering, chord progression strip, automation lanes, and Type 1 multitrack MIDI / lossless WAV stem exporter.

---

## 2. End-to-End Pipeline Architecture (9 Stages)

```
[ Audio File / Live Mic ]
         │
         ▼
[ Stage 1: Signal Ingestion & Decoding ] ─── Web Audio API AudioContext.decodeAudioData
         │
         ▼
[ Stage 2: 6-Stem Multi-Band Crossover ] ─── Vocals, Bass, Drums, Guitar, Piano, Other
         │
         ▼
[ Stage 3: Feature Extraction & Concurrent Serialization ]
         │   - RMS Envelopes & Onset Densities
         │   - Spectral Centroid & Autocorrelation
         │
         ▼
┌────────────────────────────────────────────────────────────────────────┐
│ [ INTER-STAGE GATE: Deterministic Cross-Stem Collision & Bleed Audit ] │
│  - Spatial Collision Detection (|Δt| ≤ 20ms, Overlap > 50%, p_A = p_B) │
│  - Fundamental Salience STFT Magnitude at f0 (≥ 6 dB threshold)        │
│  - Low-Pass (<250 Hz) Centroid Energy Filter for p < C3 (130.81 Hz)     │
│  - Onset Transient Attack Derivative (dA/dt) Evaluation                │
│  - Immediate Losing Note Pruning from Symbolic Matrix                  │
└────────────────────────────────────────────────────────────────────────┘
         │
         ▼
[ Stage 4: Gemini LLM Orchestration & Subgenre Classification ] ─── POST /api/analyze-song
         │   - Catalog Subgenre Classification ('boom_bap' | 'drill' | 'trap' | 'spoken_word' | 'hybrid')
         │   - Section Segmentation (Intro, Verse, Hook, Chorus, Bridge, Breakdown, Outro)
         │   - Stem Role Allocation (Foundation, Lead, Texture, Percussion, etc.)
         │   - Subgenre-Adaptive Quantization Policies (e.g. Loose Boom-Bap swing vs. Tight Drill grid)
         │   - Dynamic Harmonic Tension Curves & Executive Arrangement Critique
         │
         ▼
[ Stage 5: Adaptive Transcription Routing ]
         │   - Bass: Sub-Harmonic YIN & Fundamental Lock
         │   - Vocals: Formant Peak Tracking & Continuous Pitch Bends
         │   - Guitars/Keys: Polyphonic Spectral Peak Salience
         │   - Drums: Multi-Band Onset Detection (Kick, Snare, Hi-Hat, Cymbals)
         │
         ▼
[ Stage 6: Velocity Mapping & Micro-Tuning ] ─── Dynamic range normalization, CC11 Expression
         │
         ▼
[ Stage 7: Drum Groove Analysis & Chromagram Modal Key Detection ]
         │
         ▼
[ Stage 8: Cross-Stem Bleed Purge & Groove Realignment ]
         │
         ▼
[ Stage 9: Harmonic Chord Voicings & MIDI CC Automation Lanes ]
         │
         ▼
[ Studio Workstation UI & Lossless Export Engine ]
```

---

## 3. The Cross-Stem Collision & Bleed Audit Protocol

Placed directly between **Stage 3** (Serialization) and **Stage 4** (LLM Orchestration), this deterministic protocol halts symbolic processing for contested temporal intervals and executes an audio-domain re-audit.

### 3.1 Collision Detection Criteria
Any note pair $N_A(p_A, t_{\text{start}, A}, t_{\text{end}, A})$ and $N_B(p_B, t_{\text{start}, B}, t_{\text{end}, B})$ across different stems is flagged when:
1. **Pitch Equivalence**:
   $$p_A = p_B$$
2. **Temporal Coincidence**:
   $$|t_{\text{start}, A} - t_{\text{start}, B}| \le 20\text{ ms} \quad (0.02\text{ s})$$
3. **Duration Overlap**:
   $$\text{Overlap Duration} > 0.50 \cdot \min(\text{duration}_A, \text{duration}_B)$$

### 3.2 Signal Re-Audit Rules & Mathematical Formulas

| Metric | Target | Formula & Decision Criteria |
|---|---|---|
| **Fundamental Salience ($F_0$)** | Fundamental frequency $f_0$ | STFT magnitude computed at: $$f_0 = 440 \cdot 2^{\frac{p - 69}{12}}\text{ Hz}$$ If $\text{Salience}_A > 1.995 \cdot \text{Salience}_B$ ($\ge 6\text{ dB}$ advantage) $\rightarrow$ `KEEP_A_DELETE_B`. If $\text{Salience}_B > 1.995 \cdot \text{Salience}_A$ $\rightarrow$ `KEEP_B_DELETE_A`. |
| **Spectral Centroid & Bandwidth** | Low-band (< 250 Hz) vs Mid-High | Single-pole low-pass filtering. If $p < C_3$ ($48$ MIDI, $130.81\text{ Hz}$) and low-band energy ratio $> 70\%$ $\rightarrow$ `FORCE_BASS` (purging duplicate from Other/Guitar). For $p \ge C_3$ contested against Bass $\rightarrow$ `FORCE_OTHER`. |
| **Onset Transient Slope ($\frac{dA}{dt}$)** | Transient attack rate | Evaluated over a $15\text{ ms}$ window at $t_{\text{start}}$: $$\frac{dA}{dt} = \frac{\text{RMS}(t_{\text{start}} \dots t_{\text{start}} + 15\text{ms}) - \text{RMS}(t_{\text{start}} - 15\text{ms} \dots t_{\text{start}})}{\Delta t}$$ The stem with the steeper slope retains ownership. |

### 3.3 Symbolic Pruning & Anomaly Telemetry
- Losing note tuples are purged from the valid notes array and flagged as `wasCleanedUp = true`.
- Structured anomaly log emitted to stdout and streamed to the UI:
  ```text
  [COLLISION_RESOLVED] Timestamp: 3.420s | Pitch: 40 | Retained: Bass | Pruned: Other | Delta Energy: 9.14dB.
  ```

---

## 4. Workstation Architecture & UI Modules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Header: Title, Artist, BPM, Key, Duration, Audition Mode Switcher, Exports   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Audio Input Panel: Real File Drag-and-Drop + Live Mic Recording with Meters │
├─────────────────────────────────────────────────────────────────────────────┤
│ Pipeline Progress: 9-Stage Animated State Machine with Sub-Process Telemetry │
├─────────────────────────────────────────────────────────────────────────────┤
│ View Tabs: [ Timeline ] [ Piano Roll ] [ Accuracy ] [ Gemini ] [ Features ] │
├─────────────────────────────────────────────────────────────────────────────┤
│ Tab Content View:                                                           │
│  - Functional Timeline: Section cards, stem roles, harmonic tension curve   │
│  - Piano Roll: Interactive canvas, velocity bars, bleed ghost notes toggle  │
│  - Accuracy Inspector: 99%+ metrics, delta dB telemetry, collision feed    │
│  - Gemini Reasoning: Executive summary, tension critique, mix suggestions   │
│  - Feature Analytics: Centroids, onset density, cross-stem correlation      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Chord Progression Strip: Roman numerals, inversions, tension, voicings      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Automation Lane Drawer: Pitch Bend, CC74 Brightness, CC11 Expression        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Multitrack Mixer: 6 Stems + Master, Faders, Pan, Solo, Mute, Stem MIDI Out │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Audition Modes
- **Audio Stems Only (`audio_only`)**: Pure acoustic stem playback through the Web Audio mixing matrix.
- **Synthesized MIDI (`synth_only`)**: Real-time polyphonic web synthesizer playing the transcribed MIDI note events.
- **Hybrid Unison (`hybrid_unison`)**: Simultaneously plays real audio stems alongside synthesized MIDI to allow immediate ear-verification of transcription fidelity and phase alignment.

### 4.2 Multitrack Mixer & Stem Controls
- **Stems Managed**: Vocals, Bass, Drums, Guitar, Piano, Other, and Master Output.
- **Per-Channel Faders**: Volume (0.00 to 1.00), Stereo Pan (-1.00 Left to +1.00 Right).
- **Solo / Mute Matrix**: Dynamic gain muting with non-destructive solo latching.
- **Stem MIDI Action**: Direct Type 1 `.mid` file download for individual stems.

### 4.3 Piano Roll & Bleed Filter
- **Canvas Rendering**: High-performance HTML5 Canvas rendering hundreds of notes with zoom ($0.5\times$ to $3.0\times$) and time scrub bar.
- **Ghost Note Discrimination**: Visually separates validated clean notes from rejected bleed ghost notes with toggleable visibility.
- **Velocity Visualization**: Lower strip showing MIDI velocity (0–127) for every note.

### 4.4 Chord Progression Strip
- Identifies harmonic segments, naming chords (e.g. `Am7`, `Fmaj9`, `C/E`, `G7sus4`), Roman numeral analyses (`i7`, `VImaj9`, `I6`, `V7sus`), harmonic tension scores (0–100%), and chord inversions (`root`, `1st`, `2nd`, `3rd`).

### 4.5 Automation Lane Drawer
- Real-time continuous envelope drawer displaying:
  - **Pitch Bend**: $\pm 2$ semitones continuous vocal/guitar portamento curves.
  - **CC74 Filter Brightness**: High-frequency cutoff dynamics.
  - **CC11 Expression**: Smooth volume swells and dynamic breathing.
  - **CC1 Vibrato & CC64 Sustain**: Polyphonic keyboard damper states.

---

## 5. Technology Stack & Directory Layout

### 5.1 Tech Stack
- **Client**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Motion, Lucide React, JSZip.
- **Audio Processing**: Web Audio API (`AudioContext`, `BiquadFilterNode`, `GainNode`, `StereoPannerNode`, `AnalyserNode`, `OscillatorNode`).
- **Server API**: Node.js, Express.js (Port 3000), bundled via `esbuild` to CommonJS (`dist/server.cjs`).
- **AI Service**: Google Gen AI SDK (`@google/genai`) accessing `gemini-2.5-flash` / `gemini-3.7-flash` with structured JSON schemas and algorithmic fallback.

### 5.2 Project Structure
```
├── server.ts                       # Express server entry point with Vite middleware & /api/analyze-song
├── server/
│   └── geminiService.ts            # Gemini 2.5/3.7 Flash structured functional analysis & algorithmic fallback
├── src/
│   ├── main.tsx                    # React client entry point
│   ├── App.tsx                     # Core studio state, playback loop & pipeline orchestration
│   ├── types.ts                    # Global TypeScript interfaces, types & enums
│   ├── index.css                   # Tailwind CSS v4 styles
│   ├── components/
│   │   ├── Header.tsx              # Transport controls, metadata, audition mode switcher
│   │   ├── AudioInputPanel.tsx     # Master file drag-and-drop & live mic recorder
│   │   ├── PipelineProgress.tsx    # 9-stage animated pipeline status monitor
│   │   ├── TrackMixer.tsx          # 6-stem faders, pan knobs, mute/solo matrix
│   │   ├── TimelineView.tsx        # Section cards, stem roles, harmonic tension curve
│   │   ├── PianoRollView.tsx       # Canvas-based multi-stem piano roll & bleed visualizer
│   │   ├── AutomationLaneDrawer.tsx# Pitch bend, CC11, CC74 continuous automation lanes
│   │   ├── ChordProgressionStrip.tsx# Roman numeral chord segmentation strip
│   │   ├── AccuracyMetricsPanel.tsx# Quantitative accuracy stats & collision audit feed
│   │   ├── GeminiInsightsPanel.tsx # Gemini musical reasoning, critique & mix advice
│   │   ├── FeatureAnalyticsPanel.tsx# Spectral centroid, onset density & correlation charts
│   │   └── ExportPanel.tsx         # Multitrack MIDI & WAV stem ZIP packaging modal
│   └── lib/
│       ├── audioDsp.ts             # Multi-band DSP crossover, STFT, autocorrelation & envelopes
│       ├── audioPlayer.ts          # Web Audio multitrack stem player & polyphonic synthesizer
│       ├── audioExport.ts          # Lossless WAV rendering & background ZIP generation
│       ├── crossStemCollisionAudit.ts # Deterministic cross-stem collision & bleed protocol
│       ├── midiExport.ts           # Standard MIDI Type 1 file binary generator (0x4D546864)
│       └── transcriptionEngine.ts  # Adaptive transcription router & velocity mapper
├── package.json                    # Dependencies & build scripts
├── vite.config.ts                  # Vite bundler configuration
└── metadata.json                   # Applet metadata, permissions & capabilities
```

---

## 6. Export Capabilities

1. **Standard MIDI Format Type 1 (`.mid`)**:
   - Distinct tracks for each stem: Conductor (Tempo & Time Signature), Vocals, Bass, Drums, Guitar, Piano, Other.
   - Variable-length delta-time encoding, note-on/note-off events with dynamic velocities (0–127).
   - Injected MIDI CC automation: Pitch Bend envelopes, CC1 (Modulation), CC11 (Expression), CC74 (Brightness), CC64 (Sustain Pedal).
2. **Lossless WAV Stems Package (`.zip`)**:
   - Individual 16-bit 44.1 kHz PCM `.wav` files for all 6 isolated stems.
   - Accompanying master multitrack MIDI file bundled into the archive via JSZip.

---

## 7. Strict Operational Guarantees
- **No Mock or Simulated Elements**: All audio data is computed from genuine user uploads or microphone signals.
- **Non-Blocking Background Tasks**: Heavy packaging and ZIP generation occur asynchronously to maintain 60 FPS UI responsiveness.
- **Port Compliance**: Dev server binds exclusively to `0.0.0.0:3000`.
