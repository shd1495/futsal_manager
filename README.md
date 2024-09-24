# futsal_manager

![img](https://github.com/user-attachments/assets/ee2ac2e9-b288-4fda-b15f-ea0239fc7b34)

## 기술 스택

- Node.js
- Express.js
- MySQL - Prisma ORM
- JWT
- AWS EC2
- Yarn

## 실행 방법

- 서버 - yarn run start / pm2 start src/app.js
- 기능 - shd1495.store:3020/api/url

## 구현한 기능

### 계정 관련

- [x] 회원가입 API - POST /register
- [x] 로그인 API (JWT 토큰 발급) - GET /login
- [x] 회원탈퇴 API (JWT 인증) - DELETE /account/:accountId
- [x] 계정 정보 조회 API (JWT 인증) - GET /account/:accountId
- [x] 뽑기권 조회 API (JWT 인증) - GET /token/:accountId
- [x] 랭킹 조회 API - GET /ranking

### 캐쉬 관련

- [x] 캐쉬 충전 API (JWT 인증) - POST /cash/:accountId
- [x] 캐쉬 잔액 조회 API (JWT 인증) - GET /cash/:accountId
- [x] 뽑기권 구매 API (JWT 인증) - POST /token/:accountId

### 선수 관련

- [x] 선수 뽑기 API (JWT 인증) - POST /pickup/:accountId
- [x] 선수 판매 API (JWT 인증) - DELETE /player/:accountId
- [x] 선수 강화 API (JWT 인증) - PATCH /upgrade/:accountId
- [x] 팀 편성(라인업) API (JWT 인증) - POST /lineup/:accountId
- [x] 라인업 조회 API (JWT 인증) - GET /lineup/:accountId
- [x] 전체 선수 목록 조회 API - GET /players
- [x] 보유 선수 목록 조회 API (JWT 인증) - GET /roster/:accountId
- [x] 보유 선수 상세 조회 API (JWT 인증) - GET /player/:accountId

### 게임 관련

- [x] 게임 매치메이킹 API (JWT 인증) - POST /match/:accountId

## API 명세서

https://www.notion.so/teamsparta/3b4d6d8385754bf98799c1119d65266a?v=adef0bb8e88f4dc1840fe3d95687c5f4

## ERD

![스키마 최종](https://github.com/user-attachments/assets/adb260e6-59ce-4755-bd9e-90e5a5b88e5c)

## 기능 설명

### 계정

- 회원가입

  ```
  유효성 검사
  id: 6 ~ 16자 / 알파벳 대소문자, 숫자만 가능
  password: 6 ~ 16자
  confirmPassword를: 6 ~ 16자 / password와 같은 지 확인
  name: 2 ~ 4자 / 한글만 가능

  비밀번호 bcrypt로 해싱 후 db에 등록

  계정 생성 시 ALL 뽑기권 3장 증정
  ```

- 로그인

  ```
  입력받은 비밀번호와 db에 있는 해싱된 비밀번호가 같은지 확인

  JWT 토큰에 accountId를 담아서 발급

  res authorization headers에 토큰을 담아서 반환
  ```

- 회원탈퇴

  ```
  토큰의 아이디와 요청 파라미터의 아이디가 일치하는지 확인 후 삭제
  ```

- 계정 정보 조회

  ```
  토큰의 아이디와 요청 파라미터의 아이디가 일치하는지 확인 후

  아이디, 이름, 랭크점수를 반환
  ```

- 뽑기권 조회
  ```
  계정이 보유한 종류별의 뽑기권의 갯수를 반환
  ```
- 랭킹 조회
  ```
  랭크 점수에 따라 순위를 매기고 아이디, 이름, 랭크 점수를 반환
  ```

### 캐쉬

- 캐쉬 충전

  ```
  본인 계정의 캐쉬를 1원 이상의 충전 후 보유 캐쉬를 반환
  ```

- 캐쉬 잔액 조회

  ```
  본인 계정의 보유 캐쉬를 반환
  ```

- 뽑기권 구매
  ```
  뽑기권 종류 ALL, TOP_100, TOP_500 중 한 가지 구매
  갯수 1(SINGLE)개, 10(TEN)개씩만 구매 가능
  ```

### 선수

- 선수 뽑기

  ```
  사용할 뽑기권 종류와 갯수에 따라 선수 뽑기 시행

  가중치 랜덤 뽑기 (Weighted Random Picker)
  랜덤 기준값 이상이 될 때 까지 선수의 뽑기 확률 가중치를 누적으로 더하고

  기준값이 넘어섰을 때의 선수를 뽑힌 선수로 확정
  ```

- 선수 판매

  ```
  보유한 선수의 가격을 계산하고 판매
  ```

- 선수 강화

  ```
  1. 강화 기본 확률
  - Normal → Magic: 75% (0.75)

  - Magic → Rare: 50% (0.5)

  - Rare → Unique: 25% (0.25)

  - Unique → Epic: 5% (0.05)

  - Epic → Legendary: 1% (0.01)

  2. 등급별 스탯 증가 비율
    강화 시 등급에 따라 선수의 모든 스탯이 증가
  - Normal → Magic: 2% 증가

  - Magic → Rare: 5% 증가

  - Rare → Unique: 9% 증가

  - Unique → Epic: 15% 증가

  - Epic → Legendary: 25% 증가

  - 예시: Legendary 등급 메시: 모든 스탯이 1.25배 증가

  3. 강화 비용
  - 강화 시도 시 캐쉬 500이 소모됩니다.

  - 재료로 소모하는 선수를 최대 5명까지 사용할 수 있고, 재료 없이도 강화 시도는 가능

  4. 재료 선수의 추가 강화 확률
  - 재료로 사용하는 선수의 등급에 따라 기본 강화 확률에 추가 확률이 적용

  선수 등급	추가 확률(%)
  - Normal	10%
  - Magic	20%
  - Rare	30%
  - Unique	50%
  - Epic	100%
  - Legendary	200%

  - 예시: Epic에서 Legendary 등급으로 강화 시도 시: 기본 확률 1% + Normal 등급 재료 5명 사용 (50% 추가) = 1.5% 강화 성공 확률

  5. 강화 성공 및 실패
  - 강화 시 0 ~ 1 사이의 기준값을 랜덤으로 생성한 후, 강화 성공 확률이 기준값보다 크면 강화에 성공

  - 모든 강화 시도 시 10% 확률로 등급 하락의 위험이 존재

  - Epic에서 Legendary로 강화 시도 시에는 1% 확률로 선수 파괴 위험이 존재

  ```

- 팀 편성(라인업)

  ```
  보유한 선수 중 3명의 선수를 출전 선수로 등록

  출전 선수가 정확히 3명이 등록되어 있지 않을 경우

  게임 매치 불가능
  ```

- 라인업 조회

  ```
  본인 계정의 출전 선수로 등록한 선수들의 이름과 등급, 플레이 스타일을 조회
  ```

- 전체 선수 목록 조회

  ```
  모든 선수의 이름, 스탯, 가격, 뽑기 확률을 조회
  ```

- 보유 선수 목록 조회

  ```
  보유한 모든 선수들의 로스터 번호와 이름과 등급, 플레이 스타일을 조회
  ```

- 보유 선수 상세 조회
  ```
  보유한 선수 중 선택한 한 선수의 이름, 스탯, 플레이 스타일, 가격, 등급을 조회
  ```

### 게임 매치

- 게임 매치메이킹

  ```js
  1. 팀 스탯 계산
    - 각 팀의 모든 출전 선수들의 스탯(스피드, 방어력, 스태미너)을 더한다
      let home = (homeStats.speed + homeStats.defense + homeStats.stamina) / NUM_PLAYERS;
      let away = (awayStats.speed + awayStats.defense + awayStats.stamina) / NUM_PLAYERS;

    - 선수 수로 나눈 값이 팀의 평균 스탯이 된다

  2. 팀 컬러 및 상성
    - 한 팀의 2명 이상의 선수가 같은 플레이 스타일일 경우, 팀 컬러를 부여

    - 각 팀 컬러는 다른 컬러에 대해 가위바위보처럼 상성이 존재
      // 팀 컬러 상성
      const advantageMap = {
        highPressing: 'poacher',
        poacher: 'targetMan',
        targetMan: 'highPressing',
      };

    - 상대 팀보다 상성이 좋은 팀은 모든 스탯에 10% 보너스를 받는다

    - 한 팀이 팀 컬러가 있고, 다른 팀이 없다면 팀 컬러가 있는 팀이 상성에서 유리하다고 간주

  3. 공의 위치 및 이동
    - 경기는 공이 중앙(위치 0)에 있는 상태로 시작

    - 홈팀의 골대는 양수 범위, 어웨이팀의 골대는 음수 범위에 위치

  4. 팀 스코어 계산
    - 각 팀의 스피드, 방어력, 스태미너를 합산하고 출전 선수 수로 나눠 팀의 스코어를 계산

  5. 어드밴티지 계산
    - 홈팀의 스코어에서 어웨이팀의 스코어를 뺀 값이 어드밴티지가 된다

    - 어드밴티지가 양수면 홈팀이 유리하고, 음수면 어웨이팀이 유리
      const advantage = home - away;

  6. 공의 이동
    - 어드밴티지를 반영한 공식으로 공의 이동 범위가 결정
      const randomFactor = Math.round(Math.random() * RANDOM_RANGE * 2 - RANDOM_RANGE + RANDOM_RANGE * (advantage / 100));

    - 공의 위치가 -80 이하이거나 80 이상일 경우, 슛 찬스를 획득

  7. 슛 찬스와 골 확률
    - 슛 찬스를 얻은 팀은 골 정확도와 골 파워의 합을 2로 나눈 값이 골 확률이 된다
      const goalRate = Math.min((homeStats.shootAccuracy + homeStats.shootPower) / 2, 100);

    - 상대팀의 수비력에 따라 골 확률에서 방어력이 차감

    - 득점 확률이 0~100 사이의 랜덤 값보다 높으면 득점으로 간주
      if (goalRate - awayStats.defense / (Math.random() + 2) > Math.random() * 100)

    - 슛 시도 후, 공은 다시 중앙으로 돌아간다

  8. 페이즈 진행
    - 경기는 총 50 페이즈로 구성

    - 각 페이즈마다 스태미너가 감소하고, 10페이즈마다 스태미너에 비례하여 모든 스탯이 감소

  9. 승부차기
    - 모든 페이즈가 끝난 후 득점이 동점일 경우 승부차기가 진행

    - 승부차기는 최소 3라운드로 진행되며, 각 팀 선수들이 번갈아 가며 슛을 시도

    - 수비는 각 팀에서 수비력이 가장 높은 선수가 담당

    - 3라운드 이후 승부차기의 득점이 더 많은 팀이 승리
  ```

## 어려웠던 점
