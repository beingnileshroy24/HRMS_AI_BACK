import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

async function testGemini() {
  console.log("----------------------------------------");
  console.log("🔍 Testing Gemini Configuration...");

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY is undefined in process.env");
    console.log("👉 Tip: Make sure you have a .env file and 'dotenv' installed.");
    return;
  }

  console.log(`🔑 API Key detected: ${apiKey.substring(0, 6)}...*******`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    
    console.log("📡 Sending test request to Google...");
    const result = await model.generateContent("Say 'Hello World' in JSON format");
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ Gemini API is working correctly!");
    console.log("📝 Response:", text);
    
  } catch (error) {
    console.error("❌ Gemini API request failed:");
    console.error(`   Error Message: ${error.message}`);
    
    if (error.message.includes("400")) {
       console.log("👉 Suggestion: Your API key might be invalid, expired, or the .env file is malformed.");
    }
  }
  console.log("----------------------------------------");
}

testGemini();