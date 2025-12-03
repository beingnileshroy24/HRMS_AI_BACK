// services/docxTemplateService.js - ADVANCED VERSION
import JSZip from 'jszip';

export class DOCXTemplateService {
  
  constructor() {
    this.placeholderPatterns = {
      simple: /\[([A-Z_]+)\]/g,
      loop: /\{\{#([a-z_]+)\}\}(.*?)\{\{\/([a-z_]+)\}\}/gs,
      conditional: /\{\{#if ([a-z_]+)\}\}(.*?)\{\{\/if ([a-z_]+)\}\}/gs,
      inlineFormat: /\{\{([a-z_]+)\|([^}]+)\}\}/g
    };
  }

  /**
   * Process DOCX template with advanced features
   */
  async processDOCXTemplate(docxBuffer, data) {
    try {
      console.log("🔄 Processing DOCX template with advanced features...");
      
      // Load the DOCX file
      const zip = new JSZip();
      await zip.loadAsync(docxBuffer);
      
      // Get the main document XML
      const documentXml = await zip.file('word/document.xml').async('text');
      
      console.log("📄 Document XML loaded");
      
      // Process the XML with all features
      const processedXml = await this.processWithAdvancedFeatures(documentXml, data);
      
      // Update the ZIP with modified document
      zip.file('word/document.xml', processedXml);
      
      // Generate the new DOCX buffer
      const newDocxBuffer = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });
      
      console.log("✅ Advanced template processing complete");
      return newDocxBuffer;
      
    } catch (error) {
      console.error('❌ DOCX processing error:', error);
      throw error;
    }
  }

  /**
   * Process XML with all advanced features
   */
  async processWithAdvancedFeatures(xmlText, data) {
    let result = xmlText;
    
    // 1. Process loops first (so nested content can be processed)
    result = this.processLoops(result, data);
    
    // 2. Process conditionals
    result = this.processConditionals(result, data);
    
    // 3. Process advanced placeholders (arrays, formatted)
    result = this.processAdvancedPlaceholders(result, data);
    
    // 4. Process simple placeholders
    result = this.processSimplePlaceholders(result, data);
    
    // 5. Process inline formatting
    result = this.processInlineFormatting(result);
    
    // 6. Clean up any remaining empty sections
    result = this.cleanEmptySections(result);
    
    return result;
  }

  /**
   * Process loop syntax: {{#array}}content{{/array}}
   */
  processLoops(xmlText, data) {
    let result = xmlText;
    const loopRegex = this.placeholderPatterns.loop;
    
    let match;
    while ((match = loopRegex.exec(xmlText)) !== null) {
      const [fullMatch, arrayName, content, closingTag] = match;
      
      if (data[arrayName] && Array.isArray(data[arrayName])) {
        let loopContent = '';
        
        data[arrayName].forEach((item, index) => {
          let itemContent = content;
          
          // Replace item properties within the loop
          Object.keys(item).forEach(key => {
            const placeholder = `[${key.toUpperCase()}]`;
            if (item[key]) {
              const regex = new RegExp(this.escapeRegex(placeholder), 'g');
              itemContent = itemContent.replace(regex, this.escapeXml(item[key]));
            }
          });
          
          // Special loop variables
          itemContent = itemContent.replace(/\[INDEX\]/g, index + 1);
          itemContent = itemContent.replace(/\[IS_FIRST\]/g, index === 0 ? 'true' : '');
          itemContent = itemContent.replace(/\[IS_LAST\]/g, index === data[arrayName].length - 1 ? 'true' : '');
          
          loopContent += itemContent;
        });
        
        result = result.replace(fullMatch, loopContent);
      } else {
        // Remove loop if array doesn't exist or is empty
        result = result.replace(fullMatch, '');
      }
      
      // Reset regex lastIndex to avoid infinite loop
      loopRegex.lastIndex = 0;
    }
    
    return result;
  }

  /**
   * Process conditional syntax: {{#if condition}}content{{/if condition}}
   */
  processConditionals(xmlText, data) {
    let result = xmlText;
    const conditionalRegex = this.placeholderPatterns.conditional;
    
    let match;
    while ((match = conditionalRegex.exec(xmlText)) !== null) {
      const [fullMatch, condition, content, closingTag] = match;
      
      let shouldShow = false;
      
      // Check condition types
      if (condition.startsWith('has_')) {
        const field = condition.replace('has_', '');
        shouldShow = data[field] && 
                     (Array.isArray(data[field]) ? data[field].length > 0 : 
                      typeof data[field] === 'string' ? data[field].trim() !== '' : 
                      !!data[field]);
      } else if (condition.startsWith('not_empty_')) {
        const field = condition.replace('not_empty_', '');
        shouldShow = data[field] && data[field].toString().trim() !== '';
      } else if (data[condition] !== undefined) {
        shouldShow = !!data[condition];
      }
      
      result = result.replace(fullMatch, shouldShow ? content : '');
      
      // Reset regex lastIndex
      conditionalRegex.lastIndex = 0;
    }
    
    return result;
  }

  /**
   * Process advanced placeholders
   */
  processAdvancedPlaceholders(xmlText, data) {
    let result = xmlText;
    
    // Build all replacement values
    const replacements = this.buildAdvancedReplacements(data);
    
    // Apply replacements
    Object.entries(replacements).forEach(([placeholder, value]) => {
      if (value && value.trim()) {
        const regex = new RegExp(this.escapeRegex(placeholder), 'g');
        result = result.replace(regex, this.escapeXml(value));
      } else {
        // Remove empty placeholders
        const regex = new RegExp(this.escapeRegex(placeholder), 'g');
        result = result.replace(regex, '');
      }
    });
    
    return result;
  }

  /**
   * Build advanced replacement values
   */
  buildAdvancedReplacements(data) {
    const replacements = {};
    
    // 1. ALL_EXPERIENCES - formatted list of all experiences
    if (data.experiences && data.experiences.length > 0) {
      const allExperiences = data.experiences.map(exp => {
        let expText = `${exp.job_title} at ${exp.company}`;
        if (exp.duration) expText += ` (${exp.duration})`;
        if (exp.location) expText += ` - ${exp.location}`;
        
        if (exp.achievements && exp.achievements.length > 0) {
          expText += '\n' + exp.achievements.map(ach => `  • ${ach}`).join('\n');
        }
        
        return expText;
      }).join('\n\n');
      replacements['[ALL_EXPERIENCES]'] = allExperiences;
    }
    
    // 2. ALL_EDUCATION - formatted list of all education
    if (data.education && data.education.length > 0) {
      const allEducation = data.education.map(edu => {
        let eduText = `${edu.degree}`;
        if (edu.institution) eduText += `, ${edu.institution}`;
        if (edu.year) eduText += ` (${edu.year})`;
        if (edu.location) eduText += ` - ${edu.location}`;
        return eduText;
      }).join('\n');
      replacements['[ALL_EDUCATION]'] = allEducation;
    }
    
    // 3. SKILLS_BY_CATEGORY - categorize skills if possible
    if (data.skills && data.skills.length > 0) {
      const categorized = this.categorizeSkills(data.skills);
      let skillsText = '';
      
      Object.entries(categorized).forEach(([category, skillList]) => {
        if (skillList.length > 0) {
          skillsText += `${category}:\n  • ${skillList.join(', ')}\n\n`;
        }
      });
      
      replacements['[SKILLS_BY_CATEGORY]'] = skillsText.trim();
    }
    
    // 4. BULLETED_ACHIEVEMENTS - achievements with bullet points
    if (data.experiences && data.experiences.length > 0) {
      const allAchievements = data.experiences
        .flatMap(exp => exp.achievements || [])
        .map(ach => `• ${ach}`)
        .join('\n');
      replacements['[BULLETED_ACHIEVEMENTS]'] = allAchievements;
    }
    
    // 5. EXPERIENCE_SUMMARY - summary of experience
    if (data.experiences && data.experiences.length > 0) {
      const years = this.calculateExperienceYears(data.experiences);
      const companies = [...new Set(data.experiences.map(exp => exp.company))];
      
      let summary = `${data.experiences.length} position${data.experiences.length > 1 ? 's' : ''}`;
      if (years > 0) summary += ` over ${years} year${years > 1 ? 's' : ''}`;
      if (companies.length > 0) {
        summary += ` at ${companies.length} compan${companies.length > 1 ? 'ies' : 'y'}`;
        if (companies.length <= 3) {
          summary += ` (${companies.join(', ')})`;
        }
      }
      
      replacements['[EXPERIENCE_SUMMARY]'] = summary;
    }
    
    return replacements;
  }

  /**
   * Categorize skills automatically
   */
  categorizeSkills(skills) {
    const categories = {
      'Programming Languages': [],
      'Web Technologies': [],
      'Frameworks': [],
      'Databases': [],
      'Cloud & DevOps': [],
      'Tools': [],
      'Other Skills': []
    };
    
    const categoryPatterns = {
      'Programming Languages': /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Ruby|Go|Swift|Kotlin|PHP|Rust)\b/i,
      'Web Technologies': /\b(HTML|CSS|SASS|SCSS|LESS|Tailwind|Bootstrap|Material UI)\b/i,
      'Frameworks': /\b(React|Angular|Vue|Next\.js|Nuxt\.js|Express|NestJS|Django|Flask|Spring|Laravel)\b/i,
      'Databases': /\b(MySQL|PostgreSQL|MongoDB|Redis|SQLite|Oracle|DynamoDB|Firebase)\b/i,
      'Cloud & DevOps': /\b(AWS|Azure|GCP|Docker|Kubernetes|Jenkins|CI\/CD|Terraform|Ansible)\b/i,
      'Tools': /\b(Git|GitHub|GitLab|Jira|Confluence|Figma|Adobe|Photoshop|Illustrator)\b/i
    };
    
    skills.forEach(skill => {
      let categorized = false;
      
      for (const [category, pattern] of Object.entries(categoryPatterns)) {
        if (pattern.test(skill)) {
          categories[category].push(skill);
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        categories['Other Skills'].push(skill);
      }
    });
    
    // Remove empty categories
    Object.keys(categories).forEach(category => {
      if (categories[category].length === 0) {
        delete categories[category];
      }
    });
    
    return categories;
  }

  /**
   * Calculate total years of experience
   */
  calculateExperienceYears(experiences) {
    let totalYears = 0;
    
    experiences.forEach(exp => {
      const duration = exp.duration || '';
      const yearMatch = duration.match(/(\d{4})/g);
      
      if (yearMatch && yearMatch.length >= 2) {
        const startYear = parseInt(yearMatch[0]);
        const endYear = yearMatch[1] === 'Present' ? new Date().getFullYear() : parseInt(yearMatch[1]);
        totalYears += (endYear - startYear);
      } else if (duration.toLowerCase().includes('present')) {
        totalYears += 1; // Assume at least 1 year for current positions
      }
    });
    
    return Math.max(1, totalYears); // Minimum 1 year
  }

  /**
   * Process simple placeholders
   */
  processSimplePlaceholders(xmlText, data) {
    let result = xmlText;
    const simpleRegex = this.placeholderPatterns.simple;
    
    // Build simple replacements
    const simpleReplacements = this.buildSimpleReplacements(data);
    
    let match;
    while ((match = simpleRegex.exec(result)) !== null) {
      const [placeholder, key] = match;
      const value = simpleReplacements[key] || '';
      
      if (value && value.trim()) {
        result = result.replace(placeholder, this.escapeXml(value));
      } else {
        result = result.replace(placeholder, '');
      }
    }
    
    return result;
  }

  /**
   * Build simple replacement values
   */
  buildSimpleReplacements(data) {
    const replacements = {};
    
    // Personal info
    replacements['NAME'] = data.personal?.name || '';
    replacements['EMAIL'] = data.personal?.email || '';
    replacements['PHONE'] = data.personal?.phone || '';
    replacements['LOCATION'] = data.personal?.location || '';
    replacements['LINKEDIN'] = data.personal?.linkedin || '';
    replacements['PORTFOLIO'] = data.personal?.portfolio || '';
    replacements['TITLE'] = data.personal?.title || '';
    
    // Summary
    replacements['SUMMARY'] = data.summary || '';
    
    // Skills
    replacements['SKILLS'] = Array.isArray(data.skills) ? data.skills.join(', ') : '';
    
    // First experience
    const firstExp = data.experiences?.[0] || {};
    replacements['JOB_TITLE'] = firstExp.job_title || '';
    replacements['COMPANY'] = firstExp.company || '';
    replacements['DURATION'] = firstExp.duration || '';
    replacements['JOB_LOCATION'] = firstExp.location || '';
    replacements['ACHIEVEMENTS'] = Array.isArray(firstExp.achievements) ? 
      firstExp.achievements.map(ach => `• ${ach}`).join('\n') : '';
    
    // First education
    const firstEdu = data.education?.[0] || {};
    replacements['DEGREE'] = firstEdu.degree || '';
    replacements['INSTITUTION'] = firstEdu.institution || '';
    replacements['YEAR'] = firstEdu.year || '';
    replacements['EDUCATION_LOCATION'] = firstEdu.location || '';
    
    // Others
    replacements['CERTIFICATIONS'] = Array.isArray(data.certifications) ? 
      data.certifications.join(', ') : '';
    replacements['LANGUAGES'] = Array.isArray(data.languages) ? 
      data.languages.join(', ') : '';
    replacements['PROJECTS'] = Array.isArray(data.projects) ? 
      data.projects.join('\n') : '';
    replacements['DATE'] = data.generatedDate || '';
    
    return replacements;
  }

  /**
   * Process inline formatting: {{field|format}}
   */
  processInlineFormatting(xmlText) {
    let result = xmlText;
    const formatRegex = this.placeholderPatterns.inlineFormat;
    
    let match;
    while ((match = formatRegex.exec(result)) !== null) {
      const [fullMatch, field, format] = match;
      
      // This would be replaced with actual data in a second pass
      // For now, we just remove the formatting syntax
      result = result.replace(fullMatch, `[${field.toUpperCase()}]`);
      
      // Reset regex lastIndex
      formatRegex.lastIndex = 0;
    }
    
    return result;
  }

  /**
   * Clean empty sections
   */
  cleanEmptySections(xmlText) {
    let result = xmlText;
    
    // Remove empty paragraph tags
    result = result.replace(/<w:p[^>]*>\s*<w:r[^>]*>\s*<w:t[^>]*>\s*<\/w:t>\s*<\/w:r>\s*<\/w:p>/g, '');
    
    // Remove multiple consecutive empty lines
    result = result.replace(/(<w:p[^>]*>\s*<\/w:p>\s*){2,}/g, '<w:p></w:p>');
    
    return result;
  }

  /**
   * Prepare data with enhanced structure
   */
  prepareTemplateData(extractedData) {
    console.log("📋 Preparing enhanced template data...");
    
    const data = {
      // Personal info
      personal: {
        name: extractedData.personal_info?.full_name || '',
        email: extractedData.personal_info?.email || '',
        phone: extractedData.personal_info?.phone || '',
        location: extractedData.personal_info?.location || '',
        linkedin: extractedData.personal_info?.linkedin || '',
        portfolio: extractedData.personal_info?.portfolio || '',
        title: extractedData.personal_info?.title || ''
      },
      
      // Summary
      summary: extractedData.professional_summary || '',
      
      // Skills as array
      skills: Array.isArray(extractedData.skills) ? extractedData.skills : [],
      
      // Experiences as array of objects
      experiences: this.prepareExperiences(extractedData.experience),
      
      // Education as array of objects
      education: this.prepareEducation(extractedData.education),
      
      // Other arrays
      certifications: Array.isArray(extractedData.certifications) ? extractedData.certifications : [],
      projects: Array.isArray(extractedData.projects) ? extractedData.projects : [],
      languages: Array.isArray(extractedData.languages) ? extractedData.languages : [],
      
      // Generated date
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      
      // Boolean flags for conditionals
      has_experiences: Array.isArray(extractedData.experience) && extractedData.experience.length > 0,
      has_education: Array.isArray(extractedData.education) && extractedData.education.length > 0,
      has_skills: Array.isArray(extractedData.skills) && extractedData.skills.length > 0,
      has_certifications: Array.isArray(extractedData.certifications) && extractedData.certifications.length > 0,
      has_projects: Array.isArray(extractedData.projects) && extractedData.projects.length > 0,
      has_languages: Array.isArray(extractedData.languages) && extractedData.languages.length > 0
    };
    
    console.log("📊 Enhanced data prepared:");
    console.log("   Experiences:", data.experiences.length);
    console.log("   Education:", data.education.length);
    console.log("   Skills:", data.skills.length);
    
    return data;
  }

  /**
   * Prepare experiences array
   */
  prepareExperiences(experienceData) {
    if (!Array.isArray(experienceData)) return [];
    
    return experienceData.map((exp, index) => ({
      job_title: exp.job_title || '',
      company: exp.company || '',
      duration: exp.duration || '',
      location: exp.location || '',
      achievements: Array.isArray(exp.achievements) ? exp.achievements : [],
      description: exp.description || '',
      index: index + 1,
      is_first: index === 0,
      is_last: index === experienceData.length - 1
    }));
  }

  /**
   * Prepare education array
   */
  prepareEducation(educationData) {
    if (!Array.isArray(educationData)) return [];
    
    return educationData.map((edu, index) => ({
      degree: edu.degree || '',
      institution: edu.institution || '',
      year: edu.year || '',
      location: edu.location || '',
      gpa: edu.gpa || '',
      honors: edu.honors || '',
      index: index + 1,
      is_first: index === 0,
      is_last: index === educationData.length - 1
    }));
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
      .replace(/'/g, '&apos;')
      .replace(/\n/g, '</w:t><w:br/><w:t>'); // Handle line breaks
  }
}

export const docxTemplateService = new DOCXTemplateService();