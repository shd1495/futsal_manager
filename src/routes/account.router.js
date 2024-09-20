import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
  signAccount,
  loginAccount,
  deleteAccount,
  inquireAccount,
} from '../controllers/account.controller.js';

const router = express.Router();

//회원가입
router.post('/sign', signAccount);
//로그인
router.post('/login', loginAccount);
//계정 삭제
router.delete(`/delete/:accountId`, authMiddleware, deleteAccount);
//계정 조회
router.get(`/inquire/:accountId`, authMiddleware, inquireAccount);

export default router;
