// templates/advancedTemplate.js
export const getAdvancedTemplateHTML = () => {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Advanced CV Template</title>
</head>
<body>
    <!-- Conditional sections -->
    {{#if has_experiences}}
    <h1>[NAME]</h1>
    <p><strong>[TITLE]</strong></p>
    {{/if has_experiences}}
    
    <p>Email: [EMAIL]</p>
    <p>Phone: [PHONE]</p>
    <p>Location: [LOCATION]</p>
    
    {{#if has_skills}}
    <h2>Skills by Category</h2>
    [SKILLS_BY_CATEGORY]
    {{/if has_skills}}
    
    {{#if has_experiences}}
    <h2>Professional Experience</h2>
    [EXPERIENCE_SUMMARY]
    
    <!-- Loop through all experiences -->
    {{#experiences}}
    <h3>[JOB_TITLE]</h3>
    <p><strong>Company:</strong> [COMPANY] | <strong>Duration:</strong> [DURATION]</p>
    <p><strong>Location:</strong> [LOCATION]</p>
    
    {{#if has_achievements}}
    <h4>Achievements:</h4>
    <ul>
    {{#achievements}}
        <li>[ACHIEVEMENT]</li>
    {{/achievements}}
    </ul>
    {{/if has_achievements}}
    {{/experiences}}
    
    <!-- Or use the compact version -->
    <h3>All Experiences (Compact)</h3>
    [ALL_EXPERIENCES]
    {{/if has_experiences}}
    
    {{#if has_education}}
    <h2>Education</h2>
    [ALL_EDUCATION]
    {{/if has_education}}
    
    {{#if has_certifications}}
    <h2>Certifications</h2>
    <p>[CERTIFICATIONS]</p>
    {{/if has_certifications}}
    
    {{#if has_projects}}
    <h2>Projects</h2>
    <!-- This loop should now render all projects -->
    {{#projects}}
    <p><strong>Project [INDEX]:</strong> [PROJECT]</p>
    {{/projects}}
    {{/if has_projects}}
    
    {{#if has_languages}}
    <h2>Languages</h2>
    <p>[LANGUAGES]</p>
    {{/if has_languages}}
    
    <hr>
    <p><em>Generated: [DATE]</em></p>
</body>
</html>`;
};

// New function to display the full, structured JSON data mapped by the service
export const getDebugTemplateHTML = () => {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Debug Extracted Data CV Template</title>
</head>
<body>
    <h1>Extracted JSON Data Structure</h1>
    <p>This template shows the exact data structure mapped by the system for templating.</p>

    <!-- 1. personal_info (mapped to 'personal') -->
    <h2>1. Personal Information (personal)</h2>
    <ul>
        <li><strong>Name:</strong> [NAME]</li>
        <li><strong>Title:</strong> [TITLE]</li>
        <li><strong>Email:</strong> [EMAIL]</li>
        <li><strong>Phone:</strong> [PHONE]</li>
        <li><strong>Location:</strong> [LOCATION]</li>
        <li><strong>LinkedIn:</strong> [LINKEDIN]</li>
        <li><strong>Portfolio:</strong> [PORTFOLIO]</li>
    </ul>

    <!-- 2. professional_summary (mapped to 'summary') -->
    {{#if has_summary}}
    <h2>2. Professional Summary (summary)</h2>
    <p>[SUMMARY]</p>
    {{/if has_summary}}

    <!-- 3. skills -->
    {{#if has_skills}}
    <h2>3. Skills (skills)</h2>
    <p><strong>Skills List:</strong> [SKILLS]</p>
    
    <h3>3.1. Categorized Skills ([SKILLS_BY_CATEGORY])</h3>
    <!-- Note: We use <pre> tags here to preserve the multi-line formatting of this advanced placeholder -->
    <pre>[SKILLS_BY_CATEGORY]</pre>
    {{/if has_skills}}

    <!-- 4. experience (mapped to 'experiences') -->
    {{#if has_experiences}}
    <h2>4. Work Experience (experiences)</h2>
    <p>Summary: [EXPERIENCE_SUMMARY]</p>
    
    {{#experiences}}
    <hr>
    <h3>Job [INDEX]: [JOB_TITLE] at [COMPANY]</h3>
    <p>Duration: [DURATION] | Location: [JOB_LOCATION]</p>
    
    <!-- Nested Loop: achievements -->
    {{#achievements}}
    <ul>
        <li>• [ACHIEVEMENT]</li>
    </ul>
    {{/achievements}}
    {{/experiences}}
    {{/if has_experiences}}

    <!-- 5. education -->
    {{#if has_education}}
    <h2>5. Education (education)</h2>
    {{#education}}
    <hr>
    <h3>Education [INDEX]: [DEGREE]</h3>
    <p>Institution: [INSTITUTION] | Year: [YEAR] | Location: [EDUCATION_LOCATION]</p>
    {{/education}}
    {{/if has_education}}
    
    <!-- 6. certifications -->
    {{#if has_certifications}}
    <h2>6. Certifications (certifications)</h2>
    <p>[CERTIFICATIONS]</p>
    {{/if has_certifications}}
    
    <!-- 7. projects -->
    {{#if has_projects}}
    <h2>7. Projects (projects)</h2>
    {{#projects}}
    <hr>
    <p><strong>Project [INDEX]:</strong> [PROJECT]</p>
    {{/projects}}
    {{/if has_projects}}
    
    <!-- 8. languages -->
    {{#if has_languages}}
    <h2>8. Languages (languages)</h2>
    <p>[LANGUAGES]</p>
    {{/if has_languages}}

    <hr>
    <p><em>Generated: [DATE]</em></p>
</body>
</html>`;
};

export const getTemplateExamples = () => {
  return {
    simple: `
[NAME]
[EMAIL]
[PHONE]

Professional Summary
[SUMMARY]

Skills
[SKILLS]

Experience
[ALL_EXPERIENCES]

Education
[ALL_EDUCATION]
`,
    
    loop_example: `
{{#experiences}}
Position: [JOB_TITLE]
Company: [COMPANY]
Duration: [DURATION]

{{#achievements}}
• [ACHIEVEMENT]
{{/achievements}}

{{/experiences}}
`,
    
    conditional_example: `
{{#if has_certifications}}
Certifications:
[CERTIFICATIONS]
{{/if has_certifications}}

{{#if has_projects}}
Projects:
[PROJECTS]
{{/if has_projects}}
`,
    
    advanced_features: `
<!-- All features combined -->
[NAME]
[EMAIL]

{{#if has_skills}}
Skills (Categorized):
[SKILLS_BY_CATEGORY]
{{/if has_skills}}

{{#if has_experiences}}
Experience Summary:
[EXPERIENCE_SUMMARY]

Detailed Experience:
{{#experiences}}
[INDEX]. [JOB_TITLE] at [COMPANY]
{{#achievements}}
  - [ACHIEVEMENT]
{{/achievements}}
{{/experiences}}
{{/if has_experiences}}
`
  };
};