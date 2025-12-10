// controllers/templatePdfController.js - UPDATED WITH MASKING FEATURE
import { geminiVisionParser } from '../utils/geminiVisionParser.js';
import { docxTemplateService } from '../services/docxTemplateService.js';
import { getSampleTemplateHTML } from '../templates/sampleTemplate.js';
import { getAdvancedTemplateHTML, getTemplateExamples, getDebugTemplateHTML } from '../templates/advancedTemplate.js';
import fs from 'fs';
import JSZip from 'jszip';
import axios from 'axios';
import path from 'path';
import os from 'os';

// ============ MASKING HELPER FUNCTIONS ============

/**
 * Mask contact details in extracted data
 */
const applyContactDetailsMasking = (extractedData) => {
  console.log("🎭 Applying contact details masking...");
  
  if (!extractedData) return extractedData;
  
  const maskedData = JSON.parse(JSON.stringify(extractedData));
  
  // Mask personal info
  if (maskedData.personal_info) {
    console.log("   Masking personal information...");
    
    // Email - mask with ***
    if (maskedData.personal_info.email) {
      const email = maskedData.personal_info.email;
      const [localPart, domain] = email.split('@');
      const maskedLocal = localPart.length > 3 
        ? localPart.substring(0, 3) + '***'
        : '***';
      maskedData.personal_info.email = `${maskedLocal}@${domain}`;
      console.log(`     Email: ${email} → ${maskedData.personal_info.email}`);
    }
    
    // Phone - mask digits
    if (maskedData.personal_info.phone) {
      const phone = maskedData.personal_info.phone;
      const digits = phone.replace(/\D/g, '');
      if (digits.length > 4) {
        const lastFour = digits.slice(-4);
        maskedData.personal_info.phone = `***-***-${lastFour}`;
      } else {
        maskedData.personal_info.phone = '***-***-****';
      }
      console.log(`     Phone: ${phone} → ${maskedData.personal_info.phone}`);
    }
    
    // LinkedIn - remove
    if (maskedData.personal_info.linkedin) {
      console.log(`     LinkedIn: ${maskedData.personal_info.linkedin} → REMOVED`);
      delete maskedData.personal_info.linkedin;
    }
    
    // Portfolio/GitHub - remove
    if (maskedData.personal_info.portfolio) {
      console.log(`     Portfolio: ${maskedData.personal_info.portfolio} → REMOVED`);
      delete maskedData.personal_info.portfolio;
    }
    
    // GitHub - remove if exists
    if (maskedData.personal_info.github) {
      console.log(`     GitHub: ${maskedData.personal_info.github} → REMOVED`);
      delete maskedData.personal_info.github;
    }
    
    // Address - remove
    if (maskedData.personal_info.address) {
      console.log(`     Address: ${maskedData.personal_info.address} → REMOVED`);
      delete maskedData.personal_info.address;
    }
    
    // Other social links
    ['twitter', 'facebook', 'instagram', 'website'].forEach(social => {
      if (maskedData.personal_info[social]) {
        console.log(`     ${social}: ${maskedData.personal_info[social]} → REMOVED`);
        delete maskedData.personal_info[social];
      }
    });
  }
  
  // Also check for contact info in other sections
  if (maskedData.contact_info) {
    console.log("   Masking additional contact information...");
    Object.keys(maskedData.contact_info).forEach(key => {
      console.log(`     ${key}: ${maskedData.contact_info[key]} → REMOVED`);
    });
    delete maskedData.contact_info;
  }
  
  console.log("✅ Contact details masked successfully");
  return maskedData;
};

/**
 * Apply masking to template data
 */
const applyMaskingToTemplateData = (templateData) => {
  if (!templateData.personal) return templateData;
  
  const maskedData = { ...templateData };
  
  // Apply masking to personal info
  if (maskedData.personal.email) {
    const email = maskedData.personal.email;
    const [localPart, domain] = email.split('@');
    if (localPart && domain) {
      maskedData.personal.email = `${localPart.substring(0, 3)}***@${domain}`;
    }
  }
  
  if (maskedData.personal.phone) {
    const phone = maskedData.personal.phone;
    const digits = phone.replace(/\D/g, '');
    if (digits.length > 4) {
      const lastFour = digits.slice(-4);
      maskedData.personal.phone = `***-***-${lastFour}`;
    } else {
      maskedData.personal.phone = '***-***-****';
    }
  }
  
  // Remove social links
  maskedData.personal.linkedin = '';
  maskedData.personal.portfolio = '';
  
  return maskedData;
};

