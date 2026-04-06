import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO string
}

export async function parseFinancialMessage(message: string, categories: string[]): Promise<ParsedTransaction | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing");
    return null;
  }

  const prompt = `
    Extraia detalhes de transações financeiras da seguinte mensagem: "${message}"
    Data Atual: ${new Date().toISOString()}
    Categorias Disponíveis: ${categories.join(', ')}

    Se a mensagem não for uma transação financeira, retorne null.
    Se for, retorne um objeto JSON com:
    - type: "expense" (despesa) ou "income" (receita)
    - amount: número
    - category: string (escolha a melhor opção entre as categorias disponíveis ou "Outros")
    - description: string (breve resumo em português)
    - date: string (formato ISO 8601)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["expense", "income"] },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            date: { type: Type.STRING },
          },
          required: ["type", "amount", "category", "description", "date"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as ParsedTransaction;
  } catch (error) {
    console.error("Error parsing message with Gemini:", error);
    return null;
  }
}

export async function getFinancialAdvice(transactions: Transaction[]): Promise<string> {
  if (!process.env.GEMINI_API_KEY || transactions.length === 0) return "";

  const summary = transactions.map(t => `${t.date.toLocaleDateString()}: ${t.type} ${t.amount} in ${t.category} (${t.description})`).join('\n');
  
  const prompt = `
    Based on the following financial transactions, provide one brief, helpful tip or insight for the user (max 2 sentences):
    
    ${summary}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Error getting financial advice:", error);
    return "";
  }
}
