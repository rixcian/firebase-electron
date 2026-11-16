const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 15000;
export const MAX_GCM_REGISTER_RETRIES = 8;
export const POST_CHECKIN_DELAY_MS = 1500;

export function getGcmRetryDelayMs(retryCount: number): number {
  const delay = BASE_DELAY_MS * 2 ** retryCount;
  return Math.min(delay, MAX_DELAY_MS);
}

export function isTransientGcmError(response: string): boolean {
  return (
    response.includes('PHONE_REGISTRATION_ERROR') ||
    response.includes('TIMEOUT') ||
    response.includes('INTERNAL_SERVER_ERROR') ||
    response.includes('QUOTA_EXCEEDED')
  );
}

export function shouldRecheckIn(retryCount: number): boolean {
  // NOTE: freshly minted android_id values sometimes need a second check-in before register succeeds
  return retryCount > 0 && retryCount % 3 === 0;
}
