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
  Music,
  Disc,
  Play,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Radio,
} from 'lucide-react';
import { DEMO_SONGS, DemoSongDefinition } from '../lib/demoData';

interface AudioInputPanelProps {
  onSelectDemoSong: (demoSong: DemoSongDefinition) => void;
  onCustomAudioUploaded: (file: File, buffer: AudioBuffer) => void;
  isProcessing: boolean;
  activeDemoId: string | null;
}

export const AudioInputPanel: React.FC<AudioInputPanelProps> = ({
  onSelectDemoSong,
  onCustomAudioUploaded,
  isProcessing,
  activeDemoId,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordLevel, setRecordLevel] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i)) {
      setUploadError('Please select a valid audio file (MP3, WAV, FLAC, M4A, OGG).');
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
      setUploadError('Failed to decode audio. Please ensure the file is not corrupted.');
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
        const file = new File([audioBlob], `mic-recording-${Date.now()}.webm`, { type: 'audio/webm' });
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
      setUploadError('Microphone access permission was denied or is unavailable.');
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
            Input Source Selection
          </h2>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Select a multitrack reference song, upload raw master, or capture live audio
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-slate-400 bg-[#0A0B0E] px-2.5 py-1 rounded border border-[#2D3139]">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Ensemble + Gemini 3.7</span>
        </div>
      </div>

      {uploadError && (
        <div className="mb-3 p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Grid: Demo Tracks & Custom Upload/Record */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Curated Demo Songs */}
        <div className="lg:col-span-7 space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
            Reference Multitrack Songs
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DEMO_SONGS.map((demo) => {
              const isActive = activeDemoId === demo.id;
              return (
                <button
                  key={demo.id}
                  onClick={() => onSelectDemoSong(demo)}
                  disabled={isProcessing}
                  className={`p-3 rounded-lg text-left border transition-all relative overflow-hidden group ${
                    isActive
                      ? 'bg-[#1A1D24] border-indigo-500/70 shadow-md shadow-indigo-500/10'
                      : 'bg-[#0A0B0E] border-[#2D3139] hover:border-slate-600 hover:bg-[#1A1D24]/60'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-mono uppercase font-bold text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-500/40">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Loaded
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold text-xs">
                      <Disc className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition truncate">
                        {demo.metadata.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{demo.metadata.artist}</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                    {demo.description}
                  </p>

                  <div className="flex items-center justify-between text-[9px] font-mono uppercase text-slate-500 pt-1.5 border-t border-[#2D3139]">
                    <span className="text-indigo-400 font-semibold">{demo.genre}</span>
                    <span className="text-slate-300 tabular-nums">{demo.metadata.bpm} BPM • {demo.metadata.key}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload & Microphone Recording */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
            Custom Master / Live Capture
          </span>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 border border-dashed rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer transition ${
              isDragging
                ? 'border-indigo-400 bg-indigo-950/20'
                : 'border-[#2D3139] hover:border-slate-600 bg-[#0A0B0E]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg"
              className="hidden"
            />
            <div className="w-7 h-7 rounded bg-[#1A1D24] border border-[#2D3139] flex items-center justify-center text-indigo-400 mb-1.5">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-bold text-white">
              Drop song file, or <span className="text-indigo-400 underline underline-offset-2">browse</span>
            </p>
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">
              MP3, WAV, FLAC, M4A, OGG
            </p>
          </div>

          {/* Microphone Recording Button */}
          <div className="bg-[#1A1D24] p-2.5 rounded-lg border border-[#2D3139] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-7 h-7 rounded flex items-center justify-center transition shadow-md ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse shadow-rose-500/30'
                    : 'bg-[#0A0B0E] text-slate-300 hover:bg-slate-800 hover:text-white border border-[#2D3139]'
                } disabled:opacity-40`}
                title={isRecording ? 'Stop Recording' : 'Record from Mic'}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <div>
                <span className="text-xs font-bold text-white block">
                  {isRecording ? `Recording... (${recordSeconds}s)` : 'Direct Audio Capture'}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block">
                  {isRecording ? 'Capturing live audio signal' : 'Microphone input to stem pipeline'}
                </span>
              </div>
            </div>

            {isRecording && (
              <div className="flex items-center gap-1.5">
                <div className="w-14 h-1.5 bg-[#0A0B0E] rounded-full overflow-hidden border border-[#2D3139]">
                  <div
                    className="h-full bg-rose-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, recordLevel * 100)}%` }}
                  />
                </div>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
