import { v4 as uuidv4 } from 'uuid';

import { registerGCM, type GCMRegistrationResult } from './gcm/index.js';
import { registerFCM, type FCMRegistrationResult } from './fcm/index.js';
import type { TlsConfig } from './utils/tls-options.js';

export interface RegisterCredentials extends FCMRegistrationResult {
  gcm: GCMRegistrationResult;
  persistentIds?: string[];
}

export interface FirebaseCredentials {
  appId: string;
  apiKey: string;
  projectId: string;
  vapidKey?: string;
}

export interface RegisterOptions {
  tls?: TlsConfig;
}

export async function register(
  credentials: FirebaseCredentials,
  options: RegisterOptions = {},
): Promise<RegisterCredentials> {
  // Should be unique by app - One GCM registration/token by app/appId
  const appId = `wp:receiver.push.com#${uuidv4()}`;
  const gcmResult = await registerGCM(appId, options.tls);
  const fcmResult = await registerFCM(gcmResult.token, credentials, options.tls);

  // Need to be saved by the client
  return {
    keys: fcmResult.keys,
    fcm: fcmResult.fcm,
    gcm: gcmResult,
  };
}
