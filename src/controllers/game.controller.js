import { prisma } from '../utils/prisma/index.js';
import { throwError } from '../utils/error.handle.js';
import { checkAccount } from '../utils/validation.js';

/**
 * 매치메이킹 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function matchMaking(req, res, next) {
  const { accountId } = req.params;
  const { authAccountId } = req.account;

  try {
    // 계정 검증
    const hostAccount = await checkAccount(prisma, +accountId, +authAccountId);

    // 내 팀 라인업
    const hostlineUp = await prisma.lineUp.findMany({
      where: { accountId: +accountId },
    });
    if (hostlineUp.length < 3) throw throwError('팀 편성을 완료해주세요.');

    // 상대 목록
    const opponentPool = await prisma.accounts.findMany({
      where: {
        rankScore: {
          gte: hostAccount.rankScore - 50, // 최대 + 50
          lte: hostAccount.rankScore + 50, // 최소 - 50
        },
      },
    });
    if (opponentPool.length === 0) throw throwError('상대를 찾을 수 없습니다.', 404);

    // 상대 팀 라인업
    let opponentLineUp = [];
    let opponent;
    let cnt = 0;
    while (opponentLineUp.length < 3) {
      opponent = opponentPool[Math.floor(Math.random() * opponentPool.length)];

      opponentLineUp = await prisma.lineUp.findMany({
        where: { accountId: +opponent.accountId },
      });
      cnt++;
      if (cnt >= 100) {
        throw throwError('상대방을 찾을 수 없습니다.', 404);
      }
    }

    // 내 팀 점수
    let hostScore = 0;
    for (const lineUp of hostlineUp) {
      const roaster = await prisma.roaster.findUnique({
        where: { roasterId: +lineUp.roasterId },
      });
      if (!roaster) throw throwError('로스터를 찾을 수 없습니다.', 404);

      const player = await prisma.players.findUnique({
        where: { playerId: +roaster.playerId },
      });
      if (!player) throw throwError('선수를 찾을 수 없습니다', 404);

      hostScore += player.speed * 0.3;
      hostScore += player.shootAccuracy * 0.3;
      hostScore += player.shootPower * 0.25;
      hostScore += player.defense * 0.05;
      hostScore += player.stamina * 0.1;
    }

    // 상대 팀 점수
    let opponentScore = 0;
    for (const lineUp of opponentLineUp) {
      const roaster = await prisma.roaster.findUnique({
        where: { roasterId: +lineUp.roasterId },
      });
      if (!roaster) throw throwError('로스터를 찾을 수 없습니다.', 404);

      const player = await prisma.players.findUnique({
        where: { playerId: +roaster.playerId },
      });
      if (!player) throw throwError('선수를 찾을 수 없습니다', 404);

      opponentScore += player.speed * 0.3;
      opponentScore += player.shootAccuracy * 0.3;
      opponentScore += player.shootPower * 0.25;
      opponentScore += player.defense * 0.05;
      opponentScore += player.stamina * 0.1;
    }

    // 경기 로직
    const maxScore = hostScore + opponentScore;
    const randomValue = Math.random() * maxScore;
    let result = [];
    if (randomValue < hostScore) {
      // host 승리 처리
      const hostScore = Math.floor(Math.random() * 4) + 1; // 1에서 4 사이
      const opponentScore = Math.floor(Math.random() * Math.min(2, hostScore)); // aScore보다 작은 값을 설정
      result = [true, hostScore, opponentScore];
    } else {
      // opponent 승리 처리
      const opponentScore = Math.floor(Math.random() * 4) + 1; // 1에서 4 사이
      const hostScore = Math.floor(Math.random() * Math.min(2, opponentScore)); // bScore보다 작은 값을 설정
      result = [false, hostScore, opponentScore];
    }

    const game = await prisma.$transaction(async (tx) => {
      // 경기 결과 등록
      const game = await tx.game.create({
        data: {
          hostId: accountId,
          opponentId: opponent.accountId,
          win: result[0],
          hostScore: result[1],
          opponentScore: result[2],
        },
      });
      // host 랭크 점수 갱신
      const updateHostScore = await tx.accounts.update({
        where: { accountId: +accountId },
        data: {
          rankScore: result[0] ? hostAccount.rankScore + 10 : hostAccount.rankScore - 10,
        },
      });
      // opponent 랭크 점수 갱신
      const updateOpponentScore = await tx.accounts.update({
        where: { accountId: +opponent.accountId },
        data: {
          rankScore: !result[0] ? opponent.rankScore + 10 : opponent.rankScore - 10,
        },
      });
      return game;
    });

    return res.status(201).json({
      data: game,
      //message: `경기 결과: ${result[1]} : ${result[2]}로 ${result[0] ? '승리' : '패배'}했습니다. 현재 점수 ${curScore.rankScore}`,
    });
  } catch (error) {
    next(error);
  }
}
