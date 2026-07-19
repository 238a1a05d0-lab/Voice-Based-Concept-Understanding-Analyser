/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from "jspdf";
import { EvaluationSession } from "../types";

export function exportSessionToPdf(session: EvaluationSession) {
  const { concept, audioFeatures, evaluationResult } = session;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  let y = 18;

  // Helper to draw horizontal line
  const drawSeparator = (currentY: number) => {
    doc.setDrawColor(229, 231, 235); // border-gray-200
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, margin + contentWidth, currentY);
  };

  // Helper for Section Titles
  const drawSectionHeader = (title: string, currentY: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(title.toUpperCase(), margin, currentY);
    return currentY + 6;
  };

  // HELPER TO WRAP AND DRAW MULTILINE TEXT SENSEFULLY
  const drawParagraph = (text: string, currentY: number, fontSize = 9.5, lineHeight = 5.5, maxW = contentWidth): number => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(55, 65, 81); // gray-700
    const lines = doc.splitTextToSize(text, maxW);
    lines.forEach((line: string) => {
      doc.text(line, margin, currentY);
      currentY += lineHeight;
    });
    return currentY;
  };

  // --- BRAND HEADER ---
  doc.setFillColor(79, 70, 229); // Primary Indigo Brand Banner
  doc.rect(0, 0, pageWidth, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("VOICE-BASED CONCEPT UNDERSTANDING ANALYSER (VBCUA) - ACADEMIC REPORT", margin, 7.5);

  // --- TOP METADATA CARD ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39); // gray-900
  doc.text(concept.title, margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text(`Subject Category: ${concept.category}  |  Concept Level: ${concept.difficulty}`, margin, y);
  
  const timestampStr = new Date(session.timestamp).toLocaleString();
  doc.text(`Evaluation Date: ${timestampStr}`, margin + 105, y);
  y += 7;

  drawSeparator(y);
  y += 8;

  // --- SCORE BLOCK (GRID PANEL) ---
  // Background Box for Scores
  doc.setFillColor(249, 250, 251); // gray-50
  doc.setDrawColor(243, 244, 246); // gray-100
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, "FD");

  // Composite Score Dial
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229); // Indigo
  doc.text("COMPOSITE GRADE", margin + 6, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  const isStrong = evaluationResult.finalScore >= 80;
  const isPoor = evaluationResult.finalScore < 50;
  if (isStrong) doc.setTextColor(16, 185, 129); // Emerald
  else if (isPoor) doc.setTextColor(239, 68, 68); // Rose
  else doc.setTextColor(245, 158, 11); // Amber
  
  doc.text(`${evaluationResult.finalScore}`, margin + 6, y + 18);
  doc.setFontSize(12);
  doc.text("/ 100", margin + 25, y + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`[ ${evaluationResult.classification} ]`, margin + 6, y + 22);

  // Divider inside score block
  doc.setDrawColor(229, 231, 235);
  doc.line(margin + 50, y + 3, margin + 50, y + 21);

  // Core metrics sub-grid
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("SUB-METRICS COMPONENT", margin + 56, y + 6);
  doc.text("RATING", margin + 115, y + 6);
  doc.text("BENCHMARK", margin + 145, y + 6);

  // Metric lines
  doc.setFont("helvetica", "normal");
  doc.text("Explanation Coverage:", margin + 56, y + 11);
  doc.text("Scientific Accuracy:", margin + 56, y + 16);
  doc.text("Semantic Embedding Similarity:", margin + 56, y + 21);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(`${evaluationResult.coverageScore}%`, margin + 115, y + 11);
  doc.text(`${evaluationResult.accuracyScore}%`, margin + 115, y + 16);
  doc.text(`${Math.round(evaluationResult.cosineSimilarity * 100)}%`, margin + 115, y + 21);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(156, 163, 175);
  doc.text("> 80% target", margin + 145, y + 11);
  doc.text("> 85% target", margin + 145, y + 16);
  doc.text("> 75% target", margin + 145, y + 21);

  y += 32;

  // --- VERBAL DELIVERY STATS PANEL ---
  y = drawSectionHeader("Verbal Delivery & Elocution Profile", y);

  // Stat boxes
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(243, 244, 246);
  doc.roundedRect(margin, y, 56, 16, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text("SPEECH DELIVERY SPEED", margin + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text(`${audioFeatures.speechRate} WPM`, margin + 4, y + 12);

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin + 62, y, 56, 16, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text("SPEECH PAUSE RATIO", margin + 62 + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text(`${Math.round(audioFeatures.pauseRatio * 100)}%`, margin + 62 + 4, y + 12);

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin + 124, y, 56, 16, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text("FILLER WORDS COUNT", margin + 124 + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text(`${audioFeatures.fillerWordCount} (${Math.round(audioFeatures.fillerWordRatio * 100)}%)`, margin + 124 + 4, y + 12);

  y += 24;

  // --- AI FEEDBACK CARD ---
  y = drawSectionHeader("AI Assessor Qualitative Summary", y);
  
  doc.setFillColor(245, 247, 250); // warm gray / cool blue blend
  doc.setDrawColor(229, 231, 235);
  
  // Calculate paragraph heights to draw dynamic box
  const feedbackText = `"${evaluationResult.generalFeedback}"`;
  const wrappedLines = doc.splitTextToSize(feedbackText, contentWidth - 10);
  const boxHeight = wrappedLines.length * 5 + 8;

  doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "FD");
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  
  wrappedLines.forEach((line: string, i: number) => {
    doc.text(line, margin + 5, y + 6 + (i * 5));
  });

  y += boxHeight + 8;

  // --- SYLLABUS POINTS ACCURACY MATRIX ---
  y = drawSectionHeader("Core Syllabus Concept Matrix", y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text("ACADEMIC KEY CONCEPT SUB-POINT", margin, y);
  doc.text("STATUS", margin + 125, y);
  doc.text("EXAMINATION FEEDBACK", margin + 145, y);
  y += 3.5;

  doc.setDrawColor(243, 244, 246);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  evaluationResult.keyPointsAnalysis.forEach((kp) => {
    // Check if we need to add a new page (prevent page overflow!)
    if (y > pageHeight - 22) {
      doc.addPage();
      y = 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(79, 70, 229);
      doc.text("Core Syllabus Concept Matrix (continued)", margin, y);
      y += 6;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    
    // Draw syllabus point (wrapped if too long)
    const syllabusPointLines = doc.splitTextToSize(kp.point, 115);
    const lineCount = syllabusPointLines.length;
    syllabusPointLines.forEach((line: string, idx: number) => {
      doc.text(line, margin, y + (idx * 4.5));
    });

    if (kp.covered) {
      doc.setTextColor(16, 185, 129);
      doc.text("[ COVERED ]", margin + 125, y);
    } else {
      doc.setTextColor(156, 163, 175);
      doc.text("[ OMITTED ]", margin + 125, y);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);

    const explanationLines = doc.splitTextToSize(kp.explanation, 50);
    explanationLines.forEach((line: string, idx: number) => {
      doc.text(line, margin + 145, y + (idx * 4));
    });

    const maxDelta = Math.max(lineCount * 4.5, explanationLines.length * 4, 8);
    y += maxDelta + 4;
  });

  y += 3;

  // --- TARGET KEYWORD ANALYSIS ---
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 20;
  }

  y = drawSectionHeader("Keyword Reference Analysis", y);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text("KEYWORD", margin, y);
  doc.text("MENTIONED", margin + 50, y);
  doc.text("EXPLANATION CONTEXT", margin + 80, y);
  y += 3;
  
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  evaluationResult.keywordAnalysis.forEach((kw) => {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(kw.keyword, margin, y);

    if (kw.mentioned) {
      doc.setTextColor(16, 185, 129);
      doc.text("YES", margin + 50, y);
    } else {
      doc.setTextColor(156, 163, 175);
      doc.text("NO", margin + 50, y);
    }

    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    const contextLines = doc.splitTextToSize(kw.context || "N/A", contentWidth - 85);
    contextLines.forEach((line: string, i: number) => {
      doc.text(line, margin + 80, y + (i * 4));
    });

    y += Math.max(contextLines.length * 4, 5) + 3;
  });

  y += 4;

  // --- MISCONCEPTIONS AND STUDY RECOMMENDATIONS ---
  if (y > pageHeight - 50) {
    doc.addPage();
    y = 20;
  }

  // Draw Misconceptions if any
  if (evaluationResult.misconceptions && evaluationResult.misconceptions.length > 0) {
    y = drawSectionHeader("Detected Academic Misconceptions", y);
    
    evaluationResult.misconceptions.forEach((mis) => {
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(254, 242, 242); // red-50
      doc.setDrawColor(252, 165, 165); // red-300
      
      const wrappedMisText = `CRITICAL CORRECTION: ${mis}`;
      const lines = doc.splitTextToSize(wrappedMisText, contentWidth - 8);
      const cellHeight = lines.length * 4.5 + 5;

      doc.roundedRect(margin, y, contentWidth, cellHeight, 1.5, 1.5, "FD");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38); // red-600
      
      lines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 4, y + 4.5 + (idx * 4.5));
      });

      y += cellHeight + 3;
    });
    y += 4;
  }

  // Study Suggestions
  if (y > pageHeight - 45) {
    doc.addPage();
    y = 20;
  }

  y = drawSectionHeader("Actionable Study Recommendations", y);
  evaluationResult.suggestions.forEach((sug, idx) => {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(`Step ${idx + 1}:`, margin, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(sug, contentWidth - 18);
    lines.forEach((line: string, i: number) => {
      doc.text(line, margin + 15, y + (i * 4.2));
    });

    y += (lines.length * 4.2) + 4;
  });

  // --- FOOTER PAGINATION & WATERMARK ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    
    doc.text(
      `Page ${i} of ${pageCount}`, 
      pageWidth / 2 - 8, 
      pageHeight - 6
    );
    doc.text(
      "Verified via Google AI Studio Deep Evaluator Engine", 
      margin, 
      pageHeight - 6
    );
  }

  // Save the PDF!
  const cleanedTitle = concept.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`VBCUA_Report_${cleanedTitle}_${Date.now()}.pdf`);
}
