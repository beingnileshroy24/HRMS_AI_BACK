// routes/cvRoutes.js
import express from "express";
import multer from "multer";
import { 
  extractCVData, 
  generateFormattedCV, 
  processCVWithTemplate, 
  evaluateCVQuality,
  generateProfessionalCV,
  getAllParsedData,
  getParsedDataById,
  searchParsedData,
  deleteParsedData,
  getParsedDataStats
} from "../controllers/cvController.js";

import { 
  generatePDFFromTemplate,
  generatePDFFromExtractedData,
  downloadSampleTemplate,
  testPDFEndpoint
} from "../controllers/templatePdfController.js";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('pdf') || 
        file.mimetype.includes('word') || 
        file.mimetype.includes('officedocument') ||
        file.mimetype.includes('image') ||
        file.mimetype.includes('text') ||
        file.originalname.match(/\.(pdf|doc|docx|jpg|jpeg|png|txt|html)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, Image, Text, and HTML files are allowed'), false);
    }
  }
});

const uploadSingle = upload.single("cv");
const uploadFields = upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'template', maxCount: 1 }
]);

// CV Extraction & Generation endpoints
router.post("/extract", uploadSingle, extractCVData);
router.post("/generate-cv", generateFormattedCV);
router.post("/generate-professional-cv", generateProfessionalCV);
router.post("/process-with-template", uploadFields, processCVWithTemplate);
router.post("/evaluate", evaluateCVQuality);

// PDF Template endpoints
router.post("/generate-pdf-template", uploadFields, generatePDFFromTemplate);
router.post("/generate-pdf-from-data", generatePDFFromExtractedData);
router.get("/template/sample", downloadSampleTemplate);
router.get("/test-pdf", testPDFEndpoint);

// Data Management endpoints
router.get("/data", getAllParsedData);
router.get("/data/stats", getParsedDataStats);
router.get("/data/search", searchParsedData);
router.get("/data/:id", getParsedDataById);
router.delete("/data/:id", deleteParsedData);

export default router;