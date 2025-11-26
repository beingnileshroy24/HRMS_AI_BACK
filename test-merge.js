import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";

// 1. Mock Data (Matches your Gemini Output)
const mockData = {
  personal_info: {
    full_name: "John Doe",
    email: "john@example.com",
    phone: "123-456-7890",
    location: "New York, NY",
  },
  professional_summary: "Experienced developer with a passion for AI.",
  experience: [
    {
      job_title: "Senior Engineer",
      company: "Tech Corp",
      duration: "2020 - Present",
      location: "Remote",
      achievements: ["Built a PDF parser", "Reduced latency by 50%"]
    },
    {
      job_title: "Junior Dev",
      company: "Startup Inc",
      duration: "2018 - 2020",
      location: "San Francisco",
      achievements: ["Fixed bugs", "Wrote documentation"]
    }
  ],
  skills: ["JavaScript", "Node.js", "React"]
};

try {
  console.log("🔄 Reading 'clean_template.docx'...");
  const content = fs.readFileSync(path.resolve("clean_template.docx"), "binary");

  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // PREVENTS CRASHES ON MISSING DATA
    nullGetter: () => "" 
  });

  // 2. Prepare Data Structure (Must match template tags)
  const renderData = {
    full_name: mockData.personal_info.full_name,
    email: mockData.personal_info.email,
    phone: mockData.personal_info.phone,
    location: mockData.personal_info.location,
    summary: mockData.professional_summary,
    experience: mockData.experience,
    // Transform simple array ["A", "B"] into object array [{name: "A"}, {name: "B"}]
    skills: mockData.skills.map(s => ({ name: s })) 
  };

  console.log("🔄 Rendering document...");
  doc.render(renderData);

  const buffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  fs.writeFileSync("output_cv.docx", buffer);
  console.log("✅ Success! Check 'output_cv.docx'.");

} catch (error) {
  console.error("❌ ERROR:");
  if (error.properties && error.properties.errors) {
    error.properties.errors.forEach(e => {
        console.log(`Tag Error: ${e.name} - ${e.message}`);
    });
  } else {
    console.log(error);
  }
}