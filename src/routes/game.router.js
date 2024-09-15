import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { matchMaking } from '../controllers/game.controller.js';

const router = express.Router();

router.post('/match/:accountId', authMiddleware, matchMaking);

export default router;
