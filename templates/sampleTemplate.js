// templates/sampleTemplate.js - CLEANER VERSION
export const getSampleTemplateHTML = () => {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CV Template</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #2c5282; border-bottom: 2px solid #2c5282; padding-bottom: 5px; }
        h2 { color: #555; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 25px; }

        .experience-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .experience-table th, .experience-table td {
            padding: 8px 12px;
            text-align: left;
            border: 1px solid #eaeaea;
            vertical-align: top;
        }
        .experience-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .experience-table ul {
            margin: 0;
            padding-left: 18px;
            list-style-type: disc;
        }
        .education-entry {
            margin-bottom: 12px;
            padding-bottom: 5px;
            border-bottom: 1px dotted #ccc;
        }
    </style>
</head>

<body>

    <!-- NAME HEADER -->
    <h1>[NAME]</h1>

    <!-- CONTACT INFO -->
    <p><strong>Email:</strong> [EMAIL]</p>
    <p><strong>Phone:</strong> [PHONE]</p>
    <p><strong>Location:</strong> [LOCATION]</p>
    <p><strong>LinkedIn:</strong> [LINKEDIN]</p>
    <p><strong>Portfolio:</strong> [PORTFOLIO]</p>


    <!-- SUMMARY SECTION -->
    {{#if has_summary}}
    <h2>Professional Summary</h2>
    <p>[SUMMARY]</p>
    {{/if has_summary}}


    <!-- SKILLS SECTION -->
    {{#if has_skills}}
    <h2>Skills</h2>
    <p>[SKILLS]</p>
    {{/if has_skills}}


    <!-- EXPERIENCE SECTION -->
    {{#if has_experiences}}
    <h2>Work Experience</h2>

    <table class="experience-table">
        <thead>
            <tr>
                <th style="width: 20%;">Duration / Location</th>
                <th style="width: 25%;">Position / Company</th>
                <th style="width: 55%;">Achievements</th>
            </tr>
        </thead>
        <tbody>

        {{#experiences}}
            <tr>
                <td>
                    [DURATION]<br>
                    <small>[LOCATION]</small>
                </td>

                <td>
                    <strong>[JOB_TITLE]</strong><br>
                    <small>[COMPANY]</small>
                </td>

                <td>
                    {{#if achievements}}
                    <ul>
                        {{#achievements}}
                        <li>[ACHIEVEMENT]</li>
                        {{/achievements}}
                    </ul>
                    {{else}}
                    <em>No achievements listed</em>
                    {{/if achievements}}
                </td>
            </tr>
        {{/experiences}}

        </tbody>
    </table>
    {{/if has_experiences}}


    <!-- EDUCATION SECTION -->
    {{#if has_education}}
    <h2>Education</h2>

    {{#education}}
    <div class="education-entry">
        <p><strong>[DEGREE]</strong></p>
        <p>[INSTITUTION] — [YEAR]</p>
        <p><small>[EDUCATION_LOCATION]</small></p>
    </div>
    {{/education}}
    {{/if has_education}}


    <!-- CERTIFICATIONS -->
    {{#if has_certifications}}
    <h2>Certifications</h2>
    <p>[CERTIFICATIONS]</p>
    {{/if has_certifications}}


    <!-- LANGUAGES -->
    {{#if has_languages}}
    <h2>Languages</h2>
    <p>[LANGUAGES]</p>
    {{/if has_languages}}


    <!-- PROJECTS -->
    {{#if has_projects}}
    <h2>Projects</h2>
    <p>[PROJECTS]</p>
    {{/if has_projects}}


    <hr>
    <p><em>Generated on: [DATE]</em></p>

</body>
</html>
`;
};