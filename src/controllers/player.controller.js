import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import { throwError } from '../utils/error/error.handle.js';
import accountService from '../services/account.service.js';
import playerService from '../services/player.service.js';
import { checkCash, createCashLog } from './cash.controller.js';
import {
  PICKUP_TYPE,
  PICKUP_AMOUNT,
  PICKUP_PRICE,
  PLAYER_RANKS,
  UPGRADE_RESULTS,
} from '../utils/enum.js';
import {
  UPGRADE_COST,
  MAX_UPGRADE_MATERIALS,
  UPGRADE_STAT_BONUSES,
  UPGRADE_SUCCESS_RATES,
  UPGRADE_MATERIAL_BONUSES,
  DOWNGRADE_RATES,
  DESTRUCTION_RATES,
  NEXT_RANK,
  PREV_RANK,
} from '../utils/constants.js';
import { MESSAGE_UPGRADE_RESULT } from '../utils/messages.js';

/**
 * 팀 편성 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function createLineup(req, res, next) {
  const accountId = +req.params.accountId;
  const { rosterIds } = req.body;
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
    console.log(rosterIds);

    if (rosterIds.length !== 3) throw throwError('3명의 선수만 선택해주십시오.', 400);

    // 같은 선수가 포함된 경우
    const duplicated = new Set(rosterIds).size !== rosterIds.length;
    if (duplicated) throw throwError('같은 선수가 여러명 포함되어있습니다.', 409);

    // 보유하지 않은 선수가 포함된 경우
    const rosterArr = roster.map((item) => item.rosterId);
    const notIncludes = rosterIds.filter((id) => !rosterArr.includes(id));
    if (notIncludes.length > 0) throw throwError('보유하지 않은 선수가 포함 되어있습니다.', 400);

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
    await prisma.$transaction(async (tx) => {
      // 기존 편성 삭제
      await tx.lineup.deleteMany({
        where: { accountId: accountId },
      });

      // 편성 추가
      const createLineup = rosterIds.map((rosterId) => {
        return tx.lineup.create({
          data: {
            accountId: accountId,
            rosterId: rosterId,
          },
        });
      });

      await Promise.all(createLineup);
    });

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

    // 뽑기권 확인
    if (!(pickupType in PICKUP_TYPE)) throw throwError('올바르지 않은 뽑기권 종류입니다.', 400);
    if (!(pickupAmount in PICKUP_AMOUNT)) throw throwError('올바르지 않은 뽑기 횟수입니다.', 400);

    const pickupTokens = await prisma.pickupToken.findMany({
      where: { accountId: accountId, type: PICKUP_TYPE[pickupType] },
      take: PICKUP_AMOUNT[pickupAmount],
      orderBy: { createAt: 'asc' },
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

            for (const player of playerList) {
              rateSum += playerService.calculatePickupRate(playerService.calculateValue(player));
              if (pickup === null && rateSum >= random) pickup = player;
            }
          } else if (PICKUP_TYPE[pickupType] == 'top_500') {
            let random = Math.random() * (5 * 1e5); // 0 ~ 500000

            for (const player of playerList) {
              rateSum += playerService.calculatePickupRate(playerService.calculateValue(player));
              if (pickup === null && rateSum >= random) pickup = player;
            }
          } else {
            let random = Math.random() * 1e6; // 0 ~ 1000000
            for (const player of playerList) {
              rateSum += playerService.calculatePickupRate(playerService.calculateValue(player));
              if (pickup === null && rateSum >= random) pickup = player;
            }
          }

          await tx.pickupToken.deleteMany({
            where: {
              pickupTokenId: { in: pickupTokens.map((token) => token.pickupTokenId) },
            },
          });

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
 * 선수 강화 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function upgradePlayer(req, res, next) {
  const accountId = +req.params.accountId;
  const authAccountId = +req.account;
  const { targetId, materials } = req.body; // 강화할 선수 rosterId // 강화재료로 소모할 선수들

  try {
    // 계정 인증+인가
    await accountService.checkAccount(accountId, authAccountId);

    // 파라미터 무결성 확인
    if (!+targetId || isNaN(+targetId)) throw throwError('올바르지 않은 targetId 형식입니다.', 400);
    if (!materials) materials = []; // 빈 강화재료 input 형식 통일
    if (!Array.isArray(materials)) throw throwError('올바르지 않은 materials 형식입니다.', 400);

    for (const material of materials) {
      if (!material || isNaN(material))
        throw throwError('올바르지 않은 materials 형식입니다.', 400);
    }

    // 최대 강화재료 수 초과 여부 확인
    if (materials.length > MAX_UPGRADE_MATERIALS)
      throw throwError(`강화재료는 최대 ${MAX_UPGRADE_MATERIALS}개만 사용 가능합니다.`, 400);

    let materialSet = new Set(materials);
    if (materials.length != materialSet.size)
      throw throwError('동일한 선수를 중복해서 강화재료로 선택할 수 없습니다.', 400);

    // 캐시 잔액 확인
    await checkCash(prisma, accountId, UPGRADE_COST);

    // 강화대상 선수 보유 여부 확인
    const targetRoster = await prisma.roster.findFirst({
      where: {
        accountId: accountId,
        rosterId: +targetId,
      },
      select: {
        rosterId: true,
        rank: true,
      },
    });

    if (!targetRoster) throw throwError('강화할 선수를 보유하고 있지 않습니다.', 404);

    // 라인업에 있는 선수 선택 불가능
    const targetLineup = await prisma.roster.findFirst({
      where: {
        accountId: accountId,
        rosterId: +targetId,
      },
      select: {
        rosterId: true,
      },
    });

    if (targetLineup.length > 0) throw throwError('강화할 선수를 라인업에서 먼저 빼주세요', 400);

    // 최대강화 도달 여부 확인
    let targetRank = targetRoster.rank;
    if (targetRank === PLAYER_RANKS.LEGENDARY)
      throw throwError('이미 최대로 강화된 선수입니다.', 400);

    // 기본 강화 성공률
    let successRate = UPGRADE_SUCCESS_RATES.get(targetRank);
    let bonusRate = 0;

    // 강화재료 적용
    for (const materialId of materials) {
      const materialRoster = await prisma.roster.findFirst({
        where: {
          accountId: accountId,
          rosterId: +materialId,
        },
        select: {
          rosterId: true,
          rank: true,
        },
      });

      // 강화재료로 사용할 선수 보유 여부 확인
      if (!materialRoster)
        throw throwError('강화재료로 사용할 선수를 보유하고 있지 않습니다.', 400);

      // 라인업에 있는 선수 선택 불가능
      const materialLineup = await prisma.roster.findFirst({
        where: {
          accountId: accountId,
          rosterId: +materialId,
        },
        select: {
          rosterId: true,
        },
      });

      if (materialLineup.length > 0)
        throw throwError('강화재료로 사용할 선수를 라인업에서 먼저 빼주세요', 400);

      // 강화 보너스 성공률 적용
      bonusRate += UPGRADE_MATERIAL_BONUSES.get(materialRoster.rank);
      console.log(bonusRate);
    }
    successRate = Math.min(successRate * (1 + bonusRate), 1);
    console.log(successRate);

    // 강화 진행
    let result = null;
    await prisma.$transaction(
      async (tx) => {
        let successRandom = Math.random();

        // 강화 성공시:
        if (successRate > successRandom) {
          // 선수 강화
          result = UPGRADE_RESULTS.SUCCESS;
          await tx.roster.update({
            data: {
              rank: NEXT_RANK.get(targetRank),
            },
            where: {
              rosterId: +targetId,
            },
          });

          // 강화 실패시:
        } else {
          // 강화 페널티 판정
          let penaltyRandom = Math.random();
          // 파괴
          if (DESTRUCTION_RATES.get(targetRank) > penaltyRandom) {
            result = UPGRADE_RESULTS.DESTROYED;
            await tx.roster.delete({
              where: {
                rosterId: +targetId,
              },
            });
            // 등급 하락
          } else if (DOWNGRADE_RATES.get(targetRank) > penaltyRandom) {
            result = UPGRADE_RESULTS.DOWNGRADE;
            await tx.roster.update({
              data: {
                rank: PREV_RANK.get(targetRank),
              },
              where: {
                rosterId: +targetId,
              },
            });
            // 페널티 없음
          } else {
            result = UPGRADE_RESULTS.FAILURE;
          }
        }

        // 캐시 소모
        const purpose = 'upgrade';
        await createCashLog(tx, purpose, accountId, -UPGRADE_COST);

        // 강화 재료 소모
        for (const materialId of materials) {
          await prisma.roster.delete({
            where: {
              rosterId: +materialId,
            },
          });
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return res.status(201).json({ message: MESSAGE_UPGRADE_RESULT.get(result) });
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
      include: { player: true },
    });
    if (!roster) throw throwError('선수를 보유하고 있지 않습니다.', 404);
    if (!roster.player) throw throwError('선수가 존재하지 않습니다.', 404);

    // 가장 최근 캐쉬 변동 내역
    const cashLog = await prisma.cashLog.findFirst({
      where: { accountId: accountId },
      orderBy: { createAt: 'desc' },
    });
    if (!cashLog) throw throwError('캐시 기록이 존재하지 않습니다.', 404);

    // 라인업에 존재하면
    const lineup = await prisma.lineup.findMany({
      where: { accountId, rosterId },
    });
    if (lineup.length > 0)
      throw throwError('라인업에 있는 선수입니다. 라인업에서 해제해주십시오.', 409);

    // 선수 가격
    const price = playerService.calculatePrice(
      playerService.calculateValue(roster.player, roster.rank),
    );

    const result = await prisma.$transaction(async (tx) => {
      // 캐쉬 변동 내역
      const purpose = 'sell';
      const result = await createCashLog(tx, purpose, accountId, price);

      // 선수 판매
      await tx.roster.delete({
        where: { rosterId: rosterId, accountId: accountId },
      });
      return result;
    });

    return res.status(201).json({
      message: `${roster.player.playerName} 선수를 판매했습니다.`,
      totalCash: result,
    });
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
    const roster = await prisma.roster.findMany({
      where: { accountId },
      select: {
        rosterId: true,
        playerId: true,
        rank: true,
      },
    });
    if (!roster) throw throwError('선수를 보유하고 있지 않습니다.', 404);

    // 데이터 가공
    const result = [];
    for (const item of roster) {
      const player = await prisma.players.findFirst({
        where: { playerId: item.playerId },
        select: {
          playerName: true,
          style: true,
        },
      });
      const playerName = player.playerName;
      const style = player.style;
      const rank = item.rank;

      result.push({ rosterId: item.rosterId, playerId: item.playerId, playerName, rank, style });
    }

    res.status(200).json({ data: result });
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
    const cashUsage = PICKUP_PRICE[pickupType] * PICKUP_AMOUNT[pickupAmount];
    await checkCash(prisma, accountId, cashUsage);

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
      const purpose = 'token';
      await createCashLog(tx, purpose, accountId, -cashUsage);
    });

    return res.status(201).json({
      message: `${PICKUP_TYPE[pickupType]} 뽑기권 ${PICKUP_AMOUNT[pickupAmount]}장을 구입했습니다.`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 전체 선수 목록조회
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function getAllPlayers(req, res, next) {
  try {
    const playerList = await prisma.players.findMany({});

    // 데이터 가공
    const result = [];
    for (const player of playerList) {
      // 선수 가치
      const value = playerService.calculateValue(player);
      // 선수 가격
      const price = playerService.calculatePrice(value);
      // 선수 뽑기
      const pickupRate = playerService.calculatePickupRate(value);

      result.push({
        playerName: player.playerName,
        speed: player.speed,
        shootAccuracy: player.shootAccuracy,
        shootPower: player.shootPower,
        defense: player.defense,
        stamina: player.stamina,
        style: player.style,
        price: price,
        pickupRate: pickupRate,
      });
    }

    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * 라인업 조회
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function getLineup(req, res, next) {
  const accountId = +req.params.accountId;
  const authAccountId = +req.account;

  try {
    await accountService.checkAccount(accountId, authAccountId);

    // 라인업 조회
    const lineup = await prisma.lineup.findMany({
      where: { accountId },
      select: {
        rosterId: true,
      },
    });
    if (!lineup || lineup.length < 3) throw throwError('라인업에 선수가 존재하지 않습니다.', 404);

    // 데이터 가공
    const result = [];
    for (const item of lineup) {
      // 라인업의 로스터 조회
      const roster = await prisma.roster.findFirst({
        where: { rosterId: item.rosterId },
        select: {
          playerId: true,
          rank: true,
        },
      });

      // 선수 이름
      const player = await prisma.players.findFirst({
        where: { playerId: roster.playerId },
        select: {
          playerName: true,
          style: true,
        },
      });
      const rank = roster.rank;
      const playerName = player.playerName;
      const style = player.style;
      result.push({ playerName, rank, style });
    }

    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * 보유 선수 상세보기 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function rosterPl(req, res, next) {
  const accountId = +req.params.accountId;
  const rosterId = +req.body.rosterId;
  const authAccountId = +req.account;
  try {
    await accountService.checkAccount(accountId, authAccountId);

    const rosterPlayer = await prisma.roster.findUnique({
      where: { rosterId },
      include: { player: true },
    });

    // 선수 가격
    const price = playerService.calculatePrice(
      playerService.calculateValue(rosterPlayer.player, rosterPlayer.rank),
    );

    // 데이터 가공
    let bonus = UPGRADE_STAT_BONUSES.get(rosterPlayer.rank);

    const result = {
      playerName: rosterPlayer.player.playerName,
      speed: Math.round(rosterPlayer.player.speed * bonus),
      shootAccuracy: Math.round(rosterPlayer.player.shootAccuracy * bonus),
      shootPower: Math.round(rosterPlayer.player.shootPower * bonus),
      defense: Math.round(rosterPlayer.player.defense * bonus),
      stamina: Math.round(rosterPlayer.player.stamina * bonus),
      style: rosterPlayer.player.style,
      price: price,
      rank: rosterPlayer.rank,
    };

    res.status(200).json({ playerInfo: result });
  } catch (error) {
    next(error);
  }
}
