import { throwError } from '../utils/error.handle.js';

class PlayerService {
  constructor(prisma) {
    this.prisma = prisma;
  }
}

export default PlayerService;
