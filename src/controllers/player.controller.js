import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import { throwError } from '../utils/error.handle.js';
import accountService from '../services/account.service.js';
import { PICKUP_TYPE, PICKUP_AMOUNT, PICKUP_PRICE } from '../utils/enum.js';
import { calculateValue, calculatePrice, calculatePickupRate } from '../utils/valuation.js';

/**
 * 팀 편성 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function createLineup(req, res, next) {
  const accountId = +req.params.accountId;
  const rosterIds = +req.body.rosterIds;
  const authAccountId = +req.account;

  try {
    // 계정 존재 여부
    await accountService.checkAccount(accountId, authAccountId);

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
 * 선수 뽑기 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function pickupPlayer(req, res, next) {
  const accountId = +req.params.accountId;
  const { pickupType, pickupAmount } = req.body; // 뽑기권 종류, 뽑는 횟수
  const authAccountId = +req.account;

  try {
    // 계정 인증+인가
    await accountService.checkAccount(accountId, authAccountId);

    // 이거 캐시 구현할때 그대로 쓰셔도 될듯합니다
    // // 잔액 확인
    // const cashLog = await prisma.cashLog.findFirst({
    //   where: { accountId },
    //   orderBy: { createAt: 'desc' },
    // });
    // if (!cashLog || cashLog.totalCash < PICKUP_PRICE * numPulls)
    //   throw throwError('캐시 잔액이 부족합니다.', 402);

    // 뽑기권 확인
    if (!(pickupType in PICKUP_TYPE)) throw throwError('올바르지 않은 뽑기권 종류입니다.', 400);
    if (!(pickupAmount in PICKUP_AMOUNT)) throw throwError('올바르지 않은 뽑기 횟수입니다.', 400);

    const pickupTokens = await prisma.pickupToken.findMany({
      where: { accountId: accountId, type: PICKUP_TYPE[pickupType] },
      select: {
        pickupTokenId: true,
      },
    });
    if (pickupTokens.length < PICKUP_AMOUNT[pickupAmount])
      throw throwError('뽑기권이 부족합니다.', 400);

    let poolSize = 0;
    switch (PICKUP_TYPE[pickupType]) {
      case PICKUP_TYPE.ALL:
        poolSize = await prisma.players.findMany({
          select: {
            playerId: true,
          },
        }).length;
        break;
      case PICKUP_TYPE.TOP_500:
        poolSize = 500;
        break;
      case PICKUP_TYPE.TOP_100:
        poolSize = 100;
        break;
      default:
        break;
    }

    // 모든 선수 픽업확률 조회
    const playerList = await prisma.players.findMany({
      take: poolSize,
    });

    const result = await prisma.$transaction(
      async (tx) => {
        let result = [];

        // 뽑기권 변동 내역
        await tx.pickupTokenLog.create({
          data: {
            accountId: +accountId,
            type: PICKUP_TYPE[pickupType],
            purpose: `pickup ${PICKUP_AMOUNT[pickupAmount]} times`,
            amount: PICKUP_AMOUNT[pickupAmount],
          },
        });

        for (let i = 0; i < PICKUP_AMOUNT[pickupAmount]; i++) {
          let rateSum = 0;
          let pickup = null;
          // 뽑기
          if (PICKUP_TYPE[pickupType] == 'top_100') {
            let random = Math.random() * 1e5; // 0 ~ 100000
            playerList.forEach((player) => {
              rateSum += calculatePickupRate(calculateValue(player));
              if (pickup === null && rateSum >= random) pickup = player;
            });
          } else if (PICKUP_TYPE[pickupType] == 'top_500') {
            let random = Math.random() * (5 * 1e5); // 0 ~ 500000
            playerList.forEach((player) => {
              rateSum += calculatePickupRate(calculateValue(player));
              if (pickup === null && rateSum >= random) pickup = player;
            });
          } else {
            let random = Math.random() * (1e7 + 1e6 + 60); // 0 ~ 10000000
            playerList.forEach((player) => {
              rateSum += calculatePickupRate(calculateValue(player));
              if (pickup === null && rateSum >= random) pickup = player;
            });
          }

          // 혹시 안뽑히면
          if (!pickup) {
            i--;
            continue;
          }

          // 뽑은 선수 보유목록에 추가
          await tx.roster.create({
            data: {
              accountId: +accountId,
              playerId: pickup.playerId,
            },
          });
          result.push(pickup.playerName);
        }
        return result;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return res.status(201).json({ data: result });
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
  const authAccountId = +req.account;

  try {
    // 계정
    await accountService.checkAccount(accountId, authAccountId);

    // 보유 선수 정보
    const roster = await prisma.roster.findUnique({
      where: { accountId: accountId, rosterId: rosterId },
    });
    if (!roster) throw throwError('선수를 보유하고 있지 않습니다.', 404);

    // 가장 최근 캐쉬 변동 내역
    const cashLog = await prisma.cashLog.findFirst({
      where: { accountId: accountId },
      orderBy: { createAt: 'desc' },
    });
    if (!cashLog) throw throwError('캐시 기록이 존재하지 않습니다.', 404);

    // 라인업에 존재하면
    const lineup = await prisma.lineup.findMany({
      where: { accountId: accountId },
    });
    if (lineup) throw throwError('라인업에 있는 선수입니다. 라인업에서 해제해주십시오.', 409);

    // 선수 정보
    const player = await prisma.players.findFirst({
      where: { playerId: roster.playerId },
    });
    if (!player) throw throwError('선수가 존재하지 않습니다.', 404);

    const result = await prisma.$transaction(async (tx) => {
      // 캐쉬 변동 내역
      const result = await tx.cashLog.create({
        data: {
          accountId: accountId,
          totalCash: cashLog.totalCash + player.price,
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
  const authAccountId = +req.account;

  try {
    // 계정
    await accountService.checkAccount(accountId, authAccountId);

    // 보유 선수 목록 조회
    const roster = prisma.roster.findMany({
      where: { accountId },
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

/**
 * 뽑기권 구매 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function buyToken(req, res, next) {
  const accountId = +req.params.accountId;
  const { pickupType, pickupAmount } = req.body; // 뽑기권 종류, 뽑는 횟수
  const authAccountId = +req.account;

  try {
    const account = await accountService.checkAccount(accountId, authAccountId);

    // 뽑기권 확인
    if (!(pickupType in PICKUP_TYPE)) throw throwError('올바르지 않은 뽑기권 종류입니다.', 400);
    if (!(pickupAmount in PICKUP_AMOUNT)) throw throwError('올바르지 않은 뽑기 횟수입니다.', 400);

    // 잔액 확인
    const cashLog = await prisma.cashLog.findFirst({
      where: { accountId: accountId },
      orderBy: { createAt: 'desc' },
    });
    const cashUsage = PICKUP_PRICE[pickupType] * PICKUP_AMOUNT[pickupAmount];
    if (!cashLog || cashLog.totalCash < cashUsage) throw throwError('캐시 잔액이 부족합니다.', 402);

    const records = Array.from({ length: PICKUP_AMOUNT[pickupAmount] }, () => ({
      accountId: accountId,
      type: pickupType,
    }));

    await prisma.$transaction(async (tx) => {
      // 뽑기권 생성
      await tx.pickupToken.createMany({
        data: records,
      });

      // 캐쉬 반영
      await tx.cashLog.create({
        data: {
          accountId: accountId,
          totalCash: cashLog.totalCash - cashUsage,
          purpose: 'token',
          cashChange: -cashUsage,
        },
      });
    });

    return res.status(201).json({
      message: `${PICKUP_TYPE[pickupType]} 뽑기권 ${PICKUP_AMOUNT[pickupAmount]}장을 구입했습니다.`,
    });
  } catch (error) {
    next(error);
  }
}
//전체 선수 목록조회
export async function inquirePlayers(req, res, next) {
  const playerId = +req.params.playerId;
  try {
    const playerList = await prisma.players.findMany({
      where: { playerId: playerId },
      data: {
        playerName: playerName,
        speed: speed,
        shootAccuracy: shootAccuracy,
        shootPower: shootPower,
        defense: defense,
        stamina: stamina,
        style: style,
      },
    });
    res.status(200).json({ list_info: playerList });
  } catch (error) {
    next(error);
  }

}
//라인업 조회

export async function inquireLinenup(req, res, next) {
  const accountId = +req.params.accountId;

  try {
    const lineup = await prisma.lineup.findMany({
      where: { accountId },
    });

    res.status(200).json({ lineup });
  } catch (error) {
    next(error);
  }
  
}
//보유선수 상세정보

export async function name(req,res,next) {
  const accountId = +req.params.accountId;
  const authAccountId = +req.account;
  try{
    await accountService.checkAccount(accountId, authAccountId);
    const rosterPlayer =  await prisma.roster.findUnique({
      where: {playerId},
      select: {
        playerName:playerName,
        speed: speed,
        shootAccuracy: shootAccuracy,
        shootPower:shootPower,
        defense: defense,
        stamina: stamina,
        style: style,
        price: price,
      },
    })
    res.status(200).json({ rosterPlayerinfo: rosterPlayer });
  } catch (error) {
    next(error);
  }
}
