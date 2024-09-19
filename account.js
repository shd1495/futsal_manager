import { prisma } from '@prisma/client';
import express from 'express';

const router = express.Router();

//회원 가입 
router.post(`acccount/sign`, async (req, res)=>{
 const joinchema = Joi.object({
    id: Joi.string().alphauunm().required(),
    passwoed: Joi.string().min(6).require(),
    confimpassword:Joi.valid(Joi.ref(`password`)).required(),
    name: Joi.string.required(),
 });
 const vallidateResult = joinchema.validata(req.body);
 if(vallidateResult.error){
    res.status(400).json({error:`입력된 값이 잘못됐어습니다.`});
    return;
 }
 const inputvalue = vallidateResult.value;
 const id = inputvalue.id;
 const passwoed = inputvalue.passwoed;
 const name = inputvalue.name;

 const hashedPassword = await bcrypt.hash(passwoed, 10);
 const existId = await prisma.accounts.findUnique({where: {id:id}});
 if (existId){
    res.status(400).json({error:`중복된 아이디입니다`});
    return;
 }
 const signAccount = await prisma.accounts.create({
    data: {id: id,passwoed: hashedPassword, name: name},
 })
 res
   .status(200)
   .json({id_info:{id:signAccount.id, name: signAccount.name}});
});
//로그인
router.post(`/account/login`,async(req,res)=>{
   const loginScheme = Joi.object({
      id: Joi.string().alphauunm().required(),
      passwoed: Joi.string().min(6).required(),
   });

   const validataResult = loginScheme.validata(req.body);
   if(validataResult.error){
      res.status(400).json({error: `잘못된 요청입니다`});
      return;
   }
   const inputvalue = validataResult.value;
   const id = inputvalue.id;
   const passwoed = inputvalue.passwoed;
   const account = await prisma.accounts.findUnique({where: {id: id}});
   if (account == null){
      res.status(400).json({error: `계정이 존재하지 않습니다.`});
      return;
   }
   const passwordvalidata = await bcrypt.compare(passwoed, account.passwoed);
   if(!passwordvalidata){
      res.status(400).json({error: `비밀번호가 일치하지 않습니다`});
     return;
   }
   const accessToken = jwt.sign(
      {id: id, name: account.name},
      `seret0rPricateKey`,
      {expiresIn: `1h`},
   );
   res.status(200).json({accessToken: accessToken})
});

export default router;