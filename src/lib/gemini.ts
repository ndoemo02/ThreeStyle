import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY || "";
export const genAI = new GoogleGenerativeAI(apiKey);
