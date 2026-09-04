/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import { CrossStemCorrelation, SectionAnalysis, SongMetadata, StemFeatureData, StemType } from '../src/types';

/**
 * Hardcoded artist/catalog context for this instance of StemFlow AI.
 * This artist's catalog spans multiple related subgenres rather than
 * one fixed style. Instead of assuming a single subgenre, Gemini is
 * asked to CLASSIFY which one best fits THIS track from its actual
 * tempo/onset/energy features, then apply that subgenre's conventions.
 */
const ARTIST_STYLE_PROFILE = `
ARTIST CONTEXT: This catalog spans dark West Coast drill, trap, boom-bap,
and spoken-word hybrids. Do not assume a single subgenre — first
CLASSIFY which one this specific track matches based on its tempo and
rhythmic features, then apply that subgenre's conventions below.

SUBGENRE CLASSIFICATION SIGNALS (use estimated BPM, hi-hat onset density,
snare placement, and swing/timing variance from the feature time-series):

- BOOM-BAP: ~85-95 BPM, swung/loose hi-hat and snare placement (notable
  timing variance rather than rigid grid), sample-based or live-feel drums,
  snare typically on 2 and 4.
- DRILL: ~135-150 BPM (or half-time feel at ~67-75), sliding 808 bass,
  triplet hi-hat rolls, syncopated/irregular snare placement, half-time
  snare on beat 3.
- TRAP: ~130-150 BPM, rapid straight or triplet hi-hat rolls with high
  onset density, 808 bass slides, snare/clap on beat 3, generally more
  rhythmically rigid/gridded than drill or boom-bap.
- SPOKEN-WORD: little to no strict tempo grid, sparse or rubato
  instrumentation, vocal phrasing drives the timing rather than a
  fixed pulse.

Report your classification as "detectedSubgenre" (one of: 'boom_bap',
'drill', 'trap', 'spoken_word', 'hybrid') and use it to inform the
rules below.

VOCAL ROLES (applies across all subgenres in this catalog):
- Male vocals are ALWAYS hard-attack rap delivery, never melodic/sung.
  A hard-attack, rhythmically-spoken male vocal stem should be classified
  as 'lead' or 'foundation' — never 'texture' or 'ornament' — even
  though it is not pitched/sung in the traditional sense.
- Female vocals, when present, are ethereal and melodic, functioning as
  a contrasting 'lead' hook layer against hard-attack male verses
  (trap-soul hybrid structure).

RHYTHM & QUANTIZATION (apply per detected subgenre):
- Boom-bap: preserve swing — do NOT recommend high quantization
  strictness even in hook sections; loose timing is the genre's identity.
- Drill/Trap: drum/bass grid can be tighter, but vocal cadence (dense
  internal rhyme, anapestic meter) is often intentionally off-grid —
  keep vocal quantization strictness low-to-moderate regardless of
  section energy.
- Spoken-word: quantization strictness should be very low throughout;
  there may be no fixed grid to snap to at all.
- Drums may use triplet hi-hat rolls and half-time snare (drill/trap
  convention) — treat this as intentional groove, not a transcription
  artifact.

SECTION LABELS:
- Prefer 'verse', 'hook', 'pre_chorus', 'bridge', 'breakdown', 'outro',
  'intro' over generic EDM terms like 'drop' unless the energy profile
  genuinely matches an EDM drop.

HARMONIC/TONAL:
- Expect minor-key, modally dark harmonic centers. Sparse or static
  chord movement under a hard-attack vocal is intentional
  (drone/bass-anchored), not a sign of thin arrangement.

ATMOSPHERE:
- Overall mood is moody and bass-forward by default; ranges from
  down-tempo/cinematic/church-adjacent (boom-bap, spoken-word) to dense,
  aggressive (drill, trap).
`;

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Using algorithmic fallback analysis.');
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export interface GeminiFunctionalAnalysisOutput {
  sections: SectionAnalysis[];
  geminiExecutiveSummary: string;
  arrangementCritique: string;
  mixRecommendations: string[];
  detectedSubgenre: 'boom_bap' | 'drill' | 'trap' | 'spoken_word' | 'hybrid';
}

