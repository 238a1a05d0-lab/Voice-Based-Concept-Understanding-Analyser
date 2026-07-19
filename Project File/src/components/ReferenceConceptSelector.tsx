/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ReferenceConcept } from "../types";
import { BookOpen, HelpCircle, Plus, Check, ChevronRight, Sparkles } from "lucide-react";

interface ReferenceConceptSelectorProps {
  concepts: ReferenceConcept[];
  selectedConcept: ReferenceConcept | null;
  onSelectConcept: (concept: ReferenceConcept) => void;
  onAddCustomConcept: (concept: ReferenceConcept) => void;
}

export default function ReferenceConceptSelector({
  concepts,
  selectedConcept,
  onSelectConcept,
  onAddCustomConcept,
}: ReferenceConceptSelectorProps) {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Biology");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [description, setDescription] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [error, setError] = useState("");

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !keywordsText.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    const keywords = keywordsText
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywords.length === 0) {
      setError("Please provide at least one keyword.");
      return;
    }

    const customId = `custom-${Date.now()}`;
    const newConcept: ReferenceConcept = {
      id: customId,
      title: title.trim(),
      category: category.trim(),
      difficulty,
      description: description.trim(),
      keywords,
    };

    onAddCustomConcept(newConcept);
    onSelectConcept(newConcept);
    
    // Reset form
    setTitle("");
    setDescription("");
    setKeywordsText("");
    setIsAddingCustom(false);
    setError("");
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "Beginner":
        return "bg-green-50 text-green-700 border-green-200";
      case "Intermediate":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Advanced":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case "Biology":
        return "🌱";
      case "Physics":
        return "⚡";
      case "Computer Science":
        return "💻";
      case "Economics":
        return "📈";
      case "Space Science":
        return "🌌";
      default:
        return "📚";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            1. Select Reference Concept
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose a standard concept or input a custom syllabus point to evaluate explanation alignment.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddingCustom(!isAddingCustom);
            setError("");
          }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors shadow-xs"
        >
          {isAddingCustom ? (
            "Show Preset Concepts"
          ) : (
            <>
              <Plus className="h-4 w-4 text-indigo-600" />
              Create Custom Concept
            </>
          )}
        </button>
      </div>

      {isAddingCustom ? (
        <form onSubmit={handleSubmitCustom} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <h3 className="text-base font-semibold text-gray-900">Define Syllabus Concept</h3>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Concept Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mitochondria, Cellular Respiration"
                className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder-gray-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Biology, Chemistry, etc."
                className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Target Keywords / Key Terms * <span className="text-gray-400 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="mitochondrion, ATP, cellular, powerhouse, cristae, respiration"
                className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder-gray-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Target Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Reference Concept Explanation / Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a comprehensive academic explanation of this concept. This text will be used to generate embeddings and evaluate semantic completeness."
              rows={4}
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder-gray-400"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingCustom(false)}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium text-white shadow-xs"
            >
              Create & Select Concept
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {concepts.map((concept) => {
            const isSelected = selectedConcept?.id === concept.id;
            return (
              <div
                key={concept.id}
                onClick={() => onSelectConcept(concept)}
                className={`group relative flex flex-col p-5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-600"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xl mr-1.5" role="img" aria-label="emoji">
                      {getCategoryEmoji(concept.category)}
                    </span>
                    <span className="text-xs font-medium text-indigo-600 tracking-wide uppercase">
                      {concept.category}
                    </span>
                    <h3 className="text-base font-semibold text-gray-900 mt-1 group-hover:text-indigo-600 transition-colors">
                      {concept.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getDifficultyColor(concept.difficulty)}`}>
                      {concept.difficulty}
                    </span>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2.5 line-clamp-3 leading-relaxed">
                  {concept.description}
                </p>

                <div className="mt-auto pt-4 flex flex-wrap gap-1.5">
                  {concept.keywords.slice(0, 4).map((kw, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-100"
                    >
                      {kw}
                    </span>
                  ))}
                  {concept.keywords.length > 4 && (
                    <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5">
                      +{concept.keywords.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
