/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Upload, Loader2, Play, Pause, AlertTriangle } from "lucide-react";
import { AudioFeatures } from "../types";

interface AudioAnalyserProps {
  onAudioAnalyzed: (base64Audio: string, mimeType: string, features: AudioFeatures) => void;
  isLoading: boolean;
  loadingStep: string;
}

export default function AudioAnalyser({ onAudioAnalyzed, isLoading, loadingStep }: AudioAnalyserProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [playbackState, setPlaybackState] = useState<"idle" | "playing" | "paused">("idle");
  const [error, setError] = useState<string | null>(null);

  // Audio elements & states
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioName, setAudioName] = useState<string>("");

  // Refs for recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  
  // Audio playback elements
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Live Oscilloscope Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Clean up timers & animation frames on unmount
  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) window.clearInterval(recordIntervalRef.current);
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Update recording timer
  useEffect(() => {
    if (isRecording) {
      recordIntervalRef.current = window.setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordIntervalRef.current) {
        window.clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  // Format record timer (MM:SS)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  // Set up live voice visualizer
  const startLiveVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        animationFrameRef.current = window.requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2;
          
          // Create smooth indigo-to-purple gradient bars
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
          gradient.addColorStop(0, "rgba(99, 102, 241, 0.2)");
          gradient.addColorStop(1, "rgba(139, 92, 246, 0.8)");
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

          x += barWidth;
        }
      };

      draw();
    } catch (e) {
      console.warn("Could not start visualizer:", e);
    }
  };

  // Start Voice Recording
  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setRecordTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Try different audio format support
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/wav")) {
        mimeType = "audio/wav";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlobObj = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(audioBlobObj);
        setAudioName(`Voice Recording - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        
        const url = URL.createObjectURL(audioBlobObj);
        setAudioUrl(url);

        // Process audio features & upload
        await processAudioAndNotify(audioBlobObj, `recording-${Date.now()}.webm`, mimeType);
      };

      mediaRecorder.start(250); // Get chunks every 250ms
      setIsRecording(true);
      startLiveVisualizer(stream);
    } catch (err: any) {
      console.error("Microphone access failed:", err);
      setError("Unable to access your microphone. Please check your browser permissions.");
    }
  };

  // Stop Voice Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop mic tracks
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }

      // Stop canvas animation
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  };

  // Handle Drag-and-Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleSelectedFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleSelectedFile(file);
    }
  };

  const handleSelectedFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("audio/")) {
      setError("Invalid file type. Please upload a standard audio file (WAV, MP3, WEBM, M4A).");
      return;
    }

    setAudioName(file.name);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    await processAudioAndNotify(file, file.name, file.type);
  };

  // Digital Signal Processing of Audio for Feature Extraction
  const processAudioAndNotify = async (blob: Blob, name: string, mimeType: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const duration = audioBuffer.duration;
      const channelData = audioBuffer.getChannelData(0); // Left channel

      // Extract RMS timeline (approx. 100 timeline samples for plotting)
      const sampleRate = audioBuffer.sampleRate;
      const totalSamples = channelData.length;
      
      const timelinePoints = 120;
      const samplesPerSegment = Math.floor(totalSamples / timelinePoints);
      const rmsTimeline: number[] = [];
      let totalRmsSum = 0;
      let silentFrames = 0;

      for (let i = 0; i < timelinePoints; i++) {
        const start = i * samplesPerSegment;
        const end = Math.min(start + samplesPerSegment, totalSamples);
        
        let sumSquared = 0;
        for (let j = start; j < end; j++) {
          sumSquared += channelData[j] * channelData[j];
        }
        
        const meanSquared = sumSquared / (end - start || 1);
        const rms = Math.sqrt(meanSquared);
        rmsTimeline.push(rms);
        totalRmsSum += rms;
      }

      // Calculate peak RMS to normalize timeline & determine silences
      const maxRms = Math.max(...rmsTimeline, 0.001);
      const normalizedTimeline = rmsTimeline.map((rms) => rms / maxRms);

      // A frame is silent if its normalized RMS is below 0.08 (8% of peak speech energy)
      normalizedTimeline.forEach((rmsNorm) => {
        if (rmsNorm < 0.08) {
          silentFrames++;
        }
      });

      const averageRms = totalRmsSum / timelinePoints;
      const pauseRatio = silentFrames / timelinePoints;

      // Temporary/Pre-evaluation features. SpeechRate and FillerWord are updated post-transcription
      const initialFeatures: AudioFeatures = {
        duration,
        averageRms,
        pauseRatio,
        speechRate: 0,
        fillerWordCount: 0,
        fillerWordRatio: 0,
        rmsTimeline: normalizedTimeline,
      };

      // Convert audio blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(",")[1];
        onAudioAnalyzed(base64Data, mimeType, initialFeatures);
      };
      
      audioCtx.close();
    } catch (err: any) {
      console.error("Audio feature extraction failed:", err);
      setError("Failed to decode and extract features from this audio format. Standard WAV or MP3 is recommended.");
    }
  };

  // Audio Playback Controls
  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    const player = audioPlayerRef.current;

    if (playbackState === "playing") {
      player.pause();
      setPlaybackState("paused");
    } else {
      player.play();
      setPlaybackState("playing");
    }
  };

  const handlePlaybackEnded = () => {
    setPlaybackState("idle");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
          <Mic className="h-5 w-5 text-indigo-600" />
          2. Upload or Record Explanation
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Record your explanation directly or upload a recorded WAV/MP3. Speak clearly for 15s to 2 mins.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-indigo-50/20 rounded-2xl border border-indigo-100 p-8 flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-900">Processing Explanation</h3>
            <p className="text-xs text-indigo-600 font-medium px-3.5 py-1 bg-indigo-100/50 rounded-full inline-block mt-1">
              {loadingStep}
            </p>
          </div>
          <div className="w-full max-w-xs bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{
                width: 
                  loadingStep.includes("1") ? "33%" : 
                  loadingStep.includes("2") ? "66%" : "95%"
              }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Real-time Voice Recording */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between space-y-4 shadow-xs min-h-[220px]">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Voice Recording</h3>
              <p className="text-xs text-gray-500 mt-1">Explain the selected concept verbally using your microphone.</p>
            </div>

            {isRecording ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-2">
                <canvas 
                  ref={canvasRef} 
                  width={220} 
                  height={50} 
                  className="rounded-lg bg-gray-50/50 w-full"
                />
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                  <span className="text-sm font-mono font-semibold text-gray-800">{formatTime(recordTime)}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-4">
                {audioUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full max-w-[200px] truncate">
                      {audioName}
                    </span>
                    <audio 
                      ref={audioPlayerRef} 
                      src={audioUrl} 
                      onEnded={handlePlaybackEnded} 
                      className="hidden" 
                    />
                    <button
                      onClick={togglePlayback}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
                    >
                      {playbackState === "playing" ? (
                        <>
                          <Pause className="h-3.5 w-3.5" /> Pause playback
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" /> Listen to recording
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Mic className="h-5 w-5" />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                isRecording
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4 fill-white" /> Stop & Evaluate
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" /> {audioUrl ? "Record New Attempt" : "Start Recording"}
                </>
              )}
            </button>
          </div>

          {/* File Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-6 flex flex-col justify-between min-h-[220px] transition-all relative ${
              dragActive
                ? "border-indigo-600 bg-indigo-50/20"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Audio Upload</h3>
              <p className="text-xs text-gray-500 mt-1">Select or drag an audio file containing your verbal delivery.</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <div className="text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto text-gray-400 group-hover:text-gray-500">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-xs text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-semibold text-indigo-600 hover:text-indigo-500 focus-within:outline-hidden">
                    <span>Upload an audio file</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="audio/*"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1">WAV, MP3, M4A, WEBM up to 10MB</p>
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] text-gray-400 mt-2">
              Supports standard recordings from your phone or device.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
