import { describe, expect, it } from 'vitest';

import {
  getGcmRetryDelayMs,
  isTransientGcmError,
  shouldRecheckIn,
} from './gcm-retry.js';

describe('gcm-retry', () => {
  it('uses exponential backoff capped at 15s', () => {
    expect(getGcmRetryDelayMs(0)).toBe(2000);
    expect(getGcmRetryDelayMs(1)).toBe(4000);
    expect(getGcmRetryDelayMs(2)).toBe(8000);
    expect(getGcmRetryDelayMs(3)).toBe(15000);
    expect(getGcmRetryDelayMs(10)).toBe(15000);
  });

  it('detects transient GCM errors', () => {
    expect(isTransientGcmError('Error=PHONE_REGISTRATION_ERROR')).toBe(true);
    expect(isTransientGcmError('Error=TIMEOUT')).toBe(true);
    expect(isTransientGcmError('Error=INVALID_SENDER')).toBe(false);
  });

  it('triggers re-checkin every third retry', () => {
    expect(shouldRecheckIn(0)).toBe(false);
    expect(shouldRecheckIn(3)).toBe(true);
    expect(shouldRecheckIn(6)).toBe(true);
    expect(shouldRecheckIn(4)).toBe(false);
  });
});
