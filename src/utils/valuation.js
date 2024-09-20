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