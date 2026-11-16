import { describe, expect, it } from 'vitest';

import { toRequestTlsOptions, toTlsConnectOptions } from './tls-options.js';

describe('tls-options', () => {
  it('returns empty request options when tls config is missing', () => {
    expect(toRequestTlsOptions()).toEqual({});
  });

  it('maps ca and rejectUnauthorized for HTTP clients', () => {
    const ca = '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----';

    expect(
      toRequestTlsOptions({
        ca,
        rejectUnauthorized: false,
      }),
    ).toEqual({
      ca,
      rejectUnauthorized: false,
      agentOptions: {
        ca,
        rejectUnauthorized: false,
      },
    });
  });

  it('includes SNI servername for MCS TLS connections', () => {
    expect(toTlsConnectOptions('mtalk.google.com', 5228, { rejectUnauthorized: false })).toEqual({
      host: 'mtalk.google.com',
      port: 5228,
      servername: 'mtalk.google.com',
      ca: undefined,
      rejectUnauthorized: false,
    });
  });
});
