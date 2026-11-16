import {
  listen,
  Client,
  type CredentialsWithPersistentIds,
  type NotificationCallbackParams,
} from './listen.js';

export async function listenMany(
  credentialsList: CredentialsWithPersistentIds[],
  notificationCallback: (params: NotificationCallbackParams) => void,
): Promise<Client[]> {
  return Promise.all(credentialsList.map((credentials) => listen(credentials, notificationCallback)));
}
