import { prisma } from '../utils/prisma/index.js';
import { throwError } from '../utils/error.handle.js';
import AccountService from '../services/account.service.js';

const accountService = new AccountService(prisma);

async function penaltyKick(homeLineup, awayLineup) {
  // 호스트 팀에서 defense 값이 가장 높은 선수 찾기
  let homeDefender = homeLineup[0]; // 첫 번째 선수를 기본으로 설정
  for (let i = 1; i < homeLineup.length; i++) {
    if (homeLineup[i].defense > homeDefender.defense) {
      homeDefender = homeLineup[i];
    }
  }

  // 상대 팀에서 defense 값이 가장 높은 선수 찾기
  let awayDefender = awayLineup[0]; // 첫 번째 선수를 기본으로 설정
  for (let i = 1; i < awayLineup.length; i++) {
    if (awayLineup[i].defense > awayDefender.defense) {
      awayDefender = awayLineup[i];
    }
  }

  // 승부차기 로직
  let homePenaltyScore = 0;
  let awayPenaltyScore = 0;
  let round = 1;

  while (round <= homeLineup.length || homePenaltyScore === awayPenaltyScore) {
    // 공격자는 라인업 순서대로 돌아가며 슛을 함
    const homeAttacker = homeLineup[(round - 1) % homeLineup.length];
    const awayAttacker = awayLineup[(round - 1) % awayLineup.length];

    // 호스트 팀의 공격: 호스트 공격자 vs 상대 수비자
    if (performKick(homeAttacker, awayDefender)) {
      homePenaltyScore++;
    }

    // 상대 팀의 공격: 상대 공격자 vs 호스트 수비자
    if (performKick(awayAttacker, homeDefender)) {
      awayPenaltyScore++;
    }

    round++;
  }

  // 결과 반환
  if (homePenaltyScore > awayPenaltyScore) {
    return true;
  } else {
    return false;
  }
}

// 킥 수행 로직: 공격자의 슛 정밀도와 슛 파워를 더한 값 vs 수비자의 디펜스
function performKick(attacker, defender) {
  const attackScore = attacker.shootAccuracy + attacker.shootPower;
  const randomAttack = Math.random() * attackScore;
  const randomDefense = Math.random() * defender.defense;

  return randomAttack > randomDefense;
}

