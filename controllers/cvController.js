import fs from "fs";
import { extractText } from "../utils/extractText.js";
import { createTemplatePdf } from "../utils/createTemplatePdf.js";
import { geminiVisionParser } from "../utils/geminiVisionParser.js";
import { fillDocxTemplate } from "../utils/docxMerger.js";
import { 
  saveParsedCVData, 
  getAllParsedCVs, 
  getCVDataById,
  searchCVs,
  deleteCVData,
  getCVStats 
} from "../services/dataStorageService.js";
import dotenv from "dotenv";
import { generateProfessionalPDF } from '../services/pdfGeneratorService.js';
dotenv.config();

export const extractCVData = async (req, res) => {
  let filePath = null;

  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key not configured",
      });
    }

    filePath = file.path;
    console.log(`📁 Processing file: ${file.originalname}, Type: ${file.mimetype}`);

    const fileBuffer = fs.readFileSync(filePath);
    let extractedData;

    // Use Gemini Vision based on file type
    if (file.mimetype.includes("pdf")) {
      console.log("🔄 Using Gemini Vision for PDF parsing...");
      extractedData = await geminiVisionParser.parsePDFWithVision(fileBuffer, file.originalname);
    } else if (file.mimetype.includes("image")) {
      console.log("🔄 Using Gemini Vision for image parsing...");
      extractedData = await geminiVisionParser.parseImageWithVision(fileBuffer, file.mimetype, file.originalname);
    } else {
      console.log("🔄 Extracting text and using Gemini for parsing...");
      const extractedText = await extractText(filePath, file.mimetype);
      extractedData = await geminiVisionParser.parseCVTextWithGemini(extractedText);
    }

    console.log("✅ Successfully parsed with Gemini Vision");

    // ✅ NEW: Save parsed data to JSON file
    const savedData = await saveParsedCVData(
      extractedData, 
      file.originalname,
      {
        fileType: file.mimetype,
        parser: 'gemini_vision'
      }
    );

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Return extracted data with save info
    res.status(200).json({
      success: true,
      extracted_data: extractedData,
      saved_data: {
        id: savedData.id,
        timestamp: new Date().toISOString()
      },
      parser_used: "gemini_vision",
      note: "Data extracted using Google Gemini Vision AI and saved to database",
    });
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.error("❌ Gemini Vision extraction error:", err);
    return res.status(500).json({
      error: `Gemini Vision parsing failed: ${err.message}`,
    });
  }
};

