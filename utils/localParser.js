// Smart CV parser with automatic section detection
export const extractCVDataLocal = async (cvText) => {
  console.log('🔄 Using smart CV section detector...');
  
  try {
    // Pre-process text: clean and normalize
    const cleanedText = cleanCVText(cvText);
    
    // Detect sections automatically
    const sections = detectSections(cleanedText);
    
    const extractedData = {
      personal_info: extractPersonalInfo(cleanedText, sections),
      professional_summary: extractSummary(cleanedText, sections),
      skills: extractSkills(cleanedText, sections),
      experience: extractExperience(cleanedText, sections),
      education: extractEducation(cleanedText, sections),
      certifications: extractCertifications(cleanedText, sections),
      projects: extractProjects(cleanedText, sections),
      languages: extractLanguages(cleanedText, sections)
    };
    
    console.log('✅ CV data extracted with section detection');
    return extractedData;
    
  } catch (error) {
    console.error('❌ Extraction error:', error);
    return getFallbackData();
  }
};

// Clean and normalize CV text
function cleanCVText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

// Detect sections in CV
function detectSections(text) {
  const lines = text.split('\n');
  const sections = {
    personal: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    languages: []
  };
  
  let currentSection = 'personal';
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Detect section headers
    if (lowerLine.match(/^(professional summary|summary|objective|about me)/)) {
      currentSection = 'summary';
    } else if (lowerLine.match(/^(experience|work experience|employment|work history)/)) {
      currentSection = 'experience';
    } else if (lowerLine.match(/^(education|academic|qualifications)/)) {
      currentSection = 'education';
    } else if (lowerLine.match(/^(skills|technical skills|competencies)/)) {
      currentSection = 'skills';
    } else if (lowerLine.match(/^(certifications|certificates|licenses)/)) {
      currentSection = 'certifications';
    } else if (lowerLine.match(/^(projects|portfolio)/)) {
      currentSection = 'projects';
    } else if (lowerLine.match(/^(languages|language skills)/)) {
      currentSection = 'languages';
    } else if (line.match(/^[A-Z][A-Za-z\s]+$/)) {
      // Likely a section header in all caps
      currentSection = 'personal';
    }
    
    sections[currentSection].push(line);
  }
  
  return sections;
}

// Extract personal information with better detection
function extractPersonalInfo(text, sections) {
  const personalLines = sections.personal.join('\n');
  
  return {
    full_name: extractName(personalLines),
    email: extractEmail(text),
    phone: extractPhone(text),
    location: extractLocation(text),
    linkedin: extractLinkedIn(text),
    portfolio: extractPortfolio(text)
  };
}

function extractName(text) {
  // Look for name patterns (usually first line or prominent)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Check first few lines for name pattern
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i].trim();
    
    // Name pattern: 2-4 words, title case, reasonable length
    if (line.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/) && line.length < 50) {
      return line;
    }
    
    // Name with title (Dr., Mr., Ms., etc.)
    if (line.match(/^(?:Dr\.|Mr\.|Ms\.|Mrs\.)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/)) {
      return line.replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.)\s*/i, '');
    }
  }
  
  // Look for "Name:" pattern
  const nameMatch = text.match(/(?:name|full name)[:\s]*([^\n\r]+)/i);
  if (nameMatch) return nameMatch[1].trim();
  
  return "Professional Candidate";
}

function extractEmail(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex);
  return emails ? emails[0] : "";
}

function extractPhone(text) {
  const phoneRegexes = [
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    /(\+?\d{1,3}[-.\s]?)?\(?\d{2}\)?[-.\s]?\d{4}[-.\s]?\d{4}/g, // International formats
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g // US format
  ];
  
  for (const regex of phoneRegexes) {
    const phones = text.match(regex);
    if (phones) return phones[0];
  }
  
  return "";
}

function extractLocation(text) {
  const locationPatterns = [
    // Look for location patterns
    /(?:location|address|city|based in)[:\s]*([^\n\r,]+)/gi,
    /(?:from|located in|based in)\s+([^\n\r,.]+)/gi
  ];
  
  for (const pattern of locationPatterns) {
    const match = pattern.exec(text);
    if (match) return match[1].trim();
  }
  
  // Common locations
  const commonLocations = [
    'New York', 'London', 'San Francisco', 'Bangalore', 'Berlin', 'Toronto',
    'Sydney', 'Singapore', 'Remote', 'United States', 'UK', 'India', 'Canada',
    'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'China'
  ];
  
  for (const location of commonLocations) {
    if (text.toLowerCase().includes(location.toLowerCase())) {
      return location;
    }
  }
  
  return "Location not specified";
}

