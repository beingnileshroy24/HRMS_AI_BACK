import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

export class GeminiVisionCVParser {
  constructor() {
    // We do NOT initialize genAI here anymore to avoid import-time errors.
    // We will initialize it lazily in the getModel method.
  }

  /**
   * Helper to get the model instance, ensuring the API key is read at runtime.
   */
  getModel(modelName = "gemini-2.5-flash") {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not defined in environment variables."
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    return genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192, // Increased slightly for complex CVs
      },
    });
  }

  async parsePDFWithVision(pdfBuffer, filename) {
    try {
      console.log("🔄 Parsing PDF with Gemini Vision...");

      // Get model lazily
      const model = this.getModel("gemini-2.5-flash");

      // Convert PDF buffer to base64
      const base64PDF = pdfBuffer.toString("base64");

      const prompt = `
You are an expert CV/resume parser. Analyze this PDF document and extract ALL information.

Extract the following information with high accuracy:

PERSONAL INFORMATION:
- Full Name (extract the actual name, don't use placeholder)
- Email Address
- Phone Number
- Location/Address
- LinkedIn Profile URL
- Portfolio/Website

PROFESSIONAL SUMMARY:
- Extract the professional summary or objective

SKILLS:
- Technical skills (programming languages, tools, frameworks)
- Soft skills
- Certifications mentioned

WORK EXPERIENCE:
For each job position, extract:
- Job Title
- Company Name
- Employment Duration (start date - end date)
- Location
- Key achievements and responsibilities

EDUCATION:
For each education entry, extract:
- Degree/Certificate
- Institution Name
- Graduation Year
- Location

CERTIFICATIONS:
- Any professional certifications

PROJECTS:
- Any mentioned projects or portfolio work

LANGUAGES:
- Languages spoken and proficiency levels

Return the information as a structured JSON object with this exact format:
{
  "personal_info": {
    "full_name": "extracted actual name",
    "email": "extracted email",
    "phone": "extracted phone",
    "location": "extracted location",
    "linkedin": "extracted linkedin",
    "portfolio": "extracted portfolio"
  },
  "professional_summary": "extracted summary",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "job_title": "extracted job title",
      "company": "extracted company",
      "duration": "extracted duration",
      "location": "extracted location",
      "achievements": ["achievement1", "achievement2"]
    }
  ],
  "education": [
    {
      "degree": "extracted degree",
      "institution": "extracted institution",
      "year": "extracted year",
      "location": "extracted location"
    }
  ],
  "certifications": ["cert1", "cert2"],
  "projects": ["project1", "project2"],
  "languages": ["language1", "language2"]
}

Important: Only extract information that is actually visible in the document. Be accurate with names, dates, and technical details.
`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64PDF,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      console.log("✅ PDF parsed successfully with Gemini Vision");
      return this.parseVisionResponse(text);
    } catch (error) {
      console.error("❌ Gemini Vision parsing error:", error);
      throw new Error(`Gemini Vision parsing failed: ${error.message}`);
    }
  }

  async parseImageWithVision(imageBuffer, mimeType, filename) {
    try {
      console.log("🔄 Parsing image with Gemini Vision...");

      // Get model lazily
      const model = this.getModel("gemini-2.5-flash");

      const base64Image = imageBuffer.toString("base64");

      const prompt = `
You are an expert CV/resume parser. Analyze this image of a CV/resume and extract ALL visible information.

Extract the following information accurately:

PERSONAL INFORMATION:
- Full Name (exactly as written)
- Email Address
- Phone Number
- Location
- LinkedIn Profile
- Personal Website/Portfolio

PROFESSIONAL BACKGROUND:
- Professional Summary/Objective
- Work Experience (job titles, companies, dates, responsibilities)
- Education (degrees, institutions, years, locations)
- Skills (technical, soft, tools, languages)
- Certifications
- Projects
- Languages

Return the information as a structured JSON object. Be precise with:
- Names (don't invent or modify)
- Dates and durations
- Technical terms and skills
- Company and institution names

Format the output as valid JSON only.
`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: mimeType, // "image/png", "image/jpeg", etc.
            data: base64Image,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      console.log("✅ Image parsed successfully with Gemini Vision");
      return this.parseVisionResponse(text);
    } catch (error) {
      console.error("❌ Image parsing error:", error);
      throw new Error(`Image parsing failed: ${error.message}`);
    }
  }

  // NEW: Parse CV text with HTML content support
  async parseCVTextWithGemini(cvText, htmlContent = null) {
    try {
      console.log("🔄 Parsing CV text with Gemini...");
      
      // Get model lazily
      const model = this.getModel("gemini-2.5-flash");

      // If HTML content is provided, extract links first
      let extractedLinks = [];
      if (htmlContent) {
        extractedLinks = this.extractLinksFromHTML(htmlContent);
        console.log(`🔗 Found ${extractedLinks.length} links in HTML`);
      }

      // Build enhanced prompt
      let prompt = `
You are an expert CV/resume parser. Extract all information from this CV text and return as structured JSON.

CV TEXT:
${cvText.substring(0, 15000)}

`;

      // Add link information if available
      if (extractedLinks.length > 0) {
        prompt += `
IMPORTANT LINK INFORMATION FOUND IN DOCUMENT:
The CV contains hyperlinks. Here are the extracted links:
${extractedLinks.map(link => `- ${link.text}: ${link.url}`).join('\n')}

Please ensure these links are properly extracted in the JSON output under the relevant sections.
`;
      }

      prompt += `

CRITICAL INSTRUCTIONS:
1. Extract ALL hyperlinks/URLs found in the text (LinkedIn, GitHub, Portfolio, etc.)
2. Categorize links appropriately (LinkedIn under personal_info.linkedin, GitHub/Portfolio under personal_info.portfolio)
3. If multiple portfolio links exist, combine them or use the most relevant one

Return ONLY a valid JSON object with this structure (no additional text):
{
  "personal_info": {
    "full_name": "extracted name or empty string",
    "email": "extracted email or empty string",
    "phone": "extracted phone or empty string",
    "location": "extracted location or empty string",
    "linkedin": "extracted linkedin URL or empty string",
    "portfolio": "extracted portfolio/github URL or empty string"
  },
  "professional_summary": "extracted summary or empty string",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "job_title": "extracted job title",
      "company": "extracted company",
      "duration": "extracted duration",
      "location": "extracted location",
      "achievements": ["achievement1", "achievement2", ...]
    }
  ],
  "education": [
    {
      "degree": "extracted degree",
      "institution": "extracted institution",
      "year": "extracted year",
      "location": "extracted location"
    }
  ],
  "certifications": ["cert1", "cert2", ...],
  "projects": ["project1", "project2", ...],
  "languages": ["language1", "language2", ...],
  "extracted_links": ${JSON.stringify(extractedLinks)}
}

CRITICAL RULES:
1. All array fields (skills, certifications, projects, languages) must be arrays, even if empty
2. All string values must be properly escaped
3. If a field cannot be extracted, use an empty string for strings or empty array for arrays
4. Return ONLY the JSON object, no markdown code blocks
5. Ensure URLs are properly extracted and included in the relevant fields
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log("✅ Text parsed successfully with link extraction");
      
      // Parse the response
      const parsedData = this.parseVisionResponse(text);
      
      // Merge extracted links with parsed data
      if (extractedLinks.length > 0) {
        // Add extracted_links field
        parsedData.extracted_links = extractedLinks;
        
        // Ensure LinkedIn and Portfolio URLs are properly set
        this.enhanceParsedDataWithLinks(parsedData, extractedLinks);
      }
      
      return parsedData;
    } catch (error) {
      console.error("❌ Text parsing failed:", error);
      
      // Return default structure with extracted links if available
      const defaultData = this.getDefaultStructure();
      
      if (htmlContent) {
        const extractedLinks = this.extractLinksFromHTML(htmlContent);
        if (extractedLinks.length > 0) {
          defaultData.extracted_links = extractedLinks;
          this.enhanceParsedDataWithLinks(defaultData, extractedLinks);
        }
      }
      
      return defaultData;
    }
  }

  // NEW: Helper function to extract links from HTML
  extractLinksFromHTML(htmlContent) {
    try {
      console.log("🔍 Extracting links from HTML content...");
      
      const links = [];
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
      let match;
      
      while ((match = linkRegex.exec(htmlContent)) !== null) {
        const url = match[1].trim();
        const text = match[2].replace(/<[^>]+>/g, '').trim(); // Strip any HTML tags from link text
        
        if (url && !url.startsWith('#')) { // Skip anchor links
          // Categorize link
          let type = 'other';
          const urlLower = url.toLowerCase();
          
          if (urlLower.includes('linkedin.com') || urlLower.includes('linked.in')) {
            type = 'linkedin';
          } else if (urlLower.includes('github.com')) {
            type = 'github';
          } else if (urlLower.includes('portfolio') || urlLower.includes('website') || 
                     urlLower.includes('http://') || urlLower.includes('https://')) {
            type = 'portfolio';
          } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
            type = 'twitter';
          } else if (urlLower.includes('facebook.com')) {
            type = 'facebook';
          } else if (urlLower.includes('instagram.com')) {
            type = 'instagram';
          } else if (urlLower.includes('behance.net') || urlLower.includes('dribbble.com')) {
            type = 'design_portfolio';
          } else if (urlLower.includes('medium.com') || urlLower.includes('dev.to')) {
            type = 'blog';
          }
          
          links.push({
            url: url,
            text: text || url,
            type: type
          });
        }
      }
      
      console.log(`✅ Extracted ${links.length} links from HTML`);
      return links;
    } catch (error) {
      console.error("❌ Link extraction error:", error);
      return [];
    }
  }

  // NEW: Enhance parsed data with extracted links
  enhanceParsedDataWithLinks(parsedData, extractedLinks) {
    try {
      console.log("✨ Enhancing parsed data with extracted links...");
      
      // Find LinkedIn link
      const linkedinLink = extractedLinks.find(link => link.type === 'linkedin');
      if (linkedinLink && !parsedData.personal_info.linkedin) {
        parsedData.personal_info.linkedin = linkedinLink.url;
        console.log(`   Added LinkedIn: ${linkedinLink.url}`);
      }
      
      // Find portfolio/github links
      const portfolioLinks = extractedLinks.filter(link => 
        ['portfolio', 'github', 'design_portfolio', 'blog'].includes(link.type)
      );
      
      if (portfolioLinks.length > 0) {
        // Use the first portfolio link or combine them
        const primaryPortfolio = portfolioLinks[0];
        if (!parsedData.personal_info.portfolio) {
          parsedData.personal_info.portfolio = primaryPortfolio.url;
          console.log(`   Added portfolio: ${primaryPortfolio.url}`);
        }
        
        // Store all portfolio links
        if (!parsedData.all_portfolio_links) {
          parsedData.all_portfolio_links = portfolioLinks.map(link => link.url);
        }
      }
      
      // Add social links to personal_info
      const socialLinks = extractedLinks.filter(link => 
        ['twitter', 'facebook', 'instagram'].includes(link.type)
      );
      
      socialLinks.forEach(link => {
        if (!parsedData.personal_info[link.type]) {
          parsedData.personal_info[link.type] = link.url;
          console.log(`   Added ${link.type}: ${link.url}`);
        }
      });
      
    } catch (error) {
      console.error("❌ Error enhancing data with links:", error);
    }
  }

  parseVisionResponse(responseText) {
    try {
      // Clean the response text
      let cleanedText = responseText.trim();

      // Remove markdown code blocks
      cleanedText = cleanedText.replace(/```json\s*/g, "");
      cleanedText = cleanedText.replace(/```\s*/g, "");

      // Extract JSON from response
      const jsonStart = cleanedText.indexOf("{");
      const jsonEnd = cleanedText.lastIndexOf("}") + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        console.log("Raw response for debugging:", responseText);
        throw new Error("No JSON object found in vision response");
      }

      cleanedText = cleanedText.substring(jsonStart, jsonEnd);

      // Parse JSON
      const parsedData = JSON.parse(cleanedText);

      // ✅ FIX: Ensure projects is an array before validation
      if (parsedData.projects && !Array.isArray(parsedData.projects)) {
        console.warn("Projects is not an array, converting...", parsedData.projects);
        parsedData.projects = [parsedData.projects];
      }

      // ✅ FIX: Ensure all array fields are arrays
      const arrayFields = ['skills', 'certifications', 'languages', 'projects'];
      arrayFields.forEach(field => {
        if (parsedData[field] && !Array.isArray(parsedData[field])) {
          console.warn(`${field} is not an array, converting...`, parsedData[field]);
          parsedData[field] = [parsedData[field]];
        }
      });

      // Validate and clean the data
      return this.validateVisionData(parsedData);
    } catch (error) {
      console.error("❌ Failed to parse vision response:", error);
      console.log("Raw vision response:", responseText);
      
      // ✅ FIX: Return a safe default structure instead of throwing
      console.log("Returning default structure due to parsing error");
      return this.getDefaultStructure();
    }
  }

  // ✅ ADD THIS METHOD FOR DEFAULT STRUCTURE
  getDefaultStructure() {
    return {
      personal_info: {
        full_name: "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        portfolio: "",
        github: "",
        twitter: "",
        facebook: "",
        instagram: ""
      },
      professional_summary: "",
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      projects: [],
      languages: [],
      extracted_links: []
    };
  }

  validateVisionData(data) {
    // Ensure all required fields exist with proper fallbacks
    const validatedData = {
      personal_info: {
        full_name: this.safeString(data.personal_info?.full_name) || this.extractNameFromVision(data) || "Professional Candidate",
        email: this.safeString(data.personal_info?.email) || "",
        phone: this.safeString(data.personal_info?.phone) || "",
        location: this.safeString(data.personal_info?.location) || "",
        linkedin: this.safeString(data.personal_info?.linkedin) || "",
        portfolio: this.safeString(data.personal_info?.portfolio) || "",
        github: this.safeString(data.personal_info?.github) || "",
        twitter: this.safeString(data.personal_info?.twitter) || "",
        facebook: this.safeString(data.personal_info?.facebook) || "",
        instagram: this.safeString(data.personal_info?.instagram) || ""
      },
      professional_summary: this.safeString(data.professional_summary) || "",
      skills: this.normalizeArray(data.skills),
      experience: this.normalizeExperience(data.experience),
      education: this.normalizeEducation(data.education),
      certifications: this.normalizeArray(data.certifications),
      projects: this.normalizeArray(data.projects),
      languages: this.normalizeArray(data.languages),
      extracted_links: data.extracted_links || []
    };

    return validatedData;
  }

  safeString(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    // If it's an object or array, convert to JSON string
    try {
      return JSON.stringify(value).trim();
    } catch {
      return '';
    }
  }

  normalizeArray(arr) {
    if (!Array.isArray(arr)) return [];
    
    return arr
      .filter(item => item != null)
      .map(item => {
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'number') return String(item);
        if (typeof item === 'object') {
          try {
            return JSON.stringify(item);
          } catch {
            return '';
          }
        }
        return String(item).trim();
      })
      .filter(item => item.length > 0);
  }

  normalizeExperience(experience) {
    if (!Array.isArray(experience)) return [];
    
    return experience
      .filter(exp => exp != null)
      .map(exp => ({
        job_title: this.safeString(exp.job_title) || "Professional Role",
        company: this.safeString(exp.company) || "Company",
        duration: this.safeString(exp.duration) || "Duration not specified",
        location: this.safeString(exp.location) || "",
        achievements: this.normalizeArray(exp.achievements)
      }));
  }

  normalizeEducation(education) {
    if (!Array.isArray(education)) return [];
    
    return education
      .filter(edu => edu != null)
      .map(edu => ({
        degree: this.safeString(edu.degree) || "Degree",
        institution: this.safeString(edu.institution) || "Institution",
        year: this.safeString(edu.year) || "Year not specified",
        location: this.safeString(edu.location) || ""
      }));
  }

  extractNameFromVision(data) {
    if (data.full_name) return data.full_name;
    if (data.name) return data.name;

    const rawText = data.raw_text || "";
    const lines = rawText.split("\n").filter((line) => line.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.match(/^[A-Z][a-z]+ [A-Z][a-z]+/)) {
        return firstLine;
      }
    }

    return null;
  }

  // Helper for generating formatted CV text (referenced in controller)
  async generateFormattedCV(extractedData) {
    const model = this.getModel("gemini-2.5-flash");
    const prompt = `
     Based on this data: ${JSON.stringify(extractedData)}
     Write a professional CV content in Markdown format.
     `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  async evaluateCV(extractedData) {
    try {
      console.log('📊 Evaluating CV Quality...');
      const model = this.getModel("gemini-2.5-flash");

      const prompt = `
You are an expert ATS (Applicant Tracking System) and Senior HR Recruiter. 
Analyze the following parsed resume data and provide a performance score.

RESUME DATA:
${JSON.stringify(extractedData)}

SCORING CRITERIA (0-100):
1. Impact (Do descriptions use numbers, metrics, and action verbs?)
2. Skills Match (Are technical and soft skills clearly defined?)
3. Completeness (Are all key sections present and detailed?)
4. Clarity (Is the structure logical and easy to read?)

OUTPUT FORMAT:
Return ONLY a valid JSON object (no markdown, no extra text) with this structure:
{
  "overall_score": 85,
  "breakdown": {
    "impact": 80,
    "skills": 90,
    "completeness": 95,
    "clarity": 75
  },
  "strengths": ["Strong technical skills listed", "Good use of action verbs"],
  "weaknesses": ["Summary is too vague", "Work experience lacks quantitative metrics"],
  "improvement_tips": ["Add numbers to your project descriptions (e.g., 'Increased revenue by 20%')", "Tailor your summary to specific job roles"]
}
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON manually instead of using this.parseVisionResponse()
      let cleanedText = text.trim();
      // Remove markdown code blocks if present
      cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Extract valid JSON substring
      const jsonStart = cleanedText.indexOf('{');
      const jsonEnd = cleanedText.lastIndexOf('}') + 1;
      
      if (jsonStart === -1) throw new Error("No JSON found in response");
      
      const jsonStr = cleanedText.substring(jsonStart, jsonEnd);
      
      // Return the raw scoring object
      return JSON.parse(jsonStr);

    } catch (error) {
      console.error('❌ CV Evaluation error:', error);
      // Return a fallback object so the UI doesn't crash
      return {
        overall_score: 0,
        breakdown: { impact: 0, skills: 0, completeness: 0, clarity: 0 },
        strengths: ["Could not analyze CV"],
        weaknesses: [error.message],
        improvement_tips: ["Try uploading the file again"]
      };
    }
  }
}

// Export singleton without passing the key
export const geminiVisionParser = new GeminiVisionCVParser();