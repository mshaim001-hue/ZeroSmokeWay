/**
 * Express Server - ТОЛЬКО для локальной разработки
 * 
 * В продакшене используется Vercel Serverless Functions (backend/api/agent.js)
 * Этот файл нужен только для удобной локальной разработки
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { agentRouter } from './routes/agent.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/agent', agentRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Запускаем только в режиме разработки
// В продакшене используется Vercel Serverless Functions
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Development server running on port ${PORT}`);
    console.log(`📝 API endpoint: http://localhost:${PORT}/api/agent`);
    console.log(`⚠️  This is for development only. Production uses Vercel Serverless Functions.`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
      console.error(`💡 Try: lsof -ti:${PORT} | xargs kill -9`);
      console.error(`💡 Or change PORT in .env file`);
      process.exit(1);
    } else {
      throw err;
    }
  });
}

export default app;
