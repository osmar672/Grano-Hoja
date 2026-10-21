import { randomBytes } from 'node:crypto';
import { logInfo, logWarn } from '../utils/logger.js';
import {
  getAccountByEmail,
  normalizeEmail,
  recordFailedLogin,
  recordSuccessfulLogin,
  toPublicUser,
  verifyPassword,
} from '../services/auth.service.js';

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'rm.sid';
const INVALID_CREDENTIALS = 'Credenciales incorrectas o acceso temporalmente bloqueado';

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


export async function csrfToken(req, res, next) {
  try {
    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString('base64url');
      await saveSession(req);
    }
    return res.status(200).json({ ok: true, csrfToken: req.session.csrfToken });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' ||
        !email.trim() || !password || email.length > 254 || password.length > 256 || Buffer.byteLength(password, 'utf8') > 72) {
      logWarn('auth.login_rejected', { requestId: req.requestId, action: 'login', outcome: 'rejected', reason: 'invalid_input' });
      return res.status(400).json({ error: 'El formato del correo o la contraseña no es válido' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      logWarn('auth.login_rejected', { requestId: req.requestId, action: 'login', outcome: 'rejected', reason: 'invalid_email_format' });
      return res.status(400).json({ error: 'El formato del correo o la contraseña no es válido' });
    }

    const account = await getAccountByEmail(normalizedEmail);
    const locked = account?.locked_until && new Date(account.locked_until).getTime() > Date.now();
    const passwordMatches = await verifyPassword(password, account);

    if (!account || !account.active || locked || !passwordMatches) {
      if (account?.active && !locked && !passwordMatches) {
        await recordFailedLogin(account.id);
      }
      logWarn('auth.login_rejected', { requestId: req.requestId, actorId: account?.id === undefined ? undefined : String(account.id), role: account?.role, action: 'login', outcome: 'rejected', reason: locked ? 'temporarily_locked' : 'invalid_credentials' });
      return res.status(401).json({ error: INVALID_CREDENTIALS });
    }

    await recordSuccessfulLogin(account.id);
    await regenerateSession(req); // Cambia el ID de sesión y evita session fixation.
    const user = toPublicUser(account);
    req.session.user = user;
    await saveSession(req);
    logInfo('auth.login_succeeded', { requestId: req.requestId, actorId: String(user.id), role: user.role, action: 'login', outcome: 'success', authMethod: 'password' });

    return res.status(200).json({ ok: true, user });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res) {
  return res.status(200).json({ ok: true, user: req.user });
}

export async function logout(req, res, next) {
  if (!req.session) return res.status(204).end();
  const actorId = req.user?.id === undefined ? undefined : String(req.user.id);
  const role = req.user?.role;
  req.session.destroy((error) => {
    if (error) return next(error);
    logInfo('auth.logout_succeeded', { requestId: req.requestId, actorId, role, action: 'logout', outcome: 'success' });
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res.status(204).end();
  });
}