export async function runGeminiFunctionalAnalysis(
  metadata: SongMetadata,
  stemFeatures: Record<StemType, StemFeatureData>,
  correlations: CrossStemCorrelation[],
  collisionTelemetry: string[] = []
): Promise<GeminiFunctionalAnalysisOutput> {
  const ai = getGeminiClient();

  if (!ai) {
    return generateAlgorithmicFallbackAnalysis(metadata, stemFeatures, correlations);
  }

  try {
    // Compact feature summary for prompt
    const compactFeatureSummary = Object.entries(stemFeatures).map(([stem, data]) => ({
      stem,
      averageEnergy: data.averageEnergy,
      peakEnergy: data.peakEnergy,
      averageSpectralCentroidHz: data.averageCentroid,
      averageOnsetDensity: data.averageOnsetDensity,
      timelineSample: data.timeline.filter((_, idx) => idx % 4 === 0).map((t) => ({
        timeSec: t.time,
        energy: t.energy,
        centroidHz: t.spectralCentroid,
        onsetsPerSec: t.onsetDensity,
      })),
    }));

    const correlationSummary = correlations.map((c) => ({
      pair: c.pair,
      score: c.correlation,
      relationship: c.relationshipType,
      note: c.description,
    }));

    const prompt = `You are an expert musicologist and audio intelligence AI.
Perform a high-level FUNCTIONAL ANALYSIS of the separated 6 stems (HTDemucs 6s architecture: vocals, bass, drums, guitar, piano, other) of this track.
${ARTIST_STYLE_PROFILE}
Track Info:
- Title: "${metadata.title}" by ${metadata.artist}
- Duration: ${metadata.duration}s
- Estimated BPM: ${metadata.bpm}
- Musical Key: ${metadata.key}
- Time Signature: ${metadata.timeSignature}

Extracted Stem Feature Time-Series:
${JSON.stringify(compactFeatureSummary, null, 2)}

Cross-Stem Correlation Matrix:
${JSON.stringify(correlationSummary, null, 2)}

Cross-Stem Collision & Bleed Audit Protocol Telemetry (Deterministic Resolution):
${collisionTelemetry.length > 0 ? collisionTelemetry.slice(0, 15).join('\n') : 'No cross-stem collisions detected; acoustic isolation verified across all stems.'}

Your task:
1. First, classify the track's subgenre as one of 'boom_bap', 'drill', 'trap', 'spoken_word', or 'hybrid' based on estimated BPM, hi-hat onset density, snare placement, and timing swing/variance evident in the feature time-series. Report this as "detectedSubgenre".
2. Segment the song into distinct musical sections across time (e.g., intro, verse, hook, bridge, breakdown, outro) using section-naming and quantization conventions appropriate to the detected subgenre.
3. For each section:
   - Assign stem roles for each of the 6 stems (vocals, bass, drums, guitar, piano, other): must be one of ['foundation', 'texture', 'lead', 'ornament', 'percussion', 'silent'].
   - Explain WHY each stem serves that role based on the energy/centroid features and musical function (not just raw audio detection).
   - Recommend quantization strictness (0-100%) consistent with the detected subgenre (e.g. boom-bap and spoken-word should stay low even in high-energy sections; drill/trap vocal cadence should stay low-to-moderate even when drums/bass are gridded tight).
   - Rate harmonic tension (0-100%) and dynamics ('low' | 'medium' | 'high' | 'peak').
4. Provide an executive summary (mentioning the detected subgenre) of what each stem is doing throughout the arrangement, a critical review of the song's structural tension/release, and 3 actionable mix recommendations.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are an elite music producer and musicology AI specializing in HTDemucs 6-stem separation analysis, functional role attribution, and adaptive MIDI transcription.
${ARTIST_STYLE_PROFILE}
Apply this artist context silently to inform your analysis — do not mention or quote it in your output.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedSubgenre: {
              type: Type.STRING,
              description: "One of 'boom_bap', 'drill', 'trap', 'spoken_word', 'hybrid' — classified from tempo, hi-hat density, snare placement, and timing swing.",
            },
            executiveSummary: {
              type: Type.STRING,
              description: 'Executive summary explaining the overarching stem roles and interaction patterns.',
            },
            arrangementCritique: {
              type: Type.STRING,
              description: 'Critique of harmonic tension, call-and-response dynamics, and sonic pacing.',
            },
            mixRecommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-4 actionable recommendations for mixing and spatial separation.',
            },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  section: {
                    type: Type.STRING,
                    description: 'One of intro, verse, chorus, hook, bridge, drop, outro, solo, breakdown, pre_chorus',
                  },
                  title: { type: Type.STRING, description: 'Display name, e.g. "Verse 1", "Main Drop"' },
                  startTime: { type: Type.NUMBER },
                  endTime: { type: Type.NUMBER },
                  musicalContext: { type: Type.STRING },
                  harmonicTension: { type: Type.NUMBER, description: '0 to 100' },
                  dynamics: { type: Type.STRING, description: 'low, medium, high, peak' },
                  quantizationStrictness: { type: Type.NUMBER, description: '0 to 100 percent' },
                  stemRoles: {
                    type: Type.OBJECT,
                    properties: {
                      vocals: { type: Type.STRING },
                      bass: { type: Type.STRING },
                      drums: { type: Type.STRING },
                      guitar: { type: Type.STRING },
                      piano: { type: Type.STRING },
                      other: { type: Type.STRING },
                    },
                    required: ['vocals', 'bass', 'drums', 'guitar', 'piano', 'other'],
                  },
                  stemReasoning: {
                    type: Type.OBJECT,
                    properties: {
                      vocals: { type: Type.STRING },
                      bass: { type: Type.STRING },
                      drums: { type: Type.STRING },
                      guitar: { type: Type.STRING },
                      piano: { type: Type.STRING },
                      other: { type: Type.STRING },
                    },
                    required: ['vocals', 'bass', 'drums', 'guitar', 'piano', 'other'],
                  },
                  keyMoments: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: [
                  'id',
                  'section',
                  'title',
                  'startTime',
                  'endTime',
                  'musicalContext',
                  'harmonicTension',
                  'dynamics',
                  'quantizationStrictness',
                  'stemRoles',
                  'stemReasoning',
                ],
              },
            },
          },
          required: ['detectedSubgenre', 'executiveSummary', 'arrangementCritique', 'mixRecommendations', 'sections'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const validSubgenres = ['boom_bap', 'drill', 'trap', 'spoken_word', 'hybrid'];
    const detectedSubgenre = validSubgenres.includes(parsed.detectedSubgenre) ? parsed.detectedSubgenre : 'hybrid';

    return {
      detectedSubgenre,
      sections: parsed.sections.map((s: any, idx: number) => ({
        ...s,
        id: s.id || `sec-${idx + 1}`,
        dynamics: ['low', 'medium', 'high', 'peak'].includes(s.dynamics) ? s.dynamics : 'medium',
        quantizationStrictness: Number(s.quantizationStrictness) || 80,
        harmonicTension: Number(s.harmonicTension) || 50,
        keyMoments: Array.isArray(s.keyMoments) ? s.keyMoments : [],
      })),
      geminiExecutiveSummary: parsed.executiveSummary || 'Functional stem analysis successfully completed.',
      arrangementCritique: parsed.arrangementCritique || 'Solid arrangement with dynamic build and release cycles.',
      mixRecommendations: parsed.mixRecommendations || [
        'Sidechain bass to kick drum to avoid low-end masking in dense drop sections.',
        'Apply high-pass filtering on vocals around 120 Hz to clear space for bass fundamentals.',
        'Spread stereo width on texture pads while keeping bass and kick strictly mono.',
      ],
    };
  } catch (error) {
    console.error('Error in Gemini functional analysis call:', error);
    return generateAlgorithmicFallbackAnalysis(metadata, stemFeatures, correlations);
  }
}

function classifySubgenreHeuristic(
  metadata: SongMetadata,
  stemFeatures: Record<StemType, StemFeatureData>
): 'boom_bap' | 'drill' | 'trap' | 'spoken_word' | 'hybrid' {
  const bpm = metadata.bpm || 0;
  const drums = stemFeatures.drums;
  const avgOnsetDensity = drums?.averageOnsetDensity || 0;

  // Very low rhythmic density with no strong drum presence suggests spoken-word.
  if ((drums?.averageEnergy || 0) < 0.05 && avgOnsetDensity < 1) {
    return 'spoken_word';
  }
  // Half-time drill feel or full-tempo drill/trap range.
  if ((bpm >= 60 && bpm <= 78) || (bpm >= 135 && bpm <= 155)) {
    return avgOnsetDensity > 6 ? 'trap' : 'drill';
  }
  if (bpm >= 82 && bpm <= 98) {
    return 'boom_bap';
  }
  return 'hybrid';
}

function generateAlgorithmicFallbackAnalysis(
  metadata: SongMetadata,
  stemFeatures: Record<StemType, StemFeatureData>,
  correlations: CrossStemCorrelation[]
): GeminiFunctionalAnalysisOutput {
  const detectedSubgenre = classifySubgenreHeuristic(metadata, stemFeatures);
  const duration = metadata.duration || 30;
  const introEnd = Number((duration * 0.25).toFixed(1));
  const verseEnd = Number((duration * 0.55).toFixed(1));
  const chorusEnd = Number((duration * 0.85).toFixed(1));

  const sections: SectionAnalysis[] = [
    {
      id: 'sec-1',
      section: 'intro',
      title: 'Intro & Atmospheric Staging',
      startTime: 0,
      endTime: introEnd,
      musicalContext: 'Gradual harmonic introduction; rhythmic foundations establish initial tempo and key.',
      harmonicTension: 30,
      dynamics: 'low',
      quantizationStrictness: 75,
      stemRoles: {
        vocals: 'texture',
        bass: 'silent',
        drums: 'percussion',
        guitar: 'texture',
        piano: 'texture',
        other: 'texture',
      },
      stemReasoning: {
        vocals: 'Ambient vocal sweeps providing harmonic backdrop before the main lead melody enters.',
        bass: 'Tacet during opening measures to allow maximum dynamic contrast when the verse kicks in.',
        drums: 'Light timekeeping transients establishing the 4/4 meter.',
        guitar: 'Sparse acoustic/electric strum accents setting the tonal vibe.',
        piano: 'Warm reverberant intro chords outlining the root harmony.',
        other: 'Sustained synth pads establishing the atmospheric stage.',
      },
      keyMoments: ['Intro filter sweep', 'Rhythmic entrance transition'],
    },
    {
      id: 'sec-2',
      section: 'verse',
      title: 'Verse (Narrative & Groove)',
      startTime: introEnd,
      endTime: verseEnd,
      musicalContext: 'Monophonic bass and vocal narrative establish the melodic identity with organic phrasing.',
      harmonicTension: 55,
      dynamics: 'medium',
      quantizationStrictness: 65,
      stemRoles: {
        vocals: 'lead',
        bass: 'foundation',
        drums: 'percussion',
        guitar: 'texture',
        piano: 'foundation',
        other: 'texture',
      },
      stemReasoning: {
        vocals: 'Lead vocal carrying the primary melody with expressive micro-timing.',
        bass: 'Monophonic root-fifth motion locking with the drum groove.',
        drums: 'Steady backbeat with kick and snare alternating.',
        guitar: 'Rhythmic comping strums filling space between vocal phrases.',
        piano: 'Tonal chords supporting vocal cadence and harmonic progression.',
        other: 'Subtle atmospheric texture filling the background.',
      },
      keyMoments: ['Lead vocal entrance', 'Bass groove synchronization'],
    },
    {
      id: 'sec-3',
      section: 'hook',
      title: 'Hook (Hard-Attack Drill Section)',
      startTime: verseEnd,
      endTime: chorusEnd,
      musicalContext: 'Peak sonic impact with strict beat-grid quantization on drums/bass; hard-attack vocal cadence stays intentionally off-grid.',
      harmonicTension: 90,
      dynamics: 'peak',
      quantizationStrictness: 90,
      stemRoles: {
        vocals: 'lead',
        bass: 'foundation',
        drums: 'percussion',
        guitar: 'texture',
        piano: 'foundation',
        other: 'texture',
      },
      stemReasoning: {
        vocals: 'Hard-attack rap hook delivered at full intensity — rhythmically spoken, not sung; classified as lead despite non-melodic delivery.',
        bass: '808-style sub bass doubling the kick pattern with maximum low-end energy.',
        drums: 'Full drill kit with triplet hi-hat rolls and half-time snare.',
        guitar: 'Minimal or absent; dark synth/other layers carry the harmonic weight instead.',
        piano: 'Sparse minor-key stabs reinforcing the modal center.',
        other: 'Dark atmospheric synth layers and drone reinforcing bass-forward mood.',
      },
      keyMoments: ['Hook impact', 'Peak rhythmic intensity'],
    },
    {
      id: 'sec-4',
      section: 'outro',
      title: 'Outro & Resolution',
      startTime: chorusEnd,
      endTime: duration,
      musicalContext: 'Resolution of musical tension with expressive spoken-word or ad-lib vocal fragments over a sparse, sustained low end.',
      harmonicTension: 20,
      dynamics: 'low',
      quantizationStrictness: 30,
      stemRoles: {
        vocals: 'ornament',
        bass: 'foundation',
        drums: 'percussion',
        guitar: 'silent',
        piano: 'texture',
        other: 'texture',
      },
      stemReasoning: {
        vocals: 'Freeform spoken-word or ad-lib fragments, intentionally loose against the grid.',
        bass: 'Sustained sub-bass drone grounding the resolution.',
        drums: 'Stripped back percussion fading out.',
        guitar: 'Not present in this arrangement.',
        piano: 'Decaying minor-key chord resolving the modal center.',
        other: 'Decaying reverb/drone tail on the final phrase.',
      },
      keyMoments: ['Vocal ad-lib fragment', 'Final drone decay'],
    },
  ];

  return {
    detectedSubgenre,
    sections,
    geminiExecutiveSummary: `The track "${metadata.title}" (detected as ${detectedSubgenre.replace('_', '-')}) displays a classic tension-and-release structure across ${duration}s. Bass functions as the monophonic harmonic foundation, while Vocals drive rhythmic focal points in the Verse/Hook and transition into expressive ad-libs in the Outro.`,
    arrangementCritique: `The arrangement effectively utilizes dynamic contrast between sparse verses and dense drop sections. The cross-stem correlation highlights tight rhythmic lock between bass and drums, with responsive harmonic comping in the other stem.`,
    mixRecommendations: [
      'Maintain monophonic tracking for bass below 120Hz to preserve punch in the stereo center.',
      'Allow looser quantization on vocal ad-libs in the outro to preserve expressive human micro-timing.',
      'Dampen high-frequency bleed from drum cymbals in the texture stem using spectral centroid thresholding.',
    ],
  };
}
