import { throwError } from '../utils/error/error.handle.js';
import { prisma } from '../utils/prisma/index.js';

class AccountService {
  constructor(prisma) {
    if (AccountService.instance) {
      return AccountService.instance;
    }

    this.prisma = prisma;
    AccountService.instance = this;
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

const accountService = new AccountService(prisma);
export default accountService;
