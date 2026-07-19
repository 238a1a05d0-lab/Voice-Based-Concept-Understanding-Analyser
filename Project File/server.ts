/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { ReferenceConcept } from "./src/types";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up high limits for audio uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Pre-seeded educational concepts
const PRE_SEEDED_CONCEPTS: ReferenceConcept[] = [
  {
    id: "photosynthesis",
    title: "Photosynthesis",
    category: "Biology",
    difficulty: "Intermediate",
    description: "Photosynthesis is the biological process by which green plants, algae, and some bacteria convert light energy, carbon dioxide, and water into chemical energy in the form of glucose, releasing oxygen as a byproduct. It occurs inside chloroplasts, powered by the pigment chlorophyll which absorbs sunlight. The reaction consists of two main stages: the light-dependent reactions (which split water to produce oxygen, ATP, and NADPH) and the light-independent Calvin cycle (which uses ATP and NADPH to fix carbon dioxide into glucose molecules). Stomata on leaves facilitate the intake of carbon dioxide and release of oxygen.",
    keywords: ["chloroplast", "chlorophyll", "glucose", "stomata", "Calvin cycle", "light-dependent", "carbon dioxide", "oxygen", "water"],
  },
  {
    id: "newton-second-law",
    title: "Newton's Second Law of Motion",
    category: "Physics",
    difficulty: "Beginner",
    description: "Newton's Second Law of Motion states that the acceleration of an object is directly proportional to the net force acting upon it, and inversely proportional to its mass. Mathematically, this is expressed as Force equals mass times acceleration (F = ma). The acceleration of an object occurs in the same direction as the net applied force. When a net force acts on an object, it changes its velocity (accelerates). A greater mass requires more force to accelerate at the same rate, representing the object's inertia.",
    keywords: ["acceleration", "force", "mass", "proportional", "F=ma", "inertia", "net force", "velocity"],
  },
  {
    id: "tcp-handshake",
    title: "TCP/IP Three-Way Handshake",
    category: "Computer Science",
    difficulty: "Advanced",
    description: "The TCP/IP Three-Way Handshake is the process used in computer networks to establish a reliable connection between a client and a server over a Transmission Control Protocol (TCP) connection. It ensures that both ends are ready and can communicate reliably. In the first step, the client sends a SYN (Synchronize) packet with a random initial sequence number to the server. In the second step, the server responds with a SYN-ACK packet, acknowledging the client's SYN and sending its own SYN. In the third step, the client sends an ACK (Acknowledge) packet back to the server, establishing the active connection. This prevents old or delayed connection requests from causing issues.",
    keywords: ["SYN", "SYN-ACK", "ACK", "client", "server", "sequence number", "TCP", "connection", "reliable"],
  },
  {
    id: "supply-demand",
    title: "Law of Supply and Demand",
    category: "Economics",
    difficulty: "Beginner",
    description: "The Law of Supply and Demand is a fundamental economic principle explaining the interaction between sellers of a resource and buyers for that resource. It defines the relationship between the price of a good and the willingness of people to buy or sell it. According to the law of demand, as price increases, demand decreases. According to the law of supply, as price increases, quantity supplied increases. The intersection of these two curves determines the market equilibrium price, where the quantity demanded equals the quantity supplied. Shortages occur when demand exceeds supply, driving prices up, while surpluses occur when supply exceeds demand, pushing prices down.",
    keywords: ["supply", "demand", "equilibrium", "price", "shortage", "surplus", "market", "sellers", "buyers"],
  },
  {
    id: "black-holes",
    title: "Black Holes",
    category: "Space Science",
    difficulty: "Intermediate",
    description: "A black hole is an extremely dense region in spacetime where gravity is so strong that nothing, not even electromagnetic radiation like light, can escape from its pull. This boundary is known as the event horizon. According to Albert Einstein's general theory of relativity, a sufficiently compact mass can deform spacetime to form a black hole. At the absolute center lies the singularity, an infinitely dense point where our current understanding of physics breaks down. Black holes are classified by mass, ranging from stellar-mass black holes (formed by collapsing massive stars) to supermassive black holes found at the centers of galaxies.",
    keywords: ["gravity", "event horizon", "singularity", "spacetime", "general relativity", "stellar", "supermassive", "escape velocity"],
  }
];

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 1. Get Reference Concepts
app.get("/api/concepts", (req, res) => {
  res.json(PRE_SEEDED_CONCEPTS);
});

// 2. Transcribe Audio
app.post("/api/transcribe", async (req, res): Promise<any> => {
  try {
    const { audioData, mimeType } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: "Missing audioData in request" });
    }

    // Clean mimeType (remove parameters like codecs)
    const cleanMime = mimeType ? mimeType.split(";")[0].trim() : "audio/wav";

    // Transcribe with Gemini 3.5 Flash using multimodal audio capability
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: audioData,
            mimeType: cleanMime,
          },
        },
        "Transcribe this spoken explanation verbatim. Clean up verbal stutters/ticks if extremely repetitive, but output only the spoken transcript, without any introductory remarks, summary, markdown headers, or corrections. If the audio is silent or unintelligible, return an empty string.",
      ],
    });

    const transcript = response.text || "";
    res.json({ transcript: transcript.trim() });
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: error.message || "Failed to transcribe audio" });
  }
});

