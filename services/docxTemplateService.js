import JSZip from 'jszip';

export class DOCXTemplateService {
  
  constructor() {
    this.placeholderPatterns = {
      // These regexes now target the clean, normalized text:
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
      
      const zip = new JSZip();
      await zip.loadAsync(docxBuffer);
      
      // Get the main document XML
      const documentXml = await zip.file('word/document.xml').async('text');
      
      console.log("📄 Document XML loaded");

      // --- CRITICAL FIX: Explicitly handle the document body ---
      // 1. Extract body content and store surrounding XML (header, footers, etc.)
      const bodyMatch = documentXml.match(/(<w:body>)([\s\S]*)(<\/w:body>)/i);
      if (!bodyMatch) {
          throw new Error("Could not find <w:body> tag in DOCX XML.");
      }
      
      const documentHeader = documentXml.substring(0, bodyMatch.index);
      const bodyStartTag = bodyMatch[1];
      const bodyContent = bodyMatch[2];
      const bodyEndTag = bodyMatch[3];
      const documentFooter = documentXml.substring(bodyMatch.index + bodyMatch[0].length);


      // CRITICAL STEP 1: Normalize the XML text to combine fragmented placeholders
      // We only normalize the body content.
      const normalizedBody = this.normalizeXmlText(bodyContent);
      console.log("🛠️ XML normalized for placeholder recognition");
      
      // Process the XML with all features
      const processedBody = this.processWithAdvancedFeatures(normalizedBody, data);
      
      // CRITICAL STEP 3: Re-fragment the final text into XML run structure
      // We pass the full original XML to extract run properties.
      const finalBodyXml = this.refragmentXmlText(processedBody, documentXml);
      
      // --- CRITICAL FIX: Re-assemble the full XML ---
      const finalXml = documentHeader + bodyStartTag + finalBodyXml + bodyEndTag + documentFooter;
      
      // Update the ZIP with modified document
      zip.file('word/document.xml', finalXml);
      
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
   * Normalize the XML by stripping run and text tags, making the content plain text.
   * This is necessary for regex matching across fragmented placeholders.
   */
  normalizeXmlText(xmlText) {
    let tempResult = xmlText;
    
    // Replace <w:br/> with a temporary newline marker that won't be stripped
    tempResult = tempResult.replace(/<w:br[^>]*\/>/g, '---W:BR---');
    
    // Aggressively strip all <w:r> and <w:t> tags and their properties
    tempResult = tempResult.replace(/<w:r[^>]*>[\s\S]*?<w:t[^>]*>/g, ''); 
    tempResult = tempResult.replace(/<\/w:t>[\s\S]*?<\/w:r>/g, ''); 
    
    // Restore the newline markers
    tempResult = tempResult.replace(/---W:BR---/g, '\n');
    
    return tempResult;
  }
  
  /**
   * Re-fragment the final processed text into valid Word XML run structure.
   */
  refragmentXmlText(processedText, originalXml) {
    
    // Find a unique run property from the original XML to apply to the new content
    const runPropsMatch = originalXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
    const runProps = runPropsMatch ? runPropsMatch[0] : '';
    
    // Split the text based on structural tags
    const structuralRegex = /(<\/?w:p[^>]*>|<\/?w:tbl[^>]*>|<\/?w:tr[^>]*>|<\/?w:tc[^>]*>)/g; 
    const parts = processedText.split(structuralRegex).filter(p => p.length > 0);
    
    let finalXml = '';
    
    for (const part of parts) {
      if (part.startsWith('<w:')) {
        // This is a structural XML tag, leave it as is
        finalXml += part;
      } else {
        // This is raw text content. Wrap in <w:p> to ensure display.
        const trimmedPart = part.trim();
        if (trimmedPart.length > 0) {
          const escapedContent = this.escapeXml(trimmedPart);
          
          // CRITICAL FIX: Wrap the runs in a paragraph tag <w:p> to ensure Word displays the content.
          finalXml += `<w:p><w:r>${runProps}<w:t xml:space="preserve">${escapedContent}</w:t></w:r></w:p>`;
        }
      }
    }
    
    return finalXml;
  }


  /**
   * Process XML with all advanced features
   */
  processWithAdvancedFeatures(xmlText, data) {
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
    
    return result;
  }

  /**
   * Process loop syntax: {{#array}}content{{/array}}
   * FIX: Uses String.prototype.replace with a function for reliable, global, and recursive execution.
   */
  processLoops(xmlText, data) {
    const loopRegex = this.placeholderPatterns.loop;
    
    // Use replace with a function to handle all matches reliably
    const result = xmlText.replace(loopRegex, (fullMatch, arrayName, content, closingTag) => {
      
      // Basic validation
      if (arrayName !== closingTag) {
        console.warn(`Loop mismatch: Opened ${arrayName}, closed ${closingTag}. Removing loop.`);
        return '';
      }
      
      if (data[arrayName] && Array.isArray(data[arrayName])) {
        let loopContent = '';
        
        data[arrayName].forEach((item, index) => {
          let itemContent = content;
          
          // Replace item properties within the loop
          Object.keys(item).forEach(key => {
            // Check if the key value is a complex object (like achievements array)
            const itemValue = item[key];
            const placeholder = `[${key.toUpperCase()}]`;
            
            if (itemValue !== undefined && itemValue !== null) {
              
              if (typeof itemValue !== 'object' || Array.isArray(itemValue)) {
                // Handle simple values or arrays (which are handled by nested loops)
                const finalValue = Array.isArray(itemValue) ? '' : String(itemValue);
                const regex = new RegExp(this.escapeRegex(placeholder), 'g');
                // Content is normalized plain text here
                itemContent = itemContent.replace(regex, finalValue);
              }
              // NOTE: Objects (like nested projects) are currently left as empty string if not explicitly handled
            }
          });
          
          // Special loop variables
          itemContent = itemContent.replace(/\[INDEX\]/g, index + 1);
          itemContent = itemContent.replace(/\[IS_FIRST\]/g, index === 0 ? 'true' : '');
          itemContent = itemContent.replace(/\[IS_LAST\]/g, index === data[arrayName].length - 1 ? 'true' : '');
          
          // CRITICAL: Handle nested loops/conditionals (Recursion)
          itemContent = this.processWithAdvancedFeatures(itemContent, item); 
          
          loopContent += itemContent;
        });
        
        return loopContent;
      } else {
        // Remove loop if array doesn't exist or is empty
        return '';
      }
    });
    
    return result;
  }

  /**
   * Process conditional syntax: {{#if condition}}content{{/if condition}}
   * FIX: Uses String.prototype.replace with a function for reliable, global execution.
   */
  processConditionals(xmlText, data) {
    const conditionalRegex = this.placeholderPatterns.conditional;
    
    const result = xmlText.replace(conditionalRegex, (fullMatch, condition, content, closingTag) => {
      
      // Basic validation
      if (condition !== closingTag) {
        console.warn(`Conditional mismatch: Opened ${condition}, closed ${closingTag}. Removing conditional.`);
        return '';
      }
      
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
        // Check if the property itself is truthy
        shouldShow = !!data[condition];
      }
      
      return shouldShow ? content : '';
    });
    
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
        // Value is plain text here
        result = result.replace(regex, value);
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
        const endYear = yearMatch[1].toLowerCase() === 'present' ? new Date().getFullYear() : parseInt(yearMatch[1]);
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
    const simpleRegex = this.placeholderPatterns.simple;
    
    // Build simple replacements
    const simpleReplacements = this.buildSimpleReplacements(data);
    
    const result = xmlText.replace(simpleRegex, (fullMatch, key) => {
      const value = simpleReplacements[key] || '';
      
      if (value && value.trim()) {
        // Return the plain text value
        return value;
      } else {
        return '';
      }
    });
    
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
    
    // First experience (used for single-value placeholders like [JOB_TITLE])
    const firstExp = data.experiences?.[0] || {};
    replacements['JOB_TITLE'] = firstExp.job_title || '';
    replacements['COMPANY'] = firstExp.company || '';
    replacements['DURATION'] = firstExp.duration || '';
    replacements['JOB_LOCATION'] = firstExp.location || '';
    replacements['ACHIEVEMENTS'] = Array.isArray(firstExp.achievements) ? 
      firstExp.achievements.map(ach => `• ${ach}`).join('\n') : '';
    
    // First education (used for single-value placeholders like [DEGREE])
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
    
    const resultReplace = result.replace(formatRegex, (fullMatch, field, format) => {
      // For now, we remove the formatting syntax and leave the placeholder
      return `[${field.toUpperCase()}]`;
    });
    
    return resultReplace;
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
      has_summary: extractedData.professional_summary && extractedData.professional_summary.trim() !== '', // NEW FLAG
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
      // Ensure achievements is an array of strings, even if single string is returned
      achievements: Array.isArray(exp.achievements) ? exp.achievements : (exp.achievements ? [exp.achievements] : []),
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
   * Escape XML special characters and handle line breaks for DOCX
   */
  escapeXml(text) {
    if (!text) return '';
    
    // Replace standard XML special characters
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
      
    // Handle line breaks by inserting <w:br/> inside <w:t> tags
    // Word handles <w:br/> much better than just a \n.
    escaped = escaped.replace(/\n/g, '</w:t><w:br/><w:t xml:space="preserve">'); 
    
    return escaped;
  }
}

export const docxTemplateService = new DOCXTemplateService();