const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  console.error("WARNING: GOOGLE_AI_API_KEY not found in environment variables!");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const analyzeCandles = async (symbol, timeframe, candles) => {
  try {
    // Format candles for prompt
    // expected candles: array of { time, open, high, low, close }
    // We only need the last few candles to see context, but specific focus on the last COMPLETED candle.
    // Assuming 'candles' passed here includes the latest ones. 
    // If the last one in array is current (forming), we might want the one before it.
    // The prompt will clarify.

    const prompt = `
      You are an expert Forex trader specializing in Price Action and Doji patterns.
      Analyze the following OHLC candlestick data for ${symbol} on ${timeframe} timeframe.
      The data is provided as an array of JSON objects. The last candle in the list is the most recent completed candle.
      
      Candle Data:
      ${JSON.stringify(candles.slice(-5))} 
      
      Task:
      1. Identify if the LAST candle (the most recent one) is a valid Doji candle.
      2. A valid Doji has a very small body relative to the total length (high - low).
      3. Provide a confidence score (0.0 to 1.0) based on how perfect the Doji structure is.
      4. Ignore previous candles for the "is_doji" decision, but use them for context if needed (e.g. location of doji).
      
      Output STRICT JSON format only:
      {
        "is_doji": boolean,
        "confidence": number, // 0.0 to 1.0
        "reason": "string explanation"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up markdown code blocks if present
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const jsonResponse = JSON.parse(cleanedText);
      return {
        model_name: "gemini-1.5-flash",
        ...jsonResponse
      };
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      return {
        model_name: "gemini-1.5-flash",
        is_doji: false,
        confidence: 0,
        reason: "Parse Error"
      };
    }
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      model_name: "gemini-1.5-flash",
      is_doji: false,
      confidence: 0,
      reason: "API Error"
    };
  }
};

module.exports = { analyzeCandles };
