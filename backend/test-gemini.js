// Quick test Gemini API
const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = "AIzaSyADWWaZhC9a6vTOuFCsXGBbPWoWT1QPch8";

async function testAPI() {
  console.log("=".repeat(50));
  console.log("GEMINI API TEST");
  console.log("=".repeat(50));
  console.log("API Key:", API_KEY.substring(0, 15) + "...");
  
  const genAI = new GoogleGenerativeAI(API_KEY);
  
  // Test gemini-2.0-flash-lite (paling ringan)
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  
  try {
    console.log("\nTesting gemini-2.0-flash-lite...");
    const result = await model.generateContent("Reply with just: OK");
    const text = (await result.response).text();
    console.log("✅ SUCCESS:", text.trim());
    return true;
  } catch (e) {
    console.log("\n❌ ERROR:");
    console.log("   Status:", e.status);
    console.log("   Message:", e.message.substring(0, 200));
    
    if (e.errorDetails && e.errorDetails[1]) {
      const violations = e.errorDetails[1].violations;
      if (violations) {
        console.log("\n   Quota violations:");
        violations.forEach(v => {
          console.log("   -", v.quotaId);
        });
      }
    }
    return false;
  }
}

testAPI();
