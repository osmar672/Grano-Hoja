import { AppError } from './AppError.js';

// Costa Rica usa UTC-06:00 durante todo el año. El rango evita depender de las tablas TZ de MySQL.
export function costaRicaDayBounds(requestedDate) {
  let date = requestedDate;
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError(400, 'fecha debe tener formato YYYY-MM-DD');
    const [year, month, day] = date.split('-').map(Number);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
      throw new AppError(400, 'fecha debe ser una fecha válida con formato YYYY-MM-DD');
    }
  } else {
    date = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
  const start = new Date(`${date}T06:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { fecha: date, start, end };
}
