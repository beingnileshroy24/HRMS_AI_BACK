import fs from "fs";
import mammoth from "mammoth";
import PDFParser from "pdf2json";

export const extractText = async (filePath, mimetype) => {
  try {
    console.log(`📄 Extracting text from: ${mimetype}`);

    if (mimetype.includes("pdf")) {
      return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();
        
        pdfParser.on("pdfParser_dataError", errData => {
          reject(new Error(`PDF parsing error: ${errData.parserError}`));
        });
        
        pdfParser.on("pdfParser_dataReady", pdfData => {
          try {
            const text = pdfParser.getRawTextContent();
            console.log(`✅ PDF text extracted: ${text?.length || 0} characters`);
            resolve(text || "");
          } catch (error) {
            reject(new Error(`Failed to extract text from PDF: ${error.message}`));
          }
        });
        
        pdfParser.loadPDF(filePath);
      });
    }

    if (mimetype.includes("word") || mimetype.includes("officedocument")) {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        console.log(`✅ DOCX text extracted: ${result.value?.length || 0} characters`);
        return result.value || "";
      } catch (error) {
        throw new Error(`Failed to extract text from DOCX: ${error.message}`);
      }
    }

    throw new Error("Unsupported file format. Please upload PDF or DOCX files.");

  } catch (error) {
    console.error("❌ Text extraction error:", error);
    throw error;
  }
};