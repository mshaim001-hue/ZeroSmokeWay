import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { labyrinthRouter } from './routes/labyrinth.js';
import { sceneRouter } from './routes/scene.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '128kb' }));
app.use('/api/labyrinth', labyrinthRouter);
app.use('/api/scene', sceneRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use((error, _req, res, _next) => {
  res.status(error.status === 413 ? 413 : 500).json({ error: 'Request failed' });
});
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Labyrinth API: http://localhost:${port}/api/labyrinth`));
}
export default app;
