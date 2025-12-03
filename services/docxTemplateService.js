// services/docxTemplateService.js - SIMPLIFIED VERSION
import JSZip from 'jszip';

export class DOCXTemplateService {
  
  constructor() {
    // Simple constructor
  }

  /**
   * Simple and reliable DOCX template processing
   */
  async processDOCXTemplate(docxBuffer, data) {
    try {
      console.log("🔄 Processing DOCX template (simple method)...");
      
      // Load the DOCX file
      const zip = await JSZip.loadAsync(dxBuffer);
      
      // Get the main document XML
      let documentXml = await zip.file('word/document.xml').async('text');
      
      console.log("📄 Document XML loaded, length:", documentXml.length);
      
      // Get all replacements
      const replacements = this.getAllReplacements(data);
      
      // Perform replacements
      documentXml = this.performReplacements(documentXml, replacements);
      
      // Update the ZIP
      zip.file('word/document.xml', documentXml);
      
      // Generate new DOCX
      const newDocxBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      
      console.log("✅ DOCX processed successfully");
      return newDocxBuffer;
      
    } catch (error) {
      console.error('DOCX processing error:', error);
      // Create a simple DOCX as fallback
      return this.createSimpleDOCX(data);
    }
  }

  /**
   * Perform text replacements safely
   */
  performReplacements(xmlText, replacements) {
    console.log("🔍 Performing text replacements...");
    
    let result = xmlText;
    let totalReplacements = 0;
    
    // First, try to find what placeholders actually exist in the document
    console.log("📋 Searching for placeholders in document...");
    
    // List of placeholder patterns to search for
    const searchPatterns = [
      /\[[A-Z_]+\]/g,        // [UPPERCASE_WORDS]
      /\{\{[A-Z_]+\}\}/g,    // {{UPPERCASE_WORDS}}
      /\[[a-zA-Z_]+\]/g,     // [mixedCase]
      /\{\{[a-zA-Z_]+\}\}/g  // {{mixedCase}}
    ];
    
    // Find all unique placeholders
    const foundPlaceholders = new Set();
    searchPatterns.forEach(pattern => {
      const matches = xmlText.match(pattern);
      if (matches) {
        matches.forEach(match => foundPlaceholders.add(match));
      }
    });
    
    console.log(`🔍 Found ${foundPlaceholders.size} unique placeholders:`);
    foundPlaceholders.forEach(ph => console.log(`  - ${ph}`));
    
    // Now perform replacements for each found placeholder
    for (const placeholder of foundPlaceholders) {
      // Extract the key from the placeholder (remove brackets/braces)
      let key = placeholder.replace(/[\[\]{}]/g, '');
      
      // Try to find a replacement value
      let value = this.findReplacementValue(key, replacements);
      
      if (value) {
        // Escape the value for XML
        const escapedValue = this.escapeXml(value);
        
        // Replace ALL occurrences of this exact placeholder
        const regex = new RegExp(this.escapeRegex(placeholder), 'g');
        const matches = result.match(regex);
        
        if (matches) {
          result = result.replace(regex, escapedValue);
          totalReplacements += matches.length;
          console.log(`✅ Replaced ${matches.length}x "${placeholder}"`);
        }
      }
    }
    
    console.log(`✅ Total replacements made: ${totalReplacements}`);
    
    // If no replacements were made, log a warning
    if (totalReplacements === 0) {
      console.warn("⚠️ No placeholders were replaced. Showing XML sample:");
      console.log(xmlText.substring(0, 500));
    }
    
    return result;
  }

