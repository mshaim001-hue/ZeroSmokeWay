import express from 'express';
import { searchKnowledgeBase, indexKnowledgeBase } from '../services/knowledgeBase.js';

const router = express.Router();

// Поиск в базе знаний
router.post('/search', async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await searchKnowledgeBase(query, topK);

    res.json({
      query,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Knowledge search error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Индексация базы знаний
router.post('/index', async (req, res) => {
  try {
    console.log('Запрос на индексацию базы знаний...');
    const result = await indexKnowledgeBase();

    res.json({
      success: true,
      totalChunks: result?.totalChunks || 0,
      message: 'База знаний успешно проиндексирована',
    });
  } catch (error) {
    console.error('Knowledge indexing error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export { router as knowledgeRouter };




