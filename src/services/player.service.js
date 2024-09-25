import { prisma } from '../utils/prisma/index.js';
import { UPGRADE_STAT_BONUSES } from '../utils/constants.js';

class PlayerService {
  constructor(prisma) {
    if (PlayerService.instance) {
      return PlayerService.instance;
    }

    this.prisma = prisma;
    PlayerService.instance = this;
  }

  /**
   * 선수 가치 계산
   * @param { Object } player
   * @returns { Int }
   */
  calculateValue(player, rank = null) {
    const { speed, shootAccuracy, shootPower, defense, stamina } = player;
    let bonus = 1;
    if (rank) {
      bonus = UPGRADE_STAT_BONUSES.get(rank);
    }
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

    return baseValue * bonus;
  }
  /**
   * 선수 가격 계산
   * @param { Int } value
   * @returns { Int }
   */
  calculatePrice(value) {
    // 가격 = 가치 * 10000
    return Math.round(value * 60);
  }
  /**
   * 뽑기 확률 계산
   * @param { Int } value
   * @returns { Int }
   */
  calculatePickupRate(value) {
    // 최소값 1을 보장하기 위해 Math.max 사용
    return Math.max(Math.round((1 / value) * 1e5), 1); // 스케일링 조정 가능
  }
}

const playerService = new PlayerService(prisma);
export default playerService;
