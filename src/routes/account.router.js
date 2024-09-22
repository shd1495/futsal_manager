import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
  signAccount,
  loginAccount,
  deleteAccount,
  inquireAccount,
  checkRanking,
} from '../controllers/account.controller.js';

const router = express.Router();

//회원가입
router.post('/register', signAccount);
//로그인
router.post('/login', loginAccount);
//계정 삭제
router.delete(`/account/:accountId`, authMiddleware, deleteAccount);
//계정 조회
router.get(`/account/:accountId`, authMiddleware, inquireAccount);
//랭킹 조회
router.get(`/ranking`, checkRanking);

export default router;
