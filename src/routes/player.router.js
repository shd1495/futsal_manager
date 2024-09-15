import express from 'express';
import { createLineUp } from '../controllers/player.controller.js';

const router = express.Router();

/**
 * 팀 편성 API
 */
router.post('/lineup/:accountId', createLineUp);

export default router;
