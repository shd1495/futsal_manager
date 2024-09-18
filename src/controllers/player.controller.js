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
export async function createLineup(req, res, next) {
  const accountId = req.params.accountId;
  const rosterIds = req.body.rosterIds;
  const authAccountId = req.account.authAccountId;

  try {
    // 계정 존재 여부
    await checkAccount(prisma, accountId, authAccountId);

    // 선수 보유 여부
    const roster = await prisma.roster.findMany({
      where: { accountId },
      select: {
        rosterId: true,
      },
    });
    if (roster.length < 3) throw throwError('선수가 부족합니다.', 400);

    if (!rosterIds.length === 3) throw throwError('3명의 선수만 선택해주십시오.', 400);

    // 보유하지 않은 선수가 포함된 경우
    const rosterArr = roster.map((item) => item.rosterId);
    const notIncludes = rosterIds.filter((id) => !rosterArr.includes(id));
    if (notIncludes.length > 0) throw throwError('보유하지 않은 선수가 포함 되어있습니다.', 400);

    /*// 팀 편성
    await prisma.$transaction(async (tx) => {
      // 기존 편성 삭제
      await tx.lineup.deleteMany({
        where: { accountId: accountId },
      });

      // 편성 추가
      const createLineup = rosterIds.map((rosterId) => {
        tx.lineup.create({
          data: {
            accountId: accountId,
            rosterId: rosterId,
          },
        });
      });

      await Promise.all(createLineup);
    });*/

    // 기존 라인업 조회
    const lineup = await prisma.lineup.findMany({
      where: { accountId },
    });
    const existRosterIds = lineup.map((item) => item.rosterId);
    const deleteCnt = lineup.length - 3;

    // 라인업의 선수가 3명을 초과할 경우
    if (deleteCnt > 0) {
      // 삭제할 레코드의 ID를 추출
      const ids = lineup.slice(0, deleteCnt).map((lineup) => lineup.lineupId);

      // 해당 ID의 레코드 삭제
      await prisma.lineup.deleteMany({
        where: {
          lineupId: { in: ids },
        },
      });
    }

    // 팀 편성
    for (let i = 0; i < rosterIds.length; i++) {
      const rosterId = rosterIds[i];
      const existRosterId = existRosterIds[i];

      // 기존 정보 업데이트
      if (existRosterIds.length === 3) {
        await prisma.lineup.update({
          where: {
            accountId,
            rosterId: existRosterId,
          },
          data: { rosterId: rosterId },
        });
        // 첫 편성일 경우, 선수를 판매했을 경우 생성
      } else if (existRosterIds.length < 3) {
        await prisma.lineup.create({
          data: {
            accountId,
            rosterId,
          },
        });
      }
    }

    return res.status(201).json({ message: '팀 편성이 완료되었습니다.' });
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

    // 라인업에 존재하면
    const lineup = await prisma.lineup.findMany({
      where: { accountId },
    });
    if (lineup) throw throwError('라인업에 있는 선수입니다. 라인업에서 해제해주십시오.', 409);

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

/**
 * 보유 선수 목록 조회 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function getPlayers(req, res, next) {
  const accountId = +req.params.accountId;
  const authAccountId = +req.account.accountId;

  try {
    // 계정
    await checkAccount(prisma, accountId, authAccountId);

    // 보유 선수 목록 조회
    const roster = prisma.roster.findMany({
      where: { accountId: accountId },
      select: {
        playerId: true,
        rank: true,
      },
    });
    if (!roster) throw throwError('선수를 보유하고 있지 않습니다.', 404);

    res.status(200).json({ data: roster });
  } catch (error) {
    next(error);
  }
}
