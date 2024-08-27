import 'dotenv/config';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { EVENTS } from './core/events.d.js';
import { listen, Client, type Notification } from './core/listen.js';
import { register, type RegisterCredentials } from './core/register.js';

let credentials: RegisterCredentials | undefined;
let client: Client | undefined;

async function receive(n: number) {
  const receivedNotifications: Notification[] = [];

  return new Promise(async (resolve) => {
    const onNotification = (notification: Notification) => {
      receivedNotifications.push(notification);

      if (receivedNotifications.length === n) {
        resolve(receivedNotifications);
      }
    };

    credentials!.persistentIds = [];
    client = await listen(credentials!, onNotification);
  });
}

describe('listen function', () => {
  beforeEach(async () => {
    credentials = await register({
      apiKey: process.env.API_KEY!,
      appId: process.env.APP_ID!,
      projectId: process.env.PROJECT_ID!,
      vapidKey: process.env.FCM_VAPID_KEY!,
    });

    const receivedNotifications: Notification[] = [];

    const onNotification = (notification: Notification) => {
      receivedNotifications.push(notification);

      if (receivedNotifications.length === 1) {
        expect(receivedNotifications).toHaveLength(1);
      }
    };

    client = await listen(credentials!, onNotification);

    client.on(EVENTS.ON_CLIENT_CONNECTED, () => {
      expect(0).toBe(0);
    });
  });

  afterEach(async () => {
    if (client) {
      await client.destroy();
    }

    credentials = undefined;
  });

  it('should start listening to notifications', async () => {
    expect(client!.checkConnection()).toBe(true);
  });
});