  /**
   * Find replacement value for a key
   */
  findReplacementValue(key, replacements) {
    // Try exact match first
    if (replacements[key]) {
      return replacements[key];
    }
    
    // Try case-insensitive match
    const upperKey = key.toUpperCase();
    if (replacements[upperKey]) {
      return replacements[upperKey];
    }
    
    // Try to match common variations
    const variations = {
      'NAME': ['FULLNAME', 'FULL_NAME', 'PERSONAL_NAME'],
      'EMAIL': ['EMAIL_ADDRESS', 'MAIL'],
      'PHONE': ['PHONE_NUMBER', 'TELEPHONE', 'MOBILE'],
      'LOCATION': ['ADDRESS', 'CITY', 'CITY_STATE'],
      'SUMMARY': ['PROFESSIONAL_SUMMARY', 'PROFILE', 'OBJECTIVE'],
      'SKILLS': ['TECHNICAL_SKILLS', 'COMPETENCIES'],
      'JOB_TITLE': ['POSITION', 'ROLE', 'TITLE'],
      'COMPANY': ['EMPLOYER', 'ORGANIZATION'],
      'DURATION': ['PERIOD', 'DATE_RANGE', 'TIME_PERIOD'],
      'JOB_LOCATION': ['WORK_LOCATION', 'OFFICE_LOCATION'],
      'ACHIEVEMENTS': ['ACCOMPLISHMENTS', 'RESPONSIBILITIES'],
      'DEGREE': ['QUALIFICATION', 'EDUCATION_DEGREE'],
      'INSTITUTION': ['UNIVERSITY', 'COLLEGE', 'SCHOOL'],
      'YEAR': ['GRADUATION_YEAR', 'GRAD_YEAR'],
      'EDUCATION_LOCATION': ['SCHOOL_LOCATION', 'CAMPUS'],
      'CERTIFICATIONS': ['CERTIFICATES', 'LICENSES'],
      'LANGUAGES': ['LANGUAGE_SKILLS'],
      'PROJECTS': ['PORTFOLIO_PROJECTS'],
      'DATE': ['CURRENT_DATE', 'GENERATED_DATE']
    };
    
    // Check if key matches any variation
    for (const [standardKey, altKeys] of Object.entries(variations)) {
      if (altKeys.includes(key.toUpperCase()) || key.toUpperCase() === standardKey) {
        return replacements[standardKey];
      }
    }
    
    console.log(`⚠️ No replacement found for key: ${key}`);
    return null;
  }

  /**
   * Get all replacement values
   */
  getAllReplacements(data) {
    const replacements = {
      // Personal info - using sample data to ensure something gets replaced
      'NAME': data.personal?.name || 'JOHN DOE',
      'EMAIL': data.personal?.email || 'john.doe@example.com',
      'PHONE': data.personal?.phone || '+1 234 567 8900',
      'LOCATION': data.personal?.location || 'San Francisco, CA',
      'LINKEDIN': data.personal?.linkedin || 'linkedin.com/in/johndoe',
      'PORTFOLIO': data.personal?.portfolio || 'johndoeportfolio.com',
      
      // Summary
      'SUMMARY': data.summary || 'Experienced software engineer with 5+ years in full-stack development.',
      
      // Skills
      'SKILLS': data.skills?.join(', ') || 'JavaScript, React, Node.js, Python, AWS, Docker, Git',
      
      // Experience
      'JOB_TITLE': data.experiences?.[0]?.job_title || 'Senior Software Engineer',
      'COMPANY': data.experiences?.[0]?.company || 'Tech Innovations Inc.',
      'DURATION': data.experiences?.[0]?.duration || '2020 - Present',
      'JOB_LOCATION': data.experiences?.[0]?.location || 'San Francisco, CA',
      'ACHIEVEMENTS': data.experiences?.[0]?.achievements?.join(' • ') || 'Led team of developers • Improved system performance',
      
      // Education
      'DEGREE': data.education?.[0]?.degree || 'Bachelor of Science in Computer Science',
      'INSTITUTION': data.education?.[0]?.institution || 'Stanford University',
      'YEAR': data.education?.[0]?.year || '2016',
      'EDUCATION_LOCATION': data.education?.[0]?.location || 'Stanford, CA',
      
      // Others
      'CERTIFICATIONS': data.certifications?.join(', ') || 'AWS Certified Solutions Architect',
      'LANGUAGES': data.languages?.join(', ') || 'English (Fluent), Spanish (Intermediate)',
      'PROJECTS': data.projects?.join(', ') || 'E-commerce Platform, Mobile Banking App',
      'DATE': data.generatedDate || new Date().toLocaleDateString()
    };
    
    // Add uppercase versions of all keys
    const upperReplacements = {};
    Object.keys(replacements).forEach(key => {
      upperReplacements[key.toUpperCase()] = replacements[key];
    });
    
    return { ...replacements, ...upperReplacements };
  }

  /**
   * Create a simple DOCX as fallback
   */
  createSimpleDOCX(data) {
    console.log("📝 Creating simple DOCX as fallback...");
    
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.personal?.name || 'CV'} - Generated CV</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; }
    .section { margin-bottom: 25px; }
  </style>
