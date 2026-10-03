import { handleLabyrinthRequest } from '../services/labyrinthService.js';

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
    return res.status(200).json(await handleLabyrinthRequest(req.body));
  } catch (error) {
    return res.status(error.status === 400 ? 400 : 500).json({ error: error.status === 400 ? error.message : 'Internal server error' });
  }
}
export const config = { maxDuration: 20 };
