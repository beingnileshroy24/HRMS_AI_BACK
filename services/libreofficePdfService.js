// services/libreofficePdfService.js
import libre from 'libreoffice-convert';
import mammoth from 'mammoth';
import util from 'util';
import fs from 'fs';
import { promisify } from 'util';

// Convert callback-based libre.convert to promise-based
const convertAsync = util.promisify(libre.convert);

export class LibreOfficePDFService {
  
  /**
   * Convert DOCX to PDF using LibreOffice
   */
  async convertDOCXtoPDF(docxBuffer) {
    return new Promise((resolve, reject) => {
      const convertOptions = {
        filter: 'writer_pdf_Export',
        filterData: {
          'PdfVersion': 'PDF/A-1b',
          'SelectPdfVersion': 1,
          'Quality': 100
        }
      };

      libre.convert(docxBuffer, '.pdf', undefined, (err, pdfBuffer) => {
        if (err) {
          console.error('LibreOffice conversion error:', err);
          reject(new Error(`PDF conversion failed: ${err.message}`));
        } else {
          console.log('✅ DOCX converted to PDF successfully');
          resolve(pdfBuffer);
        }
      });
    });
  }

  /**
   * Convert DOCX to HTML (for preview)
   */
  async convertDOCXtoHTML(docxBuffer) {
    try {
      const result = await mammoth.convertToHtml({ buffer: docxBuffer });
      return result.value; // HTML content
    } catch (error) {
      console.error('DOCX to HTML conversion error:', error);
      throw error;
    }
  }

  /**
   * Generate PDF from DOCX template filled with data
   */
  async generatePDFFromTemplate(docxBuffer, data) {
    try {
      // 1. First convert DOCX to HTML for data injection
      const htmlContent = await this.convertDOCXtoHTML(docxBuffer);
      
      // 2. Fill template with data (simple string replacement)
      let filledHTML = htmlContent;
      
      // Replace placeholders in HTML
      filledHTML = filledHTML
        .replace(/{{full_name}}/g, data.personal?.name || '')
        .replace(/{{email}}/g, data.personal?.email || '')
        .replace(/{{phone}}/g, data.personal?.phone || '')
        .replace(/{{location}}/g, data.personal?.location || '')
        .replace(/{{summary}}/g, data.summary || '')
        .replace(/{{skills}}/g, data.skills?.join(', ') || '');
      
      // 3. Convert filled HTML back to DOCX (simplified approach)
      // For now, we'll create a simple DOCX with the data
      const simpleDocx = this.createSimpleDOCX(data);
      
      // 4. Convert to PDF using LibreOffice
      const pdfBuffer = await this.convertDOCXtoPDF(simpleDocx);
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  /**
   * Create a simple DOCX file with data (using template)
   */
  createSimpleDOCX(data) {
    // Create a simple DOCX structure with data
    // This is a simplified version - in production, you'd use a proper DOCX library
    const docxContent = this.generateDOCXContent(data);
    
    // Convert to Buffer (simplified)
    return Buffer.from(docxContent, 'utf8');
  }

  /**
   * Generate DOCX content with data
   */
  generateDOCXContent(data) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${data.personal?.name || 'CV'}</title>
      <style>
        body { font-family: Arial, sans-serif; }
        h1 { color: #333; }
        .section { margin-bottom: 20px; }
        .contact-info { color: #666; font-size: 14px; }
        .skill-tag { background: #e0e0e0; padding: 2px 8px; margin-right: 5px; display: inline-block; }
      </style>
    </head>
    <body>
      <h1>${data.personal?.name || 'Professional CV'}</h1>
      <div class="contact-info">
        ${data.personal?.email ? `<p>Email: ${data.personal.email}</p>` : ''}
        ${data.personal?.phone ? `<p>Phone: ${data.personal.phone}</p>` : ''}
        ${data.personal?.location ? `<p>Location: ${data.personal.location}</p>` : ''}
      </div>
      
      ${data.summary ? `
      <div class="section">
        <h2>Professional Summary</h2>
        <p>${data.summary}</p>
      </div>
      ` : ''}
      
      ${data.skills?.length > 0 ? `
      <div class="section">
        <h2>Skills</h2>
        <div>
          ${data.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
        </div>
      </div>
      ` : ''}
      
      ${data.experience?.length > 0 ? `
      <div class="section">
        <h2>Work Experience</h2>
        ${data.experience.map(exp => `
          <div>
            <h3>${exp.job_title || ''}</h3>
            <p><strong>${exp.company || ''}</strong> | ${exp.duration || ''}</p>
            ${exp.location ? `<p>Location: ${exp.location}</p>` : ''}
            ${exp.achievements?.length > 0 ? `
              <ul>
                ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}
    </body>
    </html>
    `;
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
        portfolio: extractedData.personal_info?.portfolio || ''
      },
      summary: extractedData.professional_summary || '',
      skills: extractedData.skills || [],
      experience: extractedData.experience || [],
      education: extractedData.education || [],
      certifications: extractedData.certifications || [],
      languages: extractedData.languages || [],
      projects: extractedData.projects || []
    };
  }
}

export const libreofficePDFService = new LibreOfficePDFService();