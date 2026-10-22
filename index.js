// Vercel detects this default-exported Express app as the serverless backend.
// The same app remains available through backend/src/server.js for local development.
import { app } from './backend/src/app.js';

export default app;
