import { prisma } from '../utils/prisma/index.js';
import { throwError } from '../utils/error/error.handle.js';
import accountService from '../services/account.service.js';

/**
 * 캐쉬 충전 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function chargeCash(req, res, next) {
  const accountId = +req.params.accountId;
  const amount = +req.body.amount;
  const authAccountId = +req.account;

  try {
    // 계정 존재 여부 및 권한 확인
    await accountService.checkAccount(+accountId, authAccountId);

    // 충전 금액이 유효한지 확인 (0 이상이어야 함)
    if (amount <= 0) throw throwError('충전 금액은 0보다 커야 합니다.', 400);

    // 캐쉬 충전 로그 기록 (계정 테이블은 업데이트하지 않음)
    const purpose = 'charge';
    const result = await createCashLog(prisma, purpose, accountId, amount);

    return res.status(201).json({
      message: '캐쉬 충전에 성공했습니다.',
      cash: result, // 충전 후 총 캐쉬 금액
    });
  } catch (error) {
    next(error); // 에러 핸들링 미들웨어로 넘기기
  }
}

/**
 * 캐쉬 잔액 조회 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function inquireCash(req, res, next) {
  const accountId = +req.params.accountId;
  const authAccountId = +req.account;

  try {
    await accountService.checkAccount(accountId, authAccountId);

    const totalCash = await prisma.cashLog.findFirst({
      where: { accountId },
      select: {
        totalCash: true,
      },
      orderBy: { createAt: 'desc' },
    });

    res.status(200).json({ totalCash: `${totalCash.totalCash}` });
  } catch (error) {
    next(error);
  }
}

/**
 * 캐쉬 잔액 확인 로직
 * @param {string} accountId
 * @param {int} cashNeeded
 */
export async function checkCash(prisma, accountId, cashNeeded) {
  const cashLog = await prisma.cashLog.findFirst({
    where: { accountId: +accountId },
    select: { totalCash: true },
    orderBy: { createAt: 'desc' },
  });
  if (!cashLog || cashLog.totalCash < cashNeeded) throw throwError('캐시 잔액이 부족합니다.', 402);
}

/**
 * 캐쉬 소모 로직
 * @param {string} accountId
 * @param {int} amount
 */
export async function createCashLog(prisma, purpose, accountId, amount) {
  const cashLog = await prisma.cashLog.findFirst({
    where: { accountId: +accountId },
    select: { totalCash: true },
    orderBy: { createAt: 'desc' },
  });
  const totalCash = cashLog.totalCash;

  const result = await prisma.cashLog.create({
    data: {
      accountId: +accountId,
      totalCash: totalCash + amount,
      purpose: purpose,
      cashChange: amount,
    },
  });

  return result.totalCash;
}
