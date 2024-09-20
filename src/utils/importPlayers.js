// src/importPlayers.js

import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvFilePath = path.resolve(__dirname, '../../data/players.csv');

const styles = ["highPressing", "poacher", "targetMan"];

function getRandomStyle() {
  return styles[Math.floor(Math.random() * styles.length)];
}


export function calculateValue(player) {
  const { speed, shootAccuracy, shootPower, defense, stamina } = player;
  const sum = speed + shootAccuracy + shootPower + defense + stamina;

  // 스케일링 상수 조정
  const adjustedSum = sum / 50;

  // 기본 가치 계산
  const baseValue = Math.pow(10, adjustedSum);

  // 무작위 변동성 적용 (±5%)
  const variationPercentage = (Math.random() * 0.1) - 0.05; // -0.05 ~ +0.05 사이의 값
  const value = baseValue * (1 + variationPercentage);

  return value;
}


function calculatePickupRate(value) {
  const weight = 1 / value;
  return Math.round(weight * 1e8); // 정수로 변환
}

function calculatePrice(value) {
  return Math.round(value * 1000);
}

async function importPlayers() {
  const playersData = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      const requiredFields = ['name', 'speed', 'shootAccuracy', 'shootPower', 'defense', 'stamina'];
      const hasAllFields = requiredFields.every(field => row[field] !== undefined && row[field] !== '');

      if (!hasAllFields) {
        return;
      }

      const speed = parseInt(row.speed, 10);
      const shootAccuracy = parseInt(row.shootAccuracy, 10);
      const shootPower = parseInt(row.shootPower, 10);
      const defense = parseInt(row.defense, 10);
      const stamina = parseInt(row.stamina, 10);

      const value = calculateValue({ speed, shootAccuracy, shootPower, defense, stamina });
      const pickUpRate = calculatePickupRate(value);
      const price = calculatePrice(value);
      const style = getRandomStyle();

      const playerData = {
        playerName: row.name,
        speed,
        shootAccuracy,
        shootPower,
        defense,
        stamina,
        style,
        pickUpRate,
        price,
      };

      playersData.push(playerData);
    })
    .on('end', async () => {
      try {
        await prisma.$transaction(
          playersData.map((player) =>
            prisma.players.create({ data: player })
          )
        );
      } catch (error) {
        console.error('Error:', error);
      } finally {
        await prisma.$disconnect();
      }
    })
    .on('error', (error) => {
      console.error('Error:', error);
    });
}

importPlayers();
