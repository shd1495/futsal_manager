import { PLAYER_RANKS } from './enum.js';

/**
 * 팀 인원
 */
export const NUM_PLAYERS = 3;

/**
 * 공 이동 기본 랜덤 계수
 */
export const RANDOM_RANGE = 30;

/**
 * 슛 시도 가능 거리
 */
export const SHOOTABLE_DISTANCE = 80;

/**
 * 팀 컬러 보너스 비율
 */
export const TEAM_COLOR_ADVANTAGE = 1.1;

/**
 * 강화당 소모 캐시
 */
export const UPGRADE_COST = 500;

/**
 * 최대 사용가능 강화재료 수
 */
export const MAX_UPGRADE_MATERIALS = 5;

/**
 * 강화 스탯 상승률 (올스탯+)
 * @key 현재 등급
 * @value 노말 대비 상승률
 */
export const UPGRADE_STAT_BONUSES = new Map([
  [PLAYER_RANKS.NORMAL, 1.0],
  [PLAYER_RANKS.MAGIC, 1.02],
  [PLAYER_RANKS.RARE, 1.05],
  [PLAYER_RANKS.UNIQUE, 1.09],
  [PLAYER_RANKS.EPIC, 1.15],
  [PLAYER_RANKS.LEGENDARY, 1.25],
]);

/**
 * 강화 성공 기본확률
 * @key 현재 등급
 * @value 성공 확률
 */
export const UPGRADE_SUCCESS_RATES = new Map([ 
    [PLAYER_RANKS.NORMAL, 0.75],    // normal -> magic
    [PLAYER_RANKS.MAGIC, 0.50],     // magic -> rare
    [PLAYER_RANKS.RARE, 0.25],      // rare -> unique
    [PLAYER_RANKS.UNIQUE, 0.05],    // unique -> epic
    [PLAYER_RANKS.EPIC, 0.01],      // epic -> legendary
]);

/**
 * 강화재료 사용시 성공확률 증가량
 * @key 강화재료 등급
 * @value 성공확률 증가량 (추가확률끼리는 합연산, 최종적용은 곱연산)
 */
export const UPGRADE_MATERIAL_BONUSES = new Map([
  [PLAYER_RANKS.NORMAL, 0.1],
  [PLAYER_RANKS.MAGIC, 0.2],
  [PLAYER_RANKS.RARE, 0.3],
  [PLAYER_RANKS.UNIQUE, 0.5],
  [PLAYER_RANKS.EPIC, 1.0],
  [PLAYER_RANKS.LEGENDARY, 2.0],
]);

/**
 * 강화 실패시 등급하락 확률
 * @key 현재 등급
 * @value 등급하락 확률
 */
export const DOWNGRADE_RATES = new Map([
  [PLAYER_RANKS.NORMAL, 0.0], // normal -> magic
  [PLAYER_RANKS.MAGIC, 0.1], // magic -> rare
  [PLAYER_RANKS.RARE, 0.1], // rare -> unique
  [PLAYER_RANKS.UNIQUE, 0.1], // unique -> epic
  [PLAYER_RANKS.EPIC, 0.09], // epic -> legendary
]);

/**
 * 강화 실패시 파괴 확률
 * @key 현재 등급
 * @value 등급하락 확률
 */
export const DESTRUCTION_RATES = new Map([
  [PLAYER_RANKS.NORMAL, 0.0], // normal -> magic
  [PLAYER_RANKS.MAGIC, 0.0], // magic -> rare
  [PLAYER_RANKS.RARE, 0.0], // rare -> unique
  [PLAYER_RANKS.UNIQUE, 0.0], // unique -> epic
  [PLAYER_RANKS.EPIC, 0.01], // epic -> legendary
]);

/**
 * 상위 등급
 * @key 현재 등급
 * @value 1단계 위 등급
 */
export const NEXT_RANK = new Map([
  [PLAYER_RANKS.NORMAL, PLAYER_RANKS.MAGIC],
  [PLAYER_RANKS.MAGIC, PLAYER_RANKS.RARE],
  [PLAYER_RANKS.RARE, PLAYER_RANKS.UNIQUE],
  [PLAYER_RANKS.UNIQUE, PLAYER_RANKS.EPIC],
  [PLAYER_RANKS.EPIC, PLAYER_RANKS.LEGENDARY],
  [PLAYER_RANKS.LEGENDARY, PLAYER_RANKS.LEGENDARY],
]);

/**
 * 하위 등급
 * @key 현재 등급
 * @value 1단계 아래 등급
 */
export const PREV_RANK = new Map([
  [PLAYER_RANKS.NORMAL, PLAYER_RANKS.NORMAL],
  [PLAYER_RANKS.MAGIC, PLAYER_RANKS.NORMAL],
  [PLAYER_RANKS.RARE, PLAYER_RANKS.MAGIC],
  [PLAYER_RANKS.UNIQUE, PLAYER_RANKS.RARE],
  [PLAYER_RANKS.EPIC, PLAYER_RANKS.UNIQUE],
  [PLAYER_RANKS.LEGENDARY, PLAYER_RANKS.EPIC],
]);
