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
      console.log("📊 Input data summary:");
      console.log("   - Experiences:", data.experiences?.length || 0);
      console.log("   - Education:", data.education?.length || 0);
      console.log("   - Skills:", data.skills?.length || 0);
      
      const zip = new JSZip();
      await zip.loadAsync(docxBuffer);
      
      // Get the main document XML
      const documentXml = await zip.file('word/document.xml').async('text');
      
      console.log("📄 Document XML loaded");
      
      // Check what placeholders exist in template
      this.analyzeTemplate(documentXml);

      // Process the document with a structure-preserving approach
      const processedXml = this.processDocumentPreservingStructure(documentXml, data);
      
      console.log("✅ Document processed successfully");
      
      // Update the ZIP with modified document
      zip.file('word/document.xml', processedXml);
      
      // Generate the new DOCX buffer
      const newDocxBuffer = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });
      
      console.log("✅ DOCX generation complete");
      return newDocxBuffer;
      
    } catch (error) {
      console.error('❌ DOCX processing error:', error);
      throw error;
    }
  }
  
  /**
   * Analyze template to see what placeholders exist
   */
  analyzeTemplate(xml) {
    console.log("\n📋 Template Analysis:");
    
    // Check for loops
    const loopMatches = xml.match(/\{\{#([a-z_]+)\}\}/g);
    if (loopMatches) {
      console.log("   Loops found:", loopMatches.join(', '));
    } else {
      console.log("   No loops found in template");
    }
    
    // Check for conditionals
    const conditionalMatches = xml.match(/\{\{#if ([a-z_]+)\}\}/g);
    if (conditionalMatches) {
      console.log("   Conditionals found:", conditionalMatches.join(', '));
    }
    
    // Check for placeholders
    const placeholderMatches = xml.match(/\[([A-Z_]+)\]/g);
    if (placeholderMatches) {
      const uniquePlaceholders = [...new Set(placeholderMatches)];
      console.log("   Placeholders found:", uniquePlaceholders.slice(0, 10).join(', '));
    }
    console.log("");
  }
  
  /**
   * Process document while preserving XML structure
   */
  processDocumentPreservingStructure(documentXml, data) {
    console.log("\n🔧 Starting structure-preserving processing...");
    
    // Step 1: Reconstruct fragmented placeholders MULTIPLE TIMES
    // Word can fragment placeholders in complex ways, so we need multiple passes
    let processedXml = documentXml;
    
    console.log("🔄 Pass 1: Basic reconstruction");
    processedXml = this.reconstructPlaceholders(processedXml);
    
    console.log("🔄 Pass 2: Aggressive reconstruction");
    processedXml = this.aggressiveReconstruction(processedXml);
    
    console.log("🔄 Pass 3: Cross-run reconstruction");
    processedXml = this.crossRunReconstruction(processedXml);
    
    // Step 2: Process template features in order
    console.log("\n📝 Processing template features:");
    
    processedXml = this.processLoopsInXml(processedXml, data);
    console.log("✓ Loops processed");
    
    processedXml = this.processConditionalsInXml(processedXml, data);
    console.log("✓ Conditionals processed");
    
    processedXml = this.processAdvancedPlaceholdersInXml(processedXml, data);
    console.log("✓ Advanced placeholders processed");
    
    processedXml = this.processSimplePlaceholdersInXml(processedXml, data);
    console.log("✓ Simple placeholders processed");
    
    return processedXml;
  }
  
  /**
   * Basic placeholder reconstruction within runs
   */
  reconstructPlaceholders(xml) {
    const runRegex = /<w:r\b[^>]*>(.*?)<\/w:r>/gs;
    
    return xml.replace(runRegex, (runMatch) => {
      const textNodes = [];
      const textRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
      let match;
      
      while ((match = textRegex.exec(runMatch)) !== null) {
        textNodes.push(match[1]);
      }
      
      if (textNodes.length > 1) {
        const combinedText = textNodes.join('');
        let newRun = runMatch.replace(/<w:t[^>]*>.*?<\/w:t>/gs, '');
        
        const rPrMatch = newRun.match(/(<w:rPr>.*?<\/w:rPr>)/s);
        if (rPrMatch) {
          newRun = newRun.replace(rPrMatch[0], `${rPrMatch[0]}<w:t xml:space="preserve">${combinedText}</w:t>`);
        } else {
          newRun = newRun.replace(/<w:r\b([^>]*)>/, `<w:r$1><w:t xml:space="preserve">${combinedText}</w:t>`);
        }
        
        return newRun;
      }
      
      return runMatch;
    });
  }
  
  /**
   * Aggressive reconstruction - merges adjacent runs with partial placeholders
   */
  aggressiveReconstruction(xml) {
    // Match paragraphs and process each one
    const paragraphRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gs;
    
    return xml.replace(paragraphRegex, (paragraphMatch, content) => {
      // Extract all text from all runs in this paragraph
      let fullText = '';
      const runMatches = content.match(/<w:r\b[^>]*>.*?<\/w:r>/gs) || [];
      
      runMatches.forEach(run => {
        const textMatches = run.match(/<w:t[^>]*>(.*?)<\/w:t>/gs) || [];
        textMatches.forEach(textTag => {
          const text = textTag.replace(/<w:t[^>]*>|<\/w:t>/g, '');
          fullText += text;
        });
      });
      
      // Check if this paragraph contains placeholder fragments
      const hasPlaceholderStart = /\[|{/.test(fullText);
      const hasPlaceholderEnd = /\]|}/.test(fullText);
      
      if (hasPlaceholderStart && hasPlaceholderEnd && runMatches.length > 1) {
        // Merge all runs into one
        const paragraphStart = paragraphMatch.match(/<w:p\b[^>]*>/)[0];
        const paragraphEnd = '</w:p>';
        
        // Get properties from first run
        const firstRunProps = runMatches[0].match(/<w:rPr>.*?<\/w:rPr>/s);
        const props = firstRunProps ? firstRunProps[0] : '';
        
        return `${paragraphStart}<w:r>${props}<w:t xml:space="preserve">${fullText}</w:t></w:r>${paragraphEnd}`;
      }
      
      return paragraphMatch;
    });
  }
  
  /**
   * Cross-run reconstruction - handles placeholders split across multiple runs
   */
  crossRunReconstruction(xml) {
    // Find sequences like: <w:r>...<w:t>[NAM</w:t>...</w:r><w:r>...<w:t>E]</w:t>...</w:r>
    // and merge them
    
    let result = xml;
    let changed = true;
    let iterations = 0;
    const maxIterations = 10;
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      // Pattern: </w:r> followed by <w:r> with potential whitespace/tags between
      const crossRunPattern = /(<w:r\b[^>]*>(?:<w:rPr>.*?<\/w:rPr>)?<w:t[^>]*>)([^<]*[\[\{][^\]\}]*?)(<\/w:t><\/w:r>)\s*(<w:r\b[^>]*>(?:<w:rPr>.*?<\/w:rPr>)?<w:t[^>]*>)([^\]\}]*[\]\}][^<]*)(<\/w:t><\/w:r>)/gs;
      
      const newResult = result.replace(crossRunPattern, (match, start1, text1, end1, start2, text2, end2) => {
        changed = true;
        const mergedText = text1 + text2;
        return `${start1}${mergedText}${end2}`;
      });
      
      result = newResult;
    }
    
    if (iterations > 1) {
      console.log(`   Cross-run reconstruction took ${iterations} iterations`);
    }
    
    return result;
  }
  
  /**
   * Process loops while preserving XML structure
   */
  processLoopsInXml(xml, data) {
    const loopRegex = /\{\{#([a-z_]+)\}\}(.*?)\{\{\/\1\}\}/gs;
    
    let loopCount = 0;
    const result = xml.replace(loopRegex, (fullMatch, arrayName, content) => {
      loopCount++;
      console.log(`\n   🔄 Loop #${loopCount}: {{#${arrayName}}}`);
      console.log(`      Content length: ${content.length} chars`);
      console.log(`      Array in data: ${!!data[arrayName]}`);
      console.log(`      Is array: ${Array.isArray(data[arrayName])}`);
      console.log(`      Array length: ${data[arrayName]?.length || 0}`);
      
      if (data[arrayName] && Array.isArray(data[arrayName]) && data[arrayName].length > 0) {
        let loopContent = '';
        
        data[arrayName].forEach((item, index) => {
          console.log(`      → Processing item ${index + 1}/${data[arrayName].length}`);
          let itemContent = content;
          
          // Log item structure
          console.log(`         Item keys:`, Object.keys(item).join(', '));
          
          // Replace item properties within the loop
          Object.keys(item).forEach(key => {
            const itemValue = item[key];
            const placeholder = `\\[${key.toUpperCase()}\\]`;
            const placeholderCount = (itemContent.match(new RegExp(placeholder, 'g')) || []).length;
            
            if (placeholderCount > 0) {
              console.log(`         Found ${placeholderCount}x [${key.toUpperCase()}]`);
            }
            
            if (itemValue !== undefined && itemValue !== null) {
              if (Array.isArray(itemValue)) {
                const formattedValue = itemValue.map(v => `• ${v}`).join('\n');
                const regex = new RegExp(placeholder, 'g');
                itemContent = itemContent.replace(regex, this.escapeXmlInPlace(formattedValue));
                console.log(`         ✓ Replaced with array (${itemValue.length} items)`);
              } else if (typeof itemValue === 'object') {
                console.log(`         ⊘ Skipped object value`);
              } else {
                const finalValue = String(itemValue);
                const regex = new RegExp(placeholder, 'g');
                const beforeLength = itemContent.length;
                itemContent = itemContent.replace(regex, this.escapeXmlInPlace(finalValue));
                const afterLength = itemContent.length;
                if (beforeLength !== afterLength) {
                  console.log(`         ✓ Replaced with: "${finalValue.substring(0, 50)}${finalValue.length > 50 ? '...' : ''}"`);
                }
              }
            }
          });
          
          // Special loop variables
          itemContent = itemContent.replace(/\[INDEX\]/g, String(index + 1));
          itemContent = itemContent.replace(/\[IS_FIRST\]/g, index === 0 ? 'true' : '');
          itemContent = itemContent.replace(/\[IS_LAST\]/g, index === data[arrayName].length - 1 ? 'true' : '');
          
          // Recursive processing
          itemContent = this.processLoopsInXml(itemContent, item);
          itemContent = this.processConditionalsInXml(itemContent, item);
          
          loopContent += itemContent;
        });
        
        console.log(`      ✅ Generated content for ${data[arrayName].length} items (${loopContent.length} chars)`);
        return loopContent;
      } else {
        console.log(`      ❌ Removed (no data)`);
        return '';
      }
    });
    
    if (loopCount === 0) {
      console.log("   ⚠️  No loops found to process");
    }
    
    return result;
  }
  
  /**
   * Process conditionals while preserving XML structure
   */
  processConditionalsInXml(xml, data) {
    const conditionalRegex = /\{\{#if ([a-z_]+)\}\}(.*?)\{\{\/if \1\}\}/gs;
    
    return xml.replace(conditionalRegex, (fullMatch, condition, content) => {
      let shouldShow = false;
      
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
      
      return shouldShow ? content : '';
    });
  }
  
  /**
   * Process advanced placeholders in XML
   */
  processAdvancedPlaceholdersInXml(xml, data) {
    const replacements = this.buildAdvancedReplacements(data);
    
    let result = xml;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      const escapedPlaceholder = this.escapeRegex(placeholder);
      const regex = new RegExp(escapedPlaceholder, 'g');
      const matches = result.match(regex);
      
      if (matches && value && value.trim()) {
        result = result.replace(regex, this.escapeXmlInPlace(value));
      } else if (matches) {
        result = result.replace(regex, '');
      }
    });
    
    return result;
  }
  
  /**
   * Process simple placeholders in XML
   */
  processSimplePlaceholdersInXml(xml, data) {
    const simpleReplacements = this.buildSimpleReplacements(data);
    
    console.log("\n   📝 Processing simple placeholders:");
    let replacedCount = 0;
    
    let result = xml;
    Object.entries(simpleReplacements).forEach(([key, value]) => {
      const placeholder = `\\[${key}\\]`;
      const regex = new RegExp(placeholder, 'g');
      const matches = result.match(regex);
      
      if (matches) {
        if (value && value.trim()) {
          result = result.replace(regex, this.escapeXmlInPlace(value));
          console.log(`      [${key}]: Replaced ${matches.length}x with "${value.substring(0, 30)}..."`);
          replacedCount++;
        } else {
          result = result.replace(regex, '');
          console.log(`      [${key}]: Removed (empty value)`);
        }
      }
    });
    
    console.log(`   ✓ Replaced ${replacedCount} placeholders`);
    return result;
  }
  
  /**
   * Escape XML special characters for in-place replacement
   */
  escapeXmlInPlace(text) {
    if (!text) return '';
    
    let escaped = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    escaped = escaped.replace(/\n/g, '</w:t><w:br/><w:t xml:space="preserve">');
    
    return escaped;
  }

  /**
   * Build advanced replacement values
   */
  buildAdvancedReplacements(data) {
    const replacements = {};
    
    if (data.experiences && data.experiences.length > 0) {
      const allExperiences = data.experiences.map(exp => {
        let expText = `${exp.job_title || 'Position'} at ${exp.company || 'Company'}`;
        if (exp.duration) expText += ` (${exp.duration})`;
        if (exp.location) expText += ` - ${exp.location}`;
        
        if (exp.achievements && exp.achievements.length > 0) {
          expText += '\n' + exp.achievements.map(ach => `  • ${ach}`).join('\n');
        }
        
        return expText;
      }).join('\n\n');
      replacements['[ALL_EXPERIENCES]'] = allExperiences;
    }
    
    if (data.education && data.education.length > 0) {
      const allEducation = data.education.map(edu => {
        let eduText = `${edu.degree || 'Degree'}`;
        if (edu.institution) eduText += `, ${edu.institution}`;
        if (edu.year) eduText += ` (${edu.year})`;
        if (edu.location) eduText += ` - ${edu.location}`;
        return eduText;
      }).join('\n');
      replacements['[ALL_EDUCATION]'] = allEducation;
    }
    
    if (data.skills && data.skills.length > 0) {
      const categorized = this.categorizeSkills(data.skills);
      let skillsText = '';
      
      Object.entries(categorized).forEach(([category, skillList]) => {
        if (skillList.length > 0) {
          skillsText += `${category}: ${skillList.join(', ')}\n`;
        }
      });
      
      replacements['[SKILLS_BY_CATEGORY]'] = skillsText.trim();
    }
    
    if (data.experiences && data.experiences.length > 0) {
      const allAchievements = data.experiences
        .flatMap(exp => exp.achievements || [])
        .map(ach => `• ${ach}`)
        .join('\n');
      replacements['[BULLETED_ACHIEVEMENTS]'] = allAchievements;
    }
    
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
    
    Object.keys(categories).forEach(category => {
      if (categories[category].length === 0) {
        delete categories[category];
      }
    });
    
    return categories;
  }

  // calculateExperienceYears(experiences) {
  //   let totalYears = 0;
    
  //   experiences.forEach(exp => {
  //     const duration = exp.duration || '';
  //     const yearMatch = duration.match(/(\d{4})/g);
      
  //     if (yearMatch && yearMatch.length >= 2) {
  //       const startYear = parseInt(yearMatch[0]);
  //       const endYear = yearMatch[1].toLowerCase() === 'present' ? new Date().getFullYear() : parseInt(yearMatch[1]);
  //       totalYears += (endYear - startYear);
  //     } else if (duration.toLowerCase().includes('present')) {
  //       totalYears += 1;
  //     }
  //   });
    
  //   return Math.max(1, totalYears);
  // }

  // buildSimpleReplacements(data) {
  //   const replacements = {};
    
  //   replacements['NAME'] = data.personal?.name || '';
  //   replacements['EMAIL'] = data.personal?.email || '';
  //   replacements['PHONE'] = data.personal?.phone || '';
  //   replacements['LOCATION'] = data.personal?.location || '';
  //   replacements['LINKEDIN'] = data.personal?.linkedin || '';
  //   replacements['PORTFOLIO'] = data.personal?.portfolio || '';
  //   replacements['TITLE'] = data.personal?.title || '';
  //   replacements['SUMMARY'] = data.summary || '';
  //   replacements['SKILLS'] = Array.isArray(data.skills) ? data.skills.join(', ') : '';
    
  //   const firstExp = data.experiences?.[0] || {};
  //   replacements['JOB_TITLE'] = firstExp.job_title || '';
  //   replacements['COMPANY'] = firstExp.company || '';
  //   replacements['DURATION'] = firstExp.duration || '';
  //   replacements['JOB_LOCATION'] = firstExp.location || '';
  //   replacements['ACHIEVEMENTS'] = Array.isArray(firstExp.achievements) ? 
  //     firstExp.achievements.map(ach => `• ${ach}`).join('\n') : '';
    
  //   const firstEdu = data.education?.[0] || {};
  //   replacements['DEGREE'] = firstEdu.degree || '';
  //   replacements['INSTITUTION'] = firstEdu.institution || '';
  //   replacements['YEAR'] = firstEdu.year || '';
  //   replacements['EDUCATION_LOCATION'] = firstEdu.location || '';
    
  //   replacements['CERTIFICATIONS'] = Array.isArray(data.certifications) ? 
  //     data.certifications.join(', ') : '';
  //   replacements['LANGUAGES'] = Array.isArray(data.languages) ? 
  //     data.languages.join(', ') : '';
  //   replacements['PROJECTS'] = Array.isArray(data.projects) ? 
  //     data.projects.join('\n') : '';
  //   replacements['DATE'] = data.generatedDate || '';
    
  //   return replacements;
  // }
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
      totalYears += 1;
    }
  });
  
  return Math.max(1, totalYears);
}

