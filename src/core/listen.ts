import { EVENTS } from './events.d.js';
import { Client } from './client.js';
import type { Credentials } from './client.js';

export interface Notification {
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface CredentialsWithPersistentIds extends Credentials {
  persistentIds: string[];
}

export interface NotificationCallbackParams {
  notification: Notification;
  persistentId: string;
}

export async function listen(
  credentials: CredentialsWithPersistentIds,
  notificationCallback: (params: NotificationCallbackParams) => void,
): Promise<Client> {
  const client: Client = new Client(credentials, credentials.persistentIds);

  // Listen for notifications
  client.on(EVENTS.ON_NOTIFICATION_RECEIVED, notificationCallback);

  // Connect to the mtalk.google.com server
  await client.connect();

  // Emit client connected event
  client.emit(EVENTS.ON_CLIENT_CONNECTED);

  // Return the client object
  return client;
}

export { Client };
