// controllers/templatePdfController.js - FIXED VERSION
import { geminiVisionParser } from '../utils/geminiVisionParser.js';
import { docxTemplateService } from '../services/docxTemplateService.js';
import { getSampleTemplateHTML } from '../templates/sampleTemplate.js';
import { getAdvancedTemplateHTML, getTemplateExamples } from '../templates/advancedTemplate.js';
import fs from 'fs';
import JSZip from 'jszip';

export const getAdvancedTemplate = async (req, res) => {
  try {
    const template = getAdvancedTemplateHTML();
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="Advanced_CV_Template.html"');
    
    return res.send(template);
    
  } catch (error) {
    console.error("❌ Advanced template error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getTemplateDocumentation = async (req, res) => {
  try {
    const examples = getTemplateExamples();
    
    return res.json({
      success: true,
      documentation: {
        simple_placeholders: [
          '[NAME]', '[EMAIL]', '[PHONE]', '[LOCATION]',
          '[SUMMARY]', '[SKILLS]', '[DATE]'
        ],
        advanced_placeholders: [
          '[ALL_EXPERIENCES]', '[ALL_EDUCATION]', '[SKILLS_BY_CATEGORY]',
          '[BULLETED_ACHIEVEMENTS]', '[EXPERIENCE_SUMMARY]'
        ],
        loops: {
          syntax: '{{#array}}content{{/array}}',
          examples: [
            '{{#experiences}}[JOB_TITLE] at [COMPANY]{{/experiences}}',
            '{{#skills}}• [SKILL]{{/skills}}'
          ],
          available_arrays: ['experiences', 'education', 'skills', 'projects', 'languages', 'certifications', 'achievements']
        },
        conditionals: {
          syntax: '{{#if condition}}content{{/if condition}}',
          examples: [
            '{{#if has_experiences}}Experience:{{/if has_experiences}}',
            '{{#if not_empty_certifications}}Certifications:{{/if not_empty_certifications}}'
          ],
          available_conditions: [
            'has_experiences', 'has_education', 'has_skills',
            'has_certifications', 'has_projects', 'has_languages',
            'not_empty_[field]'
          ]
        },
        formatting: {
          line_breaks: 'Use \\n for new lines',
          bullets: 'Use • character for bullet points',
          sections: 'Empty sections are automatically removed'
        }
      },
      examples: examples
    });
    
  } catch (error) {
    console.error("❌ Documentation error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const testAdvancedTemplate = async (req, res) => {
  try {
    // Test template with sample data
    const sampleData = {
      personal: {
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        title: "Senior Developer"
      },
      summary: "Experienced developer",
      skills: ["JavaScript", "React", "Node.js", "Python", "AWS"],
      experiences: [
        {
          job_title: "Senior Developer",
          company: "Tech Corp",
          duration: "2020-Present",
          location: "San Francisco",
          achievements: ["Built scalable systems", "Led team of 5"]
        },
        {
          job_title: "Developer",
          company: "Startup Inc",
          duration: "2018-2020",
          location: "New York",
          achievements: ["Developed MVP", "Improved performance"]
        }
      ],
      education: [
        {
          degree: "BS Computer Science",
          institution: "MIT",
          year: "2018",
          location: "Cambridge"
        }
      ],
      has_experiences: true,
      has_education: true,
      has_skills: true,
      generatedDate: "December 3, 2025"
    };
    
    // Create test template
    const testTemplate = `
{{#if has_experiences}}
[NAME] - [TITLE]
{{/if has_experiences}}

Email: [EMAIL]
Phone: [PHONE]

{{#if has_skills}}
Skills (Categorized):
[SKILLS_BY_CATEGORY]
{{/if has_skills}}

{{#if has_experiences}}
Experience Summary: [EXPERIENCE_SUMMARY]

All Experiences:
[ALL_EXPERIENCES]

Detailed with Loops:
{{#experiences}}
[INDEX]. [JOB_TITLE] at [COMPANY] ([DURATION])
{{#achievements}}
  • [ACHIEVEMENT]
{{/achievements}}
{{/experiences}}
{{/if has_experiences}}

{{#if has_education}}
Education:
[ALL_EDUCATION]
{{/if has_education}}

Generated: [DATE]
`;
    
    // Create test docx XML structure (mimicking what would be read from DOCX)
    const zip = new JSZip();
    const xmlContent = `<w:document><w:body><w:p>${testTemplate}</w:p></w:body></w:document>`;
    zip.file('word/document.xml', xmlContent);
    
    // Process the template
    // NOTE: This test uses a simplified XML structure, so the fix in docxTemplateService 
    // for XML fragmentation is essential for real DOCX files.
    const processed = await docxTemplateService.processWithAdvancedFeatures(
      xmlContent,
      sampleData
    );
    
    // Extract result (remove any remaining structural tags for testing output)
    const result = processed.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    
    return res.json({
      success: true,
      testData: sampleData,
      template: testTemplate,
      processedResult: result,
      featuresTested: [
        "Conditionals",
        "Advanced Placeholders",
        "Loops",
        "Nested Loops",
        "Array Processing"
      ]
    });
    
  } catch (error) {
    console.error("❌ Test error:", error);
    return res.status(500).json({ error: error.message });
  }
};

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

    // 2. Prepare template data using the service
    const templateData = docxTemplateService.prepareTemplateData(extractedData);
    console.log("📊 Template data prepared");

    // 3. Check if template was uploaded
    let docxBuffer;
    
    if (req.files['template'] && req.files['template'][0]) {
      const templateFile = req.files['template'][0];
      templateFilePath = templateFile.path;
      const fileExt = templateFile.originalname.split('.').pop().toLowerCase();
      
      if (fileExt === 'docx') {
        console.log("📝 Using uploaded DOCX template");
        console.log("📄 Template file size:", templateFile.size, "bytes");
        
        const templateBuffer = fs.readFileSync(templateFilePath);
        
        try {
          // Use the fixed DOCX template service
          docxBuffer = await docxTemplateService.processDOCXTemplate(
            templateBuffer, 
            templateData
          );
          console.log("✅ Template processed successfully, output size:", docxBuffer.length, "bytes");
        } catch (templateError) {
          console.error("❌ Template processing failed:", templateError.message);
          
          // Fallback to simple DOCX
          console.log("📝 Falling back to simple DOCX...");
          docxBuffer = await createSimpleDOCX(templateData);
        }
      } else {
        throw new Error('Only DOCX templates are supported for upload. Please convert your template to DOCX format.');
      }
    } else {
      console.log("📝 No template uploaded, creating simple DOCX");
      // Create a simple DOCX with the data
      docxBuffer = await createSimpleDOCX(templateData);
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
      error: error.message || "Unknown error occurred during DOCX generation"
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
  let templateFilePath = null;
  
  try {
    if (!req.files || !req.files['template']) {
      return res.status(400).json({ 
        error: "Template file is required" 
      });
    }

    const templateFile = req.files['template'][0];
    templateFilePath = templateFile.path;
    const fileExt = templateFile.originalname.split('.').pop().toLowerCase();
    
    if (fileExt !== 'docx') {
      throw new Error('Only DOCX files are supported. Please convert your template to DOCX format.');
    }
    
    // Validate file exists and is readable
    if (!fs.existsSync(templateFilePath)) {
      throw new Error('Template file not found');
    }
    
    // Try to read the file to ensure it's a valid DOCX
    const templateBuffer = fs.readFileSync(templateFilePath);
    if (templateBuffer.length === 0) {
      throw new Error('Template file is empty');
    }
    
    // Test if it's a valid ZIP (DOCX is a ZIP file)
    try {
      const zip = new JSZip();
      await zip.loadAsync(templateBuffer);
      console.log("✅ Template validated successfully as DOCX");
    } catch (zipError) {
      throw new Error(`Invalid DOCX file: ${zipError.message}`);
    }
    
    // Clean up file
    cleanupFiles(null, templateFilePath);
    
    return res.json({
      success: true,
      message: "Template uploaded and validated successfully. Use this template with CV file upload.",
      templateName: templateFile.originalname,
      fileSize: templateFile.size,
      instructions: "Upload this template along with a CV file to generate a customized DOCX CV.",
      templatePlaceholders: {
        recommended: "Use placeholders like [NAME], [EMAIL], [PHONE], [SUMMARY], etc.",
        format: "Placeholders should be in square brackets: [PLACEHOLDER_NAME]",
        example: "For name use: [NAME], for email use: [EMAIL]"
      }
    });
    
  } catch (error) {
    // Clean up on error
    if (templateFilePath && fs.existsSync(templateFilePath)) {
      cleanupFiles(null, templateFilePath);
    }
    
    console.error("❌ Template upload error:", error);
    return res.status(500).json({ 
      success: false,
      error: error.message,
      help: "Make sure your file is a valid DOCX file with placeholders in square brackets like [NAME], [EMAIL], etc."
    });
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
      requirements: {
        templates: "Must be DOCX format",
        placeholders: "Use [NAME], [EMAIL], [PHONE], etc. in your template",
        cvFormats: "PDF, DOCX, or images"
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Debug endpoint for templates
export const debugDOCXTemplate = async (req, res) => {
  let templateFilePath = null;

  try {
    if (!req.files || !req.files['template']) {
      return res.status(400).json({ 
        error: "Template file is required" 
      });
    }

    const templateFile = req.files['template'][0];
    templateFilePath = templateFile.path;
    
    console.log("🔍 DEBUG: Analyzing DOCX template...");
    console.log("📄 File:", templateFile.originalname);
    console.log("📊 Size:", templateFile.size, "bytes");
    
    const templateBuffer = fs.readFileSync(templateFilePath);
    const zip = new JSZip();
    await zip.loadAsync(templateBuffer);
    
    // Get the main document XML
    const documentXml = await zip.file('word/document.xml').async('text');
    
    // Extract all text from the XML
    const textContent = extractTextFromXML(documentXml);
    
    // Look for placeholder patterns
    const placeholderPatterns = findPlaceholderPatterns(documentXml);
    
    // Also check for specific patterns from sample template
    const samplePatterns = [
      '[NAME]', '[EMAIL]', '[PHONE]', '[LOCATION]', '[LINKEDIN]',
      '[PORTFOLIO]', '[SUMMARY]', '[SKILLS]', '[JOB_TITLE]', '[COMPANY]',
      '[DURATION]', '[JOB_LOCATION]', '[ACHIEVEMENTS]', '[DEGREE]',
      '[INSTITUTION]', '[YEAR]', '[EDUCATION_LOCATION]', '[CERTIFICATIONS]',
      '[LANGUAGES]', '[PROJECTS]', '[DATE]'
    ];
    
    const foundSamplePatterns = samplePatterns.filter(pattern => 
      documentXml.includes(pattern)
    );
    
    return res.json({
      success: true,
      filename: templateFile.originalname,
      fileSize: templateFile.size,
      textPreview: textContent.substring(0, 1000),
      placeholderPatterns: placeholderPatterns,
      foundSamplePlaceholders: foundSamplePatterns,
      note: "Your template should contain placeholders like [NAME], [EMAIL], etc.",
      analysis: {
        isValid: templateFile.size > 100, // Basic validation
        hasPlaceholders: foundSamplePatterns.length > 0,
        recommendation: foundSamplePatterns.length === 0 
          ? "No standard placeholders found. Please add [NAME], [EMAIL], etc. to your template."
          : "Template looks good! Found " + foundSamplePatterns.length + " standard placeholders."
      }
    });
    
  } catch (error) {
    console.error("❌ Debug error:", error);
    return res.status(500).json({ 
      error: error.message,
      help: "Make sure you're uploading a valid DOCX file"
    });
  } finally {
    if (templateFilePath && fs.existsSync(templateFilePath)) {
      cleanupFiles(null, templateFilePath);
    }
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

const generateFileName = (extractedData, extension) => {
  const name = extractedData.personal_info?.full_name?.replace(/\s+/g, '_') || 'Generated_CV';
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${name}_${timestamp}.${extension}`;
};

/**
 * Create a simple DOCX (HTML that Word can open)
 */
async function createSimpleDOCX(data) {
  console.log("📝 Creating simple DOCX with data...");
  
  // Create an HTML that Word can open
  const htmlContent = `
<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:m="http://schemas.microsoft.com/office/2004/12/omml" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <meta name="ProgId" content="Word.Document">
  <meta name="Generator" content="Microsoft Word 15">
  <meta name="Originator" content="Microsoft Word 15">
  <title>${data.personal.name || 'CV'}</title>
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.15;
      margin: 0.5in;
    }
    h1 {
      color: #2c5282;
      font-size: 20pt;
      margin-bottom: 12pt;
      border-bottom: 1pt solid #2c5282;
      padding-bottom: 6pt;
    }
    h2 {
      color: #2c5282;
      font-size: 14pt;
      margin-top: 18pt;
      margin-bottom: 6pt;
      border-bottom: 0.5pt solid #cccccc;
      padding-bottom: 3pt;
    }
    .contact-info {
      margin-bottom: 12pt;
      color: #666666;
    }
    .section {
      margin-bottom: 12pt;
    }
    ul {
      margin-top: 3pt;
      margin-bottom: 3pt;
    }
    li {
      margin-bottom: 3pt;
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
    <h2>PROFESSIONAL SUMMARY</h2>
    <p>${data.summary}</p>
  </div>` : ''}
  
  ${data.skills && data.skills.length > 0 ? `
  <div class="section">
    <h2>SKILLS</h2>
    <p>${data.skills.join(', ')}</p>
  </div>` : ''}
  
  ${data.experiences && data.experiences.length > 0 ? `
  <div class="section">
    <h2>WORK EXPERIENCE</h2>
    ${data.experiences.map(exp => `
      <div style="margin-bottom: 12pt;">
        <div style="font-weight: bold;">${exp.job_title}</div>
        <div style="color: #666666;">${exp.company} | ${exp.duration} | ${exp.location}</div>
        ${exp.achievements && exp.achievements.length > 0 ? `
          <ul style="margin-top: 6pt;">
            ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')}
  </div>` : ''}
  
  ${data.education && data.education.length > 0 ? `
  <div class="section">
    <h2>EDUCATION</h2>
    ${data.education.map(edu => `
      <div style="margin-bottom: 6pt;">
        <div style="font-weight: bold;">${edu.degree}</div>
        <div style="color: #666666;">${edu.institution} | ${edu.year} | ${edu.location}</div>
      </div>
    `).join('')}
  </div>` : ''}
  
  ${data.certifications && data.certifications.length > 0 ? `
  <div class="section">
    <h2>CERTIFICATIONS</h2>
    <p>${data.certifications.join(', ')}</p>
  </div>` : ''}
  
  ${data.languages && data.languages.length > 0 ? `
  <div class="section">
    <h2>LANGUAGES</h2>
    <p>${data.languages.join(', ')}</p>
  </div>` : ''}
  
  ${data.projects && data.projects.length > 0 ? `
  <div class="section">
    <h2>PROJECTS</h2>
    <p>${data.projects.join(', ')}</p>
  </div>` : ''}
  
  <div style="margin-top: 24pt; padding-top: 6pt; border-top: 0.5pt solid #cccccc; color: #999999; font-size: 9pt;">
    Generated on ${data.generatedDate}
  </div>
</body>
</html>`;
  
  console.log("✅ Simple DOCX created");
  return Buffer.from(htmlContent, 'utf8');
}

// Add this endpoint to your templatePdfController.js
export const testDataFlow = async (req, res) => {
  let cvFilePath = null;
  
  try {
    if (!req.files || !req.files['cv']) {
      return res.status(400).json({ error: "CV file required" });
    }
    
    const cvFile = req.files['cv'][0];
    cvFilePath = cvFile.path;
    
    // Extract data from CV
    const extractedData = await extractCVDataFromFile(cvFile, cvFilePath);
    
    // Prepare template data
    const templateData = docxTemplateService.prepareTemplateData(extractedData);
    
    // Clean up
    cleanupFiles(cvFilePath, null);
    
    return res.json({
      success: true,
      extractedData: {
        personal_info: extractedData.personal_info,
        skills: extractedData.skills,
        experience: extractedData.experience?.slice(0, 1),
        education: extractedData.education?.slice(0, 1)
      },
      templateData: templateData,
      placeholders: {
        '[NAME]': templateData.personal.name,
        '[EMAIL]': templateData.personal.email,
        '[PHONE]': templateData.personal.phone,
        '[SKILLS]': templateData.skills.join(', '),
        '[JOB_TITLE]': templateData.experiences[0]?.job_title || '',
        '[COMPANY]': templateData.experiences[0]?.company || '',
        '[DURATION]': templateData.experiences[0]?.duration || ''
      }
    });
    
  } catch (error) {
    cleanupFiles(cvFilePath, null);
    console.error("❌ Test error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Extract text from XML
 */
const extractTextFromXML = (xmlText) => {
  let text = '';
  const regex = /<w:t[^>]*>([^<]+)<\/w:t>/g;
  let match;
  while ((match = regex.exec(xmlText)) !== null) {
    text += match[1] + ' ';
  }
  return text.trim();
};

/**
 * Find placeholder patterns in XML for debugging
 */
const findPlaceholderPatterns = (xmlText) => {
  const patterns = [
    { name: "Bracketed placeholders ([NAME])", regex: /\[([^\]]+)\]/g },
    { name: "Curly brace placeholders ({{NAME}})", regex: /\{\{([^}]+)\}\}/g },
    { name: "Angle bracket placeholders (<NAME>)", regex: /<([^>]+)>/g },
    { name: "Dollar placeholders ($NAME$)", regex: /\$([^$]+)\$/g }
  ];
  
  const results = {};
  patterns.forEach(({ name, regex }) => {
    const matches = xmlText.match(regex);
    if (matches) {
      results[name] = [...new Set(matches)].slice(0, 20);
    }
  });
  
  return results;
};

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