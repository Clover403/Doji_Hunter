const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  console.error("WARNING: GOOGLE_AI_API_KEY not found in environment variables!");
}

const genAI = new GoogleGenerativeAI(apiKey);
// Use gemini-2.5-flash - better free tier quota than 2.0-flash-lite
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const analyzeCandles = async (symbol, timeframe, candles) => {
  try {
    // Optimized prompt - minimal tokens untuk hemat quota
    const lastCandle = candles[candles.length - 1];
    const prompt = `Analyze this candle for Doji pattern:
O:${lastCandle.open} H:${lastCandle.high} L:${lastCandle.low} C:${lastCandle.close}

A Doji has small body (< 10% of range). Reply JSON only:
{"is_doji":boolean,"confidence":0.0-1.0,"reason":"brief"}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up markdown code blocks if present
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const jsonResponse = JSON.parse(cleanedText);
      return {
        model_name: "gemini-2.5-flash",
        ...jsonResponse
      };
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      throw new Error("Parse Error: Invalid AI response format");
    }
  } catch (error) {
    console.error("AI Analysis Error:", error.message || error);
    // Throw error so tradingService can catch and fallback to manual
    throw error;
  }
};

module.exports = { analyzeCandles };
