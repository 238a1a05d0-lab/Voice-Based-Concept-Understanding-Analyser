/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ReferenceConcept {
  id: string;
  title: string;
  category: string;
  description: string;
  keywords: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

export interface AudioFeatures {
  duration: number; // in seconds
  averageRms: number; // 0 to 1
  pauseRatio: number; // 0 to 1
  speechRate: number; // words per minute
  fillerWordCount: number;
  fillerWordRatio: number; // filler words / total words
  rmsTimeline: number[]; // normalized list for waveform charts
}

export interface KeywordMatch {
  keyword: string;
  mentioned: boolean;
  context?: string;
}

export interface KeyPointAnalysis {
  point: string;
  covered: boolean;
  explanation: string;
}

export interface EvaluationResult {
  conceptId: string;
  conceptTitle: string;
  transcript: string;
  cosineSimilarity: number; // 0 to 1 from embeddings
  coverageScore: number; // 0 to 100
  accuracyScore: number; // 0 to 100
  generalFeedback: string;
  misconceptions: string[];
  keywordAnalysis: KeywordMatch[];
  keyPointsAnalysis: KeyPointAnalysis[];
  suggestions: string[];
  finalScore: number; // 0 to 100 composite
  classification: "Strong" | "Moderate" | "Poor";
}

export interface EvaluationSession {
  id: string;
  timestamp: string;
  concept: ReferenceConcept;
  audioName: string;
  audioFeatures: AudioFeatures;
  evaluationResult: EvaluationResult;
}
