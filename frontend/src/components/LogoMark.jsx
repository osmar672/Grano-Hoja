export default function LogoMark({ className = '', title = 'Raíz & Madera' }) {
  return <svg className={className} viewBox="0 0 72 72" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="70" height="70" rx="22" fill="currentColor" opacity=".12" />
    <path d="M35.8 51V28.5C35.8 18 45.5 13 57 14.5 56 26.8 49.2 34 36 34" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M35.7 40C34 28 25 22 14 24 15 35.2 22.5 42.2 35.7 43" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 53h29M25 53v-6h23v6M29 47v-7h15v7M32 40v-6h9v6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
