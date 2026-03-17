import type { Response } from 'express'
import type { AuthenticatedRequest } from '../types'
import { HttpError } from '../types'
import { getUserByFirebaseUid, upsertUserFromFirebase } from '../services/userService'

function requireAuthUser(req: AuthenticatedRequest) {
  if (!req.user) throw new HttpError(401, 'Unauthorized')
  return req.user
}

export async function syncUserHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = requireAuthUser(req)
  const synced = await upsertUserFromFirebase(user)
  res.json({ user: synced })
}

export async function meHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = requireAuthUser(req)
  const me = await getUserByFirebaseUid(user.uid)
  if (!me) throw new HttpError(404, 'User not found')
  res.json({ user: me })
}

