import { prisma } from '../utils/prisma/index.js';
import { throwError } from '../utils/error.handle.js';
import { checkAccount } from '../utils/validation.js';

/**
 * 캐쉬 충전 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function chargeCash(req, res, next) {
  const accountId = req.params.accountId;
  const { amount } = req.body;
  const authAccountId = req.account.authAccountId;

  try {
    // 계정 존재 여부 및 권한 확인
    await checkAccount(prisma, accountId, authAccountId);

    // 충전 금액이 유효한지 확인 (0 이상이어야 함)
    if (amount <= 0) throw throwError('충전 금액은 0보다 커야 합니다.', 400);

    // 가장 최근 캐쉬 변동 내역 조회 (이전 총 캐쉬를 확인하기 위함)
    const cashLog = await prisma.cashLog.findFirst({
      where: { accountId: accountId },
      orderBy: { createAt: 'desc' },
    });

    // 기존 캐쉬 값이 없으면 0으로 초기화
    const currentCash = cashLog ? cashLog.totalCash : 0;

    // 충전 후 총 캐쉬 계산
    const updatedCash = currentCash + amount;

    // 캐쉬 충전 로그 기록 (계정 테이블은 업데이트하지 않음)
    const result = await prisma.cashLog.create({
      data: {
        accountId: accountId,
        totalCash: updatedCash,
        purpose: '캐쉬 충전',
        cashChange: amount,
      },
    });

    
    return res.status(201).json({
      message: '캐쉬 충전에 성공했습니다.',
      cash: result.totalCash,  // 충전 후 총 캐쉬 금액
    });
  } catch (error) {
    next(error);  // 에러 핸들링 미들웨어로 넘기기
  }
}
