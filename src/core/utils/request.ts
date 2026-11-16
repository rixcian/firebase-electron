import axios, { type AxiosRequestConfig } from 'axios';
import { waitFor } from './timeout.js';

// In seconds
const MAX_RETRY_TIMEOUT = 15;
// Step in seconds
const RETRY_STEP = 5;

export function requestWithRetry<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  return retry(0, config);
}

async function retry<T = unknown>(retryCount = 0, config: AxiosRequestConfig): Promise<T> {
  try {
    const result = await axios.request<T>(config);

    return result.data;
  } catch (e) {
    const timeout = Math.min(retryCount * RETRY_STEP, MAX_RETRY_TIMEOUT);

    console.error(`Request failed : ${(e as Error).message}`);
    console.error(`Retrying in ${timeout} seconds`);

    await waitFor(timeout * 1000);

    return retry<T>(retryCount + 1, config);
  }
}
