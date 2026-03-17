import type { Response, NextFunction } from 'express'
import { admin } from '../config/firebase-admin'
import type { AuthenticatedRequest, AuthedUser } from '../types'
import { HttpError } from '../types'

function parseBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token
}

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = parseBearerToken(req.header('Authorization'))
    if (!token) throw new HttpError(401, 'Missing Authorization Bearer token')

    const decoded = await admin.auth().verifyIdToken(token)
    const user: AuthedUser = { uid: decoded.uid, email: decoded.email ?? '' }
    if (typeof decoded.name === 'string' && decoded.name.length > 0) user.name = decoded.name
    if (typeof decoded.picture === 'string' && decoded.picture.length > 0) user.picture = decoded.picture

    if (!user.email) throw new HttpError(401, 'Token missing email claim')

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