buildSimpleReplacements(data) {
  const replacements = {};
  
  // Personal information
  replacements['NAME'] = data.personal?.name || '';
  replacements['EMAIL'] = data.personal?.email || '';
  replacements['PHONE'] = data.personal?.phone || '';
  replacements['LOCATION'] = data.personal?.location || '';
  replacements['LINKEDIN'] = data.personal?.linkedin || '';
  replacements['PORTFOLIO'] = data.personal?.portfolio || '';
  replacements['TITLE'] = data.personal?.title || '';
  replacements['SUMMARY'] = data.summary || '';
  replacements['SKILLS'] = Array.isArray(data.skills) ? data.skills.join(', ') : '';
  
  // ALL EXPERIENCES (combined)
  if (data.experiences && data.experiences.length > 0) {
    const allExperiences = data.experiences.map(exp => {
      let expText = '';
      if (exp.job_title) expText += `${exp.job_title}`;
      if (exp.company) expText += expText ? ` at ${exp.company}` : exp.company;
      if (exp.duration) expText += ` (${exp.duration})`;
      if (exp.location) expText += ` - ${exp.location}`;
      
      if (exp.achievements && exp.achievements.length > 0) {
        expText += '\n' + exp.achievements.map(ach => `  • ${ach}`).join('\n');
      }
      
      return expText;
    }).join('\n\n');
    replacements['ALL_EXPERIENCES'] = allExperiences;
  } else {
    replacements['ALL_EXPERIENCES'] = '';
  }
  
  // ALL EDUCATION (combined)
  if (data.education && data.education.length > 0) {
    const allEducation = data.education.map(edu => {
      let eduText = '';
      if (edu.degree) eduText += `${edu.degree}`;
      if (edu.institution) eduText += eduText ? `, ${edu.institution}` : edu.institution;
      if (edu.year) eduText += ` (${edu.year})`;
      if (edu.location) eduText += ` - ${edu.location}`;
      if (edu.gpa) eduText += ` - GPA: ${edu.gpa}`;
      if (edu.honors) eduText += ` - ${edu.honors}`;
      return eduText;
    }).join('\n');
    replacements['ALL_EDUCATION'] = allEducation;
  } else {
    replacements['ALL_EDUCATION'] = '';
  }
  
  // Legacy single experience/education placeholders (for backward compatibility)
  const firstExp = data.experiences?.[0] || {};
  replacements['JOB_TITLE'] = firstExp.job_title || '';
  replacements['COMPANY'] = firstExp.company || '';
  replacements['DURATION'] = firstExp.duration || '';
  replacements['JOB_LOCATION'] = firstExp.location || '';
  replacements['ACHIEVEMENTS'] = Array.isArray(firstExp.achievements) ? 
    firstExp.achievements.map(ach => `• ${ach}`).join('\n') : '';
  
  const firstEdu = data.education?.[0] || {};
  replacements['DEGREE'] = firstEdu.degree || '';
  replacements['INSTITUTION'] = firstEdu.institution || '';
  replacements['YEAR'] = firstEdu.year || '';
  replacements['EDUCATION_LOCATION'] = firstEdu.location || '';
  
  // Other fields
  replacements['CERTIFICATIONS'] = Array.isArray(data.certifications) ? 
    data.certifications.join('\n\n') : '';
  replacements['LANGUAGES'] = Array.isArray(data.languages) ? 
    data.languages.join(', ') : '';
  replacements['PROJECTS'] = Array.isArray(data.projects) ? 
    data.projects.join('\n\n\n') : '';
  replacements['DATE'] = data.generatedDate || '';
  
  // Experience summary
  if (data.experiences && data.experiences.length > 0) {
    const years = this.calculateExperienceYears(data.experiences);
    const companies = [...new Set(data.experiences.map(exp => exp.company).filter(Boolean))];
    
    let summary = `${data.experiences.length} position${data.experiences.length > 1 ? 's' : ''}`;
    if (years > 0) summary += ` over ${years} year${years > 1 ? 's' : ''}`;
    if (companies.length > 0) {
      summary += ` at ${companies.length} compan${companies.length > 1 ? 'ies' : 'y'}`;
      if (companies.length <= 3) {
        summary += ` (${companies.join(', ')})`;
      }
    }
    replacements['EXPERIENCE_SUMMARY'] = summary;
  } else {
    replacements['EXPERIENCE_SUMMARY'] = '';
  }
  
  // Skills by category (if skills exist)
  if (data.skills && data.skills.length > 0) {
    const categorized = this.categorizeSkills(data.skills);
    let skillsText = '';
    
    Object.entries(categorized).forEach(([category, skillList]) => {
      if (skillList.length > 0) {
        skillsText += `${category}: ${skillList.join(', ')}\n`;
      }
    });
    
    replacements['SKILLS_BY_CATEGORY'] = skillsText.trim();
  } else {
    replacements['SKILLS_BY_CATEGORY'] = '';
  }
  
  // Bulleted achievements from all experiences
  if (data.experiences && data.experiences.length > 0) {
    const allAchievements = data.experiences
      .flatMap(exp => exp.achievements || [])
      .map(ach => `• ${ach}`)
      .join('\n');
    replacements['BULLETED_ACHIEVEMENTS'] = allAchievements;
  } else {
    replacements['BULLETED_ACHIEVEMENTS'] = '';
  }
  
  return replacements;
}