// ============ MAIN CONTROLLER FUNCTIONS ============

// Extract data from CV URL
export const extractDataFromCVUrl = async (req, res) => {
  try {
    const { cv_url, mask_contact_details } = req.body;
    if (!cv_url) return res.status(400).json({ error: "CV URL is required" });
    
    console.log(`🔗 Processing CV from URL: ${cv_url}`);
    console.log(`🎭 Mask contact details: ${mask_contact_details || false}`);
    
    const downloadedFile = await downloadFileFromUrl(cv_url);
    
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `cv_${Date.now()}_${downloadedFile.originalname}`);
    fs.writeFileSync(tempFilePath, downloadedFile.buffer);
    
    const fileObject = {
      path: tempFilePath,
      originalname: downloadedFile.originalname,
      mimetype: downloadedFile.contentType,
      size: downloadedFile.size
    };
    
    let extractedData;
    try {
      extractedData = await extractCVDataFromFile(fileObject, tempFilePath);
      console.log("✅ CV data extracted successfully from URL");
    } catch (error) {
      console.error("❌ CV extraction failed, using sample data:", error.message);
      extractedData = getSampleCVData();
    }
    
    // Apply masking if requested
    const originalData = JSON.parse(JSON.stringify(extractedData));
    if (mask_contact_details) {
      extractedData = applyContactDetailsMasking(extractedData);
    }
    
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    
    return res.json({
      success: true,
      extracted_data: extractedData,
      masking_applied: mask_contact_details || false,
      original_contact_info: mask_contact_details ? {
        email: originalData.personal_info?.email,
        phone: originalData.personal_info?.phone,
        linkedin: originalData.personal_info?.linkedin,
        portfolio: originalData.personal_info?.portfolio
      } : null,
      source: cv_url,
      file_info: {
        name: downloadedFile.originalname,
        size: downloadedFile.size,
        type: downloadedFile.contentType
      }
    });
  } catch (error) {
    console.error("❌ URL extraction error:", error);
    return res.status(500).json({ error: error.message || "Failed to process CV from URL" });
  }
};

