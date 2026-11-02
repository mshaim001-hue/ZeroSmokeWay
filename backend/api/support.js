import { handleSupportRequest } from '../services/supportDialogue.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    return res.status(200).json(await handleSupportRequest(req.body));
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    if (error.status === 409) return res.status(409).json({ error: error.message, issue: error.issue });
    return res.status(error.status === 503 ? 503 : 500).json({ error: 'unavailable', issue: error.issue || 'provider_error' });
  }
}
export const config = { maxDuration: 30 };
