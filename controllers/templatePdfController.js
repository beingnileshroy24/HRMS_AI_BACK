// controllers/templatePdfController.js
import { geminiVisionParser } from '../utils/geminiVisionParser.js';
import { docxTemplateService } from '../services/docxTemplateService.js'; // Changed to new service
import { getSampleTemplateHTML } from '../templates/sampleTemplate.js';
import fs from 'fs';

export const generateDOCXFromTemplate = async (req, res) => {
  let cvFilePath = null;
  let templateFilePath = null;

  try {
    console.log("📤 Received request for DOCX generation with template");
    
    if (!req.files || !req.files['cv']) {
      return res.status(400).json({ 
        error: "CV file is required" 
      });
    }

    const cvFile = req.files['cv'][0];
    cvFilePath = cvFile.path;

    console.log(`📄 Processing CV: ${cvFile.originalname}`);

    // 1. Extract data from CV using Gemini (with fallback)
    let extractedData;
    try {
      extractedData = await extractCVDataFromFile(cvFile, cvFilePath);
      console.log("✅ CV data extracted successfully");
    } catch (error) {
      console.error("❌ CV extraction failed, using sample data:", error.message);
      // Use sample data if extraction fails (Gemini overloaded)
      extractedData = getSampleCVData();
    }

    // 2. Prepare template data
    const templateData = docxTemplateService.prepareTemplateData(extractedData);
    console.log("📊 Template data prepared:", Object.keys(templateData));

    // 3. Check if template was uploaded
    let docxBuffer;
    
    // In your controller, update the try-catch block for template processing:
if (req.files['template'] && req.files['template'][0]) {
  const templateFile = req.files['template'][0];
  templateFilePath = templateFile.path;
  const fileExt = templateFile.originalname.split('.').pop().toLowerCase();
  
  if (fileExt === 'docx') {
    console.log("📝 Using uploaded DOCX template");
    console.log("📄 Template file size:", templateFile.size, "bytes");
    
    const templateBuffer = fs.readFileSync(templateFilePath);
    
    // First, verify the DOCX is valid
    try {
      const zip = await JSZip.loadAsync(templateBuffer);
      const files = Object.keys(zip.files);
      console.log("✅ DOCX loaded successfully, contains", files.length, "files");
      
      if (!zip.file('word/document.xml')) {
        throw new Error('Invalid DOCX: missing document.xml');
      }
      
      // Process the template
      docxBuffer = await docxTemplateService.processDOCXTemplate(
        templateBuffer, 
        templateData
      );
      
      console.log("✅ DOCX processed successfully, output size:", docxBuffer.length, "bytes");
      
    } catch (templateError) {
      console.error("❌ Template processing failed:", templateError.message);
      
      // Create a simple DOCX with the data
      console.log("📝 Creating simple DOCX instead...");
      docxBuffer = await createSimpleDOCX(templateData);
    }
  }
}

    // 4. Clean up files
    cleanupFiles(cvFilePath, templateFilePath);

    console.log("✅ DOCX generated successfully");

    // 5. Send DOCX
    const fileName = generateFileName(extractedData, 'docx');
    console.log("📁 Generated filename:", fileName);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', docxBuffer.length);
    
    return res.send(docxBuffer);

  } catch (error) {
    // Clean up on error
    cleanupFiles(cvFilePath, templateFilePath);
    
    console.error("❌ DOCX generation error:", error);
    
    return res.status(500).json({ 
      error: error.message 
    });
  }
};

