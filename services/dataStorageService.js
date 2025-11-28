// services/dataStorageService.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), 'data', 'parsed-cvs');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

// Ensure data directory exists
const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(INDEX_FILE)) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify({ entries: [] }, null, 2));
  }
};

// Generate unique ID for each CV
const generateId = () => {
  return `cv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Save parsed CV data to JSON file
export const saveParsedCVData = async (cvData, originalFileName, metadata = {}) => {
  try {
    ensureDataDir();
    
    const id = generateId();
    const timestamp = new Date().toISOString();
    
    const cvEntry = {
      id,
      timestamp,
      originalFileName,
      metadata: {
        parser: metadata.parser || 'gemini_vision',
        fileType: metadata.fileType || 'pdf',
        ...metadata
      },
      data: cvData
    };

    // Save individual CV file
    const cvFilePath = path.join(DATA_DIR, `${id}.json`);
    fs.writeFileSync(cvFilePath, JSON.stringify(cvEntry, null, 2));

    // Update index
    const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    index.entries.push({
      id,
      timestamp,
      originalFileName,
      name: cvData.personal_info?.full_name || 'Unknown',
      email: cvData.personal_info?.email || '',
      score: metadata.score || 0
    });

    // Keep only latest 1000 entries
    if (index.entries.length > 1000) {
      index.entries = index.entries.slice(-1000);
    }

    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

    console.log(`✅ CV data saved: ${id}`);
    return { id, filePath: cvFilePath };
  } catch (error) {
    console.error('❌ Failed to save CV data:', error);
    throw error;
  }
};

// Get all parsed CVs (summary)
export const getAllParsedCVs = () => {
  try {
    ensureDataDir();
    
    if (!fs.existsSync(INDEX_FILE)) {
      return { entries: [] };
    }
    
    const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    return index;
  } catch (error) {
    console.error('❌ Failed to read CV index:', error);
    return { entries: [] };
  }
};

// Get specific CV data by ID
export const getCVDataById = (id) => {
  try {
    const cvFilePath = path.join(DATA_DIR, `${id}.json`);
    
    if (!fs.existsSync(cvFilePath)) {
      return null;
    }
    
    const cvData = JSON.parse(fs.readFileSync(cvFilePath, 'utf8'));
    return cvData;
  } catch (error) {
    console.error(`❌ Failed to read CV data for ${id}:`, error);
    return null;
  }
};

// Search CVs by criteria
export const searchCVs = (criteria) => {
  try {
    const index = getAllParsedCVs();
    
    return index.entries.filter(entry => {
      const cvData = getCVDataById(entry.id);
      if (!cvData) return false;

      const searchableText = JSON.stringify(cvData.data).toLowerCase();
      const searchTerm = criteria.query.toLowerCase();

      return searchableText.includes(searchTerm);
    });
  } catch (error) {
    console.error('❌ Search failed:', error);
    return [];
  }
};

// Delete CV data by ID
export const deleteCVData = (id) => {
  try {
    const cvFilePath = path.join(DATA_DIR, `${id}.json`);
    
    // Remove individual file
    if (fs.existsSync(cvFilePath)) {
      fs.unlinkSync(cvFilePath);
    }
    
    // Update index
    const index = getAllParsedCVs();
    index.entries = index.entries.filter(entry => entry.id !== id);
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    
    console.log(`✅ CV data deleted: ${id}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete CV data ${id}:`, error);
    return false;
  }
};

// Get statistics
export const getCVStats = () => {
  try {
    const index = getAllParsedCVs();
    
    const stats = {
      total: index.entries.length,
      byMonth: {},
      skills: {},
      locations: {}
    };

    index.entries.forEach(entry => {
      const cvData = getCVDataById(entry.id);
      if (!cvData) return;

      // Count by month
      const month = entry.timestamp.substring(0, 7); // YYYY-MM
      stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;

      // Count skills
      if (cvData.data.skills) {
        cvData.data.skills.forEach(skill => {
          stats.skills[skill] = (stats.skills[skill] || 0) + 1;
        });
      }

      // Count locations
      if (cvData.data.personal_info?.location) {
        const location = cvData.data.personal_info.location;
        stats.locations[location] = (stats.locations[location] || 0) + 1;
      }
    });

    return stats;
  } catch (error) {
    console.error('❌ Failed to get stats:', error);
    return { total: 0, byMonth: {}, skills: {}, locations: {} };
  }
};