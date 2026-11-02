import express from 'express';
import handler from '../api/support.js';
const router = express.Router();
router.all('/', handler);
export { router as supportRouter };
