// templates/sampleTemplate.js - CLEANER VERSION
export const getSampleTemplateHTML = () => {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CV Template</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .placeholder { 
            background-color: #ffffcc; 
            padding: 2px 6px; 
            border: 2px dashed #ff9900;
            color: #e74c3c;
        }
    </style>
</head>
<body>
    <h1>[NAME]</h1>
    <p><strong>Email:</strong> [EMAIL]</p>
    <p><strong>Phone:</strong> [PHONE]</p>
    <p><strong>Location:</strong> [LOCATION]</p>
    <p><strong>LinkedIn:</strong> [LINKEDIN]</p>
    <p><strong>Portfolio:</strong> [PORTFOLIO]</p>
    
    <h2>Professional Summary</h2>
    <p>[SUMMARY]</p>
    
    <h2>Skills</h2>
    <p>[SKILLS]</p>
    
    <h2>Work Experience</h2>
    <h3>[JOB_TITLE]</h3>
    <p><strong>Company:</strong> [COMPANY]</p>
    <p><strong>Duration:</strong> [DURATION]</p>
    <p><strong>Location:</strong> [JOB_LOCATION]</p>
    <p><strong>Achievements:</strong><br>[ACHIEVEMENTS]</p>
    
    <h2>Education</h2>
    <p><strong>Degree:</strong> [DEGREE]</p>
    <p><strong>Institution:</strong> [INSTITUTION]</p>
    <p><strong>Year:</strong> [YEAR]</p>
    <p><strong>Location:</strong> [EDUCATION_LOCATION]</p>
    
    <h2>Certifications</h2>
    <p>[CERTIFICATIONS]</p>
    
    <h2>Languages</h2>
    <p>[LANGUAGES]</p>
    
    <h2>Projects</h2>
    <p>[PROJECTS]</p>
    
    <hr>
    <p><em>Generated on: [DATE]</em></p>
</body>
</html>`;
};