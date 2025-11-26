import "dotenv/config";

async function getAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: GEMINI_API_KEY is missing from .env file");
    return;
  }

  console.log("🔍 Querying Google API for available models...");
  
  // We hit the REST API directly to see the absolute truth
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("❌ API returned an error:", data.error.message);
      return;
    }

    if (!data.models) {
      console.error("⚠️ No models found. Your API key might be valid but has no services enabled.");
      return;
    }

    console.log("\n✅ AVAILABLE MODELS FOR YOUR KEY:");
    console.log("---------------------------------");
    
    // Filter for models that can "generateContent" (what we need for the parser)
    const contentModels = data.models.filter(m => 
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")
    );

    contentModels.forEach(model => {
      // The API returns names like "models/gemini-2.5-pro"
      // We strip "models/" so you can copy-paste the clean ID
      const cleanName = model.name.replace("models/", "");
      console.log(`🔹 ${cleanName}`);
      console.log(`   Description: ${model.displayName} (${model.version})`);
      console.log("");
    });

    console.log("---------------------------------");
    console.log("👉 Pick one of the '🔹' names above and put it in your geminiVisionParser.js");

  } catch (error) {
    console.error("❌ Network or Parsing Error:", error);
  }
}

getAvailableModels();