function extractLinkedIn(text) {
  const linkedinRegex = /(https?:\/\/)?(www\.)?linkedin\.com\/(in|company|pub)\/[a-zA-Z0-9-]+/g;
  const matches = text.match(linkedinRegex);
  return matches ? matches[0] : "";
}

function extractPortfolio(text) {
  const portfolioRegex = /(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?/g;
  const urls = text.match(portfolioRegex) || [];
  // Filter out LinkedIn and common social media
  return urls.find(url => 
    !url.includes('linkedin') && 
    !url.includes('facebook') && 
    !url.includes('twitter') &&
    !url.includes('instagram')
  ) || "";
}

function extractSummary(text, sections) {
  const summaryLines = sections.summary;
  
  if (summaryLines.length > 0) {
    return summaryLines.join(' ').substring(0, 500); // Limit length
  }
  
  // Fallback: use first meaningful paragraph
  const lines = text.split('\n').filter(line => 
    line.trim().length > 20 && 
    !line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) && // Not email
    !line.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/) // Not phone
  );
  
  return lines.length > 0 ? lines[0].substring(0, 300) : 
    "Experienced professional with strong technical skills and proven track record in delivering successful projects.";
}

function extractSkills(text, sections) {
  const skillsLines = sections.skills;
  let skills = [];
  
  // Extract from skills section
  if (skillsLines.length > 0) {
    skills = extractSkillsFromLines(skillsLines);
  }
  
  // Also scan entire text for technical skills
  if (skills.length < 5) {
    const allSkills = extractSkillsFromText(text);
    skills = [...new Set([...skills, ...allSkills])].slice(0, 15);
  }
  
  return skills.length > 0 ? skills : getDefaultSkills();
}

function extractSkillsFromLines(lines) {
  const skills = [];
  const skillIndicators = ['•', '-', '*', '·', '▪'];
  
  for (const line of lines) {
    // Skip section headers
    if (line.toLowerCase().includes('skill')) continue;
    
    // Split by common separators
    const lineSkills = line.split(/[,;|]|\.\s+/)
      .map(skill => skill.trim())
      .filter(skill => 
        skill.length > 2 && 
        skill.length < 50 &&
        !skillIndicators.includes(skill) &&
        !skill.match(/^\d+$/)
      );
    
    skills.push(...lineSkills);
  }
  
  return skills;
}

function extractSkillsFromText(text) {
  const technicalSkills = [
    // Programming Languages
    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
    'TypeScript', 'PHP', 'Perl', 'Scala', 'R', 'MATLAB',
    
    // Web Technologies
    'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
    'HTML', 'CSS', 'SASS', 'LESS', 'Bootstrap', 'jQuery',
    
    // Databases
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQLite', 'Cassandra',
    
    // Cloud & DevOps
    'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'CI/CD',
    'Terraform', 'Ansible', 'Linux', 'Unix',
    
    // Mobile
    'React Native', 'Flutter', 'Android', 'iOS', 'Xamarin',
    
    // Data Science
    'Machine Learning', 'Data Analysis', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
    'Tableau', 'Power BI', 'Apache Spark', 'Hadoop'
  ];
  
  const businessSkills = [
    'Project Management', 'Agile', 'Scrum', 'Kanban', 'Team Leadership',
    'Problem Solving', 'Communication', 'Analytical Thinking', 'Strategic Planning',
    'Product Management', 'Business Analysis', 'Stakeholder Management'
  ];
  
  const foundSkills = [
    ...technicalSkills.filter(skill => 
      new RegExp(`\\b${skill}\\b`, 'i').test(text)
    ),
    ...businessSkills.filter(skill => 
      new RegExp(`\\b${skill}\\b`, 'i').test(text)
    )
  ];
  
  return foundSkills;
}

function extractExperience(text, sections) {
  const experienceLines = sections.experience;
  const experiences = [];
  
  if (experienceLines.length > 0) {
    experiences.push(...parseExperienceSection(experienceLines));
  }
  
  // Fallback: look for job patterns in entire text
  if (experiences.length === 0) {
    experiences.push(...findJobsInText(text));
  }
  
  return experiences.length > 0 ? experiences : getDefaultExperience();
}

