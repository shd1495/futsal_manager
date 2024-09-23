import { throwError } from '../utils/error.handle.js';

class AccountService {
  constructor(prisma) {
    this.prisma = prisma;
  }
}

export default AccountService;