/**
 * 매치메이킹 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function matchMaking(req, res, next) {
  const { accountId } = req.params;
  const authAccountId = +req.account;

  try {
    // 계정 검증
    const homeAccount = await accountService.checkAccount(+accountId, authAccountId);

    // 내 팀 라인업
    const homeLineup = await prisma.lineup.findMany({
      where: { accountId: +accountId },
    });
    if (homeLineup.length < 3) throw throwError('팀 편성을 완료해주세요.');

    // 상대 목록
    // 여기서 lineup.length === 3인 애들만 필터링
    const awayPool = await prisma.accounts.findMany({
      where: {
        rankScore: {
          gte: homeAccount.rankScore + 50, // 최대 + 50
          lte: homeAccount.rankScore - 50, // 최소 - 50
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
        where: { accountId: +away.accountId },
      });
      cnt++;
      if (cnt >= 100) {
        throw throwError('상대방을 찾을 수 없습니다.', 404);
      }
    }

    // 내 팀 점수
    const homeStyle = []; // 스타일
    const homeStats = {
      speed: 0,
      shootAccuracy: 0,
      shootPower: 0,
      defense: 0,
      stamina: 0,
    };
    for (const lineup of homeLineup) {
      const roster = await prisma.roster.findUnique({
        where: { rosterId: +lineup.rosterId },
      });
      if (!roster) throw throwError('로스터를 찾을 수 없습니다.', 404);

      const player = await prisma.players.findUnique({
        where: { playerId: +roster.playerId },
      });
      if (!player) throw throwError('선수를 찾을 수 없습니다', 404);

      homeStyle.push(player.style);

      homeStats.speed += player.speed;
      homeStats.shootAccuracy += player.shootAccuracy;
      homeStats.shootPower += player.shootPower;
      homeStats.defense += player.defense;
      homeStats.stamina += player.stamina;
    }

    homeStats.speed /= awayLineup.length;
    homeStats.shootAccuracy /= awayLineup.length;
    homeStats.shootPower /= awayLineup.length;
    homeStats.defense /= awayLineup.length;
    homeStats.stamina /= awayLineup.length;

    // 같은 팀 컬러가 2개 이상이면 팀 컬러 설정
    let isHomeStyle = ''; // 팀 컬러
    const homeCountMap = {};
    for (const item of homeStyle) {
      homeCountMap[item] = (homeCountMap[item] || 0) + 1;
      if (homeCountMap[item] >= 2) isHomeStyle = item;
    }

    // 상대 팀 점수
    const awayStyle = [];
    const awayStats = {
      speed: 0,
      shootAccuracy: 0,
      shootPower: 0,
      defense: 0,
      stamina: 0,
    };
    for (const lineup of awayLineup) {
      const roster = await prisma.roster.findUnique({
        where: { rosterId: +lineup.rosterId },
      });
      if (!roster) throw throwError('로스터를 찾을 수 없습니다.', 404);

      const player = await prisma.players.findUnique({
        where: { playerId: +roster.playerId },
      });
      if (!player) throw throwError('선수를 찾을 수 없습니다', 404);

      awayStyle.push(player.style);

      awayStats.speed += player.speed;
      awayStats.shootAccuracy += player.shootAccuracy;
      awayStats.shootPower += player.shootPower;
      awayStats.defense += player.defense;
      awayStats.stamina += player.stamina;
    }

    awayStats.speed /= awayLineup.length;
    awayStats.shootAccuracy /= awayLineup.length;
    awayStats.shootPower /= awayLineup.length;
    awayStats.defense /= awayLineup.length;
    awayStats.stamina /= awayLineup.length;

    // 같은 팀 컬러가 2개 이상이면 팀 컬러 성정
    let isAwayStyle = ''; // 팀 컬러
    const awayCountMap = {};
    for (const item of awayStyle) {
      awayCountMap[item] = (awayCountMap[item] || 0) + 1;
      if (awayCountMap[item] >= 2) isAwayStyle = item;
    }

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
    for (let i = 0; i < 10; i++) {
      // home 축구력?
      let home = (homeStats.speed + homeStats.defense + homeStats.stamina) / AVG_PLAYERS; // 250
      // away 축구력?
      let away = (awayStats.speed + awayStats.defense + awayStats.stamina) / AVG_PLAYERS; // 200

      // 스탯 차이에 따라 공 이동 거리 계산 (양 팀 간 스탯 차이의 비율 사용)
      const advantage = home - away;

      // 공 이동 및 이동 거리 (랜덤 요소 추가)
      const randomFactor =
        Math.round(Math.random() * DEFAULT_RANGE * 2) - // 0 ~ 60
        DEFAULT_RANGE + // -21 ~ 39
        DEFAULT_RANGE * (advantage / 100); // 9
      ball += randomFactor;
      if (ball) {
        gameLog.push(`${i}페이즈 : ${homeAccount.name} 팀이 공을 ${ball}m 전진했습니다. `);
      } else {
        gameLog.push(`${i}페이즈 : ${away.name} 팀이 공을 ${-ball}m 전진했습니다.`);
      }

      // home 골 찬스
      if (ball >= 80) {
        const goalRate = Math.min(homeStats.shootAccuracy + homeStats.shootPower, 100);
        if (goalRate - awayStats.defense / (Math.random() + 2) > Math.random() * 100) {
          // 골 확률
          // 200
          goal[0] += 1;
          gameLog.push(`${i}페이즈 : ${homeAccount.name} 팀이 득점했습니다.`);
        } else {
          gameLog.push(`${i}페이즈 : ${homeAccount.name} 팀의 슛이 빗나갔습니다.`);
        }
        ball = 0;
      }

      // away 골 찬스
      if (ball <= -80) {
        const goalRate = Math.min(awayStats.shootAccuracy + awayStats.shootPower, 100);
        // 골 확률
        if (goalRate - homeStats.defense / (Math.random() + 2) > Math.random() * 100) {
          goal[1] += 1;
          gameLog.push(`${i}페이즈 : ${away.name} 팀이 득점했습니다.`);
        } else {
          gameLog.push(`${i}페이즈 : ${away.name} 팀의 슛이 빗나갔습니다.`);
        }
        ball = 0;
      }

      // 경기 진행도에 따른 스탯 감소
      homeStats.stamina -= i;
      if (homeStats.stamina < 50) {
        homeStats.shootAccuracy *= 0.95;
        homeStats.shootPower *= 0.95;
        homeStats.speed *= 0.95;
        homeStats.defense *= 0.95;
      } else if (homeStats.stamina < 25) {
        homeStats.shootAccuracy *= 0.9;
        homeStats.shootPower *= 0.9;
        homeStats.speed *= 0.9;
        homeStats.defense *= 0.9;
      } else if (homeStats.stamina < 10) {
        homeStats.shootAccuracy *= 0.8;
        homeStats.shootPower *= 0.8;
        homeStats.speed *= 0.8;
        homeStats.defense *= 0.8;
      }

      awayStats.stamina -= i;
      if (awayStats.stamina < 50) {
        awayStats.shootAccuracy *= 0.95;
        awayStats.shootPower *= 0.95;
        awayStats.speed *= 0.95;
        awayStats.defense *= 0.95;
      } else if (awayStats.stamina < 25) {
        awayStats.shootAccuracy *= 0.9;
        awayStats.shootPower *= 0.9;
        awayStats.speed *= 0.9;
        awayStats.defense *= 0.9;
      } else if (awayStats.stamina < 10) {
        awayStats.shootAccuracy *= 0.8;
        awayStats.shootPower *= 0.8;
        awayStats.speed *= 0.8;
        awayStats.defense *= 0.8;
      }
    }

    // 무승부일 경우 승부차기
    if (goal[0] === goal[1]) {
      penaltyKick(homeLineup, awayLineup);
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
        where: { accountId: +accountId },
        data: {
          rankScore: result[0] ? homeAccount.rankScore + 10 : homeAccount.rankScore - 10,
        },
      });
      // away 랭크 점수 갱신
      const updateAwayScore = await tx.accounts.update({
        where: { accountId: +away.accountId },
        data: {
          rankScore: !result[0] ? away.rankScore + 10 : away.rankScore - 10,
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