// Generate DOCX from CV URL (UPDATED WITH MASKING)
export const generateDOCXFromCVUrl = async (req, res) => {
  let cvTempPath = null;
  let templateFilePath = null;
  let templateFile = null;

  try {
    console.log("🔗 Processing DOCX generation from CV URL");
    console.log("📤 Request method:", req.method);
    
    // Handle both JSON body (for URL only) and form-data (for URL + template)
    let cvUrl, maskContactDetails;
    
    if (req.body && typeof req.body === 'object') {
      cvUrl = req.body.cv_url;
      maskContactDetails = req.body.mask_contact_details === 'true' || 
                          req.body.mask_contact_details === true;
      console.log("📝 CV URL from body:", cvUrl);
      console.log("🎭 Mask contact details:", maskContactDetails);
    }
    
    if (!cvUrl) {
      return res.status(400).json({ 
        error: "CV URL is required. Send as JSON with cv_url field or form-data with cv_url field and optional template file." 
      });
    }
    
    // 1. Download CV from URL
    console.log(`📥 Downloading CV from: ${cvUrl}`);
    const cvDownloadedFile = await downloadFileFromUrl(cvUrl);
    
    // Save to temp file
    const tempDir = os.tmpdir();
    cvTempPath = path.join(tempDir, `cv_${Date.now()}_${cvDownloadedFile.originalname}`);
    fs.writeFileSync(cvTempPath, cvDownloadedFile.buffer);
    
    console.log(`✅ CV downloaded: ${cvDownloadedFile.originalname} (${cvDownloadedFile.size} bytes)`);
    
    // Create file object for processing
    const cvFileObject = {
      path: cvTempPath,
      originalname: cvDownloadedFile.originalname,
      mimetype: cvDownloadedFile.contentType,
      size: cvDownloadedFile.size
    };
    
    // 2. Extract data from CV
    let extractedData;
    try {
      extractedData = await extractCVDataFromFile(cvFileObject, cvTempPath);
      console.log("✅ CV data extracted successfully");
    } catch (error) {
      console.error("❌ CV extraction failed, using sample data:", error.message);
      extractedData = getSampleCVData();
    }
    
    // 3. Apply masking if requested
    if (maskContactDetails) {
      console.log("🛡️ Applying contact details masking...");
      extractedData = applyContactDetailsMasking(extractedData);
    }
    
    // 4. Prepare template data
    let templateData = docxTemplateService.prepareTemplateData(extractedData);
    
    // Apply masking to template data if needed
    if (maskContactDetails) {
      templateData = applyMaskingToTemplateData(templateData);
    }
    
    console.log("📊 Template data prepared");
    
    // 5. Handle template (optional)
    let docxBuffer;
    
    // Check for template in different possible locations
    if (req.file) {
      templateFile = req.file;
      console.log("📝 Template from req.file:", templateFile.originalname);
    } else if (req.files && req.files['template'] && req.files['template'][0]) {
      templateFile = req.files['template'][0];
      console.log("📝 Template from req.files['template']:", templateFile.originalname);
    }
    
    if (templateFile) {
      templateFilePath = templateFile.path;
      const fileExt = templateFile.originalname.split('.').pop().toLowerCase();
      
      if (fileExt === 'docx' || fileExt === 'doc') {
        console.log(`📝 Using uploaded ${fileExt.toUpperCase()} template: ${templateFile.originalname}`);
        
        const templateBuffer = fs.readFileSync(templateFilePath);
        
        try {
          docxBuffer = await docxTemplateService.processDOCXTemplate(
            templateBuffer, 
            templateData
          );
          console.log("✅ Custom template processed successfully");
        } catch (templateError) {
          console.error("❌ Custom template processing failed:", templateError.message);
          
          // Fallback to simple DOCX
          console.log("📝 Falling back to simple DOCX...");
          docxBuffer = await createSimpleDOCX(templateData, maskContactDetails);
        }
      } else {
        throw new Error('Only DOCX/DOC templates are supported for upload.');
      }
    } else {
      console.log("📝 No template uploaded, creating simple DOCX (default template)");
      // Create a simple DOCX with the data
      docxBuffer = await createSimpleDOCX(templateData, maskContactDetails);
    }
    
    // 6. Clean up files
    cleanupFiles(cvTempPath, templateFilePath);
    
    console.log("✅ DOCX generated successfully");
    
    // 7. Send DOCX
    const fileName = generateFileName(extractedData, 'docx', maskContactDetails);
    console.log("📁 Generated filename:", fileName);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', docxBuffer.length);
    
    return res.send(docxBuffer);
    
  } catch (error) {
    // Clean up on error
    cleanupFiles(cvTempPath, templateFilePath);
    
    console.error("❌ URL DOCX generation error:", error);
    
    return res.status(500).json({ 
      error: error.message || "Failed to generate DOCX from URL"
    });
  }
};

// Generate DOCX from template (UPDATED WITH MASKING)
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
    
    // Get masking parameter
    const maskContactDetails = req.body.mask_contact_details === 'true' || 
                              req.body.mask_contact_details === true;
    
    console.log(`🎭 Mask contact details: ${maskContactDetails}`);
    console.log(`📄 Processing CV: ${cvFile.originalname}`);

    // 1. Extract data from CV
    let extractedData;
    try {
      extractedData = await extractCVDataFromFile(cvFile, cvFilePath);
      console.log("✅ CV data extracted successfully");
    } catch (error) {
      console.error("❌ CV extraction failed, using sample data:", error.message);
      extractedData = getSampleCVData();
    }

    // 2. Apply masking if requested
    if (maskContactDetails) {
      console.log("🛡️ Applying contact details masking...");
      extractedData = applyContactDetailsMasking(extractedData);
    }

    // 3. Prepare template data
    let templateData = docxTemplateService.prepareTemplateData(extractedData);
    
    // Apply masking to template data if needed
    if (maskContactDetails) {
      templateData = applyMaskingToTemplateData(templateData);
    }
    
    console.log("📊 Template data prepared");

    // 4. Check if template was uploaded
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
          docxBuffer = await docxTemplateService.processDOCXTemplate(
            templateBuffer, 
            templateData
          );
          console.log("✅ Template processed successfully, output size:", docxBuffer.length, "bytes");
        } catch (templateError) {
          console.error("❌ Template processing failed:", templateError.message);
          
          // Fallback to simple DOCX
          console.log("📝 Falling back to simple DOCX...");
          docxBuffer = await createSimpleDOCX(templateData, maskContactDetails);
        }
      } else {
        throw new Error('Only DOCX templates are supported for upload.');
      }
    } else {
      console.log("📝 No template uploaded, creating simple DOCX");
      // Create a simple DOCX with the data
      docxBuffer = await createSimpleDOCX(templateData, maskContactDetails);
    }

    // 5. Clean up files
    cleanupFiles(cvFilePath, templateFilePath);

    console.log("✅ DOCX generated successfully");

    // 6. Send DOCX
    const fileName = generateFileName(extractedData, 'docx', maskContactDetails);
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

