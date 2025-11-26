import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const createTemplatePdf = async (cvText) => {
  try {
    console.log("📄 Creating PDF document...");
    
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const margin = 50;
    let y = height - margin;

    const lines = cvText.split("\n");

    for (const line of lines) {
      // Add new page if needed
      if (y < margin + 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - margin;
      }

      // Skip empty lines but maintain spacing
      if (line.trim() === "") {
        y -= 15;
        continue;
      }

      // Determine font and size based on content
      let currentFont = font;
      let currentFontSize = 11;
      let currentColor = rgb(0, 0, 0);
      let isBold = false;

      // Main title (lines starting with #)
      if (line.trim().startsWith('# ')) {
        currentFontSize = 20;
        currentFont = boldFont;
        currentColor = rgb(0.1, 0.1, 0.4);
        isBold = true;
      }
      // Section headers (lines starting with ##)
      else if (line.trim().startsWith('## ')) {
        currentFontSize = 16;
        currentFont = boldFont;
        currentColor = rgb(0.2, 0.2, 0.5);
        isBold = true;
      }
      // Sub-sections (lines starting with ###)
      else if (line.trim().startsWith('### ')) {
        currentFontSize = 13;
        currentFont = boldFont;
        currentColor = rgb(0.3, 0.3, 0.3);
        isBold = true;
      }
      // Bullet points
      else if (line.trim().startsWith('-')) {
        currentFontSize = 10;
        currentColor = rgb(0.2, 0.2, 0.2);
      }

      // Remove markdown symbols for display
      const displayText = line.replace(/^#+\s*/, '').replace(/^-\s*/, '• ').trim();

      if (displayText) {
        page.drawText(displayText, {
          x: margin,
          y,
          size: currentFontSize,
          font: currentFont,
          color: currentColor,
        });
      }

      y -= (currentFontSize + 6);
    }

    const pdfBytes = await pdfDoc.save();
    console.log("✅ PDF created successfully");
    return pdfBytes;

  } catch (error) {
    console.error("❌ PDF creation error:", error);
    throw new Error(`Failed to create PDF: ${error.message}`);
  }
};