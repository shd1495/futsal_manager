import express from 'express';
import dotenv from 'dotenv';
import errorHandleMiddleware from './middlewares/error.handle.middleware.js';
import playerRouter from './routes/player.router.js';
import gameRouter from './routes/game.router.js';
import accountRouter from './routes/account.router.js';
import cashRouter from './routes/cash.router.js';

dotenv.config();

const app = express();
const PORT = process.env.SECRET_PORT;

app.use(express.json());


app.use('/api', [accountRouter, playerRouter, gameRouter, cashRouter]);
app.use(errorHandleMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
