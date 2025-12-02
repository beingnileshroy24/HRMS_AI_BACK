// services/pdfTemplateService.js
import Handlebars from 'handlebars';
import pdf from 'html-pdf';
import fs from 'fs';
import path from 'path';

export class PDFTemplateService {
  
  constructor() {
    this.registerHelpers();
  }

  registerHelpers() {
    Handlebars.registerHelper('eachWithIndex', function(array, options) {
      if (!array || !Array.isArray(array)) return '';
      return array.map((item, index) => 
        options.fn({ ...item, index: index + 1 })
      ).join('');
    });

    Handlebars.registerHelper('hasItems', function(array, options) {
      return array && array.length > 0 ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('join', function(array, separator) {
      return array ? array.join(separator || ', ') : '';
    });
  }

  async processHTMLTemplate(templateContent, data) {
    try {
      const template = Handlebars.compile(templateContent);
      const htmlContent = template(data);
      return htmlContent;
    } catch (error) {
      console.error('Template compilation error:', error);
      throw error;
    }
  }

  async htmlToPDF(htmlContent) {
    return new Promise((resolve, reject) => {
      const options = {
        format: 'A4',
        orientation: 'portrait',
        border: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        type: 'pdf',
        quality: '100'
      };
      
      pdf.create(htmlContent, options).toBuffer((err, buffer) => {
        if (err) {
          console.error('PDF creation error:', err);
          reject(err);
        } else {
          resolve(buffer);
        }
      });
    });
  }

  async generatePDFFromTemplate(templateType, templateContent, data) {
    try {
      let htmlContent;
      
      if (templateType === 'html') {
        htmlContent = await this.processHTMLTemplate(templateContent, data);
      } 
      else if (templateType === 'docx') {
        // For now, use default template for DOCX
        console.warn('DOCX templates not fully supported yet, using default HTML template');
        htmlContent = await this.processHTMLTemplate(this.getDefaultHTMLTemplate(), data);
      }
      else {
        throw new Error(`Unsupported template type: ${templateType}`);
      }
      
      const pdfBuffer = await this.htmlToPDF(htmlContent);
      return pdfBuffer;
      
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

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
      hasSkills: extractedData.skills?.length > 0,
      
      experiences: extractedData.experience?.map((exp, index) => ({
        ...exp,
        id: index + 1,
        hasAchievements: exp.achievements?.length > 0
      })) || [],
      hasExperiences: extractedData.experience?.length > 0,
      
      education: extractedData.education || [],
      hasEducation: extractedData.education?.length > 0,
      
      certifications: extractedData.certifications || [],
      projects: extractedData.projects || [],
      languages: extractedData.languages || [],
      
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      currentYear: new Date().getFullYear(),
      
      hasCertifications: extractedData.certifications?.length > 0,
      hasProjects: extractedData.projects?.length > 0,
      hasLanguages: extractedData.languages?.length > 0
    };
  }

  getDefaultHTMLTemplate() {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Professional CV</title>
      <style>
        @page {
          size: A4;
          margin: 20mm 15mm 20mm 15mm;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        
        .header {
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .name {
          font-size: 28px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 8px;
        }
        
        .contact-info {
          color: #666;
          font-size: 14px;
          line-height: 1.8;
        }
        
        .contact-info span {
          margin-right: 20px;
          display: inline-block;
        }
        
        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #2563eb;
          border-bottom: 2px solid #dbeafe;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        
        .skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 0;
          padding: 0;
        }
        
        .skill-tag {
          background: #dbeafe;
          color: #1e40af;
          padding: 4px 12px;
          border-radius: 15px;
          font-size: 13px;
          list-style: none;
        }
        
        .experience-item, .education-item {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .job-title {
          font-weight: bold;
          color: #1e293b;
          font-size: 16px;
          margin-bottom: 4px;
        }
        
        .company {
          color: #475569;
          font-size: 14px;
          margin-bottom: 4px;
        }
        
        .duration {
          color: #64748b;
          font-size: 13px;
          font-style: italic;
        }
        
        .achievements {
          margin-top: 8px;
          padding-left: 20px;
        }
        
        .achievements li {
          margin-bottom: 4px;
          font-size: 14px;
        }
        
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
        }
        
        /* Print-specific styles */
        @media print {
          body {
            font-size: 12pt;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">{{personal.name}}</div>
        <div class="contact-info">
          {{#if personal.email}}<span>📧 {{personal.email}}</span>{{/if}}
          {{#if personal.phone}}<span>📱 {{personal.phone}}</span>{{/if}}
          {{#if personal.location}}<span>📍 {{personal.location}}</span>{{/if}}
          {{#if personal.linkedin}}<span>🔗 {{personal.linkedin}}</span>{{/if}}
          {{#if personal.portfolio}}<span>🌐 {{personal.portfolio}}</span>{{/if}}
        </div>
      </div>
      
      {{#if summary}}
      <div class="section">
        <div class="section-title">Professional Summary</div>
        <p>{{summary}}</p>
      </div>
      {{/if}}
      
      {{#hasItems skills}}
      <div class="section">
        <div class="section-title">Skills</div>
        <div class="skills-list">
          {{#each skills}}
          <span class="skill-tag">{{this}}</span>
          {{/each}}
        </div>
      </div>
      {{/hasItems}}
      
      {{#hasItems experiences}}
      <div class="section">
        <div class="section-title">Work Experience</div>
        {{#each experiences}}
        <div class="experience-item">
          <div class="job-title">{{job_title}}</div>
          <div class="company">{{company}} {{#if location}}| {{location}}{{/if}}</div>
          <div class="duration">{{duration}}</div>
          {{#hasItems achievements}}
          <ul class="achievements">
            {{#each achievements}}
            <li>{{this}}</li>
            {{/each}}
          </ul>
          {{/hasItems}}
        </div>
        {{/each}}
      </div>
      {{/hasItems}}
      
      {{#hasItems education}}
      <div class="section">
        <div class="section-title">Education</div>
        {{#each education}}
        <div class="education-item">
          <div class="job-title">{{degree}}</div>
          <div class="company">{{institution}} {{#if location}}| {{location}}{{/if}}</div>
          <div class="duration">{{year}}</div>
        </div>
        {{/each}}
      </div>
      {{/hasItems}}
      
      {{#hasItems certifications}}
      <div class="section">
        <div class="section-title">Certifications</div>
        <ul class="achievements">
          {{#each certifications}}
          <li>{{this}}</li>
          {{/each}}
        </ul>
      </div>
      {{/hasItems}}
      
      {{#hasItems languages}}
      <div class="section">
        <div class="section-title">Languages</div>
        <div class="skills-list">
          {{#each languages}}
          <span class="skill-tag">{{this}}</span>
          {{/each}}
        </div>
      </div>
      {{/hasItems}}
      
      <div class="footer">
        Generated on {{generatedDate}} | CV generated using AI CV Architect
      </div>
    </body>
    </html>
    `;
  }
}

export const pdfTemplateService = new PDFTemplateService();