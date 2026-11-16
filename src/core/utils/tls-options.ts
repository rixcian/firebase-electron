import type tls from 'tls';

export interface TlsConfig {
  ca?: string | Buffer | Array<string | Buffer>;
  // NOTE: only disable verification for trusted local/MITM proxy debugging
  rejectUnauthorized?: boolean;
}

export function toRequestTlsOptions(tlsConfig?: TlsConfig): Record<string, unknown> {
  if (!tlsConfig) {
    return {};
  }

  return {
    ca: tlsConfig.ca,
    rejectUnauthorized: tlsConfig.rejectUnauthorized,
    agentOptions: {
      ca: tlsConfig.ca,
      rejectUnauthorized: tlsConfig.rejectUnauthorized,
    },
  };
}

export function toTlsConnectOptions(
  host: string,
  port: number,
  tlsConfig?: TlsConfig,
): tls.ConnectionOptions {
  return {
    host,
    port,
    servername: host,
    ca: tlsConfig?.ca,
    rejectUnauthorized: tlsConfig?.rejectUnauthorized,
  };
}
