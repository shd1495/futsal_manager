import { prisma } from '../utils/prisma/index.js';
import { throwError } from '../utils/error.handle.js';
import accountService from '../services/account.service.js';
import gameService from '../services/game.service.js';

/**
 * 매치메이킹 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function matchMaking(req, res, next) {
  const accountId = +req.params.accountId;
  const authAccountId = +req.account;

  try {
    // 계정 검증
    const homeAccount = await accountService.checkAccount(accountId, authAccountId);

    // 내 팀 라인업
    const homeLineup = await prisma.lineup.findMany({
      where: { accountId },
      include: { roster: { include: { player: true } } }, // 선수 정보를 포함
    });
    if (homeLineup.length < 3) throw throwError('팀 편성을 완료해주세요.');

    // 상대 목록
    // 여기서 lineup.length === 3인 애들만 필터링
    const awayPool = await prisma.accounts.findMany({
      where: {
        accountId: { not: accountId },
        rankScore: {
          gte: homeAccount.rankScore - 200, // 최소 - 50
          lte: homeAccount.rankScore + 200, // 최대 + 50
        },
      },
    });
    if (awayPool.length === 0) throw throwError('상대를 찾을 수 없습니다.', 404);

    // 상대 팀 라인업
    let awayLineup = [];
    let away;
    let cnt = 0;
    while (awayLineup.length < 3) {
      away = awayPool[Math.floor(Math.random() * awayPool.length)];

      awayLineup = await prisma.lineup.findMany({
        where: { accountId: away.accountId },
        include: {
          account: { select: { id: true } },
          roster: { include: { player: true } },
        }, // 선수 정보를 포함
      });
      cnt++;
      if (cnt >= 100) {
        throw throwError('상대방을 찾을 수 없습니다.', 404);
      }
    }

    // 내 팀 점수
    const { styles: homeStyle, stats: homeStats } =
      await gameService.calculateTeamStats(homeLineup);
    // 상대 팀 점수
    const { styles: awayStyle, stats: awayStats } =
      await gameService.calculateTeamStats(awayLineup);

    // 같은 팀 컬러가 2개 이상이면 팀 컬러 설정
    const isHomeStyle = await gameService.getTeamStyle(homeStyle);

    // 같은 팀 컬러가 2개 이상이면 팀 컬러 설정
    const isAwayStyle = await gameService.getTeamStyle(awayStyle);

    // 내 팀 스탯 평균 계산
    homeStats.speed /= homeLineup.length;
    homeStats.shootAccuracy /= homeLineup.length;
    homeStats.shootPower /= homeLineup.length;
    homeStats.defense /= homeLineup.length;
    homeStats.stamina /= homeLineup.length;

    // 상대팀 스탯 평균 계산
    awayStats.speed /= awayLineup.length;
    awayStats.shootAccuracy /= awayLineup.length;
    awayStats.shootPower /= awayLineup.length;
    awayStats.defense /= awayLineup.length;
    awayStats.stamina /= awayLineup.length;

    // 팀 컬러 상성
    const advantageMap = {
      highPressing: 'poacher',
      poacher: 'targetMan',
      targetMan: 'highPressing',
    };

    // home 상성이 유리하거나 상대가 팀컬러가 없으면
    if (advantageMap[isHomeStyle] == isAwayStyle || (isHomeStyle && !isAwayStyle)) {
      homeStats.speed *= 1.1;
      homeStats.shootAccuracy *= 1.1;
      homeStats.shootPower *= 1.1;
      homeStats.defense *= 1.1;
      homeStats.stamina *= 1.1;
    }
    // away 상성이 유리하거나 상대가 팀컬러가 없으면
    if (advantageMap[isAwayStyle] == isHomeStyle || (!isHomeStyle && isAwayStyle)) {
      awayStats.speed *= 1.1;
      awayStats.shootAccuracy *= 1.1;
      awayStats.shootPower *= 1.1;
      awayStats.defense *= 1.1;
      awayStats.stamina *= 1.1;
    }

    const AVG_PLAYERS = 3;
    const DEFAULT_RANGE = 30;

    let ball = 0;
    const goal = [0, 0];
    const gameLog = [];
    for (let i = 0; i < 50; i++) {
      // home 축구력?
      let home = (homeStats.speed + homeStats.defense + homeStats.stamina) / AVG_PLAYERS; // 250
      // away 축구력?
      let away = (awayStats.speed + awayStats.defense + awayStats.stamina) / AVG_PLAYERS; // 200

      // 스탯 차이에 따라 공 이동 거리 계산 (양 팀 간 스탯 차이의 비율 사용)
      const advantage = home - away;

      // 공 이동 및 이동 거리 (랜덤 요소 추가)
      const randomFactor = Math.round(
        Math.random() * DEFAULT_RANGE * 2 - // 0 ~ 60
          DEFAULT_RANGE + // -21 ~ 39
          DEFAULT_RANGE * (advantage / 100),
      ); // 9
      ball += randomFactor;
      if (randomFactor >= 0) {
        gameLog.push(`${i}페이즈 : ${homeAccount.id} 팀이 공을 ${randomFactor}m 전진했습니다. `);
      } else {
        gameLog.push(
          `${i}페이즈 : ${awayLineup[0].account.id} 팀이 공을 ${randomFactor}m 전진했습니다.`,
        );
      }

      // home 골 찬스
      if (ball >= 80) {
        const goalRate = Math.min((homeStats.shootAccuracy + homeStats.shootPower) / 2, 100);
        // 골 확률
        if (goalRate - awayStats.defense / (Math.random() + 2) > Math.random() * 100) {
          goal[0] += 1;
          gameLog.push(`${i}페이즈 : ${homeAccount.id} 팀이 득점했습니다.`);
        } else {
          gameLog.push(`${i}페이즈 : ${homeAccount.id} 팀의 슛이 빗나갔습니다.`);
        }
        ball = 0;
      }

      // away 골 찬스
      if (ball <= -80) {
        const goalRate = Math.min((awayStats.shootAccuracy + awayStats.shootPower) / 2, 100);
        // 골 확률
        if (goalRate - homeStats.defense / (Math.random() + 2) > Math.random() * 100) {
          goal[1] += 1;
          gameLog.push(`${i}페이즈 : ${awayLineup[0].account.id} 팀이 득점했습니다.`);
        } else {
          gameLog.push(`${i}페이즈 : ${awayLineup[0].account.id} 팀의 슛이 빗나갔습니다.`);
        }
        ball = 0;
      }

      // 경기 진행도에 따른 스탯 감소
      homeStats.stamina *= 0.97;
      if (i % 10 == 0) {
        if (homeStats.stamina < 50) {
          homeStats.shootAccuracy *= 0.9;
          homeStats.shootPower *= 0.9;
          homeStats.speed *= 0.9;
          homeStats.defense *= 0.9;
        } else if (homeStats.stamina < 25) {
          homeStats.shootAccuracy *= 0.8;
          homeStats.shootPower *= 0.8;
          homeStats.speed *= 0.8;
          homeStats.defense *= 0.8;
        }
      }

      awayStats.stamina *= 0.97;
      if (i % 10 == 0) {
        if (awayStats.stamina < 50) {
          awayStats.shootAccuracy *= 0.9;
          awayStats.shootPower *= 0.9;
          awayStats.speed *= 0.9;
          awayStats.defense *= 0.9;
        } else if (awayStats.stamina < 25) {
          awayStats.shootAccuracy *= 0.8;
          awayStats.shootPower *= 0.8;
          awayStats.speed *= 0.8;
          awayStats.defense *= 0.8;
        }
      }
    }

    let isWin;
    if (goal[0] > goal[1]) isWin = true;
    else if (goal[0] < goal[1]) isWin = false;

    // 무승부일 경우 승부차기
    if (goal[0] === goal[1]) {
      isWin = await gameService.penaltyKick(homeLineup, awayLineup);
    }

    const game = await prisma.$transaction(async (tx) => {
      // 경기 결과 등록
      // $$ 상대방 game도 등록해줘야 함 $$
      const game = await tx.game.create({
        data: {
          homeId: accountId,
          awayId: away.accountId,
          win: isWin,
          homeScore: goal[0],
          awayScore: goal[1],
        },
      });
      // home 랭크 점수 갱신
      const updateHomeScore = await tx.accounts.update({
        where: { accountId: accountId },
        data: {
          rankScore: isWin ? homeAccount.rankScore + 10 : homeAccount.rankScore - 10,
        },
      });
      // away 랭크 점수 갱신
      const updateAwayScore = await tx.accounts.update({
        where: { accountId: away.accountId },
        data: {
          rankScore: !isWin ? away.rankScore + 10 : away.rankScore - 10,
        },
      });
      return game;
    });

    return res.status(201).json({
      gameLog: [...gameLog],
      data: game,
    });
  } catch (error) {
    next(error);
  }
}