// Generate DOCX from extracted data (UPDATED WITH MASKING)
export const generateDOCXFromExtractedData = async (req, res) => {
  try {
    const { extractedData, mask_contact_details } = req.body;
    
    if (!extractedData) {
      return res.status(400).json({ error: "No extracted data provided" });
    }
    
    const maskContactDetails = mask_contact_details === 'true' || 
                              mask_contact_details === true;
    
    console.log(`🎭 Mask contact details: ${maskContactDetails}`);

    // Apply masking if requested
    let processedData = JSON.parse(JSON.stringify(extractedData));
    if (maskContactDetails) {
      console.log("🛡️ Applying contact details masking...");
      processedData = applyContactDetailsMasking(processedData);
    }

    // Prepare data
    let templateData = docxTemplateService.prepareTemplateData(processedData);
    
    // Apply masking to template data if needed
    if (maskContactDetails) {
      templateData = applyMaskingToTemplateData(templateData);
    }

    // Generate simple DOCX
    const docxBuffer = await createSimpleDOCX(templateData, maskContactDetails);

    // Send DOCX
    const fileName = generateFileName(processedData, 'docx', maskContactDetails);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    return res.send(docxBuffer);

  } catch (error) {
    console.error("❌ DOCX generation error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ============ EXISTING FUNCTIONS (UNCHANGED) ============

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

export const getDebugTemplate = async (req, res) => {
  try {
    const template = getDebugTemplateHTML();
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="Debug_CV_Data_Structure_Template.html"');
    
    return res.send(template);
    
  } catch (error) {
    console.error("❌ Debug template error:", error);
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
            'has_summary',
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
      has_summary: true,
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
    
    // Create test docx XML structure
    const zip = new JSZip();
    const xmlContent = `<w:document><w:body><w:p><w:r><w:t>${testTemplate}</w:t></w:r></w:p></w:body></w:document>`;
    zip.file('word/document.xml', xmlContent);
    
    // Process the template
    const processed = await docxTemplateService.processWithAdvancedFeatures(
      xmlContent,
      sampleData
    );
    
    // Extract result
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
      throw new Error('Only DOCX files are supported.');
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
      message: "Template uploaded and validated successfully.",
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

export const testDOCXEndpoint = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "DOCX generation endpoint is working",
      endpoints: {
        generateDOCX: "POST /api/cv/generate-docx (CV only, uses default template)",
        generateWithTemplate: "POST /api/cv/generate-docx-with-template (CV + DOCX template)",
        generateFromURL: "POST /api/cv/generate-docx-from-url (CV URL)",
        generateFromURLWithTemplate: "POST /api/cv/generate-docx-from-url-with-template (CV URL + DOCX template)",
        generateFromData: "POST /api/cv/generate-docx-from-data (extracted data only)",
        sampleTemplate: "GET /api/cv/template/sample",
        advancedTemplate: "GET /api/cv/template/advanced",
        debugTemplate: "GET /api/cv/template/debug",
        uploadTemplate: "POST /api/cv/upload-template",
        test: "GET /api/cv/test-docx"
      },
      features: {
        masking: "All generation endpoints support mask_contact_details parameter",
        templates: "Must be DOCX format",
        placeholders: "Use [NAME], [EMAIL], [PHONE], etc. in your template",
        cvFormats: "PDF, DOCX, or images"
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
        isValid: templateFile.size > 100,
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

export const testDataFlow = async (req, res) => {
  let cvFilePath = null;
  
  try {
    if (!req.files || !req.files['cv']) {
      return res.status(400).json({ error: "CV file required" });
    }
    
    const cvFile = req.files['cv'][0];
    cvFilePath = cvFile.path;
    
    // Get masking parameter
    const maskContactDetails = req.body.mask_contact_details === 'true' || 
                              req.body.mask_contact_details === true;
    
    console.log(`🎭 Test with masking: ${maskContactDetails}`);
    
    // Extract data from CV
    const extractedData = await extractCVDataFromFile(cvFile, cvFilePath);
    
    // Apply masking if requested
    let processedData = extractedData;
    if (maskContactDetails) {
      processedData = applyContactDetailsMasking(processedData);
    }
    
    // Prepare template data
    const templateData = docxTemplateService.prepareTemplateData(processedData);
    
    // Clean up
    cleanupFiles(cvFilePath, null);
    
    return res.json({
      success: true,
      masking_applied: maskContactDetails,
      extractedData: {
        personal_info: extractedData.personal_info,
        skills: extractedData.skills,
        experience: extractedData.experience?.slice(0, 1),
        education: extractedData.education?.slice(0, 1)
      },
      templateData: {
        personal: templateData.personal,
        skills: templateData.skills,
        experiences: templateData.experiences?.slice(0, 1),
        education: templateData.education?.slice(0, 1)
      },
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

// ============ HELPER FUNCTIONS ============

const downloadFileFromUrl = async (url) => {
  try {
    console.log(`📥 Downloading file from URL: ${url}`);
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      maxContentLength: 20 * 1024 * 1024,
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    // Extract filename from URL
    let filename = 'downloaded_file';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        filename = lastPart.split('?')[0];
      }
    } catch (e) {
      console.warn('Could not parse URL for filename:', e.message);
    }
    
    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'] || '',
      originalname: filename,
      size: response.data.length
    };
  } catch (error) {
    console.error('❌ URL download error:', error.message);
    throw new Error(`Failed to download file from URL: ${error.message}`);
  }
};

const extractTextFromDOCX = async (docxBuffer) => {
  try {
    console.log("📝 Extracting text from DOCX file...");
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    let text = result.value.replace(/\r\n/g, '\n').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    console.log(`✅ DOCX text extracted: ${text.length} characters`);
    return text;
  } catch (error) {
    console.error("❌ DOCX text extraction failed:", error);
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
};

const extractCVDataFromFile = async (cvFile, cvFilePath) => {
  try {
    const cvBuffer = fs.readFileSync(cvFilePath);
    const fileType = cvFile.mimetype || path.extname(cvFile.originalname).toLowerCase();

    if (cvFile.mimetype.includes("pdf") || fileType.endsWith('.pdf')) {
      console.log("🔄 Parsing PDF with Gemini...");
      return await geminiVisionParser.parsePDFWithVision(cvBuffer, cvFile.originalname);
    } else if (cvFile.mimetype.includes("image") || 
               ['.jpg', '.jpeg', '.png'].some(ext => fileType.endsWith(ext))) {
      console.log("🔄 Parsing image with Gemini...");
      return await geminiVisionParser.parseImageWithVision(cvBuffer, cvFile.mimetype, cvFile.originalname);
    } else if (cvFile.mimetype.includes("word") || fileType.endsWith('.docx') || fileType.endsWith('.doc')) {
      console.log("🔄 Parsing DOCX with Gemini...");
      const text = await extractTextFromDOCX(cvBuffer);
      return await geminiVisionParser.parseCVTextWithGemini(text);
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

const generateFileName = (extractedData, extension, maskContactDetails = false) => {
  const name = extractedData.personal_info?.full_name?.replace(/\s+/g, '_') || 'Generated_CV';
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const maskSuffix = maskContactDetails ? '_masked' : '';
  return `${name}${maskSuffix}_${timestamp}.${extension}`;
};

/**
 * Create a simple DOCX (HTML that Word can open) with masking support
 */
async function createSimpleDOCX(data, maskContactDetails = false) {
  console.log("📝 Creating simple DOCX with data..." + (maskContactDetails ? " (masked)" : ""));
  
  // Apply masking to template data if needed
  let displayData = { ...data };
  if (maskContactDetails) {
    displayData = applyMaskingToTemplateData(displayData);
  }
  
  // Create an HTML that Word can open
  const htmlContent = `
<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:m="http://schemas.microsoft.com/office/2004/12/omml" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <meta name="ProgId" content="Word.Document">
  <meta name="Generator" content="Microsoft Word 15">
  <meta name="Originator" content="Microsoft Word 15">
  <title>${displayData.personal.name || 'CV'}</title>
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
    .privacy-notice {
      background-color: #f0f7ff;
      border-left: 4px solid #4a90e2;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 9pt;
      color: #2c5282;
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
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6pt;
    }
    th {
      background-color: #f2f2f2;
      text-align: left;
      padding: 8pt;
      border: 1pt solid #dddddd;
      font-weight: bold;
      color: #2c5282;
    }
    td {
      padding: 8pt;
      border: 1pt solid #dddddd;
      vertical-align: top;
    }
    .job-title {
      font-weight: bold;
      color: #333333;
    }
    .company-info {
      color: #666666;
      font-size: 10pt;
    }
    .achievement-list {
      margin: 0;
      padding-left: 12pt;
    }
  </style>
</head>
<body>
  <h1>${displayData.personal.name || 'Professional CV'}</h1>
  
  ${maskContactDetails ? `
  <div class="privacy-notice">
    <strong>🔒 Privacy Protected:</strong> Contact details have been masked for privacy
  </div>
  ` : ''}
  
  <div class="contact-info">
    ${displayData.personal.email ? `<div><strong>Email:</strong> ${displayData.personal.email}</div>` : ''}
    ${displayData.personal.phone ? `<div><strong>Phone:</strong> ${displayData.personal.phone}</div>` : ''}
    ${displayData.personal.location ? `<div><strong>Location:</strong> ${displayData.personal.location}</div>` : ''}
    ${!maskContactDetails && displayData.personal.linkedin ? `<div><strong>LinkedIn:</strong> ${displayData.personal.linkedin}</div>` : ''}
    ${!maskContactDetails && displayData.personal.portfolio ? `<div><strong>Portfolio:</strong> ${displayData.personal.portfolio}</div>` : ''}
  </div>
  
  ${displayData.summary ? `
  <div class="section">
    <h2>PROFESSIONAL SUMMARY</h2>
    <p>${displayData.summary}</p>
  </div>` : ''}
  
  ${displayData.skills && displayData.skills.length > 0 ? `
  <div class="section">
    <h2>SKILLS</h2>
    <p>${displayData.skills.join(', ')}</p>
  </div>` : ''}
  
  ${displayData.experiences && displayData.experiences.length > 0 ? `
  <div class="section">
    <h2>WORK EXPERIENCE</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 20%;">Period</th>
          <th style="width: 30%;">Position & Company</th>
          <th style="width: 50%;">Key Achievements & Responsibilities</th>
        </tr>
      </thead>
      <tbody>
        ${displayData.experiences.map(exp => `
          <tr>
            <td>
              <div>${exp.duration}</div>
              <div class="company-info">${exp.location || ''}</div>
            </td>
            <td>
              <div class="job-title">${exp.job_title}</div>
              <div class="company-info">${exp.company}</div>
            </td>
            <td>
              ${exp.achievements && exp.achievements.length > 0 ? `
                <ul class="achievement-list">
                  ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
                </ul>
              ` : '<div style="color: #999999; font-style: italic;">No achievements listed</div>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>` : ''}
  
  ${displayData.education && displayData.education.length > 0 ? `
  <div class="section">
    <h2>EDUCATION</h2>
    ${displayData.education.map(edu => `
      <div style="margin-bottom: 6pt;">
        <div style="font-weight: bold;">${edu.degree}</div>
        <div style="color: #666666;">${edu.institution} | ${edu.year} | ${edu.location}</div>
      </div>
    `).join('')}
  </div>` : ''}
  
  ${displayData.certifications && displayData.certifications.length > 0 ? `
  <div class="section">
    <h2>CERTIFICATIONS</h2>
    <p>${displayData.certifications.join(', ')}</p>
  </div>` : ''}
  
  ${displayData.languages && displayData.languages.length > 0 ? `
  <div class="section">
    <h2>LANGUAGES</h2>
    <p>${displayData.languages.join(', ')}</p>
  </div>` : ''}
  
  ${displayData.projects && displayData.projects.length > 0 ? `
  <div class="section">
    <h2>PROJECTS</h2>
    ${displayData.projects.map((proj, index) => `
      <div style="margin-bottom: 6pt;">
        <div style="font-weight: bold;">Project ${index + 1}</div>
        <p>${proj}</p>
      </div>
    `).join('')}
  </div>` : ''}
  
  <div style="margin-top: 24pt; padding-top: 6pt; border-top: 0.5pt solid #cccccc; color: #999999; font-size: 9pt;">
    Generated on ${displayData.generatedDate || new Date().toLocaleDateString()}
    ${maskContactDetails ? ' • Contact details masked for privacy' : ''}
  </div>
</body>
</html>`;
  
  console.log("✅ Simple DOCX created");
  return Buffer.from(htmlContent, 'utf8');
}

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