// ✅ NEW: Get all parsed CVs
export const getAllParsedData = async (req, res) => {
  try {
    const cvs = getAllParsedCVs();
    res.json({
      success: true,
      total: cvs.entries.length,
      entries: cvs.entries
    });
  } catch (error) {
    console.error("❌ Failed to get parsed data:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ NEW: Get specific CV data
export const getParsedDataById = async (req, res) => {
  try {
    const { id } = req.params;
    const cvData = getCVDataById(id);
    
    if (!cvData) {
      return res.status(404).json({ error: "CV data not found" });
    }
    
    res.json({
      success: true,
      data: cvData
    });
  } catch (error) {
    console.error("❌ Failed to get CV data:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ NEW: Search CVs
export const searchParsedData = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: "Search query required" });
    }
    
    const results = searchCVs({ query });
    
    res.json({
      success: true,
      query,
      results: results.map(result => ({
        id: result.id,
        timestamp: result.timestamp,
        originalFileName: result.originalFileName,
        name: result.name,
        email: result.email
      }))
    });
  } catch (error) {
    console.error("❌ Search failed:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ NEW: Delete CV data
export const deleteParsedData = async (req, res) => {
  try {
    const { id } = req.params;
    const success = deleteCVData(id);
    
    if (success) {
      res.json({ success: true, message: "CV data deleted successfully" });
    } else {
      res.status(404).json({ error: "CV data not found" });
    }
  } catch (error) {
    console.error("❌ Failed to delete CV data:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ NEW: Get statistics
export const getParsedDataStats = async (req, res) => {
  try {
    const stats = getCVStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("❌ Failed to get stats:", error);
    res.status(500).json({ error: error.message });
  }
};

// Keep your existing functions (they will now auto-save data)
export const processCVWithTemplate = async (req, res) => {
  let cvPath = null;
  let templatePath = null;

  try {
    if (!req.files || !req.files['cv'] || !req.files['template']) {
      return res.status(400).json({ error: "Please upload both 'cv' (PDF) and 'template' (DOCX)" });
    }

    const cvFile = req.files['cv'][0];
    const templateFile = req.files['template'][0];

    cvPath = cvFile.path;
    templatePath = templateFile.path;

    console.log(`Processing CV: ${cvFile.originalname} with Template: ${templateFile.originalname}`);

    const fileBuffer = fs.readFileSync(cvPath);
    let extractedData;

    if (cvFile.mimetype.includes("pdf")) {
      extractedData = await geminiVisionParser.parsePDFWithVision(fileBuffer, cvFile.originalname);
    } else if (cvFile.mimetype.includes("image")) {
      extractedData = await geminiVisionParser.parseImageWithVision(fileBuffer, cvFile.mimetype, cvFile.originalname);
    } else {
      throw new Error("For template processing, please upload a PDF or Image CV.");
    }
    
    // ✅ NEW: Save parsed data
    await saveParsedCVData(
      extractedData, 
      cvFile.originalname,
      {
        fileType: cvFile.mimetype,
        parser: 'gemini_vision',
        templateUsed: templateFile.originalname
      }
    );

    console.log("✅ Data Extracted and Saved. Injecting into template...");

    const filledDocxBuffer = fillDocxTemplate(templatePath, extractedData);

    if (fs.existsSync(cvPath)) fs.unlinkSync(cvPath);
    if (fs.existsSync(templatePath)) fs.unlinkSync(templatePath);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=Generated_CV_${Date.now()}.docx`);
    
    return res.send(filledDocxBuffer);

  } catch (error) {
    if (cvPath && fs.existsSync(cvPath)) fs.unlinkSync(cvPath);
    if (templatePath && fs.existsSync(templatePath)) fs.unlinkSync(templatePath);

    console.error("❌ Template Processing Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const generateFormattedCV = async (req, res) => {
  try {
    const { extractedData } = req.body;

    if (!extractedData) {
      return res.status(400).json({ error: "No extracted data provided" });
    }

    console.log("🔄 Generating formatted CV...");

    const formattedCVText = await geminiVisionParser.generateFormattedCV(extractedData);
    const pdfBytes = await createTemplatePdf(formattedCVText);

    console.log("✅ CV generated successfully");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="professional-cv.pdf"');
    return res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("❌ CV Generation error:", err);
    return res.status(500).json({
      error: err.message || "Failed to generate CV",
    });
  }
};

export const evaluateCVQuality = async (req, res) => {
  try {
    const { extractedData } = req.body;

    if (!extractedData) {
      return res.status(400).json({ error: "No extracted data provided for analysis" });
    }

    console.log("🤔 Analyzing CV Quality...");
    const evaluation = await geminiVisionParser.evaluateCV(extractedData);

    console.log("✅ CV Scored Successfully:", evaluation.overall_score);
    res.json({ success: true, evaluation });

  } catch (err) {
    console.error("❌ Evaluation error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const generateProfessionalCV = async (req, res) => {
  try {
    const { extractedData, companyLogo, brandingOptions } = req.body;

    if (!extractedData) {
      return res.status(400).json({ error: "No extracted data provided" });
    }

    console.log("🔄 Generating professional CV...");

    // Generate PDF using our Node.js compatible service
    const pdfBytes = await generateProfessionalPDF(extractedData, {
      companyLogo,
      brandingOptions: {
        addWatermark: true,
        watermarkText: brandingOptions?.watermarkText || 'CONFIDENTIAL',
        ...brandingOptions
      }
    });

    console.log("✅ Professional CV generated successfully");

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="professional-cv-${Date.now()}.pdf"`
    );
    
    return res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error("❌ Professional CV generation error:", err);
    return res.status(500).json({
      error: err.message || "Failed to generate professional CV",
    });
  }
};