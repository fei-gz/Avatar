import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Initialize Gemini Client
// Requires process.env.API_KEY to be set
const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeExpression = async (
  imageBase64: string,
  blendShapes: string
): Promise<AnalysisResult> => {
  if (!ai) {
    throw new Error("API Key not found. Please set process.env.API_KEY.");
  }

  const model = "gemini-2.5-flash";

  const prompt = `
    Analyze this facial expression from the user's webcam and the accompanying blend shape data.
    
    Top active blend shapes:
    ${blendShapes}

    Provide a structured analysis of the expression:
    1. Identify the primary emotion.
    2. Describe the expression in detail (micro-expressions, nuance).
    3. Give acting feedback/tips (e.g., "Try raising your eyebrows more for surprise").
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64.split(",")[1], // Remove 'data:image/jpeg;base64,' prefix
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotion: { type: Type.STRING },
            description: { type: Type.STRING },
            actingTips: { type: Type.STRING },
          },
          required: ["emotion", "description", "actingTips"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("No response text received from Gemini.");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
