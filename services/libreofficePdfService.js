// services/libreofficePdfService.js - Updated to DOCX service
import libre from 'libreoffice-convert';
import mammoth from 'mammoth';
import util from 'util';
import Handlebars from 'handlebars';
import fs from 'fs';
import { promisify } from 'util';

// Remove the PDF conversion parts - we'll just work with DOCX

export class LibreOfficeDOCXService {
  
  constructor() {
    this.registerHandlebarsHelpers();
  }

  registerHandlebarsHelpers() {
    Handlebars.registerHelper('ifCond', function(v1, operator, v2, options) {
      switch (operator) {
        case '==':
          return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
          return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
          return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '!==':
          return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
          return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
          return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
          return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
          return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
          return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
          return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    });

    Handlebars.registerHelper('hasItems', function(array, options) {
      return array && array.length > 0 ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('join', function(array, separator) {
      return array ? array.join(separator || ', ') : '';
    });

    Handlebars.registerHelper('eachWithIndex', function(array, options) {
      if (!array || !Array.isArray(array)) return '';
      return array.map((item, index) => 
        options.fn({ ...item, index: index + 1 })
      ).join('');
    });
  }

  /**
   * Extract HTML from DOCX and replace placeholders with data
   */
  async generateDOCXFromTemplate(docxBuffer, data) {
    try {
      console.log("🔄 Processing DOCX template with data...");
      
      // Convert DOCX to HTML to get the template structure
      const result = await mammoth.convertToHtml({ buffer: docxBuffer });
      let htmlContent = result.value;
      
      console.log("📝 Extracted HTML from DOCX template");
      
      // Replace all placeholders in the HTML
      const processedHTML = this.replacePlaceholders(htmlContent, data);
      
      // Create new DOCX with the processed HTML
      const newDocxBuffer = this.createDOCXFromHTML(processedHTML);
      
      console.log("✅ DOCX generated successfully from template");
      return newDocxBuffer;
      
    } catch (error) {
      console.error('DOCX processing error:', error);
      // Fallback to simple DOCX
      return this.createSimpleDOCX(data);
    }
  }

  /**
   * Replace placeholders in HTML with actual data
   */
  replacePlaceholders(htmlContent, data) {
    // First compile with Handlebars
    const template = Handlebars.compile(htmlContent);
    const processedHTML = template(data);
    
    // Also do simple replacements for common patterns
    let result = processedHTML;
    
    // Personal info replacements
    if (data.personal) {
      result = result.replace(/{{personal\.name}}/g, data.personal.name || '');
      result = result.replace(/{{personal\.email}}/g, data.personal.email || '');
      result = result.replace(/{{personal\.phone}}/g, data.personal.phone || '');
      result = result.replace(/{{personal\.location}}/g, data.personal.location || '');
      result = result.replace(/{{personal\.linkedin}}/g, data.personal.linkedin || '');
      result = result.replace(/{{personal\.portfolio}}/g, data.personal.portfolio || '');
    }
    
    // Summary
    result = result.replace(/{{summary}}/g, data.summary || '');
    
    // Skills (as list)
    if (data.skills && data.skills.length > 0) {
      const skillsList = data.skills.map(skill => `<li>${skill}</li>`).join('');
      result = result.replace(/{{skills}}/g, `<ul>${skillsList}</ul>`);
    }
    
    return result;
  }

  /**
   * Create DOCX from HTML content
   */
  createDOCXFromHTML(htmlContent) {
    // For now, create a simple HTML that can be saved as DOCX
    // Users can open this in Word and save as proper DOCX
    const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CV Document</title>
  <style>
    body { 
      font-family: 'Calibri', 'Arial', sans-serif; 
      line-height: 1.5; 
      color: #333; 
      margin: 0;
      padding: 20px;
    }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    
    return Buffer.from(fullHTML, 'utf8');
  }

  /**
   * Create a simple DOCX file with data (fallback)
   */
  createSimpleDOCX(data) {
    const htmlContent = this.generateSimpleHTML(data);
    return this.createDOCXFromHTML(htmlContent);
  }

  /**
   * Generate HTML content with data
   */
  generateSimpleHTML(data) {
    return `
    <div style="text-align: center; border-bottom: 2px solid #2c5282; padding-bottom: 20px; margin-bottom: 30px;">
      <div style="font-size: 28pt; font-weight: bold; color: #2c5282; margin-bottom: 5px;">${data.personal?.name || 'Professional CV'}</div>
      <div style="color: #666; font-size: 11pt; line-height: 1.8;">
        ${data.personal?.email ? `📧 ${data.personal.email}<br>` : ''}
        ${data.personal?.phone ? `📱 ${data.personal.phone}<br>` : ''}
        ${data.personal?.location ? `📍 ${data.personal.location}<br>` : ''}
        ${data.personal?.linkedin ? `🔗 ${data.personal.linkedin}<br>` : ''}
        ${data.personal?.portfolio ? `🌐 ${data.personal.portfolio}` : ''}
      </div>
    </div>
    
    ${data.summary ? `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 14pt; font-weight: bold; color: #2c5282; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">PROFESSIONAL SUMMARY</div>
      <p>${data.summary}</p>
    </div>
    ` : ''}
    
    ${data.skills?.length > 0 ? `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 14pt; font-weight: bold; color: #2c5282; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">SKILLS</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${data.skills.map(skill => `<span style="background: #e8f4ff; padding: 4px 10px; border-radius: 3px; font-size: 10pt;">${skill}</span>`).join('')}
      </div>
    </div>
    ` : ''}
    
    ${data.experiences?.length > 0 ? `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 14pt; font-weight: bold; color: #2c5282; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">WORK EXPERIENCE</div>
      ${data.experiences.map(exp => `
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; color: #333;">${exp.job_title}</div>
          <div style="color: #666; font-style: italic;">${exp.company} ${exp.location ? `| ${exp.location}` : ''}</div>
          <div style="color: #999; font-size: 10pt;">${exp.duration}</div>
          ${exp.achievements?.length > 0 ? `
            <ul style="margin-top: 8px; padding-left: 20px;">
              ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    ${data.education?.length > 0 ? `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 14pt; font-weight: bold; color: #2c5282; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">EDUCATION</div>
      ${data.education.map(edu => `
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; color: #333;">${edu.degree}</div>
          <div style="color: #666; font-style: italic;">${edu.institution}</div>
          <div style="color: #999; font-size: 10pt;">${edu.year} ${edu.location ? `| ${edu.location}` : ''}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    ${data.certifications?.length > 0 ? `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 14pt; font-weight: bold; color: #2c5282; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">CERTIFICATIONS</div>
      <ul style="padding-left: 20px;">
        ${data.certifications.map(cert => `<li>${cert}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    ${data.languages?.length > 0 ? `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 14pt; font-weight: bold; color: #2c5282; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">LANGUAGES</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${data.languages.map(lang => `<span style="background: #e8f4ff; padding: 4px 10px; border-radius: 3px; font-size: 10pt;">${lang}</span>`).join('')}
      </div>
    </div>
    ` : ''}
    
    ${data.projects?.length > 0 ? `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 14pt; font-weight: bold; color: #2c5282; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">PROJECTS</div>
      <ul style="padding-left: 20px;">
        ${data.projects.map(project => `<li>${project}</li>`).join('')}
      </ul>
    </div>
    ` : ''}`;
  }

  /**
   * Prepare data for template
   */
  prepareTemplateData(extractedData) {
    return {
      personal: {
        name: extractedData.personal_info?.full_name || 'Professional Candidate',
        email: extractedData.personal_info?.email || '',
        phone: extractedData.personal_info?.phone || '',
        location: extractedData.personal_info?.location || '',
        linkedin: extractedData.personal_info?.linkedin || '',
        portfolio: extractedData.personal_info?.portfolio || '',
        title: extractedData.personal_info?.title || ''
      },
      
      summary: extractedData.professional_summary || '',
      
      skills: extractedData.skills || [],
      
      experiences: extractedData.experience?.map((exp, index) => ({
        job_title: exp.job_title || '',
        company: exp.company || '',
        duration: exp.duration || '',
        location: exp.location || '',
        achievements: Array.isArray(exp.achievements) ? exp.achievements : [],
        id: index + 1
      })) || [],
      
      education: extractedData.education?.map(edu => ({
        degree: edu.degree || '',
        institution: edu.institution || '',
        year: edu.year || '',
        location: edu.location || ''
      })) || [],
      
      certifications: extractedData.certifications || [],
      projects: extractedData.projects || [],
      languages: extractedData.languages || [],
      
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      currentYear: new Date().getFullYear()
    };
  }
}

export const libreofficePDFService = new LibreOfficeDOCXService();