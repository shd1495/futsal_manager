import { throwError } from '../utils/error.handle.js';
import { prisma } from '../utils/prisma/index.js';

class AccountService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async checkAccount(accountId, authAccountId) {
    const account = await prisma.accounts.findUnique({
      where: { accountId },
    });

    if (!account) throw throwError('계정을 찾을 수 없습니다.', 404);
    else if (authAccountId !== undefined && authAccountId !== accountId)
      throw throwError('권한이 없습니다.', 403);

    return account;
  }
}

export default AccountService;
