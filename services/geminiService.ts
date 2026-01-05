
import { GoogleGenAI } from "@google/genai";
import { ModelCategory } from "../types";

export const analyzeClothing = async (imageBase64: string, mimeType: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: imageBase64, mimeType } },
        { text: "Describe this clothing item in detail. Focus on the cut, fabric, color, and style. Keep it concise, e.g., 'A navy blue tailored silk blazer with gold buttons'." }
      ]
    }
  });

  return response.text || "clothing item";
};

export const generateVariation = async (
  imageBase64: string, 
  mimeType: string, 
  description: string, 
  brandInfo: string,
  category: ModelCategory
): Promise<{ url: string; prompt: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `A professional ${category} fashion photograph. A diverse model is wearing this exact clothing item: ${description}. ${brandInfo ? `Style: ${brandInfo}.` : ''} High resolution, cinematic lighting, professional editorial quality.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4"
          // imageSize is omitted for gemini-2.5-flash-image
        }
      }
    });

    let imageUrl = '';
    let modelFeedback = '';

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      } else if (part.text) {
        modelFeedback += part.text;
      }
    }

    if (!imageUrl) {
      throw new Error(modelFeedback || "The model could not generate an image. This usually happens if the input image or prompt triggers safety filters.");
    }

    return { url: imageUrl, prompt };
  } catch (error: any) {
    if (error.message?.includes("403")) {
      throw new Error("Permission Denied: Ensure your API key has access to the Gemini 2.5 Flash Image model.");
    }
    throw error;
  }
};
