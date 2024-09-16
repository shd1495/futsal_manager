import express from 'express';
import { createLineup, sellPlayer } from '../controllers/player.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * 팀 편성 API
 */
router.post('/lineup/:accountId', authMiddleware, createLineup);

/**
 * 선수 판매 API
 */
router.post('/sell/:accountId', authMiddleware, sellPlayer);

export default router;
