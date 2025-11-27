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
    console.log("🎨 Starting simple branding process...");
    
    // Check if files were uploaded
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

    // If logo is uploaded, save the path
    if (logoFile) {
      logoFilePath = logoFile.path;
      console.log(`🖼️ Using uploaded logo: ${logoFile.originalname}`);
    } else {
      console.log('ℹ️ No logo uploaded, will use default logo');
      // Use absolute path to default logo
      logoFilePath = path.join(process.cwd(), 'public', 'Nexu Revised 6.png');
    }

    // Generate branded PDF
    console.log("🔄 Creating branded PDF...");
    const pdfBuffer = await createSimpleBrandedPdf(
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

// SIMPLE VERSION - Just add branding to existing PDF
const createSimpleBrandedPdf = async (cvFilePath, logoFilePath = null, addWatermark = true, watermarkText = "CONFIDENTIAL") => {
  try {
    console.log("📥 Loading existing PDF...");
    
    // Check if CV file exists and is readable
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
    
    // Add logo and watermark to each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      console.log(`🔄 Processing page ${i + 1} (${width}x${height})...`);
      
      // Add logo to top right if provided
      if (logoFilePath) {
        try {
          const logoAdded = await addLogoToPage(pdfDoc, page, logoFilePath);
          if (logoAdded) {
            console.log(`✅ Logo added to page ${i + 1}`);
          } else {
            console.log(`⚠️ Logo not added to page ${i + 1}`);
          }
        } catch (logoError) {
          console.warn(`⚠️ Could not add logo to page ${i + 1}:`, logoError.message);
        }
      }
      
      // Add watermark if enabled
      if (addWatermark) {
        addWatermarkToPage(page, watermarkText, width, height);
        console.log(`✅ Watermark added to page ${i + 1}`);
      }
    }

    console.log("✅ All pages processed, saving PDF...");

    // Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();
    
    // Convert Uint8Array to Buffer for proper response
    const pdfBuffer = Buffer.from(pdfBytes);
    
    console.log("✅ PDF serialized successfully, final size:", pdfBuffer.length, "bytes");
    
    return pdfBuffer;

  } catch (error) {
    console.error("❌ Error in simple branding:", error);
    throw new Error(`Failed to brand PDF: ${error.message}`);
  }
};