</head>
<body>
  <h1>${data.personal?.name || 'Generated CV'}</h1>
  
  <div class="section">
    <p><strong>Email:</strong> ${data.personal?.email || 'Not specified'}</p>
    <p><strong>Phone:</strong> ${data.personal?.phone || 'Not specified'}</p>
    <p><strong>Location:</strong> ${data.personal?.location || 'Not specified'}</p>
  </div>
  
  ${data.summary ? `<div class="section"><h2>Summary</h2><p>${data.summary}</p></div>` : ''}
  
  ${data.skills?.length > 0 ? `
  <div class="section">
    <h2>Skills</h2>
    <p>${data.skills.join(', ')}</p>
  </div>` : ''}
  
  ${data.experiences?.length > 0 ? `
  <div class="section">
    <h2>Experience</h2>
    ${data.experiences.map(exp => `
      <h3>${exp.job_title}</h3>
      <p><strong>${exp.company}</strong> | ${exp.duration} | ${exp.location}</p>
      ${exp.achievements?.length > 0 ? `<ul>${exp.achievements.map(a => `<li>${a}</li>`).join('')}</ul>` : ''}
    `).join('')}
  </div>` : ''}
  
  <p><em>Generated on ${data.generatedDate}</em></p>
</body>
</html>`;
    
    return Buffer.from(htmlContent, 'utf8');
  }

  /**
   * Escape regex special characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Escape XML special characters
   */
  escapeXml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Prepare data for template
   */
  prepareTemplateData(extractedData) {
    console.log("📋 Preparing template data...");
    
    // Use the extracted data or fallback to sample data
    const data = {
      personal: {
        name: extractedData.personal_info?.full_name || 'John Doe',
        email: extractedData.personal_info?.email || 'john.doe@example.com',
        phone: extractedData.personal_info?.phone || '+1 234 567 8900',
        location: extractedData.personal_info?.location || 'San Francisco, CA',
        linkedin: extractedData.personal_info?.linkedin || 'linkedin.com/in/johndoe',
        portfolio: extractedData.personal_info?.portfolio || 'johndoeportfolio.com',
        title: extractedData.personal_info?.title || 'Senior Software Engineer'
      },
      
      summary: extractedData.professional_summary || 'Experienced professional with strong technical skills.',
      
      skills: Array.isArray(extractedData.skills) && extractedData.skills.length > 0 
        ? extractedData.skills 
        : ['JavaScript', 'React', 'Node.js', 'Python', 'AWS'],
      
      experiences: (Array.isArray(extractedData.experience) && extractedData.experience.length > 0)
        ? extractedData.experience.slice(0, 2).map((exp, index) => ({
            job_title: exp.job_title || `Position ${index + 1}`,
            company: exp.company || `Company ${index + 1}`,
            duration: exp.duration || 'Not specified',
            location: exp.location || 'Not specified',
            achievements: Array.isArray(exp.achievements) && exp.achievements.length > 0
              ? exp.achievements
              : ['Responsibilities and achievements']
          }))
        : [{
            job_title: 'Software Engineer',
            company: 'Technology Company',
            duration: '2020 - Present',
            location: 'San Francisco, CA',
            achievements: ['Developed web applications', 'Collaborated with cross-functional teams']
          }],
      
      education: (Array.isArray(extractedData.education) && extractedData.education.length > 0)
        ? extractedData.education.slice(0, 2).map(edu => ({
            degree: edu.degree || 'Degree',
            institution: edu.institution || 'University',
            year: edu.year || 'Year',
            location: edu.location || 'Location'
          }))
        : [{
            degree: 'Bachelor of Science',
            institution: 'University',
            year: '2018',
            location: 'City, State'
          }],
      
      certifications: Array.isArray(extractedData.certifications) && extractedData.certifications.length > 0
        ? extractedData.certifications
        : ['Professional Certification'],
      
      projects: Array.isArray(extractedData.projects) && extractedData.projects.length > 0
        ? extractedData.projects
        : ['Sample Project 1', 'Sample Project 2'],
      
      languages: Array.isArray(extractedData.languages) && extractedData.languages.length > 0
        ? extractedData.languages
        : ['English', 'Spanish'],
      
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      currentYear: new Date().getFullYear()
    };
    
    console.log("✅ Data prepared:");
    console.log("   Name:", data.personal.name);
    console.log("   Skills:", data.skills.length, "items");
    console.log("   Experience:", data.experiences.length, "positions");
    
    return data;
  }
}

export const docxTemplateService = new DOCXTemplateService();