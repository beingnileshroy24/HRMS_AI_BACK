import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cvRoutes from "./routes/cvRoutes.js";
import brandingRoutes from './routes/brandingRoutes.js';

// Load environment variables first
dotenv.config();

const app = express();

app.use('/api/branding', brandingRoutes);

// CORS configuration
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000", 
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "CV Processor Backend is running!",
    timestamp: new Date().toISOString(),
    port: process.env.PORT,
    version: "1.0.0",
    features: ["CV Extraction", "PDF Generation", "Local AI Parsing"]
  });
});

// Routes
app.use("/api/cv", cvRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 CV Processor Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ Ready to process CV files!`);
});