const addLogoToPage = async (pdfDoc, page, logoFilePath) => {
  try {
    console.log(`🖼️ Attempting to load logo from: ${logoFilePath}`);
    
    // Check if logo file exists
    if (!fs.existsSync(logoFilePath)) {
      console.warn(`⚠️ Logo file not found at: ${logoFilePath}`);
      
      // Try to find the logo in different locations
      const possiblePaths = [
        logoFilePath,
        path.join(process.cwd(), 'public', 'Nexu Revised 6.png'),
        path.join(process.cwd(), 'Nexu Revised 6.png'),
        path.join(__dirname, '..', 'public', 'Nexu Revised 6.png'),
        path.join(__dirname, '..', '..', 'public', 'Nexu Revised 6.png'),
        path.join(__dirname, '..', '..', '..', 'public', 'Nexu Revised 6.png'),
      ];
      
      let foundPath = null;
      for (const testPath of possiblePaths) {
        console.log(`🔍 Checking: ${testPath}`);
        if (fs.existsSync(testPath)) {
          foundPath = testPath;
          console.log(`✅ Found logo at: ${testPath}`);
          break;
        }
      }
      
      if (!foundPath) {
        console.error('❌ Logo not found in any location');
        // Create a placeholder rectangle instead of logo
        page.drawRectangle({
          x: page.getWidth() - 130,
          y: page.getHeight() - 130,
          width: 80,
          height: 80,
          color: rgb(0.9, 0.1, 0.1),
          opacity: 0.3,
        });
        
        page.drawText('LOGO AREA', {
          x: page.getWidth() - 125,
          y: page.getHeight() - 80,
          size: 10,
          color: rgb(0, 0, 0),
        });
        
        return false;
      }
      
      logoFilePath = foundPath;
    }

    const imageBytes = fs.readFileSync(logoFilePath);
    
    if (imageBytes.length === 0) {
      throw new Error("Logo file is empty");
    }

    console.log(`📊 Logo file read successfully, size: ${imageBytes.length} bytes`);

    let image;
    const fileExtension = logoFilePath.toLowerCase();
    
    // Determine image type and embed accordingly
    if (fileExtension.endsWith('.png')) {
      console.log("🖼️ Embedding as PNG...");
      image = await pdfDoc.embedPng(imageBytes);
    } else if (fileExtension.endsWith('.jpg') || fileExtension.endsWith('.jpeg')) {
      console.log("🖼️ Embedding as JPG...");
      image = await pdfDoc.embedJpg(imageBytes);
    } else {
      // Try both PNG and JPG as fallback
      try {
        image = await pdfDoc.embedPng(imageBytes);
        console.log("🖼️ Embedded as PNG (fallback)");
      } catch {
        try {
          image = await pdfDoc.embedJpg(imageBytes);
          console.log("🖼️ Embedded as JPG (fallback)");
        } catch {
          throw new Error('Unsupported image format');
        }
      }
    }

    console.log(`📏 Logo dimensions: ${image.width}x${image.height}`);

    // Scale logo to appropriate size
    const maxWidth = 80;
    const scale = maxWidth / image.width;
    const logoWidth = image.width * scale;
    const logoHeight = image.height * scale;

    console.log(`📐 Scaled logo dimensions: ${logoWidth}x${logoHeight}`);

    // Position in top right corner
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const x = pageWidth - logoWidth - 50; // 50px from right edge
    const y = pageHeight - logoHeight - 50; // 50px from top

    console.log(`📍 Positioning logo at (${x}, ${y})`);

    // Draw the logo
    page.drawImage(image, {
      x,
      y,
      width: logoWidth,
      height: logoHeight,
    });

    // Add a border around the logo to make it visible
    page.drawRectangle({
      x: x - 2,
      y: y - 2,
      width: logoWidth + 4,
      height: logoHeight + 4,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    console.log(`✅ Logo successfully added with border`);
    return true;

  } catch (error) {
    console.error("❌ Failed to add logo:", error);
    
    // Add a placeholder so we know something should be there
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    
    page.drawRectangle({
      x: pageWidth - 132,
      y: pageHeight - 132,
      width: 84,
      height: 84,
      color: rgb(1, 0, 0),
      opacity: 0.2,
    });
    
    page.drawText('LOGO MISSING', {
      x: pageWidth - 120,
      y: pageHeight - 80,
      size: 8,
      color: rgb(1, 0, 0),
    });
    
    return false;
  }
};

const addWatermarkToPage = (page, watermarkText, width, height) => {
  try {
    console.log(`💧 Adding watermark: "${watermarkText}"`);
    
    // Add primary watermark
    page.drawText(watermarkText, {
      x: width / 2 - 100,
      y: height / 2,
      size: 48,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.3,
      rotate: degrees(45),
    });

    console.log(`✅ Watermark added successfully`);
  } catch (error) {
    console.error("❌ Failed to add watermark:", error);
  }
};

// TEST ENDPOINT - Creates a simple PDF with guaranteed logo
export const testLogoPDF = async (req, res) => {
  try {
    console.log("🧪 Creating test PDF with logo...");
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size

    // Add title
    page.drawText('LOGO AND WATERMARK TEST', {
      x: 50,
      y: 750,
      size: 24,
      color: rgb(0, 0, 0),
    });

    page.drawText('This PDF tests if logos and watermarks work correctly', {
      x: 50,
      y: 700,
      size: 14,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Try to add the company logo
    const logoPaths = [
      path.join(process.cwd(), 'public', 'Nexu Revised 6.png'),
      path.join(__dirname, '..', 'public', 'Nexu Revised 6.png'),
      path.join(__dirname, '..', '..', 'public', 'Nexu Revised 6.png'),
    ];

    let logoAdded = false;
    for (const logoPath of logoPaths) {
      if (fs.existsSync(logoPath)) {
        try {
          console.log(`🖼️ Adding logo from: ${logoPath}`);
          const imageBytes = fs.readFileSync(logoPath);
          const image = await pdfDoc.embedPng(imageBytes);
          
          const logoWidth = 100;
          const logoHeight = (image.height * logoWidth) / image.width;
          
          const x = 595 - logoWidth - 50;
          const y = 842 - logoHeight - 50;
          
          page.drawImage(image, {
            x,
            y,
            width: logoWidth,
            height: logoHeight,
          });

          // Add border and label
          page.drawRectangle({
            x: x - 2,
            y: y - 2,
            width: logoWidth + 4,
            height: logoHeight + 4,
            borderColor: rgb(0, 0, 1),
            borderWidth: 2,
          });

          page.drawText('COMPANY LOGO', {
            x: x,
            y: y - 20,
            size: 10,
            color: rgb(0, 0, 1),
          });

          logoAdded = true;
          console.log("✅ Logo added successfully to test PDF");
          break;
        } catch (error) {
          console.warn(`⚠️ Failed to add logo from ${logoPath}:`, error.message);
        }
      }
    }

    if (!logoAdded) {
      // Add placeholder
      page.drawRectangle({
        x: 415,
        y: 662,
        width: 100,
        height: 100,
        color: rgb(1, 0, 0),
        opacity: 0.3,
      });
      
      page.drawText('LOGO NOT FOUND', {
        x: 425,
        y: 712,
        size: 12,
        color: rgb(1, 0, 0),
      });
      
      page.drawText('Check: public/Nexu Revised 6.png', {
        x: 50,
        y: 600,
        size: 10,
        color: rgb(1, 0, 0),
      });
    }

    // Add watermark
    page.drawText('CONFIDENTIAL', {
      x: 200,
      y: 400,
      size: 48,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.3,
      rotate: degrees(45),
    });

    // Add status message
    page.drawText(`Logo Status: ${logoAdded ? 'ADDED ✓' : 'MISSING ✗'}`, {
      x: 50,
      y: 650,
      size: 12,
      color: logoAdded ? rgb(0, 0.5, 0) : rgb(1, 0, 0),
    });

    page.drawText(`Watermark Status: ADDED ✓`, {
      x: 50,
      y: 630,
      size: 12,
      color: rgb(0, 0.5, 0),
    });

    // Serialize to bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);
    
    console.log("✅ Test PDF created, size:", pdfBuffer.length, "bytes");

    // Send as PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="logo-test.pdf"');
    res.setHeader("Content-Length", pdfBuffer.length);
    
    return res.send(pdfBuffer);
    
  } catch (err) {
    console.error("❌ Test PDF error:", err);
    res.status(500).json({ 
      error: `Test failed: ${err.message}`
    });
  }
};

// File system check
export const checkFiles = async (req, res) => {
  try {
    const checks = [];
    
    // Check various logo paths
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