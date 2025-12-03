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
  <title>{{personal.name}} - Professional CV</title>
  <style>
    /* Modern CV Template - A4 Size */
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      font-size: 11pt;
      padding: 30px;
      background: #ffffff;
      max-width: 210mm;
      margin: 0 auto;
    }
    
    /* Header Section */
    .header {
      text-align: center;
      padding-bottom: 25px;
      margin-bottom: 30px;
      border-bottom: 3px solid #2c5282;
    }
    
    .name {
      font-size: 28pt;
      font-weight: bold;
      color: #2d3748;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    
    .title {
      font-size: 14pt;
      color: #4a5568;
      margin-bottom: 15px;
      font-weight: normal;
    }
    
    .contact-bar {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 15px;
    }
    
    .contact-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #4a5568;
      font-size: 10pt;
    }
    
    /* Section Styling */
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: #2c5282;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 5px;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    /* Summary Section */
    .summary {
      font-size: 11pt;
      line-height: 1.7;
      text-align: justify;
      color: #4a5568;
    }
    
    /* Skills Section */
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 10px;
    }
    
    .skill-tag {
      background: #edf2f7;
      color: #2d3748;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 10pt;
      border-left: 3px solid #4299e1;
    }
    
    /* Experience & Education Items */
    .timeline-item {
      margin-bottom: 20px;
      padding-left: 20px;
      position: relative;
    }
    
    .timeline-item:before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      width: 10px;
      height: 10px;
      background: #4299e1;
      border-radius: 50%;
    }
    
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 5px;
    }
    
    .job-title {
      font-weight: bold;
      color: #2d3748;
      font-size: 12pt;
    }
    
    .company {
      color: #4a5568;
      font-weight: 500;
      margin-bottom: 3px;
    }
    
    .duration {
      background: #e2e8f0;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 9pt;
      color: #4a5568;
      white-space: nowrap;
    }
    
    .location {
      color: #718096;
      font-size: 10pt;
      font-style: italic;
      margin-bottom: 8px;
    }
    
    .achievements {
      margin-top: 8px;
      padding-left: 20px;
    }
    
    .achievements li {
      margin-bottom: 4px;
      font-size: 10pt;
      color: #4a5568;
      line-height: 1.5;
    }
    
    /* Education Items */
    .education-item {
      margin-bottom: 15px;
      padding-left: 20px;
    }
    
    .degree {
      font-weight: bold;
      color: #2d3748;
      font-size: 11pt;
    }
    
    .institution {
      color: #4a5568;
      font-size: 10pt;
    }
    
    /* Certifications, Projects, Languages */
    .items-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    
    .item-badge {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 10pt;
    }
    
    /* Two Column Layout for Education/Certifications */
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 15px;
    }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #a0aec0;
      font-size: 9pt;
    }
    
    /* Print Styles */
    @media print {
      body {
        font-size: 10pt;
        padding: 20px;
      }
      
      .page-break {
        page-break-before: always;
      }
      
      .no-print {
        display: none;
      }
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .two-columns {
        grid-template-columns: 1fr;
      }
      
      .contact-bar {
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="name">{{personal.name}}</div>
    {{#if personal.title}}
    <div class="title">{{personal.title}}</div>
    {{/if}}
    <div class="contact-bar">
      {{#if personal.email}}
      <div class="contact-item">📧 {{personal.email}}</div>
      {{/if}}
      {{#if personal.phone}}
      <div class="contact-item">📱 {{personal.phone}}</div>
      {{/if}}
      {{#if personal.location}}
      <div class="contact-item">📍 {{personal.location}}</div>
      {{/if}}
      {{#if personal.linkedin}}
      <div class="contact-item">🔗 {{personal.linkedin}}</div>
      {{/if}}
      {{#if personal.portfolio}}
      <div class="contact-item">🌐 {{personal.portfolio}}</div>
      {{/if}}
    </div>
  </div>
  
  <!-- Professional Summary -->
  {{#if summary}}
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary">{{{summary}}}</div>
  </div>
  {{/if}}
  
  <!-- Skills -->
  {{#if skills.length}}
  <div class="section">
    <div class="section-title">Skills & Competencies</div>
    <div class="skills-grid">
      {{#each skills}}
      <div class="skill-tag">{{this}}</div>
      {{/each}}
    </div>
  </div>
  {{/if}}
  
  <!-- Work Experience -->
  {{#if experiences.length}}
  <div class="section">
    <div class="section-title">Work Experience</div>
    {{#each experiences}}
    <div class="timeline-item">
      <div class="item-header">
        <div>
          <div class="job-title">{{job_title}}</div>
          <div class="company">{{company}}</div>
          {{#if location}}<div class="location">{{location}}</div>{{/if}}
        </div>
        <div class="duration">{{duration}}</div>
      </div>
      {{#if achievements.length}}
      <ul class="achievements">
        {{#each achievements}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
      {{/if}}
    </div>
    {{/each}}
  </div>
  {{/if}}
  
  <!-- Education & Certifications -->
  {{#if education.length}}
  <div class="section">
    <div class="section-title">Education & Certifications</div>
    <div class="two-columns">
      <!-- Education -->
      <div>
        {{#each education}}
        <div class="education-item">
          <div class="degree">{{degree}}</div>
          <div class="institution">{{institution}}</div>
          <div class="location">{{year}} {{#if location}}• {{location}}{{/if}}</div>
        </div>
        {{/each}}
      </div>
      
      <!-- Certifications -->
      {{#if certifications.length}}
      <div>
        <div style="margin-bottom: 10px; color: #4a5568; font-weight: 500;">Certifications</div>
        <div class="items-list">
          {{#each certifications}}
          <div class="item-badge">{{this}}</div>
          {{/each}}
        </div>
      </div>
      {{/if}}
    </div>
  </div>
  {{/if}}
  
  <!-- Projects -->
  {{#if projects.length}}
  <div class="section">
    <div class="section-title">Projects</div>
    <div class="items-list">
      {{#each projects}}
      <div class="item-badge">{{this}}</div>
      {{/each}}
    </div>
  </div>
  {{/if}}
  
  <!-- Languages -->
  {{#if languages.length}}
  <div class="section">
    <div class="section-title">Languages</div>
    <div class="items-list">
      {{#each languages}}
      <div class="item-badge">{{this}}</div>
      {{/each}}
    </div>
  </div>
  {{/if}}
  
  <!-- Footer -->
  <div class="footer">
    Generated on {{generatedDate}} | CV generated using AI CV Architect
  </div>
</body>
</html>
    `;
  }
}

export const pdfTemplateService = new PDFTemplateService();