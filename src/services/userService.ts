import { UserModel, type UserDoc } from '../models/User'
import type { AuthedUser } from '../types'

export interface UserDTO {
  _id: string
  firebaseUid: string
  email: string
  displayName?: string
  photoURL?: string
  createdAt: string
  updatedAt: string
}

function toUserDTO(doc: UserDoc & { createdAt: Date; updatedAt: Date }): UserDTO {
  const base: UserDTO = {
    _id: String(doc._id),
    firebaseUid: doc.firebaseUid,
    email: doc.email,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
  if (doc.displayName) base.displayName = doc.displayName
  if (doc.photoURL) base.photoURL = doc.photoURL
  return base
}

export async function upsertUserFromFirebase(user: AuthedUser): Promise<UserDTO> {
  const updated = await UserModel.findOneAndUpdate(
    { firebaseUid: user.uid },
    {
      firebaseUid: user.uid,
      email: user.email,
      ...(user.name ? { displayName: user.name } : { displayName: null }),
      ...(user.picture ? { photoURL: user.picture } : { photoURL: null }),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<{ _id: unknown; firebaseUid: string; email: string; displayName?: string; photoURL?: string; createdAt: Date; updatedAt: Date }>()

  // `lean()` with upsert+new should always return a doc, but keep it safe.
  if (!updated) throw new Error('Failed to sync user')

  const dto: UserDTO = {
    _id: String(updated._id),
    firebaseUid: updated.firebaseUid,
    email: updated.email,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  }
  if (updated.displayName) dto.displayName = updated.displayName
  if (updated.photoURL) dto.photoURL = updated.photoURL
  return dto
}

export async function getUserByFirebaseUid(firebaseUid: string): Promise<UserDTO | null> {
  const doc = await UserModel.findOne({ firebaseUid }).lean<{
    _id: unknown
    firebaseUid: string
    email: string
    displayName?: string
    photoURL?: string
    createdAt: Date
    updatedAt: Date
  }>()
  if (!doc) return null
  const dto: UserDTO = {
    _id: String(doc._id),
    firebaseUid: doc.firebaseUid,
    email: doc.email,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
  if (doc.displayName) dto.displayName = doc.displayName
  if (doc.photoURL) dto.photoURL = doc.photoURL
  return dto
}

