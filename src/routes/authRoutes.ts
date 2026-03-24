import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { admin } from '../config/firebase-admin';
import { UserModel } from '../models/User';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const FRONTEND_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// We determine the redirect URI dynamically or fallback to env.
// Vercel deployment has VERIFY_URL or NEXT_PUBLIC equivalent, but we can rely on standard env variables.
const REDIRECT_URI = process.env.BACKEND_URL
  ? `${process.env.BACKEND_URL}/api/auth/google/callback`
  : process.env.NODE_ENV === 'production' 
    ? 'https://be-jobtracker.onrender.com/api/auth/google/callback'
    : 'http://localhost:5000/api/auth/google/callback';

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// 1. Redirect to Google OAuth Consent Screen
router.get('/google/login', (req, res) => {
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent'
  });
  res.redirect(authorizeUrl);
});

// 2. Callback from Google
router.get('/google/callback', async (req, res) => {
  const code = req.query.code as string;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = await oauth2Client.request({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo'
    });
    
    const { email, name, picture } = oauth2.data as any;

    if (!email) {
      return res.redirect(`${FRONTEND_URL}/login?error=EmailNotProvided`);
    }

    // Check if user exists in Firebase, if not create one
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        firebaseUser = await admin.auth().createUser({
          email,
          displayName: name,
          photoURL: picture,
          emailVerified: true
        });
      } else {
        throw error;
      }
    }

    // Sync with MongoDB
    await UserModel.findOneAndUpdate(
      { firebaseUid: firebaseUser.uid },
      {
        $setOnInsert: {
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
        },
        $set: {
          displayName: name || firebaseUser.displayName,
          photoURL: picture || firebaseUser.photoURL,
        }
      },
      { upsert: true, new: true }
    );

    // Create a Firebase Custom Token
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/login/callback?token=${customToken}`);

  } catch (error) {
    console.error('OAuth Callback Error:', error);
    res.redirect(`${FRONTEND_URL}/login?error=OAuthFailed`);
  }
});

export const authRoutes = router;
