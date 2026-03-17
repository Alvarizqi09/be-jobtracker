import admin from 'firebase-admin'

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

function parsePrivateKey(raw: string): string {
  // Support both literal newlines and escaped \n from .env
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw
}

export function initFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) return admin.app()

  const projectId = getEnv('FIREBASE_PROJECT_ID')
  const clientEmail = getEnv('FIREBASE_CLIENT_EMAIL')
  const privateKey = parsePrivateKey(getEnv('FIREBASE_PRIVATE_KEY'))

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

export { admin }

