import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware'
import {
  getProfile,
  updateProfile,
  updateWorkExperience,
  updateEducation,
} from '../controllers/profileController'

export const profileRoutes = Router()

profileRoutes.use(requireAuth)

profileRoutes.get('/', getProfile)
profileRoutes.put('/', updateProfile)
profileRoutes.patch('/work', updateWorkExperience)
profileRoutes.patch('/education', updateEducation)
