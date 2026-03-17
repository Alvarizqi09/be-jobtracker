import { Response } from 'express'
import { AuthenticatedRequest, HttpError } from '../types'
import { UserModel } from '../models/User'

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
