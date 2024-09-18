// updatePlayers.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


function calculateValue(player) {
    const { speed, shootAccuracy, shootPower, defense, stamina } = player;
  
    // 가중치 설정
    const accuracyWeight = 0.3;
    const powerWeight = 0.3;
    const speedWeight = 0.3;
    const staminaWeight = 0.05;
    const defenseWeight = 0.05;
  
    // 기본 가치 계산
    const baseValue =
      (shootAccuracy * accuracyWeight) +
      (shootPower * powerWeight) +
      (speed * speedWeight) +
      (stamina * staminaWeight) +
      (defense * defenseWeight);
  
    // 무작위 변동성 적용 (±5%)
    const variationPercentage = (Math.random() * 0.1) - 0.05;
    const value = baseValue * (1 + variationPercentage);
  
    return value;
}

// 가격 계산 함수
function calculatePrice(value) {
  // 가격 = 가치 * 10000
  return Math.round(value * 10000);
}

// 뽑기 확률 계산 함수
function calculatePickupRate(value) {
    // 최소값 1을 보장하기 위해 Math.max 사용
    return Math.max(Math.round((1 / value) * 1e5), 1); // 스케일링 조정 가능
}

// 선수들의 데이터를 업데이트하는 함수
async function updatePlayers() {
  try {
    // 모든 선수 데이터 가져오기
    const players = await prisma.players.findMany();

    // 각 선수의 데이터를 순차적으로 업데이트
    for (const player of players) {
      const { playerId } = player;

      // --------- 업데이트 내용 --------- //
      // 가치 계산
      const value = calculateValue(player);

      // 새로운 price와 pickUpRate 계산
      const price = calculatePrice(value);
      const pickUpRate = calculatePickupRate(value);
    
      // --------- 업데이트 내용 --------- //
      console.log(
        `Player ID: ${playerId}, Value: ${value}, Price: ${price}, PickUpRate: ${pickUpRate}`
      );

      // 선수 데이터 업데이트
      await prisma.players.update({
        where: { playerId },
        data: {
            pickUpRate,
            price,
        },
      });
      console.log(`Player ID: ${playerId} 업데이트 성공`);
    }

    console.log('선수 데이터가 성공적으로 업데이트되었습니다.');
  } catch (error) {
    console.error('선수 데이터 업데이트 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 함수 실행
updatePlayers();
