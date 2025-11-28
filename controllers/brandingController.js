// controllers/brandingController.js
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateBrandedCV = async (req, res) => {
  let cvFilePath = null;
  let logoFilePath = null;

  try {
    console.log("🎨 Starting branding process with logo watermark...");
    
    if (!req.files || !req.files['cv']) {
      return res.status(400).json({ error: "No CV file uploaded" });
    }

    const cvFile = req.files['cv'][0];
    const logoFile = req.files['logo'] ? req.files['logo'][0] : null;

    cvFilePath = cvFile.path;
    
    console.log(`📄 Processing CV: ${cvFile.originalname}`);
    
    // Get branding options
    const { 
      addWatermark = 'true', 
      watermarkText = 'CONFIDENTIAL' 
    } = req.body;

    // Handle logo file
    if (logoFile) {
      logoFilePath = logoFile.path;
      console.log(`🖼️ Using uploaded logo: ${logoFile.originalname}`);
    } else {
      console.log('ℹ️ No logo uploaded, will use default logo');
      // Use absolute path to default logo
      logoFilePath = path.join(process.cwd(), 'public', 'Nexu Revised 6.png');
      
      if (!fs.existsSync(logoFilePath)) {
        console.warn('⚠️ Default logo not found, will use text watermark only');
        logoFilePath = null;
      }
    }

    // Generate branded PDF
    console.log("🔄 Creating branded PDF with logo watermark...");
    const pdfBuffer = await createBrandedPdfWithLogoWatermark(
      cvFilePath,
      logoFilePath,
      addWatermark === 'true',
      watermarkText
    );

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("Generated PDF is empty");
    }

    console.log("✅ Branded PDF created successfully");

    // Clean up uploaded files
    if (cvFilePath && fs.existsSync(cvFilePath)) {
      fs.unlinkSync(cvFilePath);
    }
    if (logoFile && logoFilePath && fs.existsSync(logoFilePath)) {
      fs.unlinkSync(logoFilePath);
    }

    console.log("✅ Sending PDF response...");

    // Set proper headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="branded-cv-${Date.now()}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    
    return res.send(pdfBuffer);

  } catch (err) {
    // Clean up uploaded files on error
    if (cvFilePath && fs.existsSync(cvFilePath)) {
      fs.unlinkSync(cvFilePath);
    }
    if (logoFilePath && fs.existsSync(logoFilePath)) {
      fs.unlinkSync(logoFilePath);
    }

    console.error("❌ Branded CV generation error:", err);
    return res.status(500).json({
      error: `Branded CV generation failed: ${err.message}`,
    });
  }
};

// UPDATED: Now includes logo as watermark
const createBrandedPdfWithLogoWatermark = async (cvFilePath, logoFilePath = null, addWatermark = true, watermarkText = "CONFIDENTIAL") => {
  try {
    console.log("📥 Loading existing PDF...");
    
    if (!fs.existsSync(cvFilePath)) {
      throw new Error("CV file not found");
    }

    // Read the existing CV PDF as buffer
    const existingPdfBytes = fs.readFileSync(cvFilePath);
    console.log("📄 Original PDF size:", existingPdfBytes.length, "bytes");

    // Load the existing PDF
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Get all pages from the existing PDF
    const pages = pdfDoc.getPages();
    
    if (pages.length === 0) {
      throw new Error("No pages found in the PDF");
    }
    
    console.log(`📑 Found ${pages.length} page(s) in the PDF`);
    
    // Load logo image once for reuse
    let logoImage = null;
    if (logoFilePath && fs.existsSync(logoFilePath)) {
      try {
        logoImage = await loadLogoImage(pdfDoc, logoFilePath);
        console.log("✅ Logo loaded successfully for watermarking");
      } catch (logoError) {
        console.warn("⚠️ Could not load logo for watermark:", logoError.message);
      }
    }
    
    // Add branding to each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      console.log(`🔄 Processing page ${i + 1} (${width}x${height})...`);
      
      // Add logo to top right
      if (logoImage) {
        try {
          await addLogoToTopRight(page, logoImage);
          console.log(`✅ Top-right logo added to page ${i + 1}`);
        } catch (logoError) {
          console.warn(`⚠️ Could not add top-right logo to page ${i + 1}:`, logoError.message);
        }
      }
      
      // Add logo as watermark (background)
      if (addWatermark && logoImage) {
        try {
          await addLogoWatermark(page, logoImage, width, height);
          console.log(`✅ Logo watermark added to page ${i + 1}`);
        } catch (watermarkError) {
          console.warn(`⚠️ Could not add logo watermark to page ${i + 1}:`, watermarkError.message);
        }
      }
      
      // Add text watermark as fallback or additional
      if (addWatermark) {
        addTextWatermark(page, watermarkText, width, height);
        console.log(`✅ Text watermark added to page ${i + 1}`);
      }
    }

    console.log("✅ All pages processed, saving PDF...");

    // Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);
    
    console.log("✅ PDF serialized successfully, final size:", pdfBuffer.length, "bytes");
    
    return pdfBuffer;

  } catch (error) {
    console.error("❌ Error in branding with logo watermark:", error);
    throw new Error(`Failed to brand PDF: ${error.message}`);
  }
};

