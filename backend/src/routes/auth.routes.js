import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_IP_LIMIT || 10),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos. Espera 15 minutos y vuelve a intentarlo' },
});

authRouter.post('/login', loginLimiter, controller.login);
authRouter.get('/me', requireAuth, controller.me);
authRouter.post('/logout', requireAuth, controller.logout);
