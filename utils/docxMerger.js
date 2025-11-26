import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";

/**
 * Helper to ensure we always have an array, even if Gemini gives us a string or null.
 */
const safeArray = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (typeof input === "string") return [input]; // Turn "Java" into ["Java"]
  return [];
};

/**
 * Helper to ensure we always have a string.
 */
const safeString = (input) => {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (typeof input === "number") return String(input);
  return JSON.stringify(input); // Fallback for objects
};

export const fillDocxTemplate = (templatePath, data) => {
  try {
    console.log("📄 Reading template from:", templatePath);
    
    // 1. Read Template
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    // 2. Configure Docxtemplater with "Silent Mode" (Don't crash on missing tags)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: (part) => {
        // If a tag is missing in the data, just print nothing instead of crashing
        if (!part.module || part.module === "rawxml") return "";
        return "";
      },
    });

    console.log("🧹 Sanitizing Data for Template...");

    // 3. SANITIZE DATA (The Critical Fix)
    // We strictly format every field to match what the .docx expects.
    const cleanData = {
      // Direct Strings
      full_name: safeString(data.personal_info?.full_name),
      email: safeString(data.personal_info?.email),
      phone: safeString(data.personal_info?.phone),
      location: safeString(data.personal_info?.location),
      linkedin: safeString(data.personal_info?.linkedin),
      portfolio: safeString(data.personal_info?.portfolio),
      summary: safeString(data.professional_summary),

      // Complex Arrays (Experience/Education)
      // We map over them to ensure fields inside are also strings
      experience: safeArray(data.experience).map(exp => ({
        job_title: safeString(exp.job_title),
        company: safeString(exp.company),
        duration: safeString(exp.duration),
        location: safeString(exp.location),
        // Handle nested loop for achievements
        achievements: safeArray(exp.achievements).map(a => safeString(a))
      })),

      education: safeArray(data.education).map(edu => ({
        degree: safeString(edu.degree),
        institution: safeString(edu.institution),
        year: safeString(edu.year),
        location: safeString(edu.location)
      })),

      // Simple Arrays (Skills/Languages) -> Mapped to Objects
      // Word Usage: {#skills}{{name}}{/skills}
      skills: safeArray(data.skills).map(s => ({ 
        name: safeString(s) 
      })),

      languages: safeArray(data.languages).map(l => ({ 
        name: safeString(l) 
      })),

      projects: safeArray(data.projects).map(p => ({ 
        name: safeString(p) 
      })),
      
      certifications: safeArray(data.certifications).map(c => ({ 
        name: safeString(c) 
      })),
    };

    console.log("✅ Data prepared successfully. Rendering...");
    // console.log(JSON.stringify(cleanData, null, 2)); // Uncomment to debug data

    // 4. Render
    doc.render(cleanData);

    // 5. Output
    const buffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return buffer;

  } catch (error) {
    console.error("❌ Docx Template CRITICAL Error:");
    
    // Log specific tag errors if available
    if (error.properties && error.properties.errors) {
      error.properties.errors.forEach((err) => {
        console.error(`👉 Tag Error: ${err.name}`);
        console.error(`   Message: ${err.message}`);
        console.error(`   Tag ID: ${err.properties?.id}`);
      });
    } else {
      console.error("   Error Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    
    throw new Error(`Template processing failed: ${error.message}`);
  }
};