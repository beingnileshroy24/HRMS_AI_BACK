// controllers/templatePdfController.js
import { pdfTemplateService } from '../services/pdfTemplateService.js';
import { geminiVisionParser } from '../utils/geminiVisionParser.js';
import { libreofficePDFService } from '../services/libreofficePdfService.js';
import fs from 'fs';

export const generatePDFFromTemplate = async (req, res) => {
  let cvFilePath = null;
  let templateFilePath = null;

  try {
    console.log("📤 Received request for PDF generation with template");
    
    if (!req.files || !req.files['cv']) {
      return res.status(400).json({ 
        error: "CV file is required" 
      });
    }

    const cvFile = req.files['cv'][0];
    cvFilePath = cvFile.path;

    console.log(`📄 Processing CV: ${cvFile.originalname}`);

    // 1. Extract data from CV using Gemini
    const cvBuffer = fs.readFileSync(cvFilePath);
    let extractedData;

    if (cvFile.mimetype.includes("pdf")) {
      console.log("🔄 Parsing PDF with Gemini...");
      extractedData = await geminiVisionParser.parsePDFWithVision(cvBuffer, cvFile.originalname);
    } else if (cvFile.mimetype.includes("image")) {
      console.log("🔄 Parsing image with Gemini...");
      extractedData = await geminiVisionParser.parseImageWithVision(
        cvBuffer, 
        cvFile.mimetype, 
        cvFile.originalname
      );
    } else {
      console.log("🔄 Parsing text with Gemini...");
      const text = fs.readFileSync(cvFilePath, 'utf8');
      extractedData = await geminiVisionParser.parseCVTextWithGemini(text);
    }

    console.log("✅ CV data extracted successfully");

    // 2. Prepare template data
    const templateData = libreofficePDFService.prepareTemplateData(extractedData);

    // 3. Check if template was uploaded
    let pdfBuffer;
    
    if (req.files['template'] && req.files['template'][0]) {
      const templateFile = req.files['template'][0];
      templateFilePath = templateFile.path;
      const fileExt = templateFile.originalname.split('.').pop().toLowerCase();
      
      if (fileExt === 'docx') {
        console.log("📝 Using uploaded DOCX template");
        const templateBuffer = fs.readFileSync(templateFilePath);
        
        // Generate PDF from DOCX template
        pdfBuffer = await libreofficePDFService.generatePDFFromTemplate(
          templateBuffer, 
          templateData
        );
      } else if (fileExt === 'html') {
        console.log("📝 Using HTML template (converting to DOCX first)");
        const htmlContent = fs.readFileSync(templateFilePath, 'utf8');
        // For HTML, create a simple DOCX first
        const simpleDocx = libreofficePDFService.createSimpleDOCX(templateData);
        pdfBuffer = await libreofficePDFService.convertDOCXtoPDF(simpleDocx);
      } else {
        throw new Error('Only DOCX and HTML templates are supported');
      }
    } else {
      console.log("📝 Using default template");
      // Generate default PDF
      const simpleDocx = libreofficePDFService.createSimpleDOCX(templateData);
      pdfBuffer = await libreofficePDFService.convertDOCXtoPDF(simpleDocx);
    }

    // 4. Clean up files
    if (cvFilePath && fs.existsSync(cvFilePath)) fs.unlinkSync(cvFilePath);
    if (templateFilePath && fs.existsSync(templateFilePath)) fs.unlinkSync(templateFilePath);

    console.log("✅ PDF generated successfully with LibreOffice");

    // 5. Send PDF
    const fileName = `CV_${extractedData.personal_info?.full_name?.replace(/\s+/g, '_') || 'Generated'}_${Date.now()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    return res.send(pdfBuffer);

  } catch (error) {
    // Clean up on error
    if (cvFilePath && fs.existsSync(cvFilePath)) fs.unlinkSync(cvFilePath);
    if (templateFilePath && fs.existsSync(templateFilePath)) fs.unlinkSync(templateFilePath);
    
    console.error("❌ PDF generation error:", error);
    
    // Provide helpful error message
    let errorMessage = error.message;
    if (error.message.includes('libreoffice')) {
      errorMessage += '\n\nPlease ensure LibreOffice is installed on your system.\n';
      errorMessage += 'Installation commands:\n';
      errorMessage += '  macOS: brew install --cask libreoffice\n';
      errorMessage += '  Ubuntu: sudo apt-get install libreoffice\n';
      errorMessage += '  Windows: Download from https://www.libreoffice.org/download/\n';
    }
    
    return res.status(500).json({ 
      error: errorMessage 
    });
  }
};

export const generatePDFFromExtractedData = async (req, res) => {
  try {
    const { extractedData, templateType = 'html', templateContent } = req.body;
    
    if (!extractedData) {
      return res.status(400).json({ error: "No extracted data provided" });
    }

    // Use provided template or default
    const finalTemplate = templateContent || pdfTemplateService.getDefaultHTMLTemplate();
    
    // Prepare data
    const templateData = pdfTemplateService.prepareTemplateData(extractedData);
    
    // Generate PDF
    const pdfBuffer = await pdfTemplateService.generatePDFFromTemplate(
      templateType,
      finalTemplate,
      templateData
    );

    // Send PDF
    const fileName = `CV_${extractedData.personal_info?.full_name?.replace(/\s+/g, '_') || 'Generated'}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    return res.send(pdfBuffer);

  } catch (error) {
    console.error("❌ PDF generation error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const downloadSampleTemplate = async (req, res) => {
  try {
    const sampleTemplate = pdfTemplateService.getDefaultHTMLTemplate();
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="CV_Template_Sample.html"');
    
    return res.send(sampleTemplate);
    
  } catch (error) {
    console.error("❌ Sample template error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Simple test endpoint
export const testPDFEndpoint = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "PDF generation endpoint is working",
      endpoints: {
        generatePDF: "/api/cv/generate-pdf-template",
        generateFromData: "/api/cv/generate-pdf-from-data",
        sampleTemplate: "/api/cv/template/sample",
        test: "/api/cv/test-pdf"
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};