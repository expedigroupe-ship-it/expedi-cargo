
import { GoogleGenAI, Type } from "@google/genai";

// Use the environment variable for API key as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface EstimationResult {
  price: number;
  time: string;
  reasoning: string;
}

/**
 * Service to estimate shipping price and time using Gemini AI.
 */
export const estimateShipping = async (
  description: string,
  origin: string,
  destination: string,
  weight: string
): Promise<EstimationResult> => {
  try {
    const prompt = `
      Act as a logistics expert for Cote d'Ivoire. 
      Estimate the shipping price (in CFA Francs - XOF) and delivery time for a package.
      
      Details:
      - Item: ${description}
      - Size/Weight: ${weight}
      - From: ${origin}
      - To: ${destination}
      
      Rules:
      - Inter-city (Abidjan <-> Korhogo) is expensive (approx 5000-15000 XOF).
      - Intra-city (Abidjan <-> Abidjan) is cheaper (1000-5000 XOF).
      - Provide a realistic price number (integer only).
      - Provide a short estimated time string (e.g. "2 heures", "1 jour").
      - Provide a very short reasoning in French.
    `;

    // Updated to use gemini-3-flash-preview for basic text tasks.
    // Added responseSchema for more reliable structured output.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            price: { type: Type.NUMBER, description: 'Shipping price in XOF' },
            time: { type: Type.STRING, description: 'Estimated delivery time' },
            reasoning: { type: Type.STRING, description: 'Brief reasoning in French' }
          },
          required: ['price', 'time', 'reasoning']
        }
      }
    });

    // Access the .text property directly as per latest SDK guidelines.
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as EstimationResult;
  } catch (error) {
    console.error("AI Estimation failed:", error);
    // Fallback if AI fails or no key
    return {
      price: origin === destination ? 2000 : 8000,
      time: origin === destination ? "4 heures" : "2 jours",
      reasoning: "Estimation standard par défaut."
    };
  }
};
