import { prisma } from '../utils/prisma/index.js';
import { throwError } from '../utils/error.handle.js';
import { calculateValue } from '../utils/valuation.js';
import AccountService from '../services/account.service.js';

const accountService = new AccountService(prisma);

async function penaltyKick(hostLineup, opponentLineup) {
  
  // 호스트 팀에서 defense 값이 가장 높은 선수 찾기
  let hostDefender = hostLineup[0]; // 첫 번째 선수를 기본으로 설정
  for (let i = 1; i < hostLineup.length; i++) {
    if (hostLineup[i].defense > hostDefender.defense) {
      hostDefender = hostLineup[i];
    }
  }

  // 상대 팀에서 defense 값이 가장 높은 선수 찾기
  let opponentDefender = opponentLineup[0]; // 첫 번째 선수를 기본으로 설정
  for (let i = 1; i < opponentLineup.length; i++) {
    if (opponentLineup[i].defense > opponentDefender.defense) {
      opponentDefender = opponentLineup[i];
    }
  }

  // 승부차기 로직
  let hostPenaltyScore = 0;
  let opponentPenaltyScore = 0;
  let round = 1;

  while (round <= 3 || hostPenaltyScore === opponentPenaltyScore) {
    // 공격자는 라인업 순서대로 돌아가며 슛을 함
    const hostAttacker = hostLineup[(round - 1) % hostLineup.length];
    const opponentAttacker = opponentLineup[(round - 1) % opponentLineup.length];

    // 호스트 팀의 공격: 호스트 공격자 vs 상대 수비자
    if (performkick(hostAttacker, opponentDefender)) {
      hostPenaltyScore++;
    }

    // 상대 팀의 공격: 상대 공격자 vs 호스트 수비자
    if (performKick(opponentAttacker, hostDefender)) {
      opponentPenaltyScore++;
    } 

    // 승부가 나면 종료, 3라운드 후에도 같으면 계속 반복
    if (round >= 3 && hostPenaltyScore !== opponentPenaltyScore) {
      break;
    }

    round++;
  }

  // 결과 반환
  if (hostPenaltyScore > opponentPenaltyScore) {
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
    // 여기서 lineup.length === 3인 애들만 필터링
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
    // 페이즈 10 게임

    // 이후 무승부라면
    let isWin;
    if (hostScore === opponentScore) {
      isWin = await penaltyKick(hostLineup, opponentLineup);
    }

    const game = await prisma.$transaction(async (tx) => {
      // 경기 결과 등록 
      // $$ 상대방 game도 등록해줘야 함 $$
      const game = await tx.game.create({
        data: {
          hostId: accountId,
          opponentId: opponent.accountId,
          win: isWin,
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


