import { UPGRADE_RESULTS } from '../utils/enum.js';

export const MESSAGE_UPGRADE_RESULT = new Map([
    [UPGRADE_RESULTS.SUCCESS, "강화에 성공하여 선수의 등급이 한 단계 상승했습니다!"],
    [UPGRADE_RESULTS.FAILURE, "강화에 실패했지만 다행히 아무 일도 일어나지 않았습니다!"],
    [UPGRADE_RESULTS.DOWNGRADE, "강화에 실패하여 선수의 등급이 한 단계 하락했습니다!"],
    [UPGRADE_RESULTS.DESTROYED, "강화에 실패하여 선수가 파괴되었습니다!"],
]);