// Cosine similarity helper
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 3. Evaluate Transcript against Concept
app.post("/api/evaluate", async (req, res): Promise<any> => {
  try {
    const { transcript, concept } = req.body;

    if (!transcript || !concept) {
      return res.status(400).json({ error: "Missing transcript or concept details" });
    }

    // Step 3a: Semantic Embeddings & Similarity
    let cosineSim = 0.5; // fallback
    try {
      const [embStudent, embRef] = await Promise.all([
        ai.models.embedContent({
          model: "gemini-embedding-2-preview",
          contents: transcript,
        }),
        ai.models.embedContent({
          model: "gemini-embedding-2-preview",
          contents: concept.description,
        }),
      ]);

      const rStudent = embStudent as any;
      const rRef = embRef as any;

      const vecA = rStudent.embeddings?.values || rStudent.embeddings?.[0]?.values || rStudent.embedding?.values;
      const vecB = rRef.embeddings?.values || rRef.embeddings?.[0]?.values || rRef.embedding?.values;

      if (vecA && vecB) {
        cosineSim = calculateCosineSimilarity(vecA, vecB);
      }
    } catch (embedError) {
      console.warn("Embedding generation failed, continuing with fallback similarity", embedError);
    }

    // Step 3b: Deep Conceptual Evaluation with Gemini 3.5 Flash
    const evaluationPrompt = `
      You are an expert academic tutor and conceptual understanding assessor.
      Evaluate the student's verbal explanation of the academic concept "${concept.title}" (Difficulty: ${concept.difficulty}).
      
      STUDENT EXPLANATION:
      "${transcript}"

      REFERENCE DESCRIPTION OF CONCEPT:
      "${concept.description}"

      KEY CONCEPTS/KEYWORDS TO VERIFY:
      ${JSON.stringify(concept.keywords)}

      Please evaluate the response and fill out the detailed JSON structure.
      Be objective. Check whether the student actually explained or mentioned the keywords correctly in the keywordAnalysis.
      Break down the key points from the reference description, assess if they covered them, and explain how they covered or missed them.
      Identify any scientific/factual misconceptions in the explanation, and list specific actionable suggestions for improvement.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: evaluationPrompt,
      config: {
        systemInstruction: "You are a highly detailed and rigorous educational assessor. Evaluate student spoken explanations for exact scientific coverage, identifying gaps, naming misconceptions, and checking keywords. Return your assessment in structured JSON conforming strictly to the provided responseSchema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coverageScore: {
              type: Type.INTEGER,
              description: "A score from 0 to 100 on how thoroughly the student covered the core tenets of the reference concept",
            },
            accuracyScore: {
              type: Type.INTEGER,
              description: "A score from 0 to 100 reflecting the academic accuracy and correctness of the statements. Penalize for misconceptions.",
            },
            generalFeedback: {
              type: Type.STRING,
              description: "A constructive, detailed overview of their explanation (2-3 sentences), highlighting what they did well and where the core explanation is lacking.",
            },
            misconceptions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "An array of specific incorrect statements or misconceptions identified in their transcription. Return empty array if none.",
            },
            keywordAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  keyword: { type: Type.STRING },
                  mentioned: {
                    type: Type.BOOLEAN,
                    description: "true if the keyword or its close conceptual synonym was mentioned and correctly contextualized",
                  },
                  context: {
                    type: Type.STRING,
                    description: "A brief phrase explaining how it was used, or why it was missed/important",
                  },
                },
                required: ["keyword", "mentioned", "context"],
              },
            },
            keyPointsAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  point: { type: Type.STRING, description: "A major conceptual component parsed from the reference description" },
                  covered: { type: Type.BOOLEAN, description: "true if the student sufficiently explained this specific point" },
                  explanation: { type: Type.STRING, description: "Brief analysis of the student's coverage or omission of this point" },
                },
                required: ["point", "covered", "explanation"],
              },
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "An array of 2-4 actionable, concrete study suggestions or additions they should make to strengthen their explanation",
            },
          },
          required: [
            "coverageScore",
            "accuracyScore",
            "generalFeedback",
            "misconceptions",
            "keywordAnalysis",
            "keyPointsAnalysis",
            "suggestions",
          ],
        },
      },
    });

    const aiText = response.text || "{}";
    const evaluationData = JSON.parse(aiText);

    // Calculate dynamic composite final score and classification
    // Formula balances semantic cosine similarity, coverage, and accuracy
    const semanticWeight = cosineSim * 100;
    const finalScore = Math.round(
      evaluationData.coverageScore * 0.4 +
      evaluationData.accuracyScore * 0.4 +
      semanticWeight * 0.2
    );

    let classification: "Strong" | "Moderate" | "Poor" = "Moderate";
    if (finalScore >= 80) classification = "Strong";
    else if (finalScore < 50) classification = "Poor";

    res.json({
      ...evaluationData,
      cosineSimilarity: cosineSim,
      finalScore,
      classification,
    });
  } catch (error: any) {
    console.error("Evaluation error:", error);
    res.status(500).json({ error: error.message || "Failed to evaluate explanation" });
  }
});

// Set up server listening and Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
