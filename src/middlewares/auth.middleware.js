import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';

export default async function (req, res, next) {
  try {
    const authorization = req.headers['authorization'];

    // 토큰 존재 여부
    if (!authorization) throw new Error('요청한 사용자의 토큰이 존재하지 않습니다.', 404);

    // 토큰 타입 확인
    const [tokenType, token] = authorization.split(' ');
    if (tokenType !== 'Bearer') throw new Error('토큰 타입이 Bearer 형식이 아닙니다.', 401);

    // 토큰 검증
    const decodedToken = jwt.verify(token, process.env.SESSION_SECRET_KEY);

    // 토큰 사용자 조회
    const accountId = decodedToken.accountId;
    const account = await prisma.accounts.findFirst({
      where: { accountId: +accountId },
    });
    if (!user) throw new Error('토큰 사용자가 존재하지 않습니다.', 404);

    // 사용자 정보 저장
    req.account = account.accountId;

    next();
  } catch (error) {
    // 토큰 만료
    if (error.name === 'TokenExpiredError')
      return res.status(401).json({ message: '토큰이 만료되었습니다.' });
    // 시그니처 조작
    if (error.name === 'JsonWebTokenError')
      return res.status(401).json({ message: '토큰이 조작되었습니다.' });

    return res.status(400).json({ message: error.message });
  }
}