// Also update the buildAdvancedReplacements method to remove duplication:
buildAdvancedReplacements(data) {
  const replacements = {};
  
  // Now these advanced placeholders are handled in buildSimpleReplacements
  // We'll keep this method for backward compatibility
  
  return replacements;
}

  prepareTemplateData(extractedData) {
    console.log("\n📋 Preparing enhanced template data...");
    
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
      experiences: this.prepareExperiences(extractedData.experience),
      education: this.prepareEducation(extractedData.education),
      certifications: Array.isArray(extractedData.certifications) ? extractedData.certifications : [],
      projects: Array.isArray(extractedData.projects) ? extractedData.projects : [],
      languages: Array.isArray(extractedData.languages) ? extractedData.languages : [],
      
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      
      has_summary: !!(extractedData.professional_summary && extractedData.professional_summary.trim() !== ''),
      has_experiences: !!(Array.isArray(extractedData.experience) && extractedData.experience.length > 0),
      has_education: !!(Array.isArray(extractedData.education) && extractedData.education.length > 0),
      has_skills: !!(Array.isArray(extractedData.skills) && extractedData.skills.length > 0),
      has_certifications: !!(Array.isArray(extractedData.certifications) && extractedData.certifications.length > 0),
      has_projects: !!(Array.isArray(extractedData.projects) && extractedData.projects.length > 0),
      has_languages: !!(Array.isArray(extractedData.languages) && extractedData.languages.length > 0)
    };
    
    console.log("📊 Data prepared:");
    console.log("   - Name:", data.personal.name);
    console.log("   - Experiences:", data.experiences.length);
    console.log("   - Education:", data.education.length);
    console.log("   - Skills:", data.skills.length);
    console.log("   - Certifications:", data.certifications.length);
    
    return data;
  }

  prepareExperiences(experienceData) {
    if (!Array.isArray(experienceData)) {
      console.log("⚠️ Experience data is not an array");
      return [];
    }
    
    console.log(`   Preparing ${experienceData.length} experiences`);
    
    return experienceData.map((exp, index) => ({
      job_title: exp.job_title || '',
      company: exp.company || '',
      duration: exp.duration || '',
      location: exp.location || '',
      achievements: Array.isArray(exp.achievements) ? exp.achievements : (exp.achievements ? [exp.achievements] : []),
      description: exp.description || '',
      index: index + 1,
      is_first: index === 0,
      is_last: index === experienceData.length - 1
    }));
  }

  prepareEducation(educationData) {
    if (!Array.isArray(educationData)) {
      console.log("⚠️ Education data is not an array");
      return [];
    }
    
    console.log(`   Preparing ${educationData.length} education entries`);
    
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

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const docxTemplateService = new DOCXTemplateService();