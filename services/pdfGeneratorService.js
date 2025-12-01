// services/pdfGeneratorService.js - Enhanced Uniform & Organized Design
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export const generateProfessionalPDF = async (extractedData, options = {}) => {
  try {
    console.log('Generating professional PDF with pdf-lib...');
    
    // Design system with consistent spacing and colors
    const DESIGN_SYSTEM = {
      colors: {
        primary: rgb(0.2, 0.4, 0.6),
        secondary: rgb(0.3, 0.3, 0.3),
        accent: rgb(0.1, 0.1, 0.1),
        lightGray: rgb(0.95, 0.95, 0.95),
        mediumGray: rgb(0.6, 0.6, 0.6),
        darkGray: rgb(0.3, 0.3, 0.3),
        white: rgb(1, 1, 1)
      },
      spacing: {
        margin: 40,
        sectionGap: 25,
        lineGap: 12,
        paragraphGap: 15,
        itemGap: 8
      },
      typography: {
        title: { size: 20, font: 'bold' },
        subtitle: { size: 14, font: 'bold' },
        sectionHeader: { size: 12, font: 'bold' },
        bodyLarge: { size: 11, font: 'regular' },
        body: { size: 10, font: 'regular' },
        bodySmall: { size: 9, font: 'regular' },
        caption: { size: 8, font: 'regular' }
      },
      layout: {
        contentWidth: 515.28, // A4 width - 2*margin
        columnGap: 20,
        sidebarWidth: 150
      }
    };

    // Default options
    const defaultBrandingOptions = {
      addWatermark: false,
      watermarkText: 'CONFIDENTIAL',
      primaryColor: { r: 0.2, g: 0.4, b: 0.6 },
      secondaryColor: { r: 0.3, g: 0.3, b: 0.3 }
    };

    const {
      companyLogo = null,
      brandingOptions = {}
    } = options;

    const finalBrandingOptions = {
      ...defaultBrandingOptions,
      ...brandingOptions
    };

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const { colors, spacing, typography, layout } = DESIGN_SYSTEM;
    let y = height - spacing.margin;

    // Add subtle background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: height,
      color: colors.lightGray,
    });

    // Header Section with uniform styling
    page.drawRectangle({
      x: 0,
      y: height - 100,
      width: width,
      height: 100,
      color: colors.primary,
      opacity: 0.1,
    });

    // Add company logo if provided
    if (companyLogo) {
      try {
        const base64Data = companyLogo.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        let image;
        try {
          image = await pdfDoc.embedPng(imageBytes);
        } catch (pngError) {
          image = await pdfDoc.embedJpg(imageBytes);
        }

        const logoDims = image.scale(0.08);
        page.drawImage(image, {
          x: width - logoDims.width - spacing.margin,
          y: height - logoDims.height - spacing.margin + 10,
          width: logoDims.width,
          height: logoDims.height,
        });
      } catch (logoError) {
        console.warn('Could not add logo:', logoError.message);
      }
    }

    // Add watermark
    if (finalBrandingOptions.addWatermark) {
      page.drawText(finalBrandingOptions.watermarkText, {
        x: width / 2 - 100,
        y: height / 2,
        size: 48,
        font: boldFont,
        color: colors.lightGray,
        opacity: 0.03,
        rotate: degrees(45),
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

    // Header Content with uniform spacing
    // Name
    page.drawText(personal_info.full_name?.toUpperCase() || 'PROFESSIONAL CANDIDATE', {
      x: spacing.margin,
      y: y,
      size: typography.title.size,
      font: boldFont,
      color: colors.primary,
    });
    y -= 30;

    // Title
    if (personal_info.title) {
      page.drawText(personal_info.title, {
        x: spacing.margin,
        y: y,
        size: typography.subtitle.size,
        font: boldFont,
        color: colors.darkGray,
      });
      y -= 20;
    }

    // Contact Information in a compact, uniform layout
    const contactItems = [];
    if (personal_info.email) contactItems.push(personal_info.email);
    if (personal_info.phone) contactItems.push(personal_info.phone);
    if (personal_info.location) contactItems.push(personal_info.location);

    if (contactItems.length > 0) {
      const contactText = contactItems.join(' • ');
      page.drawText(contactText, {
        x: spacing.margin,
        y: y,
        size: typography.caption.size,
        font: font,
        color: colors.darkGray,
      });
      y -= 15;
    }

    // Links section with uniform styling
    const links = [];
    if (personal_info.linkedin) links.push(`LinkedIn: ${personal_info.linkedin}`);
    if (personal_info.portfolio) links.push(`Portfolio: ${personal_info.portfolio}`);
    if (personal_info.github) links.push(`GitHub: ${personal_info.github}`);

    if (links.length > 0) {
      const linksText = links.join(' • ');
      page.drawText(linksText, {
        x: spacing.margin,
        y: y,
        size: typography.caption.size,
        font: font,
        color: colors.primary,
      });
      y -= 20;
    }

    // Main content sections with uniform structure
    const sections = [];

    // Professional Summary
    if (professional_summary) {
      sections.push({
        title: 'PROFESSIONAL PROFILE',
        content: professional_summary,
        type: 'paragraph'
      });
    }

    // Core Competencies (Skills)
    if (skills.length > 0) {
      sections.push({
        title: 'CORE COMPETENCIES',
        content: skills,
        type: 'skills'
      });
    }

    // Experience
    if (experience.length > 0) {
      sections.push({
        title: 'PROFESSIONAL EXPERIENCE',
        content: experience,
        type: 'experience'
      });
    }

    // Education
    if (education.length > 0) {
      sections.push({
        title: 'EDUCATION',
        content: education,
        type: 'education'
      });
    }

    // Certifications
    if (certifications.length > 0) {
      sections.push({
        title: 'CERTIFICATIONS',
        content: certifications,
        type: 'list'
      });
    }

    // Languages
    if (languages.length > 0) {
      sections.push({
        title: 'LANGUAGES',
        content: languages,
        type: 'languages'
      });
    }

    // Render all sections with consistent styling
    for (const section of sections) {
      // Check if we need a new page
      if (y < spacing.margin + 100) {
        page = addNewPage(pdfDoc, width, height, colors);
        y = height - spacing.margin;
      }

      // Section header with uniform design
      y -= 10;
      
      // Section title with accent line
      page.drawRectangle({
        x: spacing.margin,
        y: y + 2,
        width: 25,
        height: 2,
        color: colors.primary,
      });

      page.drawText(section.title, {
        x: spacing.margin + 30,
        y: y,
        size: typography.sectionHeader.size,
        font: boldFont,
        color: colors.primary,
      });
      y -= 25;

      // Section content with uniform spacing
      switch (section.type) {
        case 'paragraph':
          const lines = splitTextIntoLines(section.content, 90);
          for (const line of lines) {
            if (y < spacing.margin + 30) {
              page = addNewPage(pdfDoc, width, height, colors);
              y = height - spacing.margin;
            }
            page.drawText(line, {
              x: spacing.margin,
              y,
              size: typography.body.size,
              font: font,
              color: colors.darkGray,
              lineHeight: spacing.lineGap,
            });
            y -= spacing.lineGap;
          }
          y -= spacing.paragraphGap;
          break;

        case 'skills':
          // Organized skill categories
          const technicalSkills = section.content.filter(skill => 
            !skill.toLowerCase().includes('soft') && 
            !skill.toLowerCase().includes('communication') &&
            !skill.toLowerCase().includes('leadership') &&
            !skill.toLowerCase().includes('team')
          );
          
          const softSkills = section.content.filter(skill => 
            skill.toLowerCase().includes('soft') || 
            skill.toLowerCase().includes('communication') ||
            skill.toLowerCase().includes('leadership') ||
            skill.toLowerCase().includes('team') ||
            skill.toLowerCase().includes('management')
          );

          // Technical Skills in a compact format
          if (technicalSkills.length > 0) {
            const techSkillsText = technicalSkills.slice(0, 12).join(' • ');
            const techLines = splitTextIntoLines(techSkillsText, 90);
            for (const line of techLines) {
              if (y < spacing.margin + 30) {
                page = addNewPage(pdfDoc, width, height, colors);
                y = height - spacing.margin;
              }
              page.drawText(line, {
                x: spacing.margin,
                y,
                size: typography.bodySmall.size,
                font: font,
                color: colors.darkGray,
              });
              y -= spacing.lineGap;
            }
            y -= spacing.itemGap;
          }

          // Soft Skills in a compact format
          if (softSkills.length > 0) {
            const softSkillsText = softSkills.slice(0, 8).join(' • ');
            const softLines = splitTextIntoLines(softSkillsText, 90);
            for (const line of softLines) {
              if (y < spacing.margin + 30) {
                page = addNewPage(pdfDoc, width, height, colors);
                y = height - spacing.margin;
              }
              page.drawText(line, {
                x: spacing.margin,
                y,
                size: typography.bodySmall.size,
                font: font,
                color: colors.darkGray,
              });
              y -= spacing.lineGap;
            }
          }
          y -= spacing.paragraphGap;
          break;

        case 'experience':
          for (const exp of section.content.slice(0, 5)) {
            if (y < spacing.margin + 80) {
              page = addNewPage(pdfDoc, width, height, colors);
              y = height - spacing.margin;
            }

            // Job title and company in uniform layout
            page.drawText(exp.job_title || 'Professional Role', {
              x: spacing.margin,
              y,
              size: typography.bodyLarge.size,
              font: boldFont,
              color: colors.accent,
            });

            // Company and duration aligned right
            const companyInfo = [exp.company, exp.duration].filter(Boolean).join(' • ');
            const companyWidth = calculateTextWidth(companyInfo, typography.bodySmall.size, font);
            page.drawText(companyInfo, {
              x: width - spacing.margin - companyWidth,
              y,
              size: typography.bodySmall.size,
              font: italicFont,
              color: colors.primary,
            });
            y -= 15;

            // Location with consistent styling
            if (exp.location) {
              page.drawText(exp.location, {
                x: spacing.margin,
                y,
                size: typography.bodySmall.size,
                font: font,
                color: colors.mediumGray,
              });
              y -= 12;
            }

            // Achievements with bullet points
            if (exp.achievements && exp.achievements.length > 0) {
              for (const achievement of exp.achievements.slice(0, 3)) {
                if (y < spacing.margin + 30) {
                  page = addNewPage(pdfDoc, width, height, colors);
                  y = height - spacing.margin;
                }
                
                const achievementLines = splitTextIntoLines(`• ${achievement}`, 85);
                for (const line of achievementLines) {
                  page.drawText(line, {
                    x: spacing.margin + 5,
                    y,
                    size: typography.bodySmall.size,
                    font: font,
                    color: colors.darkGray,
                  });
                  y -= spacing.lineGap;
                }
              }
            }
            y -= 15;
          }
          break;

        case 'education':
          for (const edu of section.content.slice(0, 3)) {
            if (y < spacing.margin + 50) {
              page = addNewPage(pdfDoc, width, height, colors);
              y = height - spacing.margin;
            }

            // Degree and institution in uniform layout
            page.drawText(edu.degree || 'Degree', {
              x: spacing.margin,
              y,
              size: typography.body.size,
              font: boldFont,
              color: colors.accent,
            });

            const institutionInfo = [edu.institution, edu.year].filter(Boolean).join(' • ');
            const institutionWidth = calculateTextWidth(institutionInfo, typography.bodySmall.size, font);
            page.drawText(institutionInfo, {
              x: width - spacing.margin - institutionWidth,
              y,
              size: typography.bodySmall.size,
              font: font,
              color: colors.primary,
            });
            y -= 15;

            // Additional info with consistent styling
            if (edu.gpa || edu.honors) {
              const additionalInfo = [edu.gpa, edu.honors].filter(Boolean).join(' • ');
              page.drawText(additionalInfo, {
                x: spacing.margin,
                y,
                size: typography.caption.size,
                font: italicFont,
                color: colors.mediumGray,
              });
              y -= 12;
            }

            y -= 15;
          }
          break;

        case 'list':
          for (const item of section.content.slice(0, 6)) {
            if (y < spacing.margin + 30) {
              page = addNewPage(pdfDoc, width, height, colors);
              y = height - spacing.margin;
            }
            page.drawText(`• ${item}`, {
              x: spacing.margin,
              y,
              size: typography.bodySmall.size,
              font: font,
              color: colors.darkGray,
            });
            y -= 14;
          }
          break;

        case 'languages':
          const languagesText = section.content.join(' • ');
          const languageLines = splitTextIntoLines(languagesText, 90);
          for (const line of languageLines) {
            if (y < spacing.margin + 30) {
              page = addNewPage(pdfDoc, width, height, colors);
              y = height - spacing.margin;
            }
            page.drawText(line, {
              x: spacing.margin,
              y,
              size: typography.bodySmall.size,
              font: font,
              color: colors.darkGray,
            });
            y -= spacing.lineGap;
          }
          break;
      }

      y -= spacing.sectionGap; // Consistent spacing between sections
    }

    // Uniform footer
    const footerY = 30;
    page.drawLine({
      start: { x: spacing.margin, y: footerY + 10 },
      end: { x: width - spacing.margin, y: footerY + 10 },
      thickness: 0.5,
      color: colors.mediumGray,
      opacity: 0.5,
    });

    const footerText = `Generated on ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`;
    
    const footerWidth = calculateTextWidth(footerText, typography.caption.size, font);
    page.drawText(footerText, {
      x: width - spacing.margin - footerWidth,
      y: footerY,
      size: typography.caption.size,
      font: font,
      color: colors.mediumGray,
    });

    console.log('Professional PDF generated successfully');
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;

  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate professional PDF: ${error.message}`);
  }
};

// Helper function to add new page with consistent styling
function addNewPage(pdfDoc, width, height, colors) {
  const page = pdfDoc.addPage([595.28, 841.89]);
  
  // Add consistent background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: height,
    color: colors.lightGray,
  });
  
  return page;
}

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

// Improved text width calculation
function calculateTextWidth(text, fontSize, font) {
  // More accurate width calculation
  const averageCharWidth = fontSize * 0.55; // Adjusted for better accuracy
  return text.length * averageCharWidth;
}