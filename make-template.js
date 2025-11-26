import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import fs from "fs";

// Helper for template tags
const tag = (text) => new TextRun({ text: text, font: "Courier New" });
const boldTag = (text) => new TextRun({ text: text, bold: true, font: "Calibri" });

const doc = new Document({
  sections: [{
    children: [
      // Header
      new Paragraph({ children: [ new TextRun({ text: "RESUME", size: 48, bold: true }) ] }),
      new Paragraph({ children: [ tag("Name: {{full_name}}") ] }),
      new Paragraph({ children: [ tag("Email: {{email}} | Phone: {{phone}}") ] }),
      new Paragraph({ children: [ tag("Location: {{location}}") ] }),
      new Paragraph({ text: "" }), // Empty line

      // Summary
      new Paragraph({ text: "PROFESSIONAL SUMMARY", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ children: [ tag("{{summary}}") ] }),
      new Paragraph({ text: "" }),

      // Experience Loop (Crucial Part)
      new Paragraph({ text: "EXPERIENCE", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ children: [ tag("{#experience}") ] }), // Start Loop

      new Paragraph({ 
        children: [ boldTag("{{job_title}}"), tag(" at {{company}}") ] 
      }),
      new Paragraph({ children: [ tag("{{duration}} | {{location}}") ] }),

      new Paragraph({ children: [ tag("Key Achievements:") ] }),
      new Paragraph({ children: [ tag("{#achievements}") ] }), // Nested Loop
      new Paragraph({ 
        children: [ tag("• {{.}}") ],
        indent: { left: 720 } 
      }),
      new Paragraph({ children: [ tag("{/achievements}") ] }), // End Nested Loop

      new Paragraph({ children: [ tag("{/experience}") ] }), // End Loop
      new Paragraph({ text: "" }),

      // Skills Loop
      new Paragraph({ text: "SKILLS", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ children: [ tag("{#skills}{{name}}, {/skills}") ] }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("clean_template.docx", buffer);
  console.log("✅ Created 'clean_template.docx'. Use this file to test!");
});