import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const createTemplatePdf = async (cvText, logoImage = null) => {
  try {
    console.log("📄 Creating PDF document...");
    
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const margin = 50;
    let y = height - margin;

    // Add watermark/logo if provided
    if (logoImage) {
      await addWatermark(pdfDoc, page, logoImage, width, height);
    }

    const lines = cvText.split("\n");

    for (const line of lines) {
      // Add new page if needed
      if (y < margin + 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - margin;
        
        // Add watermark to new page as well
        if (logoImage) {
          await addWatermark(pdfDoc, page, logoImage, width, height);
        }
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

// Helper function to add watermark/logo
const addWatermark = async (pdfDoc, page, logoImage, pageWidth, pageHeight) => {
  try {
    let image;
    
    // Handle different image types
    if (typeof logoImage === 'string') {
      // If it's a base64 string
      if (logoImage.startsWith('data:')) {
        const base64Data = logoImage.split(',')[1];
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        image = await pdfDoc.embedPng(imageBytes);
      } 
      // If it's a URL or file path (you'll need to fetch it first)
      else {
        console.warn('URL loading requires additional setup');
        return;
      }
    } 
    // If it's already an image buffer/bytes
    else if (logoImage instanceof Uint8Array) {
      try {
        image = await pdfDoc.embedPng(logoImage);
      } catch (pngError) {
        try {
          image = await pdfDoc.embedJpg(logoImage);
        } catch (jpgError) {
          console.error('❌ Failed to embed image as PNG or JPG:', jpgError);
          return;
        }
      }
    }

    if (!image) {
      console.warn('❌ No valid image provided for watermark');
      return;
    }

    // Resize the image (adjust dimensions as needed)
    const maxWidth = 100;
    const maxHeight = 60;
    
    const imageDims = image.scaleToFit(maxWidth, maxHeight);
    
    // Position the logo (example: top-right corner)
    const x = pageWidth - imageDims.width - 50; // 50px from right edge
    const y = pageHeight - imageDims.height - 50; // 50px from top edge
    
    // Draw the image with reduced opacity for watermark effect
    page.drawImage(image, {
      x,
      y,
      width: imageDims.width,
      height: imageDims.height,
      opacity: 0.3, // Adjust opacity for watermark effect (0.1-0.5 typically)
    });

    console.log("✅ Watermark added successfully");

  } catch (error) {
    console.error("❌ Watermark addition error:", error);
  }
};

// Alternative function for centered watermark
const addCenteredWatermark = async (pdfDoc, page, logoImage, pageWidth, pageHeight) => {
  try {
    let image;
    
    // Same image embedding logic as above
    if (typeof logoImage === 'string' && logoImage.startsWith('data:')) {
      const base64Data = logoImage.split(',')[1];
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      image = await pdfDoc.embedPng(imageBytes);
    } else if (logoImage instanceof Uint8Array) {
      try {
        image = await pdfDoc.embedPng(logoImage);
      } catch (pngError) {
        image = await pdfDoc.embedJpg(logoImage);
      }
    }

    if (!image) return;

    // Center the watermark
    const maxWidth = 200;
    const maxHeight = 120;
    const imageDims = image.scaleToFit(maxWidth, maxHeight);
    
    const x = (pageWidth - imageDims.width) / 2;
    const y = (pageHeight - imageDims.height) / 2;
    
    page.drawImage(image, {
      x,
      y,
      width: imageDims.width,
      height: imageDims.height,
      opacity: 0.1, // Very light for centered watermark
    });

  } catch (error) {
    console.error("❌ Centered watermark error:", error);
  }
};