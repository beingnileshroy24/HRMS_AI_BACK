// routes/cvRoutes.js - Updated for DOCX
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  extractCVData, 
  generateFormattedCV, 
  evaluateCVQuality,
  getAllParsedData,
  getParsedDataById,
  searchParsedData,
  deleteParsedData,
  getParsedDataStats
} from "../controllers/cvController.js";

import { 
  generateDOCXFromTemplate,
  generateDOCXFromExtractedData,
  downloadSampleTemplate,
  testDOCXEndpoint,
  uploadTemplateOnly,
  debugDOCXTemplate
} from "../controllers/templatePdfController.js";

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for CV uploads only (PDF, images, text)
const cvUpload = multer({ 
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allow CV files: PDF, images, text
    if (file.mimetype.includes('pdf') || 
        file.mimetype.includes('image') ||
        file.mimetype.includes('text') ||
        file.originalname.match(/\.(pdf|jpg|jpeg|png|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Image (JPG/PNG), and Text files are allowed for CV upload'), false);
    }
  }
});

// CV Extraction & Generation endpoints
router.post("/extract", cvUpload.single("cv"), extractCVData);
router.post("/evaluate", evaluateCVQuality);

// DOCX Template endpoints
router.post("/generate-docx", cvUpload.single("cv"), async (req, res) => {
  // This will use default template
  req.files = { cv: [req.file] };
  await generateDOCXFromTemplate(req, res);
});

router.post("/generate-docx-with-template", 
  multer({ 
    dest: uploadsDir,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.fieldname === 'cv') {
        // CV files: PDF, images, text
        if (file.mimetype.includes('pdf') || 
            file.mimetype.includes('image') ||
            file.mimetype.includes('text') ||
            file.originalname.match(/\.(pdf|jpg|jpeg|png|txt)$/i)) {
          cb(null, true);
        } else {
          cb(new Error('CV must be PDF, Image, or Text file'), false);
        }
      } else if (file.fieldname === 'template') {
        // Template must be DOCX
        if (file.mimetype.includes('officedocument.wordprocessingml') ||
            file.originalname.match(/\.(docx)$/i)) {
          cb(null, true);
        } else {
          cb(new Error('Template must be DOCX file. Download sample and convert to DOCX.'), false);
        }
      } else {
        cb(new Error('Invalid field name'), false);
      }
    }
  }).fields([
    { name: 'cv', maxCount: 1 },
    { name: 'template', maxCount: 1 }
  ]), 
  generateDOCXFromTemplate
);

// Generate DOCX from already extracted data (no uploads)
router.post("/generate-docx-from-data", generateDOCXFromExtractedData);

// Template management endpoints
router.get("/template/sample", downloadSampleTemplate); // Download HTML sample
router.post("/upload-template", 
  multer({ 
    dest: uploadsDir,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.includes('officedocument.wordprocessingml') ||
          file.originalname.match(/\.(docx)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Only DOCX files are allowed'), false);
      }
    }
  }).single("template"), 
  uploadTemplateOnly
);

// Test endpoint
router.get("/test-docx", testDOCXEndpoint);

// Data Management endpoints
router.get("/data", getAllParsedData);
router.get("/data/stats", getParsedDataStats);
router.get("/data/search", searchParsedData);
router.get("/data/:id", getParsedDataById);
router.delete("/data/:id", deleteParsedData);

router.post("/debug-template", 
  multer({ 
    dest: uploadsDir,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.includes('officedocument.wordprocessingml') ||
          file.originalname.match(/\.(docx)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Only DOCX files are allowed'), false);
      }
    }
  }).single("template"), 
  debugDOCXTemplate
);

export default router;