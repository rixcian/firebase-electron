import { EVENTS } from './events.d.js';
import { Client } from './client.js';
import type { Credentials } from './client.js';
import type { TlsConfig } from './utils/tls-options.js';

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

export interface ListenOptions {
  tls?: TlsConfig;
}

export async function listen(
  credentials: CredentialsWithPersistentIds,
  notificationCallback: (params: NotificationCallbackParams) => void,
  options: ListenOptions = {},
): Promise<Client> {
  const client: Client = new Client(
    { gcm: credentials.gcm, keys: credentials.keys },
    credentials.persistentIds,
    options.tls,
  );

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
