import { prisma } from '../utils/prisma/index.js';
import { throwError } from '../utils/error/error.handle.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import accountService from '../services/account.service.js';

/**
 * 회원 가입
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function signAccount(req, res, next) {
  const { id, name, password, confirmPassword } = req.body;
  try {
    const schema = Joi.object({
      id: Joi.string()
        .pattern(/^[a-zA-Z0-9]+$/)
        .min(6)
        .max(16)
        .required(),
      password: Joi.string().min(6).max(16).required(),
      confirmPassword: Joi.valid(Joi.ref(`password`)).required(),
      name: Joi.string()
        .pattern(/^[가-힣]+$/)
        .min(2)
        .max(4)
        .required(),
    });
    const { error } = schema.validate(req.body);
    if (error) throw throwError(`입력된 값이 잘못되었습니다.`, 400);

    const hashedPassword = await bcrypt.hash(password, 10);

    const existId = await prisma.accounts.findUnique({ where: { id: id } });
    if (existId) throw throwError(`중복된 아이디입니다.`, 409);

    let signAccount;
    await prisma.$transaction(async (tx) => {
      signAccount = await tx.accounts.create({
        data: { id: id, password: hashedPassword, name: name },
      });
      signAccount.accountId;

      await tx.pickupToken.createMany({
        data: Array(3).fill({
          accountId: signAccount.accountId,
          type: 'ALL',
        }),
      });

      await tx.cashLog.create({
        data: {
          accountId: signAccount.accountId,
          totalCash: 0,
          purpose: 'createAccount',
          cashChange: 0,
        },
      });
    });

    res.status(201).json({ id_info: { id: signAccount.id, name: signAccount.name } });
  } catch (error) {
    next(error);
  }
}
/**
 * 로그인
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function loginAccount(req, res, next) {
  const { id, password } = req.body;

  try {
    const account = await prisma.accounts.findFirst({
      where: { id },
    });
    if (!account) throw throwError(`계정이 존재하지 않습니다.`, 404);

    if (!bcrypt.compare(password, account.password))
      throw throwError(`비밀번호가 일치하지 않습니다.`, 401);

    const accessToken = jwt.sign({ accountId: account.accountId }, process.env.SESSION_SECRET_KEY, {
      expiresIn: `1d`,
    });

    res.header('authorization', `Bearer ${accessToken}`);

    return res.status(200).json({ message: '로그인에 성공했습니다.', accessToken: accessToken });
  } catch (error) {
    next(error);
  }
}
/**
 * 아이디 삭제
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export async function deleteAccount(req, res, next) {
  const accountId = +req.params.accountId;
  const authAccountId = +req.account;

  try {
    await accountService.checkAccount(accountId, authAccountId);

    await prisma.accounts.delete({
      where: { accountId: accountId },
    });

    return res.status(200).json({ message: `아이디가 삭제 되었습니다.` });
  } catch (error) {
    next(error);
  }
}
/**
 * 계정 정보 조회
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function inquireAccount(req, res, next) {
  const accountId = +req.params.accountId;
  const authAccountId = +req.account;

  console.log(accountId);
  try {
    const account = await accountService.checkAccount(accountId, authAccountId);

    const accountInfo = { name: account.name, rankScore: account.rankScore };

    res.status(200).json({ accountInfo });
  } catch (error) {
    next(error);
  }
}
/**
 * 랭킹 조회
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function checkRanking(req, res, next) {
  try {
    const ranking = await prisma.accounts.findMany({
      select: {
        id: true,
        name: true,
        rankScore: true,
      },
      orderBy: { rankScore: 'desc' },
    });

    const result = [];

    for (let i = 0; i < ranking.length; i++) {
      result.push({
        ranking: i + 1,
        id: ranking[i].id,
        name: ranking[i].name,
        rankScore: ranking[i].rankScore,
      });
    }

    res.status(200).json({ ranking: result });
  } catch (error) {
    next(error);
  }
}

/**
 * 보유한 뽑기권 조회
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function remainingToken(req, res, next) {
  const accountId = +req.params.accountId;
  const authAccountId = +req.account;

  try {
    await accountService.checkAccount(accountId, authAccountId);

    // all 뽑기권 갯수
    const AllPickupToken = await prisma.pickupToken.findMany({
      where: { accountId, type: 'all' },
    });

    // top100 뽑기권 갯수
    const top100PickupToken = await prisma.pickupToken.findMany({
      where: { accountId, type: 'top_100' },
    });

    // top500 뽑기권 갯수
    const top500PickupToken = await prisma.pickupToken.findMany({
      where: { accountId, type: 'top_500' },
    });

    return res.status(200).json({
      all: AllPickupToken.length || 0,
      TOP_100: top100PickupToken.length || 0,
      TOP_500: top500PickupToken.length || 0,
    });
  } catch (error) {
    next(error);
  }
}
