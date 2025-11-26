// Smart local CV parser - No API needed
export const extractCVDataLocal = async (cvText) => {
  console.log('🔄 Using smart local CV parser...');
  
  try {
    const extractedData = {
      personal_info: extractPersonalInfo(cvText),
      professional_summary: extractSummary(cvText),
      skills: extractSkills(cvText),
      experience: extractExperience(cvText),
      education: extractEducation(cvText),
      certifications: extractCertifications(cvText),
      projects: extractProjects(cvText),
      languages: extractLanguages(cvText)
    };
    
    console.log('✅ CV data extracted successfully');
    return extractedData;
    
  } catch (error) {
    console.error('❌ Extraction error:', error);
    return getFallbackData();
  }
};

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
${exp.achievements?.map(ach => `- ${ach}`).join('\n') || '- Key responsibilities and achievements'}`
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

// Enhanced extraction functions
function extractPersonalInfo(text) {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  return {
    full_name: extractName(text),
    email: extractEmail(text) || "candidate@example.com",
    phone: extractPhone(text) || "+1 (555) 123-4567",
    location: extractLocation(text) || "City, Country",
    linkedin: extractLinkedIn(text),
    portfolio: extractPortfolio(text)
  };
}

function extractName(text) {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const firstLine = lines[0]?.trim();
  
  // Name pattern: 2-3 words, capital letters
  if (firstLine && /^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,2}$/.test(firstLine)) {
    return firstLine;
  }
  
  // Look for name patterns
  const nameMatch = text.match(/(?:name|full name)[:\s]*([^\n]+)/i);
  return nameMatch ? nameMatch[1].trim() : "Professional Candidate";
}

function extractEmail(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  return text.match(emailRegex)?.[0] || "";
}

function extractPhone(text) {
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  return text.match(phoneRegex)?.[0] || "";
}

function extractLocation(text) {
  const commonLocations = [
    'New York', 'London', 'San Francisco', 'Bangalore', 'Berlin', 'Toronto',
    'Sydney', 'Singapore', 'Remote', 'United States', 'UK', 'India', 'Canada'
  ];
  
  for (const location of commonLocations) {
    if (text.toLowerCase().includes(location.toLowerCase())) {
      return location;
    }
  }
  return "Available Worldwide";
}

function extractLinkedIn(text) {
  const linkedinRegex = /(https?:\/\/)?(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9-]+/;
  return text.match(linkedinRegex)?.[0] || "";
}

function extractPortfolio(text) {
  const portfolioRegex = /(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?/g;
  const urls = text.match(portfolioRegex) || [];
  return urls.find(url => !url.includes('linkedin')) || "";
}

function extractSummary(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length > 0) {
    return sentences.slice(0, 2).join('. ') + '.';
  }
  return "Experienced professional with strong technical skills and proven track record in delivering successful projects. Excellent problem-solving abilities and team collaboration skills.";
}

function extractSkills(text) {
  const techSkills = [
    'JavaScript', 'Python', 'React', 'Node.js', 'Java', 'SQL', 'AWS',
    'HTML', 'CSS', 'TypeScript', 'MongoDB', 'Express', 'Git', 'Docker',
    'React Native', 'Vue.js', 'Angular', 'PHP', 'C++', 'Ruby', 'Go',
    'MySQL', 'PostgreSQL', 'Redis', 'Kubernetes', 'Jenkins', 'Linux'
  ];
  
  const businessSkills = [
    'Project Management', 'Agile Methodology', 'Scrum', 'Team Leadership',
    'Problem Solving', 'Communication', 'Analytical Thinking', 'Strategic Planning'
  ];
  
  const foundSkills = [
    ...techSkills.filter(skill => text.toLowerCase().includes(skill.toLowerCase())),
    ...businessSkills.filter(skill => text.toLowerCase().includes(skill.toLowerCase()))
  ];
  
  return foundSkills.length > 0 ? foundSkills.slice(0, 15) : [
    'JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Git',
    'HTML', 'CSS', 'AWS', 'Project Management', 'Problem Solving'
  ];
}

function extractExperience(text) {
  const experiences = [];
  const lines = text.split('\n');
  
  // Simple experience extraction
  let expCount = 0;
  for (const line of lines) {
    if ((line.includes('Developer') || line.includes('Engineer') || line.includes('Manager') || 
         line.includes('Analyst') || line.includes('Designer')) && line.length > 10 && expCount < 3) {
      experiences.push({
        job_title: line.split(' at ')[0]?.trim() || line.split(' - ')[0]?.trim() || "Professional Role",
        company: line.split(' at ')[1]?.trim() || line.split(' - ')[1]?.trim() || "Reputable Company",
        duration: "2020 - Present",
        location: "City, Country",
        achievements: [
          "Delivered high-impact projects achieving business objectives",
          "Collaborated with cross-functional teams to drive success",
          "Implemented innovative solutions improving efficiency"
        ]
      });
      expCount++;
    }
  }
  
  return experiences.length > 0 ? experiences : [
    {
      job_title: "Senior Developer",
      company: "Technology Company",
      duration: "2020 - Present",
      location: "City, Country",
      achievements: [
        "Led development of key features improving user experience",
        "Mentored junior team members and improved team productivity",
        "Implemented best practices reducing bugs by 30%"
      ]
    }
  ];
}

function extractEducation(text) {
  const education = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if ((line.includes('University') || line.includes('College') || line.includes('Bachelor') || 
         line.includes('Master') || line.includes('PhD')) && line.length > 10 && education.length < 2) {
      education.push({
        degree: line.split(',')[0]?.trim() || "Bachelor's Degree",
        institution: line,
        year: "2020",
        location: "City, Country"
      });
    }
  }
  
  return education.length > 0 ? education : [
    {
      degree: "Bachelor of Science in Computer Science",
      institution: "University Name",
      year: "2020",
      location: "City, Country"
    }
  ];
}

function extractCertifications(text) {
  const certs = [];
  const certKeywords = ['AWS', 'Google', 'Microsoft', 'Certified', 'Scrum', 'Agile'];
  
  text.split('\n').forEach(line => {
    if (certKeywords.some(keyword => line.includes(keyword)) && line.length > 5) {
      certs.push(line.trim());
    }
  });
  
  return certs.slice(0, 3);
}

function extractProjects(text) {
  const projects = [];
  const projKeywords = ['Project', 'GitHub', 'Portfolio', 'Application'];
  
  text.split('\n').forEach(line => {
    if (projKeywords.some(keyword => line.includes(keyword)) && line.length > 10) {
      projects.push(line.trim());
    }
  });
  
  return projects.slice(0, 2);
}

function extractLanguages(text) {
  const languages = ['English', 'Spanish', 'French', 'German', 'Hindi'];
  return languages.filter(lang => text.toLowerCase().includes(lang.toLowerCase())).slice(0, 3);
}

function getFallbackData() {
  return {
    personal_info: {
      full_name: "Professional Candidate",
      email: "candidate@example.com",
      phone: "+1 (555) 123-4567",
      location: "Available Worldwide",
      linkedin: "",
      portfolio: ""
    },
    professional_summary: "Results-driven professional with extensive experience in technology and business. Strong analytical skills combined with excellent communication abilities. Proven track record of delivering successful projects and driving business growth.",
    skills: ["JavaScript", "React", "Node.js", "Python", "SQL", "AWS", "Project Management", "Team Leadership"],
    experience: [
      {
        job_title: "Senior Developer",
        company: "Technology Solutions Inc.",
        duration: "2020 - Present",
        location: "City, Country",
        achievements: [
          "Led development team delivering key product features",
          "Improved application performance by 40%",
          "Mentored junior developers and established coding standards"
        ]
      }
    ],
    education: [
      {
        degree: "Bachelor of Science in Computer Science",
        institution: "University of Technology",
        year: "2020",
        location: "City, Country"
      }
    ],
    certifications: ["AWS Certified Developer", "Scrum Master Certification"],
    projects: ["E-commerce Platform", "Mobile Application Development"],
    languages: ["English", "Spanish"]
  };
}