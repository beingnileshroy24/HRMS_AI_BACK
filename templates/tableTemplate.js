// Create a new file: templates/tableTemplate.js
export const getTableTemplateHTML = () => {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CV with Tabular Work Experience</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; }
        h1 { color: #2c3e50; }
        h2 { color: #34495e; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .contact-info { color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background-color: #2c3e50; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border: 1px solid #ddd; vertical-align: top; }
        tr:nth-child(even) { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>[NAME]</h1>
        <p><strong>[TITLE]</strong></p>
        <div class="contact-info">
            <p>Email: [EMAIL] | Phone: [PHONE] | Location: [LOCATION]</p>
            ${'[LINKEDIN]' ? '<p>LinkedIn: [LINKEDIN]</p>' : ''}
            ${'[PORTFOLIO]' ? '<p>Portfolio: [PORTFOLIO]</p>' : ''}
        </div>
    </div>
    
    {{#if has_summary}}
    <div>
        <h2>PROFESSIONAL SUMMARY</h2>
        <p>[SUMMARY]</p>
    </div>
    {{/if has_summary}}
    
    {{#if has_skills}}
    <div>
        <h2>SKILLS</h2>
        <p>[SKILLS]</p>
    </div>
    {{/if has_skills}}
    
    {{#if has_experiences}}
    <div>
        <h2>WORK EXPERIENCE</h2>
        <!-- TABLE WILL BE INSERTED HERE -->
        [WORK_EXPERIENCE_TABLE]
    </div>
    {{/if has_experiences}}
    
    {{#if has_education}}
    <div>
        <h2>EDUCATION</h2>
        <!-- Regular education listing (NOT table) -->
        {{#education}}
        <div style="margin-bottom: 15px;">
            <p><strong>[DEGREE]</strong></p>
            <p>[INSTITUTION] | [YEAR] | [LOCATION]</p>
        </div>
        {{/education}}
    </div>
    {{/if has_education}}
    
    {{#if has_certifications}}
    <div>
        <h2>CERTIFICATIONS</h2>
        <p>[CERTIFICATIONS]</p>
    </div>
    {{/if has_certifications}}
    
    {{#if has_projects}}
    <div>
        <h2>PROJECTS</h2>
        <p>[PROJECTS]</p>
    </div>
    {{/if has_projects}}
    
    {{#if has_languages}}
    <div>
        <h2>LANGUAGES</h2>
        <p>[LANGUAGES]</p>
    </div>
    {{/if has_languages}}
    
    <hr>
    <p><em>Generated: [DATE]</em></p>
</body>
</html>`;
};