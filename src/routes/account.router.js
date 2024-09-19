import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { signaccount,loginAccount } from '../controllers/account.contrller.js';

const router = express.Router();
//회원가입
router.post('/sign/:accountId', authMiddleware, singnaccount);
//로그인
router.post('/login/:accountId', authMiddleware, loginAccount);
export default router;
