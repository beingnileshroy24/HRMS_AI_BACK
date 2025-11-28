// services/pdfGeneratorService.js - Fixed version
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export const generateProfessionalPDF = async (extractedData, options = {}) => {
  try {
    console.log('🔄 Generating professional PDF with pdf-lib...');
    
    const {
      companyLogo = null,
      brandingOptions = {
        addWatermark: true,
        watermarkText: 'CONFIDENTIAL'
      }
    } = options;

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Set up margins and coordinates
    const margin = 50;
    let y = height - margin;

    // Add company logo if provided
    if (companyLogo) {
      try {
        // Remove data URL prefix if present
        const base64Data = companyLogo.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        let image;
        try {
          image = await pdfDoc.embedPng(imageBytes);
        } catch (pngError) {
          image = await pdfDoc.embedJpg(imageBytes);
        }

        const logoDims = image.scale(0.15); // Scale logo
        const logoX = width - logoDims.width - margin;
        const logoY = height - logoDims.height - margin;

        page.drawImage(image, {
          x: logoX,
          y: logoY,
          width: logoDims.width,
          height: logoDims.height,
        });
      } catch (logoError) {
        console.warn('⚠️ Could not add logo:', logoError.message);
      }
    }

    // Add watermark - FIXED ROTATION
    if (brandingOptions.addWatermark) {
      page.drawText(brandingOptions.watermarkText, {
        x: width / 2 - 100,
        y: height / 2,
        size: 48,
        font: boldFont,
        color: rgb(0.8, 0.8, 0.8),
        opacity: 0.1,
        rotate: degrees(45), // FIXED: Use degrees() function
      });
    }

    const { 
      personal_info = {},
      professional_summary = '',
      experience = [],
      education = [],
      skills = [],
      certifications = [],
      languages = []
    } = extractedData;

    // Header Section
    // Name
    page.drawText(personal_info.full_name || 'Professional Candidate', {
      x: margin,
      y,
      size: 24,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 30;

    // Title
    if (personal_info.title) {
      page.drawText(personal_info.title, {
        x: margin,
        y,
        size: 14,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 20;
    }

    // Contact Information
    const contactInfo = [
      personal_info.email,
      personal_info.phone, 
      personal_info.location
    ].filter(Boolean);

    if (contactInfo.length > 0) {
      page.drawText(contactInfo.join(' • '), {
        x: margin,
        y,
        size: 10,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 25;
    }

    // LinkedIn and Portfolio
    const links = [];
    if (personal_info.linkedin) links.push(`LinkedIn: ${personal_info.linkedin}`);
    if (personal_info.portfolio) links.push(`Portfolio: ${personal_info.portfolio}`);
    
    if (links.length > 0) {
      page.drawText(links.join(' • '), {
        x: margin,
        y,
        size: 9,
        font: font,
        color: rgb(0.3, 0.3, 0.6),
      });
      y -= 25;
    }

    // Add a separator line
    page.drawLine({
      start: { x: margin, y: y + 5 },
      end: { x: width - margin, y: y + 5 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 20;

    // Professional Summary
    if (professional_summary) {
      page.drawText('PROFESSIONAL SUMMARY', {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.4),
      });
      y -= 20;

      // Split summary into lines that fit the page width
      const summaryLines = splitTextIntoLines(professional_summary, 85, font, 10);
      for (const line of summaryLines) {
        if (y < margin + 50) {
          // Add new page if running out of space
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }
        page.drawText(line, {
          x: margin,
          y,
          size: 10,
          font: font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 12;
      }
      y -= 15;
    }

    // Skills Section
    if (skills.length > 0) {
      page.drawText('SKILLS', {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.4),
      });
      y -= 20;

      const skillsText = skills.slice(0, 20).join(' • ');
      const skillLines = splitTextIntoLines(skillsText, 100, font, 9);
      for (const line of skillLines) {
        if (y < margin + 30) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }
        page.drawText(line, {
          x: margin,
          y,
          size: 9,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 11;
      }
      y -= 15;
    }

    // Experience Section
    if (experience.length > 0) {
      page.drawText('PROFESSIONAL EXPERIENCE', {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.4),
      });
      y -= 20;

      for (const exp of experience.slice(0, 5)) { // Limit to 5 most recent
        if (y < margin + 100) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }

        // Job Title
        page.drawText(exp.job_title || 'Professional Role', {
          x: margin,
          y,
          size: 11,
          font: boldFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= 14;

        // Company and Duration
        const companyInfo = [exp.company, exp.duration].filter(Boolean).join(' • ');
        page.drawText(companyInfo, {
          x: margin,
          y,
          size: 10,
          font: italicFont,
          color: rgb(0.3, 0.3, 0.6),
        });
        y -= 14;

        // Location
        if (exp.location) {
          page.drawText(exp.location, {
            x: margin,
            y,
            size: 9,
            font: font,
            color: rgb(0.5, 0.5, 0.5),
          });
          y -= 12;
        }

        // Achievements
        if (exp.achievements && exp.achievements.length > 0) {
          for (const achievement of exp.achievements.slice(0, 3)) { // Limit to 3 achievements
            if (y < margin + 30) {
              page = pdfDoc.addPage([595.28, 841.89]);
              y = height - margin;
            }
            const achievementLines = splitTextIntoLines(`• ${achievement}`, 90, font, 9);
            for (const line of achievementLines) {
              page.drawText(line, {
                x: margin + 10,
                y,
                size: 9,
                font: font,
                color: rgb(0.2, 0.2, 0.2),
              });
              y -= 11;
            }
          }
        }
        y -= 15;
      }
    }

    // Education Section
    if (education.length > 0) {
      if (y < margin + 100) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - margin;
      }

      page.drawText('EDUCATION', {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.4),
      });
      y -= 20;

      for (const edu of education.slice(0, 3)) { // Limit to 3 most recent
        if (y < margin + 50) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }

        page.drawText(edu.degree || 'Degree', {
          x: margin,
          y,
          size: 10,
          font: boldFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= 12;

        const eduInfo = [edu.institution, edu.year].filter(Boolean).join(' • ');
        page.drawText(eduInfo, {
          x: margin,
          y,
          size: 9,
          font: font,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 15;
      }
    }

    // Certifications
    if (certifications.length > 0) {
      if (y < margin + 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - margin;
      }

      page.drawText('CERTIFICATIONS', {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.4),
      });
      y -= 20;

      for (const cert of certifications.slice(0, 5)) {
        if (y < margin + 30) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }
        page.drawText(`• ${cert}`, {
          x: margin,
          y,
          size: 9,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 12;
      }
    }

    // Languages
    if (languages.length > 0) {
      if (y < margin + 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - margin;
      }

      page.drawText('LANGUAGES', {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.4),
      });
      y -= 20;

      const languagesText = languages.join(' • ');
      const languageLines = splitTextIntoLines(languagesText, 100, font, 9);
      for (const line of languageLines) {
        if (y < margin + 30) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }
        page.drawText(line, {
          x: margin,
          y,
          size: 9,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 11;
      }
    }

    console.log('✅ Professional PDF generated successfully');
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    throw new Error(`Failed to generate professional PDF: ${error.message}`);
  }
};

// Helper function to split text into lines that fit page width
function splitTextIntoLines(text, maxChars) {
  if (!text) return [];
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxChars) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}