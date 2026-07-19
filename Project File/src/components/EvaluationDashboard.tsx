/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { EvaluationSession, KeywordMatch } from "../types";
import { 
  Award, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  BookOpen, 
  Activity,
  FileText,
  Loader2
} from "lucide-react";

interface EvaluationDashboardProps {
  session: EvaluationSession;
  onExportPdf: () => void;
  isExportingPdf: boolean;
}

export default function EvaluationDashboard({ session, onExportPdf, isExportingPdf }: EvaluationDashboardProps) {
  const { concept, audioFeatures, evaluationResult } = session;

  // Classifications and color map
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200 ring-emerald-500/20";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200 ring-amber-500/20";
    return "text-rose-600 bg-rose-50 border-rose-200 ring-rose-500/20";
  };

  const getScoreProgressColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  // Delivery feature descriptors
  const getSpeechRateDescriptor = (wpm: number) => {
    if (wpm === 0) return { label: "N/A", color: "text-gray-500 bg-gray-50" };
    if (wpm < 85) return { label: "Too Slow (<85 WPM)", color: "text-amber-700 bg-amber-50" };
    if (wpm < 110) return { label: "Deliberate (85-110 WPM)", color: "text-indigo-700 bg-indigo-50" };
    if (wpm <= 150) return { label: "Optimal (110-150 WPM)", color: "text-emerald-700 bg-emerald-50" };
    if (wpm <= 180) return { label: "Fast (150-180 WPM)", color: "text-amber-700 bg-amber-50" };
    return { label: "Too Rapid (>180 WPM)", color: "text-rose-700 bg-rose-50" };
  };

  const getPauseRatioDescriptor = (ratio: number) => {
    const percentage = Math.round(ratio * 100);
    if (ratio < 0.10) return { label: "Dense / Rushed (<10%)", color: "text-amber-700 bg-amber-50" };
    if (ratio <= 0.25) return { label: "Optimal Pacing (10-25%)", color: "text-emerald-700 bg-emerald-50" };
    if (ratio <= 0.35) return { label: "Slight Hesitations (25-35%)", color: "text-amber-700 bg-amber-50" };
    return { label: "Heavy Pausing (>35%)", color: "text-rose-700 bg-rose-50" };
  };

  const getFillerWordDescriptor = (ratio: number) => {
    const percentage = Math.round(ratio * 100);
    if (ratio < 0.02) return { label: "Fluent & Precise (<2%)", color: "text-emerald-700 bg-emerald-50" };
    if (ratio <= 0.05) return { label: "Moderate (2-5%)", color: "text-indigo-700 bg-indigo-50" };
    return { label: "High Reliance (>5%)", color: "text-rose-700 bg-rose-50" };
  };

  // Helper to highlight filler words in the transcript
  const renderHighlightedTranscript = (text: string) => {
    if (!text) return <p className="text-sm text-gray-400 italic">No transcript available.</p>;

    const fillers = ["uh", "um", "ah", "like", "so", "you know", "basically", "actually", "literally", "totally", "right", "mean", "okay"];
    const regex = new RegExp(`\\b(${fillers.join("|")})\\b`, "gi");
    
    const parts = text.split(regex);
    return (
      <p className="text-sm text-gray-700 leading-relaxed font-sans">
        {parts.map((part, index) => {
          const isFiller = fillers.includes(part.toLowerCase());
          return isFiller ? (
            <span 
              key={index} 
              className="px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-800 font-semibold font-mono text-xs border border-rose-200/50"
              title="Filler word detected"
            >
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          );
        })}
      </p>
    );
  };

  return (
    <div className="space-y-6" id="evaluation-report-view">
      {/* Executive Header Card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {concept.category}
            </span>
            <span className="text-xs font-mono text-gray-400">
              Analyzed {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            {concept.title} Assessment
          </h1>
          <p className="text-sm text-gray-500 max-w-xl">
            A comprehensive semantic, conceptual, and speech alignment analysis of your spoken explanation.
          </p>
        </div>

        {/* Master Score Dial */}
        <div className="flex items-center gap-5 shrink-0">
          <div className="text-right">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Composite Score</div>
            <div className="text-sm font-bold text-gray-900 mt-1">
              Understanding: <span className={evaluationResult.classification === "Strong" ? "text-emerald-600" : evaluationResult.classification === "Moderate" ? "text-amber-600" : "text-rose-600"}>
                {evaluationResult.classification}
              </span>
            </div>
          </div>
          <div className={`h-20 w-20 rounded-full border-4 flex flex-col items-center justify-center shadow-xs ring-4 ${getScoreColor(evaluationResult.finalScore)}`}>
            <span className="text-2xl font-black font-mono leading-none">{evaluationResult.finalScore}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">/ 100</span>
          </div>
        </div>
      </div>

      {/* Primary Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Scores and Delivery */}
        <div className="lg:col-span-2 space-y-6">
          {/* Conceptual Alignment Scores Card */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
              <Award className="h-4.5 w-4.5 text-indigo-600" />
              Conceptual Understanding Scores
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Coverage Progress */}
              <div className="bg-gray-50 rounded-2xl p-4.5 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Explanation Coverage</span>
                  <span className="text-base font-bold font-mono text-gray-900">{evaluationResult.coverageScore}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${evaluationResult.coverageScore}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Measures how thoroughly you described the key points in the curriculum.
                </p>
              </div>

              {/* Accuracy Progress */}
              <div className="bg-gray-50 rounded-2xl p-4.5 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Scientific Accuracy</span>
                  <span className="text-base font-bold font-mono text-gray-900">{evaluationResult.accuracyScore}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${getScoreProgressColor(evaluationResult.accuracyScore)}`} style={{ width: `${evaluationResult.accuracyScore}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Assesses factual precision. Reduced scores represent stated misconceptions.
                </p>
              </div>

              {/* Semantic Similarity */}
              <div className="bg-gray-50 rounded-2xl p-4.5 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Embedding Cosine Sim</span>
                  <span className="text-base font-bold font-mono text-gray-900">{Math.round(evaluationResult.cosineSimilarity * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-violet-600 h-full rounded-full" style={{ width: `${evaluationResult.cosineSimilarity * 100}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Mathematical alignment using state-of-the-art vector embeddings.
                </p>
              </div>
            </div>
          </div>

          {/* Audio Waveform and Delivery Analysis */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-indigo-600" />
                Delivery & Waveform Profiler
              </h3>
              <span className="text-xs font-mono font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                Duration: {audioFeatures.duration.toFixed(1)}s
              </span>
            </div>

            {/* Custom SVG Waveform Render from raw RMS timeline */}
            <div className="bg-gray-900 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[9px] font-bold font-mono text-gray-400 uppercase tracking-wider bg-gray-800/80 px-2 py-0.5 rounded backdrop-blur-xs z-10">
                <Activity className="h-3 w-3 text-indigo-400" />
                Volume Profile (RMS Energy over speech timeline)
              </div>

              <div className="h-28 w-full flex items-end gap-[2px] pt-6 relative">
                {audioFeatures.rmsTimeline.map((rms, idx) => {
                  const barHeight = Math.max(rms * 100, 3); // minimum 3% for styling
                  const isSilent = rms < 0.08; // silent pause
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-full transition-all duration-300"
                      style={{
                        height: `${barHeight}%`,
                        backgroundColor: isSilent 
                          ? "rgba(156, 163, 175, 0.15)" // mute grey for silent chunks
                          : "rgba(129, 140, 248, 0.85)", // rich indigo for active speech
                      }}
                      title={isSilent ? "Detected speech pause" : "Active verbal energy"}
                    />
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-end gap-4 mt-3 text-[10px] font-medium text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" />
                  <span>Active Vocal Explanation</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-gray-700" />
                  <span>Silent Pause / Breath</span>
                </div>
              </div>
            </div>

            {/* Delivery Speech Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Speech Rate */}
              <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <Clock className="h-4 w-4 text-gray-400" />
                  Speech Delivery Rate
                </div>
                <div className="text-xl font-bold font-mono text-gray-900">
                  {audioFeatures.speechRate} <span className="text-xs text-gray-400 font-normal">WPM</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${getSpeechRateDescriptor(audioFeatures.speechRate).color}`}>
                  {getSpeechRateDescriptor(audioFeatures.speechRate).label}
                </span>
              </div>

              {/* Pause Ratio */}
              <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <Activity className="h-4 w-4 text-gray-400" />
                  Speech Pause Ratio
                </div>
                <div className="text-xl font-bold font-mono text-gray-900">
                  {Math.round(audioFeatures.pauseRatio * 100)}%
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${getPauseRatioDescriptor(audioFeatures.pauseRatio).color}`}>
                  {getPauseRatioDescriptor(audioFeatures.pauseRatio).label}
                </span>
              </div>

              {/* Filler Word Ratio */}
              <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <FileText className="h-4 w-4 text-gray-400" />
                  Filler Word Ratio
                </div>
                <div className="text-xl font-bold font-mono text-gray-900">
                  {audioFeatures.fillerWordCount} <span className="text-xs text-gray-400 font-normal">({Math.round(audioFeatures.fillerWordRatio * 100)}%)</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${getFillerWordDescriptor(audioFeatures.fillerWordRatio).color}`}>
                  {getFillerWordDescriptor(audioFeatures.fillerWordRatio).label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Qualitative Feedback, Misconceptions, Actions */}
        <div className="space-y-6">
          {/* General Feedback */}
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Evaluator Overview
            </h3>
            <p className="text-sm text-indigo-50/90 leading-relaxed font-sans">
              "{evaluationResult.generalFeedback}"
            </p>
            <div className="pt-3 border-t border-indigo-800/60 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider">Concept Difficulty</span>
              <span className="text-[10px] font-bold bg-indigo-800/80 border border-indigo-700 text-indigo-100 px-2 py-0.5 rounded">
                {concept.difficulty}
              </span>
            </div>
          </div>

          {/* Misconceptions Card (conditional) */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
              Factual Misconceptions
            </h3>
            {evaluationResult.misconceptions && evaluationResult.misconceptions.length > 0 ? (
              <div className="space-y-3">
                {evaluationResult.misconceptions.map((mis, idx) => (
                  <div key={idx} className="flex gap-2.5 p-3 rounded-xl bg-red-50 text-red-800 border border-red-100 text-xs font-medium leading-relaxed">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{mis}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-medium">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                No scientific or factual misconceptions detected. Excellent precision!
              </div>
            )}
          </div>

          {/* Study Suggestions */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
              <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
              Actionable Review Suggestions
            </h3>
            <div className="space-y-3">
              {evaluationResult.suggestions.map((sug, idx) => (
                <div key={idx} className="flex gap-2.5 text-xs text-gray-700 leading-relaxed font-medium">
                  <ArrowRight className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>{sug}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Speech Transcript Display */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
          <FileText className="h-4.5 w-4.5 text-indigo-600" />
          Transcribed Speech Verbatim
        </h3>
        <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
          {renderHighlightedTranscript(evaluationResult.transcript)}
        </div>
        <div className="text-[10px] text-gray-400 flex items-center gap-1.5 font-medium pl-1">
          <span className="inline-block h-2 w-5 rounded-sm bg-rose-100 border border-rose-200" />
          <span>Pink badges identify verbal ticks / fillers to target for reduced hesitation.</span>
        </div>
      </div>

      {/* Comprehensive Academic Alignment Matrices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Syllabus Points Coverage */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
            <BookOpen className="h-4.5 w-4.5 text-indigo-600" />
            Core Syllabus Concepts Matrix
          </h3>
          <div className="space-y-3.5">
            {evaluationResult.keyPointsAnalysis.map((kp, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-2xl border transition-all ${
                  kp.covered 
                    ? "bg-emerald-50/20 border-emerald-100 hover:border-emerald-200" 
                    : "bg-gray-50/50 border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {kp.covered ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-900 leading-tight">
                      {kp.point}
                    </h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-sans">
                      {kp.explanation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keyword Reference Matrix */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
            <TrendingUp className="h-4.5 w-4.5 text-indigo-600" />
            Target Keywords Coverage
          </h3>
          <div className="overflow-hidden border border-gray-100 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3 text-[10px]">Keyword</th>
                  <th className="px-4 py-3 text-[10px]">Status</th>
                  <th className="px-4 py-3 text-[10px]">Context Analysis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {evaluationResult.keywordAnalysis.map((kw, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-gray-800">{kw.keyword}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        kw.mentioned 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-gray-50 text-gray-400 border-gray-100"
                      }`}>
                        {kw.mentioned ? "Mentioned" : "Omitted"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[180px] leading-relaxed">
                      {kw.context || "No context analysis generated."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action / Export Banner */}
      <div className="bg-gray-50 rounded-3xl border border-gray-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h3 className="text-sm font-semibold text-gray-900">Download Professional PDF Report</h3>
          <p className="text-xs text-gray-500 mt-1">Export this academic analysis with visual wave charts, score sheets, and feedback.</p>
        </div>
        <button
          onClick={onExportPdf}
          disabled={isExportingPdf}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
        >
          {isExportingPdf ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Download Report PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
