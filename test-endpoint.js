// test-endpoint.js
const testEndpoint = async () => {
  try {
    console.log("Testing /api/cv/test-pdf endpoint...");
    const response = await fetch('http://localhost:8081/api/cv/test-pdf');
    const result = await response.json();
    console.log("✅ Endpoint test result:", result);
    
    console.log("\nTesting /api/cv/template/sample endpoint...");
    const templateResponse = await fetch('http://localhost:8081/api/cv/template/sample');
    console.log("✅ Template endpoint status:", templateResponse.status);
    
  } catch (err) {
    console.error("❌ Test failed:", err.message);
    console.log("\nMake sure:");
    console.log("1. Backend server is running (npm start in backend folder)");
    console.log("2. Port 8081 is available");
    console.log("3. All packages are installed (npm install handlebars puppeteer)");
  }
};

testEndpoint();