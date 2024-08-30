import 'dotenv/config';
import { describe, it, expect } from 'vitest';

import { register, type RegisterCredentials } from './core/register.js';

describe('register function', () => {
  // it(
  //   'should return a valid credentials (with vapid key)',
  //   async () => {
  //     const credentials: RegisterCredentials = await register({
  //       apiKey: process.env.API_KEY!,
  //       appId: process.env.APP_ID!,
  //       projectId: process.env.PROJECT_ID!,
  //       vapidKey: process.env.FCM_VAPID_KEY!,
  //     });

  //     expect(credentials).toBeDefined();
  //   },
  //   { timeout: 10000 },
  // );

  // it(
  //   'should return a valid credentials (without vapid key)',
  //   async () => {
  //     const credentials: RegisterCredentials = await register({
  //       apiKey: process.env.API_KEY!,
  //       appId: process.env.APP_ID!,
  //       projectId: process.env.PROJECT_ID!,
  //     });

  //     expect(credentials).toBeDefined();
  //   },
  //   { timeout: 10000 },
  // );
});
