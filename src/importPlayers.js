// src/importPlayers.js

import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// CSV 파일 경로 설정
const csvFilePath = path.resolve('data/players.csv');

// 스타일 옵션 정의
const styles = ["highPressing", "poacher", "targetMan"];

// 스타일을 랜덤으로 선택하는 함수
function getRandomStyle() {
  return styles[Math.floor(Math.random() * styles.length)];
}

// 선수의 가치를 계산하는 함수
function calculateValue(player) {
  const { speed, shootAccuracy, shootPower, defense, stamina } = player;
  return (speed * 0.3) + (shootAccuracy * 0.3) + (shootPower * 0.3) + (defense * 0.05) + (stamina * 0.05);
}

// pickupRate를 계산하는 함수 (0% 이상 100% 이하)
function calculatePickupRate(value) {
  let rate = 100 - value;
  if (rate < 0) rate = 0;
  if (rate > 100) rate = 100;
  return rate;
}

// price를 계산하는 함수
function calculatePrice(value) {
  return Math.round(value * 1000);
}

// Player 객체를 저장할 배열
const players = [];

// 카운터 초기화
let count = 0;

// CSV 파일 스트림 생성 및 파싱
const readStream = fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    // 상위 10개 데이터만 처리
    if (count >= 10) {
      readStream.destroy(); // 스트림 종료
      return;
    }

    // 필수 필드 확인
    const requiredFields = ['name', 'speed', 'shootAccuracy', 'shootPower', 'defense', 'stamina'];
    const hasAllFields = requiredFields.every(field => row[field] !== undefined && row[field] !== '');

    if (!hasAllFields) {
      console.warn(`유효하지 않은 데이터 (필수 필드 누락): ${JSON.stringify(row)}`);
      return; // 필수 필드가 누락된 데이터는 건너뜁니다.
    }

    // 각 필드를 정수로 변환
    const speed = parseInt(row.speed, 10);
    const shootAccuracy = parseInt(row.shootAccuracy, 10);
    const shootPower = parseInt(row.shootPower, 10);
    const defense = parseInt(row.defense, 10);
    const stamina = parseInt(row.stamina, 10);

    // 숫자 필드 유효성 검사
    if (
      isNaN(speed) ||
      isNaN(shootAccuracy) ||
      isNaN(shootPower) ||
      isNaN(defense) ||
      isNaN(stamina)
    ) {
      console.warn(`유효하지 않은 데이터 (숫자 필드 오류): ${JSON.stringify(row)}`);
      return; // 숫자 필드가 유효하지 않은 데이터는 건너뜁니다.
    }

    // 선수의 가치 계산
    const value = calculateValue({ speed, shootAccuracy, shootPower, defense, stamina });

    // pickupRate 계산
    const pickupRate = calculatePickupRate(value);

    // price 계산
    const price = calculatePrice(value);

    // style 랜덤 선택
    const style = getRandomStyle();

    // Player 객체 생성
    const player = {
      name: row.name,
      speed,
      shootAccuracy,
      shootPower,
      defense,
      stamina,
      style,
      pickupRate,
      price
    };

    // 유효한 데이터만 배열에 추가
    players.push(player);
    count++;
  })
  .on('end', () => {
    console.log('CSV 파일 읽기 완료.');
    console.log('상위 10개 플레이어 데이터:');
    console.log(players);
  })
  .on('error', (error) => {
    console.error('CSV 파일 읽기 중 오류 발생:', error);
  });
