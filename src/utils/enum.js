export const PICKUP_TYPE = Object.freeze({
  ALL: 'all',
  TOP_500: 'top_500',
  TOP_100: 'top_100',
});

export const PICKUP_AMOUNT = Object.freeze({
  SINGLE: 1,
  TEN: 10,
});

export const PICKUP_PRICE = Object.freeze({
  ALL: 100,
  TOP_500: 3300,
  TOP_100: 4900,
});

export const PLAYER_RANKS = Object.freeze({
  NORMAL: 'normal',
  MAGIC: 'magic',
  RARE: 'rare',
  UNIQUE: 'unique',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
});

export const UPGRADE_RESULTS = Object.freeze({
  SUCCESS: 'success',
  FAILURE: 'failure',
  DOWNGRADE: 'downgrade',
  DESTROYED: `destroyed`,
});