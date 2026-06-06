/**
 * GET /api/email-flush — Vercel Cron endpoint.
 * Запускается каждые 30 минут, отправляет pending письма из email_queue.
 * Защита: CRON_SECRET в заголовке Authorization.
 */
import { flushEmailQueue } from '../backend/services/emailSequenceService.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization ?? '';
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const result = await flushEmailQueue();
    return res.status(200).json(result);
  } catch (err) {
    console.error('email-flush error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
