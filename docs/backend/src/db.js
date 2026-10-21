import pg from 'pg';

const { Pool } = pg;
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Para servicios gestionados que requieran TLS, define PGSSL=true y configura certificados según el proveedor.
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (error) => {
  console.error('Error inesperado en el pool PostgreSQL:', error.message);
});
