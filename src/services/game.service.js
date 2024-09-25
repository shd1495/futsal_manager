import { prisma } from '../utils/prisma/index.js';
import { UPGRADE_STAT_BONUSES } from '../utils/constants.js';

class GameService {
  constructor(prisma) {
    if (GameService.instance) {
      return GameService.instance;
    }

    this.prisma = prisma;
    GameService.instance = this;
  }

  /**
   * 승부 차기
   * @param {Object} homeLineup
   * @param {Object} awayLineup
   * @returns {Boolean} isWin
   */
  penaltyKick(homeLineup, awayLineup) {
    // // 호스트 팀에서 defense 값이 가장 높은 선수 찾기
    let homeDefender = homeLineup[0].roster.player;
    for (const lineup of homeLineup) {
      if (lineup.roster.player.defense > homeDefender.defense) {
        homeDefender = lineup.roster.player;
      }
    }

    // 상대 팀에서 defense 값이 가장 높은 선수 찾기
    let awayDefender = awayLineup[0].roster.player;
    for (const lineup of awayLineup) {
      if (lineup.roster.player.defense > awayDefender.defense) {
        awayDefender = lineup.roster.player;
      }
    }

    // 승부차기 로직
    let homePenaltyScore = 0;
    let awayPenaltyScore = 0;
    let round = 1;

    while (round <= homeLineup.length || homePenaltyScore === awayPenaltyScore) {
      // 공격자는 라인업 순서대로 돌아가며 슛을 함
      const homeAttacker = homeLineup[(round - 1) % homeLineup.length].roster.player;
      const awayAttacker = awayLineup[(round - 1) % awayLineup.length].roster.player;

      // 호스트 팀의 공격: 호스트 공격자 vs 상대 수비자
      if (gameService.performKick(homeAttacker, awayDefender)) {
        homePenaltyScore++;
      }

      // 상대 팀의 공격: 상대 공격자 vs 호스트 수비자
      if (gameService.performKick(awayAttacker, homeDefender)) {
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

  /**
   * 킥 수행
   * @param {*} attacker
   * @param {*} defender
   * @returns
   * @author 공격자의 슛 정밀도와 슛 파워를 더한 값 vs 수비자의 디펜스
   */
  performKick(attacker, defender) {
    const attackScore = attacker.shootAccuracy + attacker.shootPower;
    const randomAttack = Math.random() * attackScore;
    const randomDefense = Math.random() * defender.defense;

    return randomAttack > randomDefense;
  }

  /**
   * 팀 스탯 계산
   * @param {Object} lineup
   * @returns {Object} styles, stats
   */
  calculateTeamStats(lineup) {
    const styles = [];
    const stats = {
      speed: 0,
      shootAccuracy: 0,
      shootPower: 0,
      defense: 0,
      stamina: 0,
    };

    for (const lineupItem of lineup) {
      styles.push(lineupItem.roster.player.style);

      // 기본 스탯
      stats.speed += lineupItem.roster.player.speed;
      stats.shootAccuracy += lineupItem.roster.player.shootAccuracy;
      stats.shootPower += lineupItem.roster.player.shootPower;
      stats.defense += lineupItem.roster.player.defense;
      stats.stamina += lineupItem.roster.player.stamina;

      // 랭크 보정치 적용
      let rank = lineupItem.roster.rank;
      let bonus = UPGRADE_STAT_BONUSES.get(rank);
      stats.speed *= bonus;
      stats.shootAccuracy *= bonus;
      stats.shootPower *= bonus;
      stats.defense *= bonus;
      stats.stamina *= bonus;
    }

    return { styles, stats };
  }

  /**
   * 팀 컬러
   * @param {Array} styles
   * @returns {String} style
   */
  getTeamStyle(styles) {
    const countMap = {};
    let teamStyle = '';

    for (const item of styles) {
      countMap[item] = (countMap[item] || 0) + 1;
      if (countMap[item] >= 2) teamStyle = item;
    }

    return teamStyle;
  }

  /**
   * 스탯 설정
   * @param {Object} player
   * @param {float} amount
   * @param {String} operator
   */
  modifyStats(player, amount, operator, modifyStamina = true) {
    if (operator === '+') {
      player.speed += amount;
      player.shootAccuracy += amount;
      player.shootPower += amount;
      player.defense += amount;
      if (modifyStamina) player.stamina += amount;
    } else if (operator === '*') {
      player.speed *= amount;
      player.shootAccuracy *= amount;
      player.shootPower *= amount;
      player.defense *= amount;
      if (modifyStamina) player.stamina *= amount;
    } else if (operator === '/') {
      if (amount === 0) throw throwError('잘못된 요청입니다.', 400);
      player.speed /= amount;
      player.shootAccuracy /= amount;
      player.shootPower /= amount;
      player.defense /= amount;
      if (modifyStamina) player.stamina /= amount;
    }
  }

  /**
   * ELO 계산
   * @param {Int} homeElo
   * @param {Int} awayElo
   * @param {Boolean} isWin
   * @param {Int} kFactor
   * @returns
   * @author 공격자의 슛 정밀도와 슛 파워를 더한 값 vs 수비자의 디펜스
   */
  calculateElo(homeElo, awayElo, isWin, kFactor = 32) {
    const expectedScore = 1 / (1 + Math.pow(10, (awayElo - homeElo) / 400));
    const winFactor = isWin ? 1 : 0;

    return homeElo + kFactor * (winFactor - expectedScore);
  }
}

const gameService = new GameService(prisma);
export default gameService;
