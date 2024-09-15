import { prisma } from '../utils/prisma/index.js';

/**
 * 팀 편성 로직
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function createLineUp(req, res, next) {
  const { accountId } = req.params;
  const { roasterIds } = req.body;
  const { authAccountId } = req.account;

  try {
    // 계정 존재 여부
    const account = await prisma.accounts.findUnique({
      where: { accountId: +accountId },
    });
    if (!account) return res.status(404).json({ message: '계정을 찾을 수 없습니다.' });
    else if (+authAccountId !== +accountId)
      return res.status(403).json({ message: '권한이 없습니다.' });

    // 선수 보유 여부
    const roaster = await prisma.roaster.findMany({
      where: { accountId: +accountId },
      select: {
        roasterId: true,
      },
    });
    if (roaster.length < 3) return res.status(400).json({ message: '선수가 부족합니다.' });

    // 보유하지 않은 선수가 포함된 경우
    const roasterArr = roaster.map((item) => item.roasterId);
    const notIncludes = roasterIds.filter((id) => !roasterArr.includes(id));
    if (notIncludes.length > 0)
      return res.status(400).json({ message: '보유하지 않은 선수가 포함 되어있습니다.' });

    // 팀 편성
    await prisma.$transaction(async (tx) => {
      // 기존 편성 삭제
      await tx.lineUp.deleteMany({
        where: { accountId: +accountId },
      });

      // 편성 추가
      const createLineUp = roasterIds.map((roasterId) => {
        tx.lineUp.create({
          data: {
            accountId: +accountId,
            roasterId: roasterId,
          },
        });
      });

      await Promise.all(createLineUp);
    });

    return res.status(201).json({ message: '팀 편셩이 완료되었습니다.' });
  } catch (error) {
    next(error);
  }
}
