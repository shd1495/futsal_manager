import { prisma } from '../utils/prisma/index.js';
import { throwError } from '../utils/error.handle.js';
import AccountService from '../services/account.service.js';
import calculateValue from '../utils/updatePlayers.js';

const accountService = new AccountService(prisma);

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
    const hostAccount = await accountService.checkAccount(prisma, +accountId, +authAccountId);

    // 내 팀 라인업
    const hostLineup = await prisma.lineup.findMany({
      where: { accountId: +accountId },
    });
    if (hostLineup.length < 3) throw throwError('팀 편성을 완료해주세요.');

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
    let opponentLineup = [];
    let opponent;
    let cnt = 0;
    while (opponentLineup.length < 3) {
      opponent = opponentPool[Math.floor(Math.random() * opponentPool.length)];

      opponentLineup = await prisma.lineup.findMany({
        where: { accountId: +opponent.accountId },
      });
      cnt++;
      if (cnt >= 100) {
        throw throwError('상대방을 찾을 수 없습니다.', 404);
      }
    }

    // 내 팀 점수
    const hostStyle = []; // 스타일
    const hostStats = {
      speed: 0,
      shootAccuracy: 0,
      shootPower: 0,
      defense: 0,
      stamina: 0,
    };
    let hostValue = 0; // 라인업 가치
    for (const lineup of hostLineup) {
      const roster = await prisma.roster.findUnique({
        where: { rosterId: +lineup.rosterId },
      });
      if (!roster) throw throwError('로스터를 찾을 수 없습니다.', 404);

      const player = await prisma.players.findUnique({
        where: { playerId: +roster.playerId },
      });
      if (!player) throw throwError('선수를 찾을 수 없습니다', 404);

      hostStyle.push(player.style);

      hostStats.speed += player.speed;
      hostStats.shootAccuracy += player.shootAccuracy;
      hostStats.shootPower += player.shootPower;
      hostStats.defense += player.defense;
      hostStats.stamina += player.stamina;

      hostValue += calculateValue(player);
    }

    // 같은 팀 컬러가 2개 이상이면 팀 컬러 설정
    let isHostStyle = ''; // 팀 컬러
    const hostCountMap = {};
    for (const item of hostStyle) {
      hostCountMap[item] = (hostCountMap[item] || 0) + 1;
      if (hostCountMap[item] >= 2) isHostStyle = item;
    }

    // 상대 팀 점수
    const opponentStyle = [];
    const opponentStats = {
      speed: 0,
      shootAccuracy: 0,
      shootPower: 0,
      defense: 0,
      stamina: 0,
    };
    let opponentValue = 0; // 라인업 가치
    for (const lineup of opponentLineup) {
      const roster = await prisma.roster.findUnique({
        where: { rosterId: +lineup.rosterId },
      });
      if (!roster) throw throwError('로스터를 찾을 수 없습니다.', 404);

      const player = await prisma.players.findUnique({
        where: { playerId: +roster.playerId },
      });
      if (!player) throw throwError('선수를 찾을 수 없습니다', 404);

      opponentStyle.push(player.style);

      opponentStats.speed += player.speed;
      opponentStats.shootAccuracy += player.shootAccuracy;
      opponentStats.shootPower += player.shootPower;
      opponentStats.defense += player.defense;
      opponentStats.stamina += player.stamina;

      opponentValue += calculateValue(player);
    }

    // 같은 팀 컬러가 2개 이상이면 팀 컬러 성정
    let isOpponentStyle = ''; // 팀 컬러
    const OpponentCountMap = {};
    for (const item of opponentStyle) {
      OpponentCountMap[item] = (OpponentCountMap[item] || 0) + 1;
      if (OpponentCountMap[item] >= 2) isOpponentStyle = item;
    }

    // 팀 컬러 상성
    const advantageMap = {
      highPressing: 'poacher',
      poacher: 'targetMan',
      targetMan: 'highPressing',
    };

    // host 상성이 유리하거나 상대가 팀컬러가 없으면
    if (advantageMap[isHostStyle] == isOpponentStyle || (isHostStyle && !isOpponentStyle)) {
      hostStats.speed *= 1.1;
      hostStats.shootAccuracy *= 1.1;
      hostStats.shootPower *= 1.1;
      hostStats.defense *= 1.1;
      hostStats.stamina *= 1.1;
    }
    // opponent 상성이 유리하거나 상대가 팀컬러가 없으면
    if (advantageMap[isOpponentStyle] == isHostStyle || (!isHostStyle && isOpponentStyle)) {
      opponentStats.speed *= 1.1;
      opponentStats.shootAccuracy *= 1.1;
      opponentStats.shootPower *= 1.1;
      opponentStats.defense *= 1.1;
      opponentStats.stamina *= 1.1;
    }

    let ball = 0;
    const goal = [0, 0];
    for (let i = 0; i < 10; i++) {
      // host 축구력?
      let host = hostStats.speed + hostStats.defense + hostStats.stamina;
      // opponent 축구력?
      let opponent = opponentStats.speed + opponentStats.defense + opponentStats.stamina;

      // 스탯 차이에 따라 공 이동 거리 계산 (양 팀 간 스탯 차이의 비율 사용)
      const statDifference = host - opponent; //
      const advantage = statDifference / (host + opponent) / 2; // 스탯 차이 비율
      const baseMovement = Math.round(advantage * 100); // 기본 이동 거리를 스탯 비율로 설정

      // 공 이동 및 이동 거리 (랜덤 요소 추가)
      const randomFactor = Math.round(Math.random() * 30) - 15; // - 15 ~ 15
      ball += baseMovement + randomFactor;

      // host 골 찬스
      if (ball >= 80) {
        const goalRate = (hostStats.shootAccuracy + hostStats.shootPower) / 2;
        // 골 확률
        if (goalRate > Math.random() * 100) goal[0] += 1;
        ball = 0;
      }

      // opponent 골 찬스
      if (ball <= -80) {
        const goalRate = (opponentStats.shootAccuracy + opponentStats.shootPower) / 2;
        // 골 확률
        if (goalRate > Math.random() * 100) goal[1] += 1;
        ball = 0;
      }

      // 경기 진행도에 따른 스탯 감소
      hostStats.stamina -= i * 2;
      if (hostStats.stamina < 150) host *= 0.95;
      else if (hostStats.stamina < 100) host *= 0.9;
      else if (hostStats.stamina < 50) host *= 0.8;
      else host *= 0.7;

      opponentStats.stamina -= i * 2;
      if (opponentStats.stamina < 150) opponent *= 0.95;
      else if (opponentStats.stamina < 100) opponent *= 0.9;
      else if (opponentStats.stamina < 50) opponent *= 0.8;
      else opponent *= 0.7;
    }

    // 무승부일 경우 승부차기
    if (goal[0] === goal[1]) {
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
