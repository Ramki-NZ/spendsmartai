// services/geminiService.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

// NOTE: In Vite, we inject this via vite.config.ts define:
// 'process.env.API_KEY' / 'process.env.GEMINI_API_KEY'
const apiKey =
  (process.env.API_KEY as string | undefined) ||
  (process.env.GEMINI_API_KEY as string | undefined) ||
  "";

if (!apiKey) {
  console.warn(
    "GEMINI API key is not set. Make sure GEMINI_API_KEY (or API_KEY) is defined in your env and wired via vite.config.ts."
  );
}

const ai = new GoogleGenerativeAI(apiKey);

/**
 * Convert a browser File into a Gemini inlineData part.
 * We keep the shape { inlineData: { data, mimeType } } which the SDK understands.
 */
export const fileToGenerativePart = (file: File) =>
  new Promise<{ inlineData: { data: string; mimeType: string } }>(
    (resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Content = result.split(",")[1]; // strip "data:...;base64,"
        resolve({
          inlineData: {
            data: base64Content,
            mimeType: file.type,
          },
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  );

/**
 * Parse a receipt or bank statement image/PDF into structured transactions.
 * We *ask* Gemini to return JSON, then JSON.parse it ourselves.
 * (No responseSchema / Type enum – keeps things simple & compatible.)
 */
export const parseReceiptOrStatement = async (file: File) => {
  try {
    const filePart = await fileToGenerativePart(file);

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash", // you can switch to gemini-2.0-flash if your key supports it
    });

    const instructions = `
Analyze this document (receipt or bank statement) and extract transaction data.

CRITICAL OCR & PARSING INSTRUCTIONS:
1. Handwriting & Low Quality: Pay close attention to handwritten text, especially for totals or tips. If text is blurry or faded, use context (e.g., sum of items + tax) to infer the correct Total Amount.
2. Multiple Receipts: If the image contains multiple distinct receipts (e.g., side-by-side), split them into separate transaction objects.
3. Accuracy Check: Verify that individual item prices roughly sum up to the total. Prefer the explicitly labeled "Total" or "Grand Total" over subtotals.
4. Date Handling: Look for dates in various formats (MM/DD/YY, DD-Mon-YYYY). Convert strictly to ISO 8601 (YYYY-MM-DD). If year is missing, assume the current year.

Extract the following structured data:
- store: Merchant name (string).
- date: Transaction date (YYYY-MM-DD).
- totalAmount: Final amount paid (number).
- category: Best fit from: [Groceries, Dining, Transport, Utilities, Shopping, Entertainment, Health, Housing, Education, Personal Care, Travel, Subscriptions, Other].
- isRecurring: true if it looks like a subscription, rent, insurance, or utility bill; otherwise false.
- items: Array of line items with:
  - name (string)
  - quantity (number, default 1 if unspecified)
  - unitPrice (number)
  - totalPrice (number)

Return ONLY a JSON array of objects with this structure. No extra commentary, no markdown, no explanation – just pure JSON.
`.trim();

    const result = await model.generateContent([
      filePart,
      { text: instructions },
    ]);

    const text = result.response.text();

    if (!text) {
      console.error("Gemini returned an empty response for OCR.");
      return [];
    }

    try {
      const parsed = JSON.parse(text);
      // Ensure we always return an array
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (err) {
      console.error("Failed to parse JSON from Gemini:", text, err);
      throw err;
    }
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};

/**
 * Get shopping/budgeting advice from Gemini based on recent transactions + a user query.
 * We just generate plain text advice (optionally markdown) for display in the UI.
 */
export const getShoppingAdvice = async (transactions: any[], query: string) => {
  try {
    // keep payload reasonable
    const recentTransactions = transactions.slice(0, 50).map((t) => ({
      store: t.store,
      amount: t.totalAmount,
      date: t.date,
      items: t.items?.map((i: any) => i.name).join(", "),
      category: t.category,
      isRecurring: t.isRecurring,
    }));

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
You are SpendSmartAI, a friendly but direct personal finance coach.

Here is a summary of the user's recent transactions as JSON:
${JSON.stringify(recentTransactions, null, 2)}

User query:
"${query}"

Tasks:
1. Analyse their spending patterns (e.g., overspending categories, recurring bills, obvious savings).
2. Answer the user's query specifically.
3. Give concrete, actionable suggestions (e.g., "Set a weekly grocery cap of $X", "Cancel subscription Y", "Switch to a cheaper provider").
4. If relevant, mention rough percentage splits between key categories (Groceries, Housing, Transport, etc.).

Format your response in clear markdown with:
- short paragraphs
- bullet points
- section headings like "Overview", "Key Issues", "Recommendations".
`.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return {
      text: text ?? "",
      // we are not using search tools / grounding here, so keep this null for now
      grounding: null as unknown as any,
    };
  } catch (error) {
    console.error("Gemini Advice Error:", error);
    throw error;
  }
};
