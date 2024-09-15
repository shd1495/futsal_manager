import express from 'express';
import dotenv from 'dotenv';
import errorHandleMiddleware from './middlewares/error.handle.middleware.js';
import { playerRouter } from './routes/player.router.js';

dotenv.config();

const app = express();
const PORT = SECRET_PORT;

app.use(express.json);

app.use('/api', playerRouter);
app.use(errorHandleMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
