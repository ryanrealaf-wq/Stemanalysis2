/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { runGeminiFunctionalAnalysis } from './server/geminiService';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Route: Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'StemFlow AI Audio Intelligence Server',
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // API Route: Gemini Functional Analysis
  app.post('/api/analyze-song', async (req, res) => {
    try {
      const { metadata, stemFeatures, correlations, collisionTelemetry } = req.body;

      if (!metadata || !stemFeatures) {
        return res.status(400).json({ error: 'Missing required song metadata or stem features payload.' });
      }

      console.log(`[API] Processing Gemini functional analysis for "${metadata.title}" (${metadata.duration}s)...`);
      const analysisResult = await runGeminiFunctionalAnalysis(
        metadata,
        stemFeatures,
        correlations || [],
        Array.isArray(collisionTelemetry) ? collisionTelemetry : []
      );

      return res.json({
        success: true,
        ...analysisResult,
      });
    } catch (err: any) {
      console.error('[API] Error in /api/analyze-song:', err);
      return res.status(500).json({
        error: 'Failed to complete functional analysis',
        details: err.message || String(err),
      });
    }
  });

  // API Route: Backend Stem Separation & DSP Feature Extraction Engine Info
  app.get('/api/models-info', (req, res) => {
    res.json({
      dspPipeline: {
        separationGraph: 'Web Audio OfflineAudioContext Multi-Band Crossover Filter Graph',
        vocalFilter: 'Mid-Band Formant & Harmonic Extractor (280Hz-4.2kHz Bandpass + Peaking Filter)',
        drumFilter: 'Multi-Band Spectral Flux Transient Decomposition',
        dspFeatureEngine: 'RMS Energy, Spectral Centroid, Onset Density & Pearson Cross-Correlation',
      },
      transcriptionEngines: {
        foundation: 'Monophonic Sub-harmonic YIN / Autocorrelation with Parabolic Interpolation',
        lead: 'Spectral Salience & Formant Pitch Tracker with 14-bit Continuous Pitch Bends',
        texture: 'Chord / Harmony Voicing Detector (Triads & 7th chords)',
        drums: 'Multi-Band Transient Attack & Groove Pocket Tracker',
        ornaments: 'Expressive Unquantized Human Micro-timing Engine',
      },
      aiIntelligence: 'Gemini 3.7 Flash Backend (Arrangement & Section Analysis)',
    });
  });

  // API Route: Download Packaged Android APK
  app.get('/api/download-apk', (req, res) => {
    const apkCandidatePaths = [
      path.join(process.cwd(), 'android/app/build/outputs/apk/debug/app-debug.apk'),
      path.join(process.cwd(), 'dist/stemflow-ai.apk'),
      path.join(process.cwd(), 'public/stemflow-ai.apk'),
    ];

    for (const p of apkCandidatePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', 'attachment; filename="stemflow-ai.apk"');
        return res.sendFile(p);
      }
    }
    return res.status(404).json({ error: 'Android APK has not been packaged yet.' });
  });

  // API Route: Android Packaging Metadata
  app.get('/api/apk-info', (req, res) => {
    const apkPath = path.join(process.cwd(), 'android/app/build/outputs/apk/debug/app-debug.apk');
    if (fs.existsSync(apkPath)) {
      const stats = fs.statSync(apkPath);
      return res.json({
        available: true,
        filename: 'stemflow-ai.apk',
        packageName: 'com.stemflow.ai',
        version: '1.0',
        versionCode: 1,
        targetSdkVersion: 36,
        minSdkVersion: 24,
        sizeBytes: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        builtAt: stats.mtime.toISOString(),
        downloadUrl: '/api/download-apk',
      });
    }
    return res.json({
      available: false,
      message: 'APK build in progress or not available.',
    });
  });

  // Vite middleware for development vs Static file serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StemFlow AI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
