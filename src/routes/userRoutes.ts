import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware'
import { meHandler, syncUserHandler } from '../controllers/userController'

export const userRoutes = Router()

userRoutes.use(requireAuth)

userRoutes.post('/sync', syncUserHandler)
userRoutes.get('/me', meHandler)

