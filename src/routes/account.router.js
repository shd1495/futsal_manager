import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { signAccount, loginAccount } from '../controllers/account.controller.js';

const router = express.Router();

//회원가입
router.post('/sign/:accountId', signAccount);
//로그인
router.post('/login/:accountId', loginAccount);

export default router;
