import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicjalizacja SDK odbywa się serwerowo ukrywając klucz w procesie Node
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_KEY || '');

export async function POST(req: Request) {
    try {
        const { transcript } = await req.json();

        if (!transcript) {
            return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Jesteś profesjonalnym trenerem freestyle'u. 
        Użytkownik powiedział: "${transcript}". 
        Zasugeruj 3 mocne rymy wielokrotne i jeden kolejny temat (słowo-klucz).
        Wygeneruj poprawny JSON, używając tego formatu bez bloczków z kodem (tylko sam json):
        { "rhymes": ["rym 1", "rym 2", "rym 3"], "nextTopic": "temat" }`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        // Bezpieczny parsing odpowiedzi usunięciu ewentualnych znaczników markdown
        if (text.startsWith("```json")) {
            text = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith("```")) {
            text = text.substring(3, text.length - 3).trim();
        }

        const data = JSON.parse(text);

        return NextResponse.json(data);
    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json(
            { error: "Error parsing completion from Gemini" },
            { status: 500 }
        );
    }
}
