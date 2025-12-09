// routes/cvRoutes.js - CORRECTED VERSION

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
  debugDOCXTemplate,
  getAdvancedTemplate,
  getTemplateDocumentation,
  testAdvancedTemplate,
  extractDataFromCVUrl,           // NEW: URL extraction
  generateDOCXFromCVUrl          // NEW: URL DOCX generation
} from "../controllers/templatePdfController.js";

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ============================================
// MULTER UPLOAD CONFIGURATIONS (DEFINE THEM HERE, NOT IMPORTED)
// ============================================

// For template uploads (DOCX only)
const templateUpload = multer({ 
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('officedocument.wordprocessingml') ||
        file.mimetype.includes('msword') ||
        file.originalname.match(/\.(docx|doc)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only DOCX files are allowed'), false);
    }
  }
});

// For CV uploads (PDF, images, text, DOCX)
const cvUpload = multer({ 
  dest: uploadsDir,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB (increased for DOCX)
  },
  fileFilter: (req, file, cb) => {
    // Allow CV files: PDF, images, text, DOCX
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    const allowedExtensions = /\.(pdf|jpg|jpeg|png|txt|docx|doc)$/i;
    
    if (allowedMimeTypes.some(type => file.mimetype.includes(type)) || 
        allowedExtensions.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, Image (JPG/PNG), and Text files are allowed for CV upload'), false);
    }
  }
});

// For combined CV + Template uploads
const cvWithTemplateUpload = multer({ 
  dest: uploadsDir,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'cv') {
      // CV files: PDF, images, text, DOCX
      const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      
      const allowedExtensions = /\.(pdf|jpg|jpeg|png|txt|docx|doc)$/i;
      
      if (allowedMimeTypes.some(type => file.mimetype.includes(type)) || 
          allowedExtensions.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error('CV must be PDF, DOCX, Image, or Text file'), false);
      }
    } else if (file.fieldname === 'template') {
      // Template must be DOCX/DOC
      if (file.mimetype.includes('officedocument.wordprocessingml') ||
          file.mimetype.includes('msword') ||
          file.originalname.match(/\.(docx|doc)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Template must be DOCX or DOC file'), false);
      }
    } else {
      cb(new Error('Invalid field name'), false);
    }
  }
});

// ============================================
// URL-BASED ENDPOINTS (NEW)
// ============================================

// Extract CV data from URL
router.post("/extract-from-url", extractDataFromCVUrl);

// Generate DOCX from CV URL (no template - uses default)
router.post("/generate-docx-from-url", generateDOCXFromCVUrl);

// Generate DOCX from CV URL with template (form-data)
router.post("/generate-docx-from-url-with-template", 
  templateUpload.single("template"),
  generateDOCXFromCVUrl
);

// ============================================
// FILE-BASED ENDPOINTS (EXISTING)
// ============================================

// CV Extraction & Generation endpoints
router.post("/extract", cvUpload.single("cv"), extractCVData);
router.post("/evaluate", evaluateCVQuality);

// Generate DOCX from uploaded CV (default template)
router.post("/generate-docx", cvUpload.single("cv"), async (req, res) => {
  // This will use default template
  req.files = { cv: [req.file] };
  await generateDOCXFromTemplate(req, res);
});

// Generate DOCX with custom template
router.post("/generate-docx-with-template", 
  cvWithTemplateUpload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'template', maxCount: 1 }
  ]), 
  generateDOCXFromTemplate
);

// Generate DOCX from already extracted data (no uploads)
router.post("/generate-docx-from-data", generateDOCXFromExtractedData);

// ============================================
// TEMPLATE MANAGEMENT
// ============================================

// Template downloads
router.get("/template/sample", downloadSampleTemplate);
router.get("/template/advanced", getAdvancedTemplate);
router.get("/template/documentation", getTemplateDocumentation);
router.get("/template/test-advanced", testAdvancedTemplate);

// Template upload validation
router.post("/upload-template", 
  templateUpload.single("template"), 
  uploadTemplateOnly
);

// Template debugging
router.post("/debug-template", 
  templateUpload.single("template"), 
  debugDOCXTemplate
);

// ============================================
// DATA MANAGEMENT
// ============================================

router.get("/data", getAllParsedData);
router.get("/data/stats", getParsedDataStats);
router.get("/data/search", searchParsedData);
router.get("/data/:id", getParsedDataById);
router.delete("/data/:id", deleteParsedData);

// ============================================
// TEST & HEALTH CHECK ENDPOINTS
// ============================================

router.get("/test-docx", testDOCXEndpoint);

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    features: {
      file_upload: "enabled",
      url_processing: "enabled",
      docx_generation: "enabled",
      template_processing: "enabled"
    },
    endpoints: {
      file_extraction: "POST /api/cv/extract",
      url_extraction: "POST /api/cv/extract-from-url",
      file_docx_generation: "POST /api/cv/generate-docx",
      url_docx_generation: "POST /api/cv/generate-docx-from-url",
      custom_template_generation: "POST /api/cv/generate-docx-with-template",
      url_template_generation: "POST /api/cv/generate-docx-from-url-with-template",
      sample_template: "GET /api/cv/template/sample"
    }
  });
});

// Route info endpoint
router.get("/endpoints", (req, res) => {
  res.json({
    message: "CV Processing API Endpoints",
    base_path: "/api/cv",
    endpoints: [
      {
        method: "POST",
        path: "/extract",
        description: "Extract data from uploaded CV file",
        params: "multipart/form-data with 'cv' file",
        file_types: "PDF, DOCX, DOC, JPG, PNG, TXT"
      },
      {
        method: "POST",
        path: "/extract-from-url",
        description: "Extract data from CV URL",
        params: "JSON body with 'cv_url' field",
        url_types: "Direct links to PDF, DOCX, DOC, JPG, PNG, TXT files"
      },
      {
        method: "POST",
        path: "/generate-docx",
        description: "Generate DOCX from uploaded CV (default template)",
        params: "multipart/form-data with 'cv' file"
      },
      {
        method: "POST",
        path: "/generate-docx-from-url",
        description: "Generate DOCX from CV URL (default template)",
        params: "JSON body with 'cv_url' field"
      },
      {
        method: "POST",
        path: "/generate-docx-with-template",
        description: "Generate DOCX with custom template",
        params: "multipart/form-data with 'cv' file and optional 'template' file"
      },
      {
        method: "POST",
        path: "/generate-docx-from-url-with-template",
        description: "Generate DOCX from URL with custom template",
        params: "multipart/form-data with 'cv_url' field and 'template' file"
      },
      {
        method: "GET",
        path: "/template/sample",
        description: "Download sample HTML template"
      },
      {
        method: "GET",
        path: "/health",
        description: "API health check"
      }
    ]
  });
});

export default router;