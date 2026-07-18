import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/authMiddleware'
import {
  getProfile,
  updateProfile,
  updateWorkExperience,
  updateEducation,
  parseCV,
} from '../controllers/profileController'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are accepted'))
    }
  },
})

export const profileRoutes = Router()

profileRoutes.use(requireAuth)

profileRoutes.get('/', getProfile)
profileRoutes.put('/', updateProfile)
profileRoutes.patch('/work', updateWorkExperience)
profileRoutes.patch('/education', updateEducation)
profileRoutes.post('/parse-cv', upload.single('cv'), parseCV)

