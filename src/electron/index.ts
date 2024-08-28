import { ipcMain, type WebContents } from 'electron';
import ElectronStore from 'electron-config';

import { listen } from '../core/listen.js';
import { register, type FirebaseCredentials } from '../core/register.js';

import {
  NOTIFICATION_RECEIVED,
  NOTIFICATION_SERVICE_ERROR,
  NOTIFICATION_SERVICE_STARTED,
  START_NOTIFICATION_SERVICE,
  TOKEN_UPDATED,
} from './constants.js';

const config = new ElectronStore();

// To be sure that start is called only once
let started = false;

// To be called from the main process
function setup(webContents: WebContents): void {
  // Will be called by the renderer process
  ipcMain.on(START_NOTIFICATION_SERVICE, async (_, firebaseCredentials: FirebaseCredentials) => {
    // Retrieve saved credentials
    let credentials: any = config.get('credentials');
    // Retrieve saved senderId
    const savedFirebaseCredentials: FirebaseCredentials | undefined = config.get('firebaseCredentials') as
      | FirebaseCredentials
      | undefined;
    if (started) {
      webContents.send(NOTIFICATION_SERVICE_STARTED, (credentials?.fcm || {}).token);
      return;
    }
    started = true;
    try {
      // Retrieve saved persistentIds : avoid receiving all already received notifications on start
      const persistentIds: string[] = (config.get('persistentIds') as string[]) || [];
      // Register if no credentials or if senderId has changed
      if (
        !credentials ||
        !savedFirebaseCredentials ||
        savedFirebaseCredentials.appId !== firebaseCredentials.appId ||
        savedFirebaseCredentials.apiKey !== firebaseCredentials.apiKey ||
        savedFirebaseCredentials.projectId !== firebaseCredentials.projectId ||
        savedFirebaseCredentials.vapidKey !== firebaseCredentials.vapidKey
      ) {
        credentials = await register(firebaseCredentials);
        // Save credentials for later use
        config.set('credentials', credentials);
        // Save senderId
        config.set('firebaseCredentials', firebaseCredentials);
        // Notify the renderer process that the FCM token has changed
        webContents.send(TOKEN_UPDATED, credentials.fcm.token);
      }
      // Listen for GCM/FCM notifications
      await listen({ ...credentials, persistentIds }, onNotification(webContents));
      // Notify the renderer process that we are listening for notifications
      webContents.send(NOTIFICATION_SERVICE_STARTED, credentials.fcm.token);
    } catch (e) {
      console.error('PUSH_RECEIVER:::Error while starting the service', e);
      // Forward error to the renderer process
      webContents.send(NOTIFICATION_SERVICE_ERROR, (e as Error).message);
    }
  });
}

// Will be called on new notification
function onNotification(webContents: WebContents) {
  return ({ notification, persistentId }: { notification: any; persistentId: string }) => {
    const persistentIds: string[] = (config.get('persistentIds') as string[]) || [];
    // Update persistentId
    config.set('persistentIds', [...persistentIds, persistentId]);
    // Notify the renderer process that a new notification has been received
    // And check if window is not destroyed for darwin Apps
    if (!webContents.isDestroyed()) {
      webContents.send(NOTIFICATION_RECEIVED, notification);
    }
  };
}

export {
  NOTIFICATION_RECEIVED,
  NOTIFICATION_SERVICE_ERROR,
  NOTIFICATION_SERVICE_STARTED,
  START_NOTIFICATION_SERVICE,
  TOKEN_UPDATED,
  setup,
};
