import express from 'express';
import handler from '../api/scene.js';
const router = express.Router();
router.all('/', handler);
export { router as sceneRouter };
