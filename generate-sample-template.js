import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import fs from "fs";

// Helper to create a loop variable syntax text
const text = (content, bold = false, size = 24) => 
  new TextRun({ text: content, bold: bold, size: size, font: "Calibri" });

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        // --- HEADER ---
        new Paragraph({
          children: [text("{{full_name}}", true, 48)], // Size is half-points (48 = 24pt)
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            text("{{email}} | {{phone}} | {{location}}"),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),

        // --- SUMMARY ---
        new Paragraph({
          text: "PROFESSIONAL SUMMARY",
          heading: HeadingLevel.HEADING_2,
          thematicBreak: true, // Adds a horizontal line
        }),
        new Paragraph({
          children: [text("{{summary}}")],
          spacing: { after: 300 },
        }),

        // --- EXPERIENCE (Loop Start) ---
        new Paragraph({
          text: "WORK EXPERIENCE",
          heading: HeadingLevel.HEADING_2,
          thematicBreak: true,
        }),
        // Opening tag for the loop
        new Paragraph({ children: [text("{#experience}")] }),
        
        // Job Title & Company
        new Paragraph({
          children: [
            text("{{job_title}}", true, 28),
            text(" at "),
            text("{{company}}", true, 28),
          ],
        }),
        // Date & Location
        new Paragraph({
          children: [
            text("{{duration}} | {{location}}", false, 22),
          ],
          spacing: { after: 100 },
        }),

        // Nested Loop for Achievements
        new Paragraph({ children: [text("{#achievements}")] }),
        new Paragraph({
          children: [text("• {{.}}")], // Bullet point for string array
          indent: { left: 720 }, // Indent bullet
        }),
        new Paragraph({ children: [text("{/achievements}")] }),

        new Paragraph({ 
            children: [text("{/experience}")], // Closing tag
            spacing: { after: 300 } 
        }), 

        // --- SKILLS ---
        new Paragraph({
          text: "SKILLS",
          heading: HeadingLevel.HEADING_2,
          thematicBreak: true,
        }),
        new Paragraph({
          children: [
            text("{#skills}"),
            text("{{name}}, "),
            text("{/skills}"),
          ],
        }),
      ],
    },
  ],
});

// Generate the file
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("sample_template.docx", buffer);
  console.log("✅ 'sample_template.docx' created successfully!");
});