// NEW: Load logo image once for reuse
const loadLogoImage = async (pdfDoc, logoFilePath) => {
  try {
    console.log(`🖼️ Loading logo from: ${logoFilePath}`);
    
    const imageBytes = fs.readFileSync(logoFilePath);
    
    if (imageBytes.length === 0) {
      throw new Error("Logo file is empty");
    }

    console.log(`📊 Logo file size: ${imageBytes.length} bytes`);

    const fileExtension = path.extname(logoFilePath).toLowerCase();
    let image;
    
    if (fileExtension === '.png') {
      console.log("🖼️ Embedding as PNG...");
      image = await pdfDoc.embedPng(imageBytes);
    } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
      console.log("🖼️ Embedding as JPG...");
      image = await pdfDoc.embedJpg(imageBytes);
    } else {
      // Try both formats
      try {
        image = await pdfDoc.embedPng(imageBytes);
        console.log("🖼️ Embedded as PNG (auto-detected)");
      } catch (pngError) {
        image = await pdfDoc.embedJpg(imageBytes);
        console.log("🖼️ Embedded as JPG (auto-detected)");
      }
    }

    console.log(`📏 Logo dimensions: ${image.width}x${image.height}`);
    return image;

  } catch (error) {
    console.error("❌ Failed to load logo image:", error);
    throw error;
  }
};

// UPDATED: Add logo to top-right corner
// UPDATED: Add logo to top-right corner - more towards the edge
const addLogoToTopRight = async (page, logoImage) => {
  try {
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    // Scale logo for top-right position (smaller)
    const maxWidth = 50; // Reduced from 60
    const maxHeight = 40; // Reduced from 45
    const widthRatio = maxWidth / logoImage.width;
    const heightRatio = maxHeight / logoImage.height;
    const scale = Math.min(widthRatio, heightRatio, 1);
    
    const logoWidth = logoImage.width * scale;
    const logoHeight = logoImage.height * scale;

    // Position in top right corner - closer to edges
    const x = pageWidth - logoWidth - 15; // Reduced from 30px (closer to right edge)
    const y = pageHeight - logoHeight - 15; // Reduced from 30px (closer to top edge)

    console.log(`📍 Positioning top-right logo at (${x}, ${y}), size: ${logoWidth}x${logoHeight}`);

    // Draw the logo
    page.drawImage(logoImage, {
      x,
      y,
      width: logoWidth,
      height: logoHeight,
    });

    return true;

  } catch (error) {
    console.error("❌ Failed to add top-right logo:", error);
    throw error;
  }
};

// NEW: Add logo as watermark (background)
const addLogoWatermark = async (page, logoImage, pageWidth, pageHeight) => {
  try {
    console.log("💧 Adding logo watermark...");
    
    // Scale logo for watermark (larger, more transparent)
    const maxWidth = 200;
    const maxHeight = 150;
    const widthRatio = maxWidth / logoImage.width;
    const heightRatio = maxHeight / logoImage.height;
    const scale = Math.min(widthRatio, heightRatio, 1);
    
    const watermarkWidth = logoImage.width * scale;
    const watermarkHeight = logoImage.height * scale;

    // Calculate positions for multiple watermark instances
    const watermarkPositions = [
      // Center
      { x: (pageWidth - watermarkWidth) / 2, y: (pageHeight - watermarkHeight) / 2 },
      // Top-left quadrant
      { x: pageWidth * 0.25 - watermarkWidth / 2, y: pageHeight * 0.75 - watermarkHeight / 2 },
      // Top-right quadrant
      { x: pageWidth * 0.75 - watermarkWidth / 2, y: pageHeight * 0.75 - watermarkHeight / 2 },
      // Bottom-left quadrant
      { x: pageWidth * 0.25 - watermarkWidth / 2, y: pageHeight * 0.25 - watermarkHeight / 2 },
      // Bottom-right quadrant
      { x: pageWidth * 0.75 - watermarkWidth / 2, y: pageHeight * 0.25 - watermarkHeight / 2 },
    ];

    // Add multiple watermarks for better coverage
    for (const position of watermarkPositions) {
      page.drawImage(logoImage, {
        x: position.x,
        y: position.y,
        width: watermarkWidth,
        height: watermarkHeight,
        opacity: 0.1, // Very transparent for watermark effect
      });
    }

    console.log(`✅ Logo watermark added at ${watermarkPositions.length} positions`);
    return true;

  } catch (error) {
    console.error("❌ Failed to add logo watermark:", error);
    throw error;
  }
};

// UPDATED: Add text watermark (as additional watermark)
const addTextWatermark = (page, watermarkText, width, height) => {
  try {
    console.log(`💧 Adding text watermark: "${watermarkText}"`);
    
    // Add multiple text watermarks
    const textPositions = [
      { x: width / 2 - 120, y: height / 2, angle: 45, size: 36 },
      { x: width / 4, y: height * 0.75, angle: 30, size: 28 },
      { x: width * 0.75, y: height / 4, angle: -30, size: 28 },
    ];
    
    for (const pos of textPositions) {
      page.drawText(watermarkText, {
        x: pos.x,
        y: pos.y,
        size: pos.size,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.15, // Very subtle
        rotate: degrees(pos.angle),
      });
    }

    console.log(`✅ Text watermark added successfully`);
  } catch (error) {
    console.error("❌ Failed to add text watermark:", error);
  }
};

// Keep your existing test endpoints the same...
export const testLogoPDF = async (req, res) => {
  try {
    console.log("🧪 Creating test PDF with logo watermark...");
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    // Add title
    page.drawText('LOGO WATERMARK TEST', {
      x: 50,
      y: 750,
      size: 24,
      color: rgb(0, 0, 0),
    });

    page.drawText('This PDF tests if logo watermarks work correctly', {
      x: 50,
      y: 700,
      size: 14,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Try to load and use logo for both top-right and watermark
    const logoPaths = [
      path.join(process.cwd(), 'public', 'Nexu Revised 6.png'),
      path.join(__dirname, '..', 'public', 'Nexu Revised 6.png'),
    ];

    let logoImage = null;
    for (const logoPath of logoPaths) {
      if (fs.existsSync(logoPath)) {
        try {
          console.log(`🖼️ Loading logo from: ${logoPath}`);
          const imageBytes = fs.readFileSync(logoPath);
          logoImage = await pdfDoc.embedPng(imageBytes);
          console.log("✅ Logo loaded for testing");
          break;
        } catch (error) {
          console.warn(`⚠️ Failed to load logo from ${logoPath}:`, error.message);
        }
      }
    }

    if (logoImage) {
      // Add top-right logo
      await addLogoToTopRight(page, logoImage);
      
      // Add logo watermark
      await addLogoWatermark(page, logoImage, 595, 842);
      
      page.drawText('Logo Watermark: ADDED ✓', {
        x: 50,
        y: 650,
        size: 12,
        color: rgb(0, 0.5, 0),
      });
    } else {
      page.drawText('Logo Watermark: MISSING ✗', {
        x: 50,
        y: 650,
        size: 12,
        color: rgb(1, 0, 0),
      });
    }

    // Add text watermark
    addTextWatermark(page, "TEST WATERMARK", 595, 842);
    
    page.drawText('Text Watermark: ADDED ✓', {
      x: 50,
      y: 630,
      size: 12,
      color: rgb(0, 0.5, 0),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);
    
    console.log("✅ Test PDF created, size:", pdfBuffer.length, "bytes");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="logo-watermark-test.pdf"');
    res.setHeader("Content-Length", pdfBuffer.length);
    
    return res.send(pdfBuffer);
    
  } catch (err) {
    console.error("❌ Test PDF error:", err);
    res.status(500).json({ 
      error: `Test failed: ${err.message}`
    });
  }
};

// Keep your existing checkFiles function...
export const checkFiles = async (req, res) => {
  try {
    const checks = [];
    
    const logoPaths = [
      { name: 'Current Working Directory', path: path.join(process.cwd(), 'public', 'Nexu Revised 6.png') },
      { name: 'Relative from controller', path: path.join(__dirname, '..', 'public', 'Nexu Revised 6.png') },
      { name: 'Project root', path: path.join(__dirname, '..', '..', 'public', 'Nexu Revised 6.png') },
    ];
    
    for (const check of logoPaths) {
      const exists = fs.existsSync(check.path);
      checks.push({
        name: check.name,
        path: check.path,
        exists: exists,
        size: exists ? fs.statSync(check.path).size : 0
      });
    }
    
    res.json({
      currentDir: process.cwd(),
      controllerDir: __dirname,
      checks: checks
    });
    
  } catch (err) {
    console.error("❌ File check error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Add this function to your brandingController.js (at the end of the file)

// NEW: Debug information endpoint
export const getDebugInfo = async (req, res) => {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      currentWorkingDirectory: process.cwd(),
      controllerDirectory: __dirname,
      environment: process.env.NODE_ENV || 'development',
      publicDirectory: path.join(process.cwd(), 'public'),
      logoPaths: [
        path.join(process.cwd(), 'public', 'Nexu Revised 6.png'),
        path.join(__dirname, '..', 'public', 'Nexu Revised 6.png'),
        path.join(__dirname, '..', '..', 'public', 'Nexu Revised 6.png'),
      ].map(p => ({
        path: p,
        exists: fs.existsSync(p),
        size: fs.existsSync(p) ? fs.statSync(p).size : 0
      }))
    };
    
    res.json(debugInfo);
  } catch (error) {
    console.error('❌ Debug info error:', error);
    res.status(500).json({ error: error.message });
  }
};