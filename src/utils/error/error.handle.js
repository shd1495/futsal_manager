/**
 * 에러 처리 함수
 * @param { String } message
 * @param { Int } status
 * @returns { Error }
 */
export function throwError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}
