import { Response } from "express";
import { AuthenticatedRequest, HttpError } from "../types";
import { UserModel } from "../models/User";
import { CoverLetterModel } from "../models/CoverLetter";
import { generateCoverLetterWithGemini } from "../services/geminiService";

export const generate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) throw new HttpError(401, "Unauthorized");
    const {
      jobId,
      companyName,
      jobTitle,
      jobDescription,
      style,
      language = "english",
    } = req.body;

    console.log("Generating cover letter for user:", req.user.uid);
    console.log("Request body:", { companyName, jobTitle, style, language });

    const user = await UserModel.findOne({ firebaseUid: req.user.uid });
    if (!user || !user.profile) {
      throw new HttpError(400, "Please complete your profile first");
    }

    console.log("User found, generating with Gemini...");
    const profileData = (user.profile as any).toObject
      ? (user.profile as any).toObject()
      : user.profile;
    const content = await generateCoverLetterWithGemini(
      { ...profileData, displayName: user.displayName },
      { companyName, jobTitle, jobDescription },
      style,
      language,
    );

    console.log("Cover letter generated successfully");
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    const letter = await CoverLetterModel.create({
      userId: req.user.uid,
      jobId: jobId || undefined,
      companyName,
      jobTitle,
      jobDescription,
      content,
      style,
      language,
      isEdited: false,
      wordCount,
    });

    res.json({ content, wordCount, letterId: letter._id, letter });
  } catch (err: any) {
    console.error("Cover letter generation error:", err);
    throw err;
  }
};

export const getAll = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new HttpError(401, "Unauthorized");
  const letters = await CoverLetterModel.find({ userId: req.user.uid }).sort({
    createdAt: -1,
  });
  res.json(letters);
};

export const getById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new HttpError(401, "Unauthorized");
  const letter = await CoverLetterModel.findOne({
    _id: req.params.id,
    userId: req.user.uid,
  });
  if (!letter) throw new HttpError(404, "Cover letter not found");
  res.json(letter);
};

export const update = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new HttpError(401, "Unauthorized");
  const { content } = req.body;

  const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;

  const letter = await CoverLetterModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.uid },
    { $set: { content, wordCount, isEdited: true } },
    { new: true },
  );

  if (!letter) throw new HttpError(404, "Cover letter not found");
  res.json(letter);
};

export const remove = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new HttpError(401, "Unauthorized");
  const letter = await CoverLetterModel.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.uid,
  });
  if (!letter) throw new HttpError(404, "Cover letter not found");
  res.json({ success: true });
};

export const getByJobId = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new HttpError(401, "Unauthorized");
  const letters = await CoverLetterModel.find({
    jobId: req.params.jobId,
    userId: req.user.uid,
  }).sort({ createdAt: -1 });
  res.json(letters);
};
