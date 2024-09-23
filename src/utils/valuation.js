/**
 * 선수 가치 계산 함수
 * @param { String } player
 * @returns { Int }
 */
export function calculateValue(player) {
  const { speed, shootAccuracy, shootPower, defense, stamina } = player;

  // 가중치 설정
  const accuracyWeight = 0.3;
  const powerWeight = 0.3;
  const speedWeight = 0.3;
  const staminaWeight = 0.05;
  const defenseWeight = 0.05;

  // 기본 가치 계산
  const baseValue =
    shootAccuracy * accuracyWeight +
    shootPower * powerWeight +
    speed * speedWeight +
    stamina * staminaWeight +
    defense * defenseWeight;

  return baseValue;
}
/**
 * 선수 가격 계산 함수
 * @param { Int } value
 * @returns { Int }
 */
export function calculatePrice(value) {
  // 가격 = 가치 * 10000
  return Math.round(value * 60);
}

/**
 * 뽑기 확률 계산 함수
 * @param { Int } value
 * @returns
 */
export function calculatePickupRate(value) {
  // 최소값 1을 보장하기 위해 Math.max 사용
  return Math.max(Math.round((1 / value) * 1e5), 1); // 스케일링 조정 가능
}
