// services/docxTemplateService.js - IMPROVED VERSION WITH BETTER XML PARSING
import JSZip from 'jszip';

export class DOCXTemplateService {
  
  constructor() {
    this.placeholderMap = new Map();
  }

  /**
   * Process DOCX template by extracting and modifying XML
   */
  async processDOCXTemplate(docxBuffer, data) {
    try {
      console.log("🔄 Processing DOCX template...");
      
      // Load the DOCX file
      const zip = new JSZip();
      await zip.loadAsync(docxBuffer);
      
      // Get the main document XML
      const documentXml = await zip.file('word/document.xml').async('text');
      
      console.log("📄 Document XML loaded");
      
      // Build comprehensive replacement map
      const replacements = this.buildReplacementMap(data);
      
      // Perform XML-aware replacement
      const modifiedXml = this.replacePlaceholdersInXML(documentXml, replacements);
      
      // Update the ZIP with modified document
      zip.file('word/document.xml', modifiedXml);
      
      // Generate the new DOCX buffer
      const newDocxBuffer = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });
      
      console.log("✅ DOCX template processed successfully");
      return newDocxBuffer;
      
    } catch (error) {
      console.error('❌ DOCX processing error:', error);
      throw error;
    }
  }

  /**
   * Build comprehensive replacement map
   */
  buildReplacementMap(data) {
    const replacements = {};
    
    // Personal Info - ONLY use parsed data, no defaults
    replacements['[NAME]'] = data.personal?.name || '';
    replacements['[EMAIL]'] = data.personal?.email || '';
    replacements['[PHONE]'] = data.personal?.phone || '';
    replacements['[LOCATION]'] = data.personal?.location || '';
    replacements['[LINKEDIN]'] = data.personal?.linkedin || '';
    replacements['[PORTFOLIO]'] = data.personal?.portfolio || '';
    
    // Summary
    replacements['[SUMMARY]'] = data.summary || '';
    
    // Skills
    replacements['[SKILLS]'] = Array.isArray(data.skills) ? 
      data.skills.join(', ') : '';
    
    // Work Experience - first experience
    const firstExp = data.experiences?.[0] || {};
    replacements['[JOB_TITLE]'] = firstExp.job_title || '';
    replacements['[COMPANY]'] = firstExp.company || '';
    replacements['[DURATION]'] = firstExp.duration || '';
    replacements['[JOB_LOCATION]'] = firstExp.location || '';
    replacements['[ACHIEVEMENTS]'] = Array.isArray(firstExp.achievements) ? 
      firstExp.achievements.map(ach => `• ${ach}`).join('\n') : '';
    
    // Education - first education
    const firstEdu = data.education?.[0] || {};
    replacements['[DEGREE]'] = firstEdu.degree || '';
    replacements['[INSTITUTION]'] = firstEdu.institution || '';
    replacements['[YEAR]'] = firstEdu.year || '';
    replacements['[EDUCATION_LOCATION]'] = firstEdu.location || '';
    
    // Others
    replacements['[CERTIFICATIONS]'] = Array.isArray(data.certifications) ? 
      data.certifications.join(', ') : '';
    replacements['[LANGUAGES]'] = Array.isArray(data.languages) ? 
      data.languages.join(', ') : '';
    replacements['[PROJECTS]'] = Array.isArray(data.projects) ? 
      data.projects.join('\n') : '';
    replacements['[DATE]'] = data.generatedDate || '';
    
    // Log what we have
    console.log("🔄 Will replace these placeholders:");
    Object.entries(replacements).forEach(([key, value]) => {
      if (value && value.trim()) {
        console.log(`   ${key} → "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
      } else {
        console.log(`   ${key} → (EMPTY - will be removed)`);
      }
    });
    
    return replacements;
  }

  /**
   * Replace placeholders in XML document
   */
  replacePlaceholdersInXML(xmlText, replacements) {
    console.log("🔄 Replacing placeholders in XML...");
    
    // Create a copy to work with
    let result = xmlText;
    
    // First, let's see what the XML actually contains
    const textContent = this.extractAllText(xmlText);
    console.log("📋 Found text in template:", textContent.substring(0, 200));
    
    // Check for placeholders
    Object.keys(replacements).forEach(placeholder => {
      if (xmlText.includes(placeholder)) {
        console.log(`✅ Found placeholder in XML: ${placeholder}`);
      } else {
        console.log(`❌ Placeholder NOT found: ${placeholder}`);
      }
    });
    
    // Simple approach: Direct string replacement in the entire XML
    // This works because DOCX XML is just text
    Object.entries(replacements).forEach(([placeholder, value]) => {
      if (value && value.trim()) {
        // Only replace if we have data
        if (result.includes(placeholder)) {
          console.log(`   Replacing ${placeholder} with actual data`);
          result = result.split(placeholder).join(this.escapeXml(value));
        }
      } else {
        // Remove empty placeholders
        console.log(`   Removing empty placeholder: ${placeholder}`);
        result = this.removeEmptyPlaceholder(result, placeholder);
      }
    });
    
    console.log("✅ XML processing complete");
    return result;
  }

  /**
   * Remove empty placeholder from XML
   */
  removeEmptyPlaceholder(xmlText, placeholder) {
    // Pattern to find placeholder and its surrounding w:r block
    const patterns = [
      // Pattern 1: Placeholder in its own w:t tag
      new RegExp(`<w:r[^>]*>\\s*<w:t[^>]*>\\s*${this.escapeRegex(placeholder)}\\s*</w:t>\\s*</w:r>`, 'gi'),
      
      // Pattern 2: Placeholder as part of text in w:t tag
      new RegExp(`(${this.escapeRegex(placeholder)})`, 'g')
    ];
    
    let result = xmlText;
    patterns.forEach(pattern => {
      result = result.replace(pattern, '');
    });
    
    return result;
  }

  /**
   * Extract all text from XML for debugging
   */
  extractAllText(xmlText) {
    // Remove XML tags to see plain text
    let text = xmlText
      .replace(/<[^>]+>/g, ' ')  // Replace tags with space
      .replace(/\s+/g, ' ')      // Collapse multiple spaces
      .trim();
    
    return text;
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
   * Prepare data for template - NO DEFAULTS
   */
  prepareTemplateData(extractedData) {
    console.log("📋 Preparing template data from extracted CV...");
    
    const data = {
      personal: {
        name: extractedData.personal_info?.full_name || '',
        email: extractedData.personal_info?.email || '',
        phone: extractedData.personal_info?.phone || '',
        location: extractedData.personal_info?.location || '',
        linkedin: extractedData.personal_info?.linkedin || '',
        portfolio: extractedData.personal_info?.portfolio || '',
        title: extractedData.personal_info?.title || ''
      },
      
      summary: extractedData.professional_summary || '',
      
      skills: Array.isArray(extractedData.skills) ? extractedData.skills : [],
      
      experiences: Array.isArray(extractedData.experience) && extractedData.experience.length > 0 ? 
        extractedData.experience.map((exp, index) => ({
          job_title: exp.job_title || '',
          company: exp.company || '',
          duration: exp.duration || '',
          location: exp.location || '',
          achievements: Array.isArray(exp.achievements) ? exp.achievements : []
        })) : [],
      
      education: Array.isArray(extractedData.education) && extractedData.education.length > 0 ? 
        extractedData.education.map(edu => ({
          degree: edu.degree || '',
          institution: edu.institution || '',
          year: edu.year || '',
          location: edu.location || ''
        })) : [],
      
      certifications: Array.isArray(extractedData.certifications) ? extractedData.certifications : [],
      projects: Array.isArray(extractedData.projects) ? extractedData.projects : [],
      languages: Array.isArray(extractedData.languages) ? extractedData.languages : [],
      
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
    
    // Log what was extracted
    console.log("📊 Parsed CV Data Summary:");
    console.log("   Name:", data.personal.name || "Not found");
    console.log("   Email:", data.personal.email || "Not found");
    console.log("   Skills:", data.skills.length, "skills found");
    console.log("   Experiences:", data.experiences.length, "experiences found");
    console.log("   Education:", data.education.length, "education entries found");
    
    return data;
  }

  /**
   * Debug function to see XML structure
   */
  async debugDOCXStructure(docxBuffer) {
    const zip = new JSZip();
    await zip.loadAsync(docxBuffer);
    
    const documentXml = await zip.file('word/document.xml').async('text');
    
    // Find all w:t tags to see structure
    const wttags = documentXml.match(/<w:t[^>]*>.*?<\/w:t>/g) || [];
    
    console.log("🔍 DOCX Structure Analysis:");
    console.log("   Total w:t tags:", wttags.length);
    
    // Show first few w:t tags
    wttags.slice(0, 10).forEach((tag, i) => {
      const text = tag.replace(/<[^>]+>/g, '').trim();
      if (text) {
        console.log(`   Tag ${i + 1}: "${text}"`);
      }
    });
    
    // Look for placeholders
    const placeholders = ['[NAME]', '[EMAIL]', '[PHONE]', '[SUMMARY]'];
    placeholders.forEach(placeholder => {
      if (documentXml.includes(placeholder)) {
        console.log(`✅ Found ${placeholder} in XML`);
      }
    });
    
    return {
      totalTags: wttags.length,
      sampleTags: wttags.slice(0, 5),
      hasPlaceholders: placeholders.filter(p => documentXml.includes(p))
    };
  }
}

export const docxTemplateService = new DOCXTemplateService();