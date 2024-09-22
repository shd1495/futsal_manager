import express from 'express';
import { chargeCash, inquireCash } from '../controllers/cash.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * 캐쉬 충전 API
 */
router.post('/cash/:accountId', authMiddleware, chargeCash);

/**
 * 캐쉬 잔액 조회 API
 */
router.get('/cash/:accountId', authMiddleware, inquireCash);

export default router;
