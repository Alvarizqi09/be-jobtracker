import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'

import { connectDb } from './config/db'
import { initFirebaseAdmin } from './config/firebase-admin'
import { errorHandler } from './middleware/errorHandler'
import { jobRoutes } from './routes/jobRoutes'
import { userRoutes } from './routes/userRoutes'
import { profileRoutes } from './routes/profileRoutes'
import { coverLetterRoutes } from './routes/coverLetterRoutes'
import { analyticsRoutes } from './routes/analyticsRoutes'
import { contactRoutes } from './routes/contactRoutes'
import { notificationRoutes } from './routes/notificationRoutes'

dotenv.config()

function mustGetEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

const app = express()

app.disable('x-powered-by')
// Prevent 304 responses (ETag) for JSON API to avoid stale UI in browsers.
app.set('etag', false)
app.use(helmet())
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? true,
    credentials: true,
  })
)
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api/users/profile', profileRoutes)
app.use('/api/users', userRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/cover-letter', coverLetterRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/contacts', contactRoutes)
app.use('/api/notifications', notificationRoutes)

app.use(errorHandler)

let isInitialized = false;
async function initializeApp(): Promise<void> {
  if (isInitialized) return;
  initFirebaseAdmin()
  
  const cronService = await import('./services/cronService');
  cronService.startCronJobs();
  
  const mongoUri = mustGetEnv('MONGODB_URI')
  await connectDb(mongoUri)
  isInitialized = true;
}

// 1) Initialize DB, Cron, and Firebase safely
initializeApp().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to initialize server dependencies', err)
})

// 2) If not running on Vercel, start the server normally (for local dev)
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT ?? 5000)
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`JobDeck API listening on http://localhost:${port}`)
  })
}

// 3) Export the app for Vercel Serverless Functions
export default app;
