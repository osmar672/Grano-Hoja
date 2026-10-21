import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from '../controllers/auth.controller.js';
import * as googleController from '../controllers/google-auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { emptyQuerySchema, googleStartQuerySchema, loginBodySchema, optionalEmptyBodySchema } from '../validation/schemas.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_IP_LIMIT || 10),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos. Espera 15 minutos y vuelve a intentarlo' },
});

const googleOAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticación. Espera 15 minutos y vuelve a intentarlo' },
});

authRouter.get('/google/start', googleOAuthLimiter, validateRequest({ query: googleStartQuerySchema }), googleController.startGoogleAuth);
authRouter.get('/google/callback', googleOAuthLimiter, googleController.googleCallback);
authRouter.post('/login', loginLimiter, validateRequest({ body: loginBodySchema, query: emptyQuerySchema }), controller.login);
authRouter.get('/me', requireAuth, validateRequest({ query: emptyQuerySchema }), controller.me);
authRouter.post('/logout', requireAuth, validateRequest({ query: emptyQuerySchema, body: optionalEmptyBodySchema }), controller.logout);
