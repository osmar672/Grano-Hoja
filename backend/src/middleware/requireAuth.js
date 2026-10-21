import { pool } from '../db.js';

function destroySession(req) {
  return new Promise((resolve) => {
    if (!req.session) return resolve();
    req.session.destroy(() => resolve());
  });
}

// La autenticación se valida también en la API; esconder rutas en React no protege datos.
export async function requireAuth(req, res, next) {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser?.id) {
      return res.status(401).json({ error: 'Debes iniciar sesión para continuar' });
    }

    // Comprueba el estado actual de la cuenta, no solo los datos antiguos de la sesión.
    const result = await pool.query(
      `SELECT id, email, display_name, role, active
       FROM app_users WHERE id = $1`,
      [sessionUser.id],
    );
    const user = result.rows[0];
    if (!user || !user.active) {
      await destroySession(req);
      res.clearCookie(process.env.SESSION_COOKIE_NAME || 'gh.sid', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      return res.status(401).json({ error: 'La sesión no es válida. Inicia sesión de nuevo' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
    };
    req.session.user = req.user;
    return next();
  } catch (error) {
    return next(error);
  }
}
