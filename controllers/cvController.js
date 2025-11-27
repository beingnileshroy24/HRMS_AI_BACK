import fs from "fs";
import { extractText } from "../utils/extractText.js";
import { createTemplatePdf } from "../utils/createTemplatePdf.js";
import { geminiVisionParser } from "../utils/geminiVisionParser.js";
import { fillDocxTemplate } from "../utils/docxMerger.js";
import dotenv from "dotenv";
dotenv.config();

export const extractCVData = async (req, res) => {
  let filePath = null;

  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error:
          "Gemini API key not configured. Please add GEMINI_API_KEY to your .env file",
      });
    }

    filePath = file.path;
    console.log(
      `📁 Processing file: ${file.originalname}, Type: ${file.mimetype}`
    );

    const fileBuffer = fs.readFileSync(filePath);
    let extractedData;

    // Use Gemini Vision based on file type
    if (file.mimetype.includes("pdf")) {
      console.log("🔄 Using Gemini Vision for PDF parsing...");
      extractedData = await geminiVisionParser.parsePDFWithVision(
        fileBuffer,
        file.originalname
      );
    } else if (file.mimetype.includes("image")) {
      console.log("🔄 Using Gemini Vision for image parsing...");
      extractedData = await geminiVisionParser.parseImageWithVision(
        fileBuffer,
        file.mimetype,
        file.originalname
      );
    } else {
      // For text files (DOCX, etc.), extract text first then use Gemini
      console.log("🔄 Extracting text and using Gemini for parsing...");
      const extractedText = await extractText(filePath, file.mimetype);
      extractedData = await geminiVisionParser.parseCVTextWithGemini(
        extractedText
      );
    }

    console.log("✅ Successfully parsed with Gemini Vision");

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Return extracted data
    res.status(200).json({
      success: true,
      extracted_data: extractedData,
      parser_used: "gemini_vision",
      note: "Data extracted using Google Gemini Vision AI",
    });
  } catch (err) {
    // Clean up uploaded file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.error("❌ Gemini Vision extraction error:", err);
    return res.status(500).json({
      error: `Gemini Vision parsing failed: ${err.message}`,
    });
  }
};

export const processCVWithTemplate = async (req, res) => {
  let cvPath = null;
  let templatePath = null;

  try {
    // 1. Validation
    if (!req.files || !req.files['cv'] || !req.files['template']) {
      return res.status(400).json({ error: "Please upload both 'cv' (PDF) and 'template' (DOCX)" });
    }

    const cvFile = req.files['cv'][0];
    const templateFile = req.files['template'][0];

    cvPath = cvFile.path;
    templatePath = templateFile.path;

    console.log(`Processing CV: ${cvFile.originalname} with Template: ${templateFile.originalname}`);

    // 2. Extract Data using Gemini (Reusing your existing logic)
    const fileBuffer = fs.readFileSync(cvPath);
    let extractedData;

    // Determine strategy based on file type
    if (cvFile.mimetype.includes("pdf")) {
       extractedData = await geminiVisionParser.parsePDFWithVision(fileBuffer, cvFile.originalname);
    } else if (cvFile.mimetype.includes("image")) {
       extractedData = await geminiVisionParser.parseImageWithVision(fileBuffer, cvFile.mimetype, cvFile.originalname);
    } else {
       // Fallback for text extraction if you have it implemented
       throw new Error("For template processing, please upload a PDF or Image CV.");
    }
    
    console.log("✅ Data Extracted. Injecting into template...");

    // 3. Inject Data into Template
    const filledDocxBuffer = fillDocxTemplate(templatePath, extractedData);

    // 4. Cleanup Files
    if (fs.existsSync(cvPath)) fs.unlinkSync(cvPath);
    if (fs.existsSync(templatePath)) fs.unlinkSync(templatePath);

    // 5. Send back the generated file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=Generated_CV_${Date.now()}.docx`);
    
    return res.send(filledDocxBuffer);

  } catch (error) {
    // Cleanup on error
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

    // Generate formatted CV text using Gemini
    const formattedCVText = await geminiVisionParser.generateFormattedCV(
      extractedData
    );

    // Generate PDF
    const pdfBytes = await createTemplatePdf(formattedCVText);

    console.log("✅ CV generated successfully");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="professional-cv.pdf"'
    );
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