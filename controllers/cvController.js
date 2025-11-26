import fs from "fs";
import { extractText } from "../utils/extractText.js";
import { createTemplatePdf } from "../utils/createTemplatePdf.js";
import { extractCVDataLocal, generateFormattedCVLocal } from "../utils/localParser.js";

export const extractCVData = async (req, res) => {
  let filePath = null;
  
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    filePath = file.path;
    console.log(`📁 Processing file: ${file.originalname}`);

    // Extract raw text from CV
    const extractedText = await extractText(filePath, file.mimetype);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text could be extracted from the file. The file might be scanned or corrupted.");
    }

    console.log(`✅ Extracted ${extractedText.length} characters from CV`);

    // Extract structured data using local parser
    const extractedData = await extractCVDataLocal(extractedText);

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Return extracted data
    res.json({
      success: true,
      extracted_data: extractedData,
      raw_text_length: extractedText.length,
      note: "Data extracted using smart local parser"
    });

  } catch (err) {
    // Clean up uploaded file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    console.error("❌ Extraction error:", err);
    return res.status(500).json({ 
      error: err.message || "Failed to extract CV data" 
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

    // Generate formatted CV text using local formatter
    const formattedCVText = await generateFormattedCVLocal(extractedData);

    // Generate PDF
    const pdfBytes = await createTemplatePdf(formattedCVText);

    console.log("✅ CV generated successfully");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=\"professional-cv.pdf\"");
    return res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error("❌ CV Generation error:", err);
    return res.status(500).json({ 
      error: err.message || "Failed to generate CV" 
    });
  }
};