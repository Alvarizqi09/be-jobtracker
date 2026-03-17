import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware'
import { generate, getAll, getById, update, remove, getByJobId } from '../controllers/coverLetterController'

export const coverLetterRoutes = Router()

coverLetterRoutes.use(requireAuth)

coverLetterRoutes.post('/generate', generate)
coverLetterRoutes.get('/', getAll)
coverLetterRoutes.get('/:id', getById)
coverLetterRoutes.put('/:id', update)
coverLetterRoutes.delete('/:id', remove)
coverLetterRoutes.get('/job/:jobId', getByJobId)
