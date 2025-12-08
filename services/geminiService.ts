import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to encode file to base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Content = base64Data.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const parseReceiptOrStatement = async (file: File) => {
  try {
    const filePart = await fileToGenerativePart(file);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          filePart,
          {
            text: `Analyze this document (receipt or bank statement) and extract transaction data.

            **CRITICAL OCR & PARSING INSTRUCTIONS:**
            1.  **Complex Layouts & Multi-line Items:** If an item description spans multiple lines, combine them into a single name string. Do not treat the second line as a separate item with 0 price. Ensure the price aligns with the correct item row.
            2.  **Handwriting & Low Quality:** Pay close attention to handwritten text, especially for totals or tips. Use context (sum of items) to infer unclear numbers.
            3.  **Category Inference:** 
                - Determine the *Main Transaction Category* based on the merchant.
                - Determine a *Specific Category* for EACH individual item. **IMPORTANT:** This must be one of the standard categories list (e.g. if the item is an Apple, use "Groceries", if it is a T-Shirt, use "Shopping").
            4.  **Accuracy Check:** Verify that individual item prices roughly sum up to the total. Prefer the explicitly labeled "Total" or "Grand Total".
            5.  **Date Handling:** Convert dates strictly to ISO 8601 (YYYY-MM-DD). If year is missing, assume current year.

            **Extract the following structured data:**
            - **Store:** Merchant name.
            - **Date:** Transaction date (YYYY-MM-DD).
            - **Total Amount:** Final amount paid.
            - **Category:** Main category from: [Groceries, Dining, Transport, Utilities, Shopping, Entertainment, Health, Housing, Education, Personal Care, Travel, Subscriptions, Other].
            - **Items:** List of line items with:
                - Name
                - Quantity (number, default 1)
                - Unit Price (number)
                - Total Price (number)
                - Category (Item-specific category from the main list above)
            - **Is Recurring:** Set to true if it looks like a subscription, rent, insurance, or utility bill.

            Return ONLY a JSON array of objects.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              store: { type: Type.STRING },
              date: { type: Type.STRING },
              totalAmount: { type: Type.NUMBER },
              category: { type: Type.STRING },
              isRecurring: { type: Type.BOOLEAN },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER },
                    totalPrice: { type: Type.NUMBER },
                    category: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};

export const getShoppingAdvice = async (transactions: any[], query: string) => {
  try {
    // We only send a summary to avoid token limits if history is huge
    const recentTransactions = transactions.slice(0, 50).map(t => ({
        store: t.store,
        amount: t.totalAmount,
        date: t.date,
        items: t.items?.map((i: any) => i.name).join(', ')
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            text: `You are SpendSmartAI, a financial advisor. 
            Here is a summary of the user's recent transactions: ${JSON.stringify(recentTransactions)}.
            
            User Query: "${query}"
            
            If the user asks for price comparisons, look at the items they bought and use Google Search to find better deals.
            If the user asks for budgeting advice, analyze their spending habits.
            Provide actionable, specific advice.`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    return {
        text: response.text,
        grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("Gemini Advice Error:", error);
    throw error;
  }
};