import express from 'express';
import {
  createLineup,
  pickupPlayer,
  upgradePlayer,
  sellPlayer,
  getPlayers,
  buyToken,
  getAllPlayers,
  getLinenup,
  rosterPl,
} from '../controllers/player.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * 팀 편성 API
 */
router.patch('/lineup/:accountId', authMiddleware, createLineup);

/**
 * 선수 뽑기 API
 */
router.post('/pickup/:accountId', authMiddleware, pickupPlayer);

/**
 * 선수 강화 API
 */
router.patch('/upgrade/:accountId', authMiddleware, upgradePlayer);

/**
 * 선수 판매 API
 */
router.delete('/sell/:accountId', authMiddleware, sellPlayer);

/**
 * 보유 선수 목록 조회 API
 */
router.get('/roster/:accountId', authMiddleware, getPlayers);

/**
 * 뽑기권 구매 API
 */
router.post('/token/:accountId', authMiddleware, buyToken);

/**
 * 전체 선수 목록 조회 API
 */
router.get('/players', getAllPlayers);

/**
 * 라인업 조회 API
 */
router.get('/lineup/:accountId', authMiddleware, getLinenup);

/**
 * 보유선수 상세보기 API
 */
router.get('/player/:accountId', authMiddleware, rosterPl);

export default router;
