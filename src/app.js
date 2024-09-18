import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.SECRET_PORT;

app.use(express.json());

app.use("/api");

app.listen(PORT, () => {
  console.log(PORT, "포트로 서버가 열렸어요!");
});
