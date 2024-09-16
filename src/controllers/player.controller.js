import { prisma } from '../utils/prisma/index.js';
import { throwError } from '../utils/error.handle.js';
import { checkAccount } from '../utils/validation.js';

/**
 * 팀 편성 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function createLineUp(req, res, next) {
  const { accountId } = req.params;
  const { rosterIds } = req.body;
  const { authAccountId } = req.account;

  try {
    // 계정 존재 여부
    await checkAccount(prisma, +accountId, +authAccountId);

    // 선수 보유 여부
    const roster = await prisma.roster.findMany({
      where: { accountId: +accountId },
      select: {
        rosterId: true,
      },
    });
    if (roster.length < 3) throw throwError('선수가 부족합니다.', 400);

    // 보유하지 않은 선수가 포함된 경우
    const rosterArr = roster.map((item) => item.rosterId);
    const notIncludes = rosterIds.filter((id) => !rosterArr.includes(id));
    if (notIncludes.length > 0) throw throwError('보유하지 않은 선수가 포함 되어있습니다.', 400);

    // 팀 편성
    await prisma.$transaction(async (tx) => {
      // 기존 편성 삭제
      await tx.lineUp.deleteMany({
        where: { accountId: +accountId },
      });

      // 편성 추가
      const createLineUp = rosterIds.map((rosterId) => {
        tx.lineUp.create({
          data: {
            accountId: +accountId,
            rosterId: rosterId,
          },
        });
      });

      await Promise.all(createLineUp);
    });

    return res.status(201).json({ message: '팀 편셩이 완료되었습니다.' });
  } catch (error) {
    next(error);
  }
}

/**
 * 선수 판매 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function sellPlayer(req, res, next) {
  const accountId = +req.params.accountId;
  const rosterId = +req.body.rosterId;
  const authAccountId = +req.account.accountId;

  try {
    // 계정
    const account = await checkAccount(prisma, accountId, authAccountId);

    // 보유 선수 정보
    const roster = await prisma.roster.findUnique({
      where: { rosterId, accountId },
    });
    if (!roster) throw throwError('선수를 보유하고 있지 않습니다.', 404);

    // 가장 최근 캐쉬 변동 내역
    const cashLog = await prisma.cashLog.findFirst({
      where: { accountId },
      orderBy: { createAt: 'desc' },
    });
    if (!cashLog) throw throwError('캐시 기록이 존재하지 않습니다.', 404);

    // 선수 정보
    const player = await prisma.players.findFirst({
      where: { playerId: +roster.playerId },
    });
    if (!player) throw throwError('선수가 존재하지 않습니다.', 404);

    const result = await prisma.$transaction(async (tx) => {
      // 캐쉬 변동 내역
      const result = await tx.cashLog.create({
        data: {
          accountId: accountId,
          totalCash: cashLog.totalCash + +player.price,
          purpose: 'sell',
          cashChange: player.price,
        },
      });

      // 선수 판매
      await tx.roster.delete({
        where: { rosterId: rosterId, accountId: accountId },
      });
      return result;
    });

    return res
      .status(201)
      .json({ message: `${player.playerName} 선수를 판매했습니다.`, totalCash: result.totalCash });
  } catch (error) {
    next(error);
  }
}
