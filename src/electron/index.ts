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
} from './consts.js';

const config = new ElectronStore();

// To be sure that start is called only once
let started = false;

// To be called from the main process
function setup(webContents: WebContents, debug: boolean = false, debugLog: (message?: any, ...optionalParams: any[]) => void = console.log): void {
  // Will be called by the renderer process
  ipcMain.on(START_NOTIFICATION_SERVICE, async (_, firebaseCredentials: FirebaseCredentials) => {
    if (debug) debugLog('[electron/index.ts] [info] Starting notification service');
    
    // Retrieve saved credentials
    let credentials: any = config.get('credentials');

    // Log notification token if debug is true
    if (debug) {
      if (credentials && credentials.fcm && credentials.fcm.token) {
        debugLog(`[electron/index.ts] [info] Notification token: ${credentials.fcm.token}`);
      } else {
        debugLog('[electron/index.ts] [info] No notification token found');
      }
    }
    
    // Retrieve saved senderId
    const savedFirebaseCredentials: FirebaseCredentials | undefined = config.get('firebaseCredentials') as
      | FirebaseCredentials
      | undefined;
    
    // Log saved Firebase credentials if debug is true
    if (debug) {
      if (savedFirebaseCredentials) {
        debugLog(`[electron/index.ts] Saved Firebase Credentials (from electron-config): ${savedFirebaseCredentials}`);
      } else {
        debugLog('[electron/index.ts] No saved Firebase credentials found');
      }
      if (credentials) {
        debugLog(`[electron/index.ts] Starting notification service; Credentials (from electron-config): ${credentials}`);
      }
    }
    
    if (started) {
      if (debug) debugLog('[electron/index.ts] Notification service already started');
      webContents.send(NOTIFICATION_SERVICE_STARTED, (credentials?.fcm || {}).token);
      return;
    }

    started = true;
    
    try {
      // Retrieve saved persistentIds : avoid receiving all already received notifications on start
      const persistentIds: string[] = (config.get('persistentIds') as string[]) || [];

      if (debug) debugLog(`[electron/index.ts] Persistent ids: ${persistentIds}`);

      // Register if no credentials or if senderId has changed
      if (
        !credentials ||
        !savedFirebaseCredentials ||
        savedFirebaseCredentials.appId !== firebaseCredentials.appId ||
        savedFirebaseCredentials.apiKey !== firebaseCredentials.apiKey ||
        savedFirebaseCredentials.projectId !== firebaseCredentials.projectId ||
        savedFirebaseCredentials.vapidKey !== firebaseCredentials.vapidKey
      ) {
        if (debug) debugLog('[electron/index.ts] No cached credentials found! Registering with new firebase credentials');

        credentials = await register(firebaseCredentials);

        if (debug) debugLog(`[electron/index.ts] register() func finished; Credentials: ${credentials}`);
        
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
