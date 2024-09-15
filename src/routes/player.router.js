import express from 'express';
import { createLineUp } from '../controllers/player.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * 팀 편성 API
 */
router.post('/lineup/:accountId', authMiddleware, createLineUp);

export default router;
