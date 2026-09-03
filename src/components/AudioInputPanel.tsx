/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Upload,
  Mic,
  MicOff,
  Sparkles,
  FileAudio,
  AlertCircle,
  Radio,
  AudioWaveform,
  CheckCircle2,
  Cpu,
  Layers,
  Wand2,
  Zap,
} from 'lucide-react';
import { generateDemoAudioBuffer } from '../lib/demoSongGenerator';

interface AudioInputPanelProps {
  onCustomAudioUploaded: (file: File, buffer: AudioBuffer) => void;
  isProcessing: boolean;
  hasLoadedAudio?: boolean;
}

export const AudioInputPanel: React.FC<AudioInputPanelProps> = ({
  onCustomAudioUploaded,
  isProcessing,
  hasLoadedAudio = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordLevel, setRecordLevel] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLoadDemoTrack = async () => {
    try {
      setIsGeneratingDemo(true);
      setUploadError(null);
      const demoBuffer = await generateDemoAudioBuffer(12);
      const demoFile = new File(['demo-audio'], 'cosmic_funk_jam.wav', { type: 'audio/wav' });
      onCustomAudioUploaded(demoFile, demoBuffer);
    } catch (err: any) {
      console.error('Failed to generate demo track:', err);
      setUploadError('Failed to generate synthesized demo audio: ' + (err.message || String(err)));
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAudioFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAudioFile(e.target.files[0]);
    }
  };

  const processAudioFile = async (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|flac|m4a|aac|aiff)$/i)) {
      setUploadError('Please select a valid audio file (MP3, WAV, FLAC, M4A, OGG, AAC, AIFF).');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      onCustomAudioUploaded(file, decodedBuffer);
    } catch (err: any) {
      console.error('Error decoding audio file:', err);
      setUploadError('Failed to decode audio file. Please verify file integrity.');
    }
  };

  const startRecording = async () => {
    try {
      setUploadError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Audio monitor for level visualization
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setRecordLevel(avg / 128);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `live-recording-${Date.now()}.webm`, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        onCustomAudioUploaded(file, decodedBuffer);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      setUploadError('Microphone permission was denied or is unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  return (
    <div className="bg-[#15171C] rounded-lg border border-[#2D3139] p-4 shadow-xl select-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#2D3139]">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            Audio Ingestion & Signal Capture
          </h2>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Upload audio master stems or capture direct live instrument signal for DSP transcription
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-slate-400 bg-[#0A0B0E] px-2.5 py-1 rounded border border-[#2D3139]">
          <Cpu className="w-3 h-3 text-indigo-400" />
          <span>Real Web Audio DSP + Gemini 3.7</span>
        </div>
      </div>

      {uploadError && (
        <div className="mb-3 p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Primary Ingestion Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Main Audio File Drop Zone */}
        <div className="lg:col-span-8">
          <div
            id="audio-dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`min-h-[140px] border border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer transition relative group ${
              isDragging
                ? 'border-indigo-400 bg-indigo-950/30 ring-2 ring-indigo-500/50'
                : 'border-[#2D3139] hover:border-indigo-500/70 bg-[#0A0B0E] hover:bg-[#1A1D24]/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac,.aiff"
              className="hidden"
            />
            <div className="w-10 h-10 rounded-lg bg-[#1A1D24] border border-[#2D3139] flex items-center justify-center text-indigo-400 mb-2 group-hover:scale-105 transition">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-white">
              Drop audio file here, or <span className="text-indigo-400 underline underline-offset-2">browse filesystem</span>
            </p>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-1">
              Supports Lossless WAV, FLAC, AIFF, MP3, M4A, OGG (Full Sample Rate)
            </p>
          </div>
        </div>

        {/* Live Audio Capture & DSP Specs */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          {/* Microphone Recording Workstation */}
          <div className="bg-[#0A0B0E] p-3 rounded-lg border border-[#2D3139] flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  {isRecording ? `Recording (${recordSeconds}s)` : 'Direct Audio Capture'}
                </span>
              </div>

              {isRecording && (
                <span className="text-[10px] font-mono text-rose-400 font-bold animate-pulse">
                  LIVE PCM
                </span>
              )}
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
              Capture acoustic vocals, guitar, or live performance through your audio interface.
            </p>

            {isRecording && (
              <div className="mb-2 flex items-center gap-2">
                <div className="flex-1 h-2 bg-[#1A1D24] rounded-full overflow-hidden border border-[#2D3139]">
                  <div
                    className="h-full bg-rose-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, recordLevel * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-400 tabular-nums">
                  {Math.round(recordLevel * 100)}%
                </span>
              </div>
            )}

            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || isGeneratingDemo}
              className={`w-full py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-[#1A1D24] hover:bg-[#2D3139] text-slate-200 border border-[#2D3139]'
              } disabled:opacity-40`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Stop & Transcribe Audio</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Record Microphone Signal</span>
                </>
              )}
            </button>

            {/* Instant Demo Synthesized Audio Loader */}
            <div className="mt-2.5 pt-2 border-t border-[#2D3139]">
              <button
                type="button"
                onClick={handleLoadDemoTrack}
                disabled={isProcessing || isGeneratingDemo || isRecording}
                className="w-full py-2 px-3 rounded bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/50 hover:border-indigo-400 text-indigo-300 hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 disabled:opacity-40"
                title="Synthesize and separate a full 6-stem funk demo track (Vocals, Bass, Drums, Guitar, Piano, Other)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{isGeneratingDemo ? 'Synthesizing Audio...' : '⚡ Try Demo Track (6 Stems)'}</span>
              </button>
              <span className="text-[9px] font-mono text-slate-500 text-center block mt-1">
                Auto-separates & auto-downloads stems ZIP package
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
