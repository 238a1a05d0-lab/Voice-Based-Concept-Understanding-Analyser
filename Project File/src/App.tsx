/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ReferenceConcept, AudioFeatures, EvaluationSession, EvaluationResult } from "./types";
import ReferenceConceptSelector from "./components/ReferenceConceptSelector";
import AudioAnalyser from "./components/AudioAnalyser";
import EvaluationDashboard from "./components/EvaluationDashboard";
import { exportSessionToPdf } from "./components/ReportGenerator";
import { 
  BookOpen, 
  History, 
  Activity, 
  Award, 
  TrendingUp, 
  Sparkles, 
  Trash2, 
  CheckCircle,
  Clock,
  ArrowRight
} from "lucide-react";

export default function App() {
  const [concepts, setConcepts] = useState<ReferenceConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<ReferenceConcept | null>(null);
  const [activeView, setActiveView] = useState<"assess" | "history">("assess");
  
  // Pipeline states
  const [currentSession, setCurrentSession] = useState<EvaluationSession | null>(null);
  const [pastSessions, setPastSessions] = useState<EvaluationSession[]>([]);
  
  // Loading & error states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // 1. Fetch Preset Concepts on Mount
  useEffect(() => {
    async function fetchConcepts() {
      try {
        const res = await fetch("/api/concepts");
        if (res.ok) {
          const data = await res.json();
          setConcepts(data);
          // Set first concept as default
          if (data.length > 0) {
            setSelectedConcept(data[0]);
          }
        } else {
          console.error("Failed to fetch pre-seeded concepts");
        }
      } catch (err) {
        console.error("Error fetching concepts:", err);
      }
    }
    fetchConcepts();

    // Load past sessions from localStorage
    const saved = localStorage.getItem("vbcua_sessions");
    if (saved) {
      try {
        setPastSessions(JSON.parse(saved));
      } catch (err) {
        console.error("Error reading past sessions:", err);
      }
    }
  }, []);

  // Sync past sessions with local storage
  const saveSessions = (sessions: EvaluationSession[]) => {
    setPastSessions(sessions);
    localStorage.setItem("vbcua_sessions", JSON.stringify(sessions));
  };

  // Add custom concept (e.g. from educator custom creator)
  const handleAddCustomConcept = (newConcept: ReferenceConcept) => {
    setConcepts((prev) => [newConcept, ...prev]);
    setSelectedConcept(newConcept);
  };

  // 2. Perform Full-Stack Speech Evaluation Pipeline
  const handleAudioAnalyzed = async (base64Audio: string, mimeType: string, initialFeatures: AudioFeatures) => {
    if (!selectedConcept) {
      setPipelineError("Please select a reference concept first before starting transcription.");
      return;
    }

    setIsLoading(true);
    setPipelineError(null);
    setCurrentSession(null);

    try {
      // Step A: Speech-to-Text Transcription via Server Endpoint (Whisper-emulated on Gemini 3.5)
      setLoadingStep("1/3: Transcribing vocal delivery using Gemini Speech API...");
      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioData: base64Audio, mimeType }),
      });

      if (!transcribeRes.ok) {
        const errData = await transcribeRes.json();
        throw new Error(errData.error || "Speech transcription failed.");
      }

      const { transcript } = await transcribeRes.json();

      if (!transcript || transcript.trim().length === 0) {
        throw new Error("No intelligible speech detected in your recording. Please speak clearly closer to your microphone and try again.");
      }

      // Step B: Calculate client-side elocution & delivery stats using the transcription results
      setLoadingStep("2/3: Calculating verbal delivery pacing & speech metrics...");
      
      const words = transcript.split(/\s+/).filter((w: string) => w.length > 0);
      const totalWords = words.length;

      // Scan for standard filler words / vocal ticks
      const fillers = ["uh", "um", "ah", "like", "so", "you know", "basically", "actually", "literally", "totally", "right", "mean", "okay"];
      let fillerCount = 0;
      words.forEach((word: string) => {
        const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
        if (fillers.includes(cleaned)) {
          fillerCount++;
        }
      });

      // Words Per Minute: (Total words / (Duration in seconds / 60))
      const wpm = initialFeatures.duration > 0 
        ? Math.round(totalWords / (initialFeatures.duration / 60)) 
        : 0;

      const fillerWordRatio = totalWords > 0 ? fillerCount / totalWords : 0;

      const finalFeatures: AudioFeatures = {
        ...initialFeatures,
        speechRate: wpm,
        fillerWordCount: fillerCount,
        fillerWordRatio,
      };

      // Step C: Conceptual Evaluation & Semantic Similarity via Server Endpoint
      setLoadingStep("3/3: Evaluating semantic coverage & scientific alignment...");
      const evaluateRes = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, concept: selectedConcept }),
      });

      if (!evaluateRes.ok) {
        const errData = await evaluateRes.json();
        throw new Error(errData.error || "Semantic concept evaluation failed.");
      }

      const evaluationData: EvaluationResult = await evaluateRes.json();

      // Step D: Assemble and Save Complete Session
      const newSession: EvaluationSession = {
        id: `session-${Date.now()}`,
        timestamp: new Date().toISOString(),
        concept: selectedConcept,
        audioName: initialFeatures.duration > 5 ? "Microphone Recording" : "Uploaded Explanation File",
        audioFeatures: finalFeatures,
        evaluationResult: evaluationData,
      };

      // Update states
      const updatedSessions = [newSession, ...pastSessions];
      saveSessions(updatedSessions);
      setCurrentSession(newSession);

    } catch (err: any) {
      console.error("Evaluation pipeline crashed:", err);
      setPipelineError(err.message || "An unexpected error occurred during the assessment pipeline.");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  // Export session to PDF
  const handleExportPdf = () => {
    if (!currentSession) return;
    setIsExportingPdf(true);
    try {
      exportSessionToPdf(currentSession);
    } catch (err) {
      console.error("PDF Export failed:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Clear Session History
  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to permanently clear your full assessment history? This action is irreversible.")) {
      saveSessions([]);
    }
  };

  // Delete individual session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = pastSessions.filter((s) => s.id !== id);
    saveSessions(updated);
    if (currentSession?.id === id) {
      setCurrentSession(null);
    }
  };

  // Calculate Average History Metrics
  const getAverageScore = () => {
    if (pastSessions.length === 0) return 0;
    const sum = pastSessions.reduce((acc, s) => acc + s.evaluationResult.finalScore, 0);
    return Math.round(sum / pastSessions.length);
  };

  const getStrongRatio = () => {
    if (pastSessions.length === 0) return 0;
    const strongs = pastSessions.filter((s) => s.evaluationResult.classification === "Strong").length;
    return Math.round((strongs / pastSessions.length) * 100);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-gray-900 font-sans selection:bg-indigo-500/20 selection:text-indigo-900 antialiased">
      {/* Brand Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/10">
              <Activity className="h-5.5 w-5.5 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest leading-none block">Project VBCUA</span>
              <h1 className="text-base font-extrabold text-gray-900 tracking-tight leading-none mt-1">
                Voice Based Concept Understanding Analyser
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200">
            <button
              onClick={() => setActiveView("assess")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
                activeView === "assess"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Award className="h-4 w-4 text-indigo-600" />
              Assessment Engine
            </button>
            <button
              onClick={() => setActiveView("history")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
                activeView === "history"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <History className="h-4 w-4 text-indigo-600" />
              History & Progress
              {pastSessions.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                  {pastSessions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeView === "assess" ? (
          <div className="space-y-8">
            {/* Stage 1: Selector */}
            {!currentSession && !isLoading && (
              <ReferenceConceptSelector
                concepts={concepts}
                selectedConcept={selectedConcept}
                onSelectConcept={setSelectedConcept}
                onAddCustomConcept={handleAddCustomConcept}
              />
            )}

            {/* Stage 2: Audio Input Interface */}
            {!currentSession && (
              <AudioAnalyser
                onAudioAnalyzed={handleAudioAnalyzed}
                isLoading={isLoading}
                loadingStep={loadingStep}
              />
            )}

            {/* Error messaging inside pipeline */}
            {pipelineError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-sm text-rose-800 font-medium shadow-xs">
                <div className="h-6 w-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <span className="text-rose-700 font-bold">!</span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold">Evaluation Pipeline Failed</h4>
                  <p className="text-xs text-rose-600 leading-relaxed font-sans">{pipelineError}</p>
                </div>
              </div>
            )}

            {/* Stage 3: Dynamic Evaluation Dashboard Results */}
            {currentSession && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentSession(null)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
                  >
                    ← Analyze Another Explanation
                  </button>
                  <span className="text-xs text-gray-400 font-medium">
                    This evaluation was saved in your history logs.
                  </span>
                </div>

                <EvaluationDashboard
                  session={currentSession}
                  onExportPdf={handleExportPdf}
                  isExportingPdf={isExportingPdf}
                />
              </div>
            )}
          </div>
        ) : (
          /* History logs & Student Progress Tracking */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <History className="h-5.5 w-5.5 text-indigo-600" />
                  Concept Mastery Progress Logs
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Track your evaluation attempts, review grade trends, and monitor communication fluency metrics.
                </p>
              </div>

              {pastSessions.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-xs font-bold text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear History Logs
                </button>
              )}
            </div>

            {pastSessions.length > 0 ? (
              <div className="space-y-6">
                {/* Aggregate Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Average Grade</span>
                      <span className="text-xl font-black font-mono text-gray-900 leading-none mt-1">{getAverageScore()} / 100</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Strong Mastery Ratio</span>
                      <span className="text-xl font-black font-mono text-gray-900 leading-none mt-1">{getStrongRatio()}%</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Attempts</span>
                      <span className="text-xl font-black font-mono text-gray-900 leading-none mt-1">{pastSessions.length}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Speech Practice</span>
                      <span className="text-xl font-black font-mono text-gray-900 leading-none mt-1">
                        {Math.round(pastSessions.reduce((acc, s) => acc + s.audioFeatures.duration, 0))}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* List of past session cards */}
                <div className="space-y-4">
                  {pastSessions.map((sessionItem) => {
                    const rating = sessionItem.evaluationResult.classification;
                    const isStrongRating = rating === "Strong";
                    const isPoorRating = rating === "Poor";

                    return (
                      <div
                        key={sessionItem.id}
                        onClick={() => {
                          setCurrentSession(sessionItem);
                          setActiveView("assess");
                        }}
                        className="group bg-white rounded-2xl border border-gray-200 hover:border-indigo-600 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs transition-all hover:shadow-xs cursor-pointer"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                              {sessionItem.concept.category}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">
                              {new Date(sessionItem.timestamp).toLocaleDateString()} {new Date(sessionItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {sessionItem.concept.title}
                          </h3>
                          <p className="text-xs text-gray-500 font-sans line-clamp-1 max-w-xl">
                            "{sessionItem.evaluationResult.transcript}"
                          </p>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 pt-3 md:pt-0">
                          {/* Elocution Metrics Summary */}
                          <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono text-gray-400 font-semibold">
                            <div>SPEED: <span className="text-gray-700 font-bold">{sessionItem.audioFeatures.speechRate} WPM</span></div>
                            <div>PAUSES: <span className="text-gray-700 font-bold">{Math.round(sessionItem.audioFeatures.pauseRatio * 100)}%</span></div>
                            <div>FILLERS: <span className="text-gray-700 font-bold">{sessionItem.audioFeatures.fillerWordCount}</span></div>
                          </div>

                          {/* Session Score Badge */}
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-gray-400 uppercase leading-none">Grade</div>
                              <span className={`text-xs font-black uppercase mt-1 inline-block ${
                                isStrongRating ? "text-emerald-600" : isPoorRating ? "text-rose-600" : "text-amber-600"
                              }`}>
                                {rating}
                              </span>
                            </div>

                            <div className={`h-11 w-11 rounded-full border-2 flex items-center justify-center font-bold font-mono text-sm shadow-2xs ${
                              isStrongRating 
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200" 
                                : isPoorRating 
                                ? "text-rose-700 bg-rose-50 border-rose-200" 
                                : "text-amber-700 bg-amber-50 border-amber-200"
                            }`}>
                              {sessionItem.evaluationResult.finalScore}
                            </div>

                            <button
                              onClick={(e) => handleDeleteSession(sessionItem.id, e)}
                              className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                              title="Delete log record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center max-w-md mx-auto space-y-4 shadow-2xs my-8">
                <div className="h-12 w-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
                  <History className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">No Assessment Sessions Found</h3>
                  <p className="text-xs text-gray-500 leading-relaxed font-sans">
                    You have not recorded any concept verbalizations yet. Complete your first speech alignment check to populate your tracking history.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView("assess")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Start First Assessment Attempt
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Decorative footer */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-16">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
          <span>Voice Based Concept Understanding Analyser</span>
          <span>Designed with high-fidelity React, Express & Google Gemini AI</span>
        </div>
      </footer>
    </div>
  );
}
