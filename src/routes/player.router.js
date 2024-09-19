import express from 'express';
import { createLineup, pickupPlayer, sellPlayer, getPlayers } from '../controllers/player.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * 팀 편성 API
 */
router.post('/lineup/:accountId', authMiddleware, createLineup);

/**
 * 선수 뽑기 API
 */
router.post('/pickup/:accountId', authMiddleware, pickupPlayer);

/**
 * 선수 판매 API
 */
router.delete('/sell/:accountId', authMiddleware, sellPlayer);

/**
 * 보유 선수 목록 조회 API
 */
router.get('/myPlayers/:accountId', authMiddleware, getPlayers);

export default router;
