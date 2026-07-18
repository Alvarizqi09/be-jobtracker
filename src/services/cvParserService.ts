import { GoogleGenerativeAI } from "@google/generative-ai";
import { HttpError } from "../types";

/** Maximum allowed file size: 4 MB */
export const MAX_CV_SIZE_BYTES = 4 * 1024 * 1024;

interface ParsedWorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: string; // YYYY-MM
  endDate?: string; // YYYY-MM
  isCurrent: boolean;
  description: string;
  technologies?: string[];
}

interface ParsedEducation {
  id: string;
  institution: string;
  degree: string;
  field: string;
  graduationYear: number;
  gpa?: string;
}

export interface ParsedCvProfile {
  headline: string;
  summary: string;
  phone?: string;
  location: string;
  linkedin?: string;
  portfolio?: string;
  github?: string;
  workExperience: ParsedWorkExperience[];
  education: ParsedEducation[];
  skills: string[];
  achievements: string[];
  languages: string[];
}

function initializeGemini(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new HttpError(
      500,
      "Gemini API key is not configured. Please set GEMINI_API_KEY environment variable."
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Parse a CV PDF file using Gemini multimodal input and extract structured profile data.
 */
export async function parseCvWithGemini(
  pdfBuffer: Buffer
): Promise<ParsedCvProfile> {
  try {
    const genAI = initializeGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const pdfBase64 = pdfBuffer.toString("base64");

    const prompt = `You are an expert CV/Resume parser. Analyze the attached PDF document and extract ALL information into the following JSON structure.

IMPORTANT RULES:
- Extract EVERY piece of information you can find from the CV.
- LANGUAGE: Detect the language of the CV. All extracted text (headline, summary, descriptions, achievements) MUST be in the SAME language as the CV. If the CV is in Indonesian, output in Indonesian. If in English, output in English. Do NOT translate.
- For "headline", create a concise professional headline from their job title/role (e.g. "Full Stack Developer with 3 years experience").
- For "summary", extract or synthesize a professional summary from the CV. If no summary section exists, create one from the overall CV content (2-3 sentences).
- For "startDate" and "endDate", use YYYY-MM format (e.g. "2023-01"). If only the year is available, use "YYYY-01".
- For "isCurrent", set to true if the position is their current/present role.
- For "technologies", extract any tech stack, tools, or frameworks mentioned in each work experience.
- For "skills", extract ALL technical skills, soft skills, tools, and technologies mentioned anywhere in the CV.
- For "achievements", extract notable accomplishments, certifications, awards, or quantified results.
- For "languages", extract spoken/written languages (e.g. "English", "Indonesian", "Mandarin").
- Generate a unique id for each workExperience and education entry using format "cv_<index>" (e.g. "cv_0", "cv_1").
- For "graduationYear", use the year as a number. If still studying, use the expected graduation year.
- If a field is not found in the CV, use empty string for strings, empty array for arrays, and 0 for numbers.

Return ONLY valid JSON, no markdown, no commentary. Use this exact schema:
{
  "headline": "string",
  "summary": "string", 
  "phone": "string",
  "location": "string",
  "linkedin": "string",
  "portfolio": "string",
  "github": "string",
  "workExperience": [
    {
      "id": "string",
      "company": "string",
      "role": "string",
      "startDate": "string (YYYY-MM)",
      "endDate": "string (YYYY-MM) or empty if current",
      "isCurrent": "boolean",
      "description": "string",
      "technologies": ["string"]
    }
  ],
  "education": [
    {
      "id": "string",
      "institution": "string",
      "degree": "string",
      "field": "string",
      "graduationYear": "number",
      "gpa": "string or empty"
    }
  ],
  "skills": ["string"],
  "achievements": ["string"],
  "languages": ["string"]
}`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      },
      { text: prompt },
    ]);

    const responseText = result.response.text();

    if (!responseText) {
      throw new HttpError(500, "Gemini returned empty response when parsing CV");
    }

    // Clean up any markdown code blocks if present
    const cleaned = responseText.replace(/```json|```/g, "").trim();

    let parsed: ParsedCvProfile;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini response as JSON:", cleaned);
      throw new HttpError(
        500,
        "Failed to parse CV data. The AI response was not valid JSON."
      );
    }

    // Ensure arrays are always arrays (defensive)
    parsed.workExperience = Array.isArray(parsed.workExperience)
      ? parsed.workExperience
      : [];
    parsed.education = Array.isArray(parsed.education) ? parsed.education : [];
    parsed.skills = Array.isArray(parsed.skills) ? parsed.skills : [];
    parsed.achievements = Array.isArray(parsed.achievements)
      ? parsed.achievements
      : [];
    parsed.languages = Array.isArray(parsed.languages) ? parsed.languages : [];

    // Ensure each work experience has a valid id
    parsed.workExperience = parsed.workExperience.map((w, i) => ({
      ...w,
      id: w.id || `cv_${i}`,
      isCurrent: Boolean(w.isCurrent),
      technologies: Array.isArray(w.technologies) ? w.technologies : [],
    }));

    // Ensure each education has a valid id
    parsed.education = parsed.education.map((e, i) => ({
      ...e,
      id: e.id || `cv_edu_${i}`,
      graduationYear: Number(e.graduationYear) || 0,
    }));

    return parsed;
  } catch (err: any) {
    if (err instanceof HttpError) throw err;

    console.error("CV Parser Error:", err);

    if (err.message?.includes("429") || err.message?.includes("quota")) {
      throw new HttpError(429, "Rate limit exceeded. Please try again later.");
    }

    throw new HttpError(
      500,
      `Failed to parse CV: ${err.message || "Unknown error"}`
    );
  }
}
