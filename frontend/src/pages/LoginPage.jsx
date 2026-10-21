import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';

function safeReturnPath(location) {
  const path = location.state?.from?.pathname;
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && path !== '/login' ? path : '/';
}

export default function LoginPage() {
  const { user, loading, login, sessionError } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) return <main className="auth-check-screen" role="status"><span className="auth-spinner" /> Verificando tu sesión…</main>;
  if (user) return <Navigate to={safeReturnPath(location)} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Escribe tu correo y contraseña para continuar.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Escribe un correo con formato válido.');
      return;
    }
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (requestError) {
      setError(requestError.status === 429
        ? requestError.message
        : requestError.status === 401
          ? 'No pudimos validar tus credenciales. Revisa los datos o espera si el acceso está temporalmente bloqueado.'
          : requestError.message || 'No se pudo iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-backdrop" aria-hidden="true"><span /><span /><span /></div>
      <section className="login-story" aria-label="Grano & Hoja">
        <Link className="login-brand" to="/login" aria-label="Grano & Hoja, inicio de sesión">
          <span className="login-brand-mark" aria-hidden="true">❧</span>
          <span><strong>Grano <i>&</i> Hoja</strong><small>CAFÉ · INVENTARIO · CUIDADO</small></span>
        </Link>
        <div className="login-story-copy">
          <span className="login-overline"><span /> UN ESPACIO PARA CRECER</span>
          <h1>Del bosque a tu taza.<br /><em>Todo en equilibrio.</em></h1>
          <p>Cuida cada ingrediente, acompaña cada venta y mantén tu cafetería en armonía.</p>
        </div>
        <div className="login-story-bottom">
          <span className="login-leaf" aria-hidden="true">✳</span>
          <div><strong>Hecho con calma, servido con cuidado.</strong><small>Gestión interna de Grano & Hoja</small></div>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <div className="login-mobile-brand">
            <span className="login-brand-mark" aria-hidden="true">❧</span>
            <strong>Grano <i>&</i> Hoja</strong>
          </div>
          <span className="login-overline login-overline-light">ACCESO AL EQUIPO</span>
          <h2 id="login-title">Qué bueno tenerte de vuelta.</h2>
          <p className="login-intro">Inicia sesión para entrar a tu espacio de trabajo.</p>

          {(error || sessionError) && <div className="login-error" role="alert"><span aria-hidden="true">!</span><p>{error || 'No pudimos comprobar tu sesión anterior. Comprueba la conexión con la API e inicia sesión.'}</p></div>}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="login-email">Correo del equipo</label>
            <div className="login-input-wrap"><span aria-hidden="true">✉</span><input id="login-email" type="email" inputMode="email" autoComplete="username" placeholder="tu@granohoja.local" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></div>

            <div className="login-label-row"><label htmlFor="login-password">Contraseña</label></div>
            <div className="login-input-wrap"><span aria-hidden="true">⌑</span><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} maxLength={72} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? 'Ocultar' : 'Ver'}</button></div>

            <button className="login-submit" type="submit" disabled={submitting}>
              <span>{submitting ? 'Validando acceso…' : 'Entrar al espacio'}</span><span className="login-submit-arrow" aria-hidden="true">↗</span>
            </button>
          </form>
          <div className="login-security-note"><span aria-hidden="true">✦</span><p>Acceso privado para el equipo autorizado.<br /><small>Las cuentas son creadas por la persona administradora.</small></p></div>
          <div className="login-card-footer"><span>GRANO & HOJA</span><span>·</span><span>GESTIÓN CON CUIDADO</span></div>
        </div>
      </section>
    </main>
  );
}
