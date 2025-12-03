// templates/sampleTemplate.js
export const getSampleTemplateHTML = () => {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CV Template</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #3498db; margin-top: 25px; }
        .placeholder { 
            background-color: #ffffcc; 
            padding: 2px 6px; 
            border: 2px dashed #ff9900;
            font-weight: bold;
            color: #e74c3c;
        }
        .section { margin-bottom: 20px; }
        .note { 
            background: #e8f4fc; 
            padding: 15px; 
            border-left: 4px solid #3498db;
            margin-top: 30px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="section">
        <h1><span class="placeholder">[NAME]</span></h1>
        <p><strong>Email:</strong> <span class="placeholder">[EMAIL]</span></p>
        <p><strong>Phone:</strong> <span class="placeholder">[PHONE]</span></p>
        <p><strong>Location:</strong> <span class="placeholder">[LOCATION]</span></p>
        <p><strong>LinkedIn:</strong> <span class="placeholder">[LINKEDIN]</span></p>
        <p><strong>Portfolio:</strong> <span class="placeholder">[PORTFOLIO]</span></p>
    </div>
    
    <div class="section">
        <h2>Professional Summary</h2>
        <p><span class="placeholder">[SUMMARY]</span></p>
    </div>
    
    <div class="section">
        <h2>Skills</h2>
        <p><span class="placeholder">[SKILLS]</span></p>
    </div>
    
    <div class="section">
        <h2>Work Experience</h2>
        <h3><span class="placeholder">[JOB_TITLE]</span></h3>
        <p><strong>Company:</strong> <span class="placeholder">[COMPANY]</span></p>
        <p><strong>Duration:</strong> <span class="placeholder">[DURATION]</span></p>
        <p><strong>Location:</strong> <span class="placeholder">[JOB_LOCATION]</span></p>
        <p><strong>Achievements:</strong> <span class="placeholder">[ACHIEVEMENTS]</span></p>
    </div>
    
    <div class="section">
        <h2>Education</h2>
        <p><strong>Degree:</strong> <span class="placeholder">[DEGREE]</span></p>
        <p><strong>Institution:</strong> <span class="placeholder">[INSTITUTION]</span></p>
        <p><strong>Year:</strong> <span class="placeholder">[YEAR]</span></p>
        <p><strong>Location:</strong> <span class="placeholder">[EDUCATION_LOCATION]</span></p>
    </div>
    
    <div class="section">
        <h2>Certifications</h2>
        <p><span class="placeholder">[CERTIFICATIONS]</span></p>
    </div>
    
    <div class="section">
        <h2>Languages</h2>
        <p><span class="placeholder">[LANGUAGES]</span></p>
    </div>
    
    <div class="section">
        <h2>Projects</h2>
        <p><span class="placeholder">[PROJECTS]</span></p>
    </div>
    
    <hr>
    <p><em>Generated on: <span class="placeholder">[DATE]</span></em></p>
    
    <div class="note">
        <strong>⚠️ IMPORTANT INSTRUCTIONS:</strong><br>
        1. Copy ALL of this HTML content<br>
        2. Open <strong>Microsoft Word</strong> or <strong>Google Docs</strong><br>
        3. Paste the content<br>
        4. <strong>DO NOT EDIT</strong> the <span class="placeholder">[PLACEHOLDERS]</span><br>
        5. Save as <strong>DOCX file (.docx)</strong><br>
        6. Upload the DOCX file as your template<br>
        <br>
        <strong>Note:</strong> The colored placeholders will be automatically replaced with your actual CV data.
    </div>
</body>
</html>`;
};