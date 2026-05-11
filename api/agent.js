/**
 * Vercel serverless entry (корень `api/`).
 * Реализация остаётся в `backend/api/` для локального dev и единого кода.
 */
export { default } from '../backend/api/agent.js';
export { config } from '../backend/api/agent.js';