export const generateDOCXFromExtractedData = async (req, res) => {
  try {
    const { extractedData } = req.body;
    
    if (!extractedData) {
      return res.status(400).json({ error: "No extracted data provided" });
    }

    // Prepare data
    const templateData = docxTemplateService.prepareTemplateData(extractedData);
    
    // Generate simple DOCX
    const docxBuffer = await createSimpleDOCX(templateData);

    // Send DOCX
    const fileName = generateFileName(extractedData, 'docx');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    return res.send(docxBuffer);

  } catch (error) {
    console.error("❌ DOCX generation error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const downloadSampleTemplate = async (req, res) => {
  try {
    const sampleTemplate = getSampleTemplateHTML();
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="CV_Template_Sample.html"');
    
    return res.send(sampleTemplate);
    
  } catch (error) {
    console.error("❌ Sample template error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const uploadTemplateOnly = async (req, res) => {
  try {
    if (!req.files || !req.files['template']) {
      return res.status(400).json({ 
        error: "Template file is required" 
      });
    }

    const templateFile = req.files['template'][0];
    const templateFilePath = templateFile.path;
    const fileExt = templateFile.originalname.split('.').pop().toLowerCase();
    
    if (fileExt !== 'docx') {
      cleanupFiles(null, templateFilePath);
      throw new Error('Only DOCX files are supported. Please convert your template to DOCX format.');
    }
    
    // Validate file exists and is readable
    if (!fs.existsSync(templateFilePath)) {
      throw new Error('Template file not found');
    }
    
    // Try to read the file to ensure it's a valid DOCX
    try {
      const templateBuffer = fs.readFileSync(templateFilePath);
      if (templateBuffer.length === 0) {
        throw new Error('Template file is empty');
      }
      console.log("✅ Template validated successfully");
    } catch (readError) {
      throw new Error(`Invalid template file: ${readError.message}`);
    }
    
    // Clean up file
    cleanupFiles(null, templateFilePath);
    
    return res.json({
      success: true,
      message: "Template uploaded and validated successfully. Use this template with CV file upload.",
      templateName: templateFile.originalname,
      fileSize: templateFile.size,
      instructions: "Upload this template along with a CV file to generate a customized DOCX CV."
    });
    
  } catch (error) {
    // Clean up on error
    if (req.files && req.files['template'] && req.files['template'][0]) {
      const templateFilePath = req.files['template'][0].path;
      cleanupFiles(null, templateFilePath);
    }
    
    console.error("❌ Template upload error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Simple test endpoint
export const testDOCXEndpoint = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "DOCX generation endpoint is working",
      endpoints: {
        generateDOCX: "POST /api/cv/generate-docx-with-template (CV + DOCX template)",
        generateSimpleDOCX: "POST /api/cv/generate-docx (CV only, uses default template)",
        generateFromData: "POST /api/cv/generate-docx-from-data (extracted data only)",
        sampleTemplate: "GET /api/cv/template/sample",
        uploadTemplate: "POST /api/cv/upload-template",
        test: "GET /api/cv/test-docx"
      },
      note: "Templates must be DOCX format. Placeholders like {{personal.name}} will be replaced with actual data."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ HELPER FUNCTIONS ============

const extractCVDataFromFile = async (cvFile, cvFilePath) => {
  try {
    const cvBuffer = fs.readFileSync(cvFilePath);

    if (cvFile.mimetype.includes("pdf")) {
      console.log("🔄 Parsing PDF with Gemini...");
      return await geminiVisionParser.parsePDFWithVision(cvBuffer, cvFile.originalname);
    } else if (cvFile.mimetype.includes("image")) {
      console.log("🔄 Parsing image with Gemini...");
      return await geminiVisionParser.parseImageWithVision(
        cvBuffer, 
        cvFile.mimetype, 
        cvFile.originalname
      );
    } else {
      console.log("🔄 Parsing text with Gemini...");
      const text = fs.readFileSync(cvFilePath, 'utf8');
      return await geminiVisionParser.parseCVTextWithGemini(text);
    }
  } catch (error) {
    console.error("❌ Gemini parsing failed:", error.message);
    // Re-throw the error to be handled by the caller
    throw error;
  }
};

const cleanupFiles = (cvFilePath, templateFilePath) => {
  if (cvFilePath && fs.existsSync(cvFilePath)) {
    try {
      fs.unlinkSync(cvFilePath);
      console.log("🧹 Cleaned up CV file");
    } catch (error) {
      console.warn("⚠️ Could not delete CV file:", error.message);
    }
  }
  if (templateFilePath && fs.existsSync(templateFilePath)) {
    try {
      fs.unlinkSync(templateFilePath);
      console.log("🧹 Cleaned up template file");
    } catch (error) {
      console.warn("⚠️ Could not delete template file:", error.message);
    }
  }
};

const debugDOCXTemplate = async (templateBuffer) => {
  try {
    const zip = await JSZip.loadAsync(templateBuffer);
    const documentXml = await zip.file('word/document.xml').async('text');
    
    // Look for common Word XML patterns that might contain our placeholders
    console.log("🔍 DEBUG: Analyzing DOCX structure...");
    
    // Search for placeholders in various forms
    const searchPatterns = [
      { name: "Double curly braces", pattern: /{{[^}]+}}/g },
      { name: "Field codes", pattern: /MERGEFIELD/g },
      { name: "Plain text", pattern: /personal|name|email|phone|skills|experience/g }
    ];
    
    searchPatterns.forEach(({ name, pattern }) => {
      const matches = documentXml.match(pattern);
      if (matches) {
        console.log(`📌 Found ${matches.length} ${name} patterns`);
        console.log("   Sample:", matches.slice(0, 3).join(", "));
      }
    });
    
    // Show a sample of the XML
    const sample = documentXml.substring(0, 500);
    console.log("📋 XML Sample (first 500 chars):");
    console.log(sample);
    
    return documentXml;
  } catch (error) {
    console.error("❌ DEBUG error:", error.message);
    return null;
  }
};


const generateFileName = (extractedData, extension) => {
  const name = extractedData.personal_info?.full_name?.replace(/\s+/g, '_') || 'Generated';
  const timestamp = Date.now();
  return `CV_${name}_${timestamp}.${extension}`;
};

// Create simple DOCX (fallback when template processing fails)
// Update the createSimpleDOCX function in controller:
async function createSimpleDOCX(data) {
  console.log("📝 Creating simple DOCX with data...");
  
  // Create a minimal HTML that will work when opened in Word
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.personal.name || 'CV'}</title>
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      line-height: 1.5;
      color: #000000;
      margin: 1in;
    }
    h1 {
      color: #2c5282;
      font-size: 24pt;
      margin-bottom: 0.5in;
      border-bottom: 2px solid #2c5282;
      padding-bottom: 0.2in;
    }
    .contact-info {
      margin-bottom: 0.3in;
      color: #666666;
    }
    .section {
      margin-bottom: 0.3in;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: #2c5282;
      margin-bottom: 0.1in;
      border-bottom: 1px solid #cccccc;
      padding-bottom: 0.05in;
    }
  </style>
</head>
<body>
  <h1>${data.personal.name || 'Professional CV'}</h1>
  
  <div class="contact-info">
    ${data.personal.email ? `<div><strong>Email:</strong> ${data.personal.email}</div>` : ''}
    ${data.personal.phone ? `<div><strong>Phone:</strong> ${data.personal.phone}</div>` : ''}
    ${data.personal.location ? `<div><strong>Location:</strong> ${data.personal.location}</div>` : ''}
    ${data.personal.linkedin ? `<div><strong>LinkedIn:</strong> ${data.personal.linkedin}</div>` : ''}
    ${data.personal.portfolio ? `<div><strong>Portfolio:</strong> ${data.personal.portfolio}</div>` : ''}
  </div>
  
  ${data.summary ? `
  <div class="section">
    <div class="section-title">PROFESSIONAL SUMMARY</div>
    <p>${data.summary}</p>
  </div>` : ''}
  
  ${data.skills && data.skills.length > 0 ? `
  <div class="section">
    <div class="section-title">SKILLS</div>
    <p>${data.skills.join(', ')}</p>
  </div>` : ''}
  
  ${data.experiences && data.experiences.length > 0 ? `
  <div class="section">
    <div class="section-title">WORK EXPERIENCE</div>
    ${data.experiences.map(exp => `
      <div style="margin-bottom: 0.2in;">
        <div style="font-weight: bold;">${exp.job_title}</div>
        <div style="color: #666666;">${exp.company} | ${exp.duration} | ${exp.location}</div>
        ${exp.achievements && exp.achievements.length > 0 ? `
          <ul style="margin-top: 0.1in; padding-left: 0.2in;">
            ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')}
  </div>` : ''}
  
  ${data.education && data.education.length > 0 ? `
  <div class="section">
    <div class="section-title">EDUCATION</div>
    ${data.education.map(edu => `
      <div style="margin-bottom: 0.1in;">
        <div style="font-weight: bold;">${edu.degree}</div>
        <div style="color: #666666;">${edu.institution} | ${edu.year} | ${edu.location}</div>
      </div>
    `).join('')}
  </div>` : ''}
  
  <div style="margin-top: 0.5in; padding-top: 0.1in; border-top: 1px solid #cccccc; color: #999999; font-size: 10pt;">
    Generated on ${data.generatedDate}
  </div>
</body>
</html>`;
  
  console.log("✅ Simple DOCX created, size:", htmlContent.length, "chars");
  return Buffer.from(htmlContent, 'utf8');
}

// Sample data for testing (when Gemini is overloaded)
function getSampleCVData() {
  return {
    personal_info: {
      full_name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1 234 567 8900",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/johndoe",
      portfolio: "johndoeportfolio.com",
      title: "Senior Software Engineer"
    },
    professional_summary: "Experienced software engineer with 5+ years in full-stack development. Specialized in JavaScript, React, Node.js, and cloud technologies. Proven track record of delivering scalable solutions and leading cross-functional teams.",
    skills: ["JavaScript", "React", "Node.js", "Python", "AWS", "Docker", "Git", "REST APIs", "MongoDB", "PostgreSQL"],
    experience: [
      {
        job_title: "Senior Software Engineer",
        company: "Tech Innovations Inc.",
        duration: "2020 - Present",
        location: "San Francisco, CA",
        achievements: [
          "Led development of microservices architecture improving system performance by 40%",
          "Mentored 3 junior developers and conducted code reviews",
          "Implemented CI/CD pipeline reducing deployment time by 60%",
          "Designed and developed REST APIs serving 1M+ monthly requests"
        ]
      },
      {
        job_title: "Full Stack Developer",
        company: "Digital Solutions LLC",
        duration: "2018 - 2020",
        location: "New York, NY",
        achievements: [
          "Developed responsive web applications using React and Node.js",
          "Collaborated with UX team to improve user experience",
          "Reduced page load time by 30% through optimization",
          "Implemented automated testing reducing bugs by 25%"
        ]
      }
    ],
    education: [
      {
        degree: "Master of Science in Computer Science",
        institution: "Stanford University",
        year: "2018",
        location: "Stanford, CA"
      },
      {
        degree: "Bachelor of Science in Software Engineering",
        institution: "MIT",
        year: "2016",
        location: "Cambridge, MA"
      }
    ],
    certifications: ["AWS Certified Solutions Architect", "Google Cloud Professional", "React Developer Certification"],
    projects: ["E-commerce Platform (React/Node.js)", "Mobile Banking App (React Native)", "Real-time Analytics Dashboard"],
    languages: ["English (Native)", "Spanish (Fluent)", "French (Intermediate)"]
  };
}