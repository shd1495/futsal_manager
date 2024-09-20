import { prisma } from '../utils/prisma/index.js';
import { throwError } from '../utils/error.handle.js';
import Joi from 'joi';
import AccountService from '../services/account.service.js';

const accountService = new AccountService(prisma);

//회원 가입
export async function signAccount(req, res, next) {
  try {
    const joinSchema = Joi.object({
      id: Joi.string().alphanum().min(6).max(16).required(),
      password: Joi.string().min(6).max(16).required(),
      confirmPassword: Joi.valid(Joi.ref(`password`)).required(),
      name: Joi.string.min(2).max(4).required(),
    });
    const validateResult = joinSchema.validate(req.body);

    if (validateResult.error) throw throwError(`입력된 값이 잘못되었습니다.`, 400);

    const inputValue = validateResult.value;
    const id = inputValue.id;
    const password = inputValue.password;
    const name = inputValue.name;

    const hashedPassword = await bcrypt.hash(password, 10);
    const existId = await prisma.accounts.findUnique({ where: { id: id } });

    if (existId) throw throwError(`입력된 값이 잘못되었습니다.`, 400);

    const signAccount = await prisma.accounts.create({
      data: { id: id, password: hashedPassword, name: name },
    });

    res.status(201).json({ id_info: { id: signAccount.id, name: signAccount.name } });
  } catch (error) {
    next(error);
  }
}
//로그인
export async function loginAccount(req, res, next) {
  const id = +req.body.id;
  const password = +req.body.password;

  try {
    const account = await prisma.accounts.findUnique({ where: { id: id } });
    if (account) throw throwError(`계정이 존재하지 않습니다.`, 404);

    const passwordValidate = await bcrypt.compare(password, account.password);
    if (!passwordValidate) throw throwError(`비밀번호가 일치하지 않습니다.`, 401);

    const accessToken = jwt.sign({ id: id }, env.SESSION_SECRET_KEY, { expiresIn: `1h` });

    res.header('authorization', `Bearer ${accessToken}`);

    return res.status(200).json({ accessToken: accessToken });
  } catch (error) {
    next(error);
  }
}
// 아이디 삭제
export async function deleteAccount(req, res, next) {
  const accountId = +req.params.accountId;
  const authAccountId = +req.account.accountId;

  try {
    await accountService.checkAccount(prisma, accountId, authAccountId);

    await prisma.accounts.delete({
      where: { accountId },
    });

    return res.status(200).json({ message: `아이디가 삭제 되었습니다.` });
  } catch (error) {
    next(error);
  }
}
//계정 정보 조회
export async function inquireAccount(req, res, next) {
  const accountId = +req.params.accountId;
  const authAccountId = +req.account.accountId;

  try {
    const account = await accountService.checkAccount(prisma, accountId, authAccountId);

    const accountInfo = { name: account.name, rankScore: account.rankScore };

    res.status(200).json({ accountInfo });
  } catch (error) {
    next(error);
  }
}

export default router;