function parseExperienceSection(lines) {
  const experiences = [];
  let currentJob = null;
  
  for (const line of lines) {
    // Skip section headers
    if (line.toLowerCase().includes('experience')) continue;
    
    // Detect job entry (contains dates, company, or job title patterns)
    const jobMatch = line.match(/(.+?)\s+(?:at|@|-|–)\s+(.+?)(?:\s+\((.+?)\))?$/);
    const dateMatch = line.match(/(\w+\s+\d{4})\s*(?:-|–|to)\s*(\w+\s+\d{4}|Present|Current)/i);
    
    if (jobMatch && !line.match(/^\s*[-•*]/)) {
      // Save previous job
      if (currentJob) {
        experiences.push(currentJob);
      }
      
      currentJob = {
        job_title: jobMatch[1].trim(),
        company: jobMatch[2].trim(),
        duration: jobMatch[3] || "Duration not specified",
        location: "",
        achievements: []
      };
    } else if (currentJob && line.match(/^\s*[-•*]/)) {
      // Achievement bullet point
      const achievement = line.replace(/^\s*[-•*]\s*/, '').trim();
      if (achievement) {
        currentJob.achievements.push(achievement);
      }
    } else if (line.trim() && currentJob && !currentJob.location) {
      // Possibly location line
      currentJob.location = line.trim();
    }
  }
  
  // Add the last job
  if (currentJob) {
    experiences.push(currentJob);
  }
  
  return experiences.slice(0, 5); // Limit to 5 experiences
}

function findJobsInText(text) {
  const experiences = [];
  const lines = text.split('\n');
  
  const jobTitles = [
    'Developer', 'Engineer', 'Manager', 'Analyst', 'Designer', 'Architect',
    'Consultant', 'Specialist', 'Coordinator', 'Director', 'Lead', 'Head'
  ];
  
  let jobCount = 0;
  
  for (const line of lines) {
    if (jobCount >= 3) break;
    
    for (const title of jobTitles) {
      if (line.includes(title) && line.length > 10 && line.length < 100) {
        experiences.push({
          job_title: line.split(' at ')[0]?.trim() || line.split(' - ')[0]?.trim() || title,
          company: line.split(' at ')[1]?.trim() || line.split(' - ')[1]?.trim() || "Company",
          duration: "Duration not specified",
          location: "",
          achievements: [
            "Responsible for key deliverables and project success",
            "Collaborated with team members to achieve objectives",
            "Contributed to organizational goals and targets"
          ]
        });
        jobCount++;
        break;
      }
    }
  }
  
  return experiences;
}

function extractEducation(text, sections) {
  const educationLines = sections.education;
  const education = [];
  
  if (educationLines.length > 0) {
    education.push(...parseEducationSection(educationLines));
  }
  
  // Fallback: look for education patterns
  if (education.length === 0) {
    education.push(...findEducationInText(text));
  }
  
  return education.length > 0 ? education : getDefaultEducation();
}

function parseEducationSection(lines) {
  const education = [];
  
  for (const line of lines) {
    // Skip section headers
    if (line.toLowerCase().includes('education')) continue;
    
    // Common education patterns
    const degreeMatch = line.match(/(.+?)(?:\s+-\s+|\s+at\s+|\s+,\s+)(.+?)(?:\s+-\s+|\s+\((.+?)\))?$/);
    
    if (degreeMatch) {
      education.push({
        degree: degreeMatch[1].trim(),
        institution: degreeMatch[2].trim(),
        year: degreeMatch[3] || "Year not specified",
        location: ""
      });
    } else if (line.match(/(University|College|Institute|School)/i) && line.length > 5) {
      education.push({
        degree: "Degree not specified",
        institution: line.trim(),
        year: "Year not specified",
        location: ""
      });
    }
  }
  
  return education.slice(0, 3); // Limit to 3 education entries
}

function findEducationInText(text) {
  const education = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if ((line.includes('University') || line.includes('College') || 
         line.includes('Bachelor') || line.includes('Master') || 
         line.includes('PhD') || line.includes('B.')) && line.length > 10) {
      education.push({
        degree: line.split(',')[0]?.trim() || "Degree",
        institution: line,
        year: extractYearFromText(line) || "Year not specified",
        location: ""
      });
      if (education.length >= 2) break;
    }
  }
  
  return education;
}

function extractYearFromText(text) {
  const yearMatch = text.match(/(19|20)\d{2}/);
  return yearMatch ? yearMatch[0] : "";
}

function extractCertifications(text, sections) {
  const certLines = sections.certifications;
  const certifications = [];
  
  if (certLines.length > 0) {
    certifications.push(...parseListSection(certLines));
  }
  
  // Also scan entire text
  const certKeywords = ['AWS', 'Google', 'Microsoft', 'Certified', 'Scrum', 'Agile', 'PMP'];
  text.split('\n').forEach(line => {
    if (certKeywords.some(keyword => line.includes(keyword)) && line.length > 5) {
      certifications.push(line.trim());
    }
  });
  
  return [...new Set(certifications)].slice(0, 5);
}

