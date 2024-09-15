/**
 * 에러 처리 미들웨어
 */
export default (err, req, res, next) => {
  // 에러 로깅
  console.error(err);

  const status = err.status || 500; // 에러 상태 코드가 정의되어 있으면 사용, 그렇지 않으면 500
  const message = err.message || '서버 내부에서 에러가 발생했습니다.'; // 예기치못한 에러도 처리

  res.status(status).json({ message: message });
};
