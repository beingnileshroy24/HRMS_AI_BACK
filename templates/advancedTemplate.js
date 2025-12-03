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
    <h3>All Experiences</h3>
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