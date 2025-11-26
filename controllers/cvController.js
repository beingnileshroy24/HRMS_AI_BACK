import fs from "fs";
import { extractText } from "../utils/extractText.js";
import { createTemplatePdf } from "../utils/createTemplatePdf.js";
import { geminiVisionParser } from "../utils/geminiVisionParser.js";
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
    res.json({
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
