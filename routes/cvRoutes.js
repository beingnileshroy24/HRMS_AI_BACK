import express from "express";
import multer from "multer";
import { 
  extractCVData, 
  generateFormattedCV, 
  processCVWithTemplate, 
  evaluateCVQuality,
  generateProfessionalCV,  // NEW IMPORT
  getAllParsedData,
  getParsedDataById,
  searchParsedData,
  deleteParsedData,
  getParsedDataStats
} from "../controllers/cvController.js";

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
        file.originalname.match(/\.(pdf|doc|docx|jpg|jpeg|png)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and image files are allowed'), false);
    }
  }
});

const uploadFields = upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'template', maxCount: 1 }
]);

// CV Extraction & Generation endpoints
router.post("/extract", upload.single("cv"), extractCVData);
router.post("/generate-cv", generateFormattedCV);
router.post("/generate-professional-cv", generateProfessionalCV); // NEW ROUTE
router.post("/process-with-template", uploadFields, processCVWithTemplate);
router.post("/evaluate", evaluateCVQuality);

// Data Management endpoints
router.get("/data", getAllParsedData);
router.get("/data/stats", getParsedDataStats);
router.get("/data/search", searchParsedData);
router.get("/data/:id", getParsedDataById);
router.delete("/data/:id", deleteParsedData);

export default router;