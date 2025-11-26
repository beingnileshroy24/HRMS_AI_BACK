import express from "express";
import multer from "multer";
import { extractCVData, generateFormattedCV, processCVWithTemplate } from "../controllers/cvController.js";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF and Word documents
    if (file.mimetype.includes('pdf') || 
        file.mimetype.includes('word') || 
        file.mimetype.includes('officedocument') ||
        file.originalname.match(/\.(pdf|doc|docx)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'), false);
    }
  }
});

const uploadFields = upload.fields([
  { name: 'cv', maxCount: 1 },       // The Resume PDF to extract data FROM
  { name: 'template', maxCount: 1 }  // The Word Doc to inject data INTO
]);

// CV Extraction & Generation endpoints
router.post("/extract", upload.single("cv"), extractCVData);
router.post("/generate-cv", generateFormattedCV);
router.post("/process-with-template", uploadFields, processCVWithTemplate);

export default router;