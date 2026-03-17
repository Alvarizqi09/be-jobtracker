import { GoogleGenerativeAI } from "@google/generative-ai";
import { HttpError } from "../types";
import { UserDoc } from "../models/User";

function initializeGemini(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new HttpError(
      500,
      "Gemini API key is not configured. Please set GEMINI_API_KEY environment variable.",
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function generateCoverLetterWithGemini(
  profile: any, // The profile embedded object
  jobInfo: { companyName: string; jobTitle: string; jobDescription?: string },
  style: "formal" | "conversational" | "creative",
  language: "english" | "indonesian" = "english",
): Promise<string> {
  try {
    const genAI = initializeGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Safely fallback arrays if undefined
    const workExps = profile.workExperience || [];
    const achievements = profile.achievements || [];
    const skills = profile.skills || [];
    const educations = profile.education || [];

    const workExpSummary = workExps
      .slice(0, 3) // top 3 most recent
      .map(
        (w: any) =>
          `- ${w.role} at ${w.company} (${w.isCurrent ? "Current" : w.endDate}): ${w.description}`,
      )
      .join("\n");

    const isIndonesian = language === "indonesian";

    const prompt = `
${
  isIndonesian
    ? "Anda adalah penulis surat lamaran profesional dengan 15 tahun pengalaman membantu kandidat mendapatkan pekerjaan impian mereka.\n\nTulis surat lamaran yang menarik dan sangat personal untuk kandidat ini."
    : "You are a professional cover letter writer with 15 years of experience helping candidates land their dream jobs.\n\nWrite a compelling, highly personalized cover letter for this candidate."
}

${isIndonesian ? "===PROFIL KANDIDAT===" : "===CANDIDATE PROFILE==="}
${isIndonesian ? "Nama:" : "Name:"} ${profile.displayName || (isIndonesian ? "Pelamar" : "The Applicant")}
${isIndonesian ? "Judul:" : "Headline:"} ${profile.headline || (isIndonesian ? "Profesional" : "Professional")}
${isIndonesian ? "Ringkasan:" : "Summary:"} ${profile.summary || ""}
${isIndonesian ? "Lokasi:" : "Location:"} ${profile.location || (isIndonesian ? "Tidak ditentukan" : "Not specified")}

${isIndonesian ? "Pengalaman Kerja:" : "Work Experience:"}
${workExpSummary || (isIndonesian ? "Tidak ada pengalaman kerja yang disediakan." : "No work experience provided.")}

${isIndonesian ? "Keterampilan Utama:" : "Key Skills:"} ${skills.slice(0, 15).join(", ") || (isIndonesian ? "Tidak ada keterampilan khusus yang terdaftar." : "No specific skills listed.")}

${isIndonesian ? "Prestasi Utama:" : "Notable Achievements:"}
${achievements.map((a: string) => `- ${a}`).join("\n") || (isIndonesian ? "Tidak ada yang terdaftar." : "None listed.")}

${isIndonesian ? "Pendidikan:" : "Education:"} ${educations[0] ? `${educations[0].degree} in ${educations[0].field} from ${educations[0].institution}` : isIndonesian ? "Tidak ditentukan" : "Not specified"}

${isIndonesian ? "===PEKERJAAN TARGET===" : "===TARGET JOB==="}
${isIndonesian ? "Perusahaan:" : "Company:"} ${jobInfo.companyName}
${isIndonesian ? "Posisi:" : "Position:"} ${jobInfo.jobTitle}
${jobInfo.jobDescription ? (isIndonesian ? "Deskripsi Pekerjaan:" : "Job Description:") + `\n${jobInfo.jobDescription.slice(0, 1500)}` : ""}

${isIndonesian ? "===GAYA PENULISAN===" : "===WRITING STYLE==="}
${
  style === "formal"
    ? isIndonesian
      ? "Tulis dengan nada formal dan profesional. Gunakan bahasa yang jelas dan terstruktur. Hindari kontraksi. Pertahankan gravitasi di seluruh tulisan."
      : "Write in a formal, professional tone. Use clear, structured language. Avoid contractions. Maintain gravitas throughout."
    : style === "conversational"
      ? isIndonesian
        ? "Tulis dengan nada hangat, conversational namun tetap profesional. Gunakan bahasa alami dan kontraksi ringan. Tunjukkan kepribadian sambil tetap sesuai."
        : "Write in a warm, conversational but professional tone. Use natural language and light contractions (I'm, I've). Show personality while staying appropriate."
      : isIndonesian
        ? "Tulis dengan nada kreatif dan berkesan yang menonjol. Buka dengan sesuatu yang tidak terduga. Tunjukkan antusiasme asli dan perspektif unik. Jadilah berani namun tetap profesional."
        : "Write in a creative, memorable tone that stands out. Open with something unexpected. Show genuine enthusiasm and unique perspective. Be bold but not unprofessional."
}

${isIndonesian ? "===INSTRUKSI===" : "===INSTRUCTIONS==="}
${
  isIndonesian
    ? `
- Panjang: maksimal 200-250 kata. Singkat dan padat.
- Kalimat pembuka: Perkenalkan diri secara natural — nama, latar belakang, dan ketertarikan tulus pada peran ini. Buat terasa seperti manusia menulis, bukan template. Variasikan struktur kalimat setiap kali.
- Paragraf 1 (Perkenalan): Siapa Anda + apa yang secara spesifik menarik Anda ke perusahaan/peran ini. Maks 3 kalimat.
- Paragraf 2 (Kecocokan skill): 2-3 skill/pengalaman paling relevan dengan persyaratan. Maks 3 kalimat.
- Paragraf 3 (Pencapaian): Satu pencapaian spesifik dengan dampak terukur. Maks 2 kalimat.
- Penutup: Satu kalimat ajakan bertindak yang percaya diri. Akhiri dengan "Dengan hormat,"
- PENTING: Setiap surat harus terasa ditulis segar. JANGAN ikuti template tetap. Variasikan struktur pembuka, pilihan kata, dan alur setiap kali.
- JANGAN berulang, JANGAN over-explain.
- Output HANYA teks surat lamaran. Tidak ada pendahuluan atau komentar.`
    : `
- Length: 200-250 words maximum. Be concise and punchy.
- Opening sentence: Introduce yourself naturally — your name, your background, and your genuine interest in this specific role. Make it feel human, not templated. Vary the sentence structure each time.
- Paragraph 1 (Introduction): Who you are + what specifically draws you to this company/role. Max 3 sentences.
- Paragraph 2 (Skills match): 2-3 most relevant skills/experiences matched to job requirements. Max 3 sentences.
- Paragraph 3 (Achievement): One specific achievement with measurable impact relevant to this role. Max 2 sentences.
- Closing: One confident call-to-action sentence. End with "Sincerely,"
- CRITICAL: Every letter must feel freshly written. Do NOT follow a fixed template. Vary the opening structure, word choices, and flow each time.
- NO filler phrases, NO repetition, NO over-explaining.
- Output ONLY the cover letter text. No preamble, no notes.`
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) {
      throw new HttpError(
        500,
        "Failed to generate cover letter content from Gemini API",
      );
    }

    return responseText;
  } catch (err: any) {
    // Re-throw HttpError as-is
    if (err instanceof HttpError) {
      throw err;
    }

    // Log the actual error for debugging
    console.error("Gemini API Error:", err);

    // Provide a user-friendly error message
    if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
      throw new HttpError(
        500,
        "Authentication failed with Gemini API. Please check your API key.",
      );
    }

    if (err.message?.includes("429") || err.message?.includes("quota")) {
      throw new HttpError(429, "Rate limit exceeded. Please try again later.");
    }

    throw new HttpError(
      500,
      `Failed to generate cover letter: ${err.message || "Unknown error"}`,
    );
  }
}