function extractProjects(text, sections) {
  const projectLines = sections.projects;
  const projects = [];
  
  if (projectLines.length > 0) {
    projects.push(...parseListSection(projectLines));
  }
  
  // Look for project mentions
  text.split('\n').forEach(line => {
    if ((line.includes('Project') || line.includes('GitHub') || line.includes('Portfolio')) && 
        line.length > 10 && !line.toLowerCase().includes('section')) {
      projects.push(line.trim());
    }
  });
  
  return projects.slice(0, 3);
}

function extractLanguages(text, sections) {
  const languageLines = sections.languages;
  const languages = [];
  
  if (languageLines.length > 0) {
    languages.push(...parseListSection(languageLines));
  }
  
  // Common languages detection
  const commonLanguages = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Chinese', 'Japanese'];
  const foundLanguages = commonLanguages.filter(lang => 
    text.toLowerCase().includes(lang.toLowerCase())
  );
  
  return [...new Set([...languages, ...foundLanguages])].slice(0, 5);
}

function parseListSection(lines) {
  const items = [];
  const indicators = ['•', '-', '*', '·', '▪'];
  
  for (const line of lines) {
    // Skip section headers
    if (line.toLowerCase().match(/^(skills|certifications|projects|languages)/)) continue;
    
    // Extract list items
    for (const indicator of indicators) {
      if (line.startsWith(indicator) || line.includes(` ${indicator} `)) {
        const item = line.replace(new RegExp(`^\\s*\\${indicator}\\s*`), '').trim();
        if (item && item.length > 2) {
          items.push(item);
        }
      }
    }
    
    // Also consider lines that look like list items
    if (line.length > 2 && line.length < 100 && !line.match(/[.:]$/) && !items.includes(line)) {
      items.push(line.trim());
    }
  }
  
  return items;
}

// Default data fallbacks
function getDefaultSkills() {
  return [
    'JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Git',
    'HTML', 'CSS', 'AWS', 'Project Management', 'Problem Solving'
  ];
}

function getDefaultExperience() {
  return [
    {
      job_title: "Professional Role",
      company: "Company Name",
      duration: "Duration not specified",
      location: "City, Country",
      achievements: [
        "Responsible for key deliverables and project objectives",
        "Collaborated with cross-functional teams",
        "Achieved measurable results and improvements"
      ]
    }
  ];
}

function getDefaultEducation() {
  return [
    {
      degree: "Bachelor's Degree in Relevant Field",
      institution: "University Name",
      year: "Year",
      location: "City, Country"
    }
  ];
}

function getFallbackData() {
  return {
    personal_info: {
      full_name: "Professional Candidate",
      email: "email@example.com",
      phone: "+1 (555) 123-4567",
      location: "City, Country",
      linkedin: "",
      portfolio: ""
    },
    professional_summary: "Experienced professional with demonstrated skills and achievements. Strong analytical and problem-solving capabilities with excellent communication skills.",
    skills: getDefaultSkills(),
    experience: getDefaultExperience(),
    education: getDefaultEducation(),
    certifications: [],
    projects: [],
    languages: ["English"]
  };
}

export const generateFormattedCVLocal = async (extractedData) => {
  console.log('🔄 Generating formatted CV...');
  
  const { personal_info, skills, experience, education, certifications, professional_summary, languages } = extractedData;
  
  const formattedCV = `
# ${personal_info.full_name}
📍 ${personal_info.location} | ✉ ${personal_info.email} | 📞 ${personal_info.phone} ${personal_info.linkedin ? `| 🔗 ${personal_info.linkedin}` : ''}

## PROFESSIONAL SUMMARY
${professional_summary}

## SKILLS
${skills.map(skill => `- ${skill}`).join('\n')}

## EXPERIENCE
${experience.map(exp => 
`### ${exp.job_title} — ${exp.company} (${exp.duration})
${exp.achievements?.map(ach => `- ${ach}`).join('\n')}`
).join('\n\n')}

## EDUCATION
${education.map(edu => 
`${edu.degree} — ${edu.institution} — ${edu.year}`
).join('\n')}

${certifications.length > 0 ? `## CERTIFICATIONS
${certifications.map(cert => `- ${cert}`).join('\n')}` : ''}

${languages.length > 0 ? `## LANGUAGES
${languages.map(lang => `- ${lang}`).join('\n')}` : ''}
  `.trim();

  console.log('✅ CV formatted successfully');
  return formattedCV;
};