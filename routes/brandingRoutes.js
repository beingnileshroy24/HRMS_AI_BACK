// routes/brandingRoutes.js
import express from "express";
import multer from "multer";
import { 
  generateBrandedCV, 
  testLogoPDF,
  checkFiles
} from "../controllers/brandingController.js";

const router = express.Router();

// CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Configure multer
const brandingUpload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024,
  }
});

// Branding endpoints
router.post("/generate-branded-cv", 
  brandingUpload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'logo', maxCount: 1 }
  ]), 
  generateBrandedCV
);

// Test endpoints
router.get("/test-logo", testLogoPDF);
router.get("/check-files", checkFiles);

export default router;