import express from 'express';
import handler from '../api/labyrinth.js';
const router = express.Router();
router.all('/', handler);
export { router as labyrinthRouter };
