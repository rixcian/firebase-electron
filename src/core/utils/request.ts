import request from 'request-promise';
import { waitFor } from './timeout.js';

// In seconds
const MAX_RETRY_TIMEOUT = 15;
// Step in seconds
const RETRY_STEP = 5;

type RequestArgs = Parameters<typeof request>;

export function requestWithRetry(...args: RequestArgs): Promise<any> {
  return retry(0, ...args);
}

async function retry(retryCount = 0, ...args: RequestArgs): Promise<any> {
  try {
    const result = await request(...args);

    return result;
  } catch (e) {
    const timeout = Math.min(retryCount * RETRY_STEP, MAX_RETRY_TIMEOUT);

    console.error(`Request failed : ${(e as Error).message}`);
    console.error(`Retrying in ${timeout} seconds`);

    await waitFor(timeout * 1000);

    const result = await retry(retryCount + 1, ...args);

    return result;
  }
}
