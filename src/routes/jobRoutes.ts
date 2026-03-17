import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware'
import {
  createJobHandler,
  deleteJobHandler,
  getJobHandler,
  listJobsHandler,
  statsSummaryHandler,
  updateJobHandler,
  updateJobStatusHandler,
} from '../controllers/jobController'

export const jobRoutes = Router()

jobRoutes.use(requireAuth)

jobRoutes.get('/stats/summary', statsSummaryHandler)
jobRoutes.get('/', listJobsHandler)
jobRoutes.post('/', createJobHandler)
jobRoutes.get('/:id', getJobHandler)
jobRoutes.put('/:id', updateJobHandler)
jobRoutes.patch('/:id/status', updateJobStatusHandler)
jobRoutes.delete('/:id', deleteJobHandler)

