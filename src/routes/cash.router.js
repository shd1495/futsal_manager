import express from 'express';
import { chargeCash } from '../controllers/cash.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * 캐쉬 충전 API
 */
router.post('/cash/:accountId', authMiddleware, chargeCash);


export default router;
