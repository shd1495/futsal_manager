import { throwError } from '../utils/error.handle.js';

/**
 * 계정 존재 여부 검증
 * @param {Object} prisma
 * @param {Number} accountId
 * @param {Number} authAccountId
 * @returns {Object||Null} account
 */
export async function checkAccount(prisma, accountId, authAccountId) {
  const account = await prisma.accounts.findUnique({
    where: { accountId: accountId },
  });
  if (!account) throw throwError('계정을 찾을 수 없습니다.', 404);
  else if (authAccountId !== accountId) throw throwError('권한이 없습니다.', 403);

  return account;
}
