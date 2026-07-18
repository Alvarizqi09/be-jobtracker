import { Response } from 'express'
import { AuthenticatedRequest, HttpError } from '../types'
import { UserModel } from '../models/User'
import { parseCvWithGemini, MAX_CV_SIZE_BYTES } from '../services/cvParserService'

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new HttpError(401, 'Unauthorized')
  const user = await UserModel.findOne({ firebaseUid: req.user.uid })
  if (!user) throw new HttpError(404, 'User not found')
  res.json({ profile: user.profile || {} })
}

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new HttpError(401, 'Unauthorized')
  const updates = req.body
  const user = await UserModel.findOneAndUpdate(
    { firebaseUid: req.user.uid },
    { $set: { profile: updates } },
    { new: true }
  )
  if (!user) throw new HttpError(404, 'User not found')
  res.json({ profile: user.profile })
}

export const updateWorkExperience = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new HttpError(401, 'Unauthorized')
  const workExperience = req.body
  const user = await UserModel.findOneAndUpdate(
    { firebaseUid: req.user.uid },
    { $set: { 'profile.workExperience': workExperience } },
    { new: true }
  )
  if (!user) throw new HttpError(404, 'User not found')
  res.json({ profile: user.profile })
}

export const updateEducation = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new HttpError(401, 'Unauthorized')
  const education = req.body
  const user = await UserModel.findOneAndUpdate(
    { firebaseUid: req.user.uid },
    { $set: { 'profile.education': education } },
    { new: true }
  )
  if (!user) throw new HttpError(404, 'User not found')
  res.json({ profile: user.profile })
}

export const parseCV = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new HttpError(401, 'Unauthorized')

  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) {
    throw new HttpError(400, 'No file uploaded. Please upload a PDF file.')
  }

  if (file.mimetype !== 'application/pdf') {
    throw new HttpError(400, 'Invalid file type. Only PDF files are accepted.')
  }

  if (file.size > MAX_CV_SIZE_BYTES) {
    throw new HttpError(400, 'File too large. Maximum size is 4MB.')
  }

  const parsedProfile = await parseCvWithGemini(file.buffer)

  res.json({ profile: parsedProfile })
}
