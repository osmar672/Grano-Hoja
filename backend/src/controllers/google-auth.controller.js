import { randomBytes, timingSafeEqual } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import {
  createGoogleAccount,
  getAccountByEmail,
  getAccountByGoogleSub,
  normalizeEmail,
  recordSuccessfulLogin,
  toPublicUser,
} from '../services/auth.service.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const STATE_TTL_MS = 10 * 60 * 1000;

function hasGoogleConfig() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

function makeOAuthClient() {
  if (!hasGoogleConfig()) throw new Error('Google OAuth no está configurado');
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

function sameSecret(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function loginRedirect(res, error) {
  const target = new URL('/login', FRONTEND_URL);
  if (error) target.searchParams.set('oauthError', error);
  return res.redirect(303, target.toString());
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

export async function startGoogleAuth(req, res, next) {
  try {
    if (!hasGoogleConfig()) return loginRedirect(res, 'google_not_configured');
    const intent = req.query.intent;
    if (intent !== 'login' && intent !== 'register') return loginRedirect(res, 'invalid_intent');

    const client = makeOAuthClient();
    const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
    const state = randomBytes(32).toString('hex');
    const nonce = randomBytes(32).toString('hex');
    req.session.googleOAuth = { state, nonce, intent, codeVerifier, createdAt: Date.now() };
    await saveSession(req);

    const url = client.generateAuthUrl({
      response_type: 'code',
      scope: ['openid', 'email', 'profile'],
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
      access_type: 'online',
    });
    return res.redirect(302, url);
  } catch (error) {
    return next(error);
  }
}

export async function googleCallback(req, res) {
  const flow = req.session?.googleOAuth;
  // El state se guarda en la sesión; SameSite=Lax permite el callback GET de Google.
  if (!flow || Date.now() - flow.createdAt > STATE_TTL_MS || !sameSecret(req.query.state, flow.state)) {
    if (req.session) delete req.session.googleOAuth;
    return loginRedirect(res, 'oauth_state_invalid');
  }
  delete req.session.googleOAuth;

  if (req.query.error || typeof req.query.code !== 'string') {
    return loginRedirect(res, 'google_cancelled');
  }

  try {
    if (!hasGoogleConfig()) return loginRedirect(res, 'google_not_configured');
    const client = makeOAuthClient();
    const { tokens } = await client.getToken({ code: req.query.code, codeVerifier: flow.codeVerifier });
    if (!tokens.id_token) return loginRedirect(res, 'oauth_failed');

    // Verifica firma, emisor, audiencia y expiración con la biblioteca oficial de Google.
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || profile.email_verified !== true || profile.nonce !== flow.nonce) {
      return loginRedirect(res, 'google_email_unverified');
    }

    const email = normalizeEmail(profile.email);
    let account;
    if (flow.intent === 'register') {
      // Nunca se enlaza una cuenta local existente automáticamente: evita elevar roles por coincidencia de correo.
      const byEmail = await getAccountByEmail(email);
      const byGoogle = await getAccountByGoogleSub(profile.sub);
      if (byEmail || byGoogle) return loginRedirect(res, 'account_exists');
      const displayName = String(profile.name || email.split('@')[0]).trim().slice(0, 120) || 'Nuevo usuario';
      account = await createGoogleAccount({ email, displayName, googleSub: profile.sub });
    } else {
      account = await getAccountByGoogleSub(profile.sub);
      if (!account) return loginRedirect(res, 'google_not_registered');
    }

    if (!account.active) return loginRedirect(res, 'account_inactive');
    await recordSuccessfulLogin(account.id);
    await regenerateSession(req);
    req.session.user = toPublicUser(account);
    await saveSession(req);

    const target = new URL('/', FRONTEND_URL);
    target.searchParams.set('oauth', flow.intent === 'register' ? 'registered' : 'signed_in');
    return res.redirect(303, target.toString());
  } catch (error) {
    // No se exponen errores OAuth, códigos ni tokens al navegador.
    console.error('Fallo controlado durante Google OAuth:', error.message);
    return loginRedirect(res, error.code === '23505' ? 'account_exists' : 'oauth_failed');
  }
}
