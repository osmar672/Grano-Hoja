import { Link } from 'react-router-dom';
export default function NotFoundPage(){return <section className="not-found"><span className="eyebrow">ERROR 404</span><div className="not-found-number">404</div><h1>Este rincón no existe.</h1><p>La página que buscas no está en nuestro catálogo.</p><Link className="button button-primary" to="/">Volver al panel</Link></section>;}
