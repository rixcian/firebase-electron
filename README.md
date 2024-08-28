# firebase-electron

Receive Firebase push notifications in your Electron app.

## Installation

```bash
npm i firebase-electron
```

## Usage

### In the main process (`main.js/.ts`)
```typescript
import { setup: setupPushReceiver } from 'firebase-electron';

// Call it before 'did-finish-load' with mainWindow a reference to your window
setupPushReceiver(mainWindow.webContents);
```

### In the renderer process (`renderer.js/.ts`)

```typescript
import { ipcRenderer } from 'electron';
import {
  START_NOTIFICATION_SERVICE,
  NOTIFICATION_SERVICE_STARTED,
  NOTIFICATION_SERVICE_ERROR,
  NOTIFICATION_RECEIVED as ON_NOTIFICATION_RECEIVED,
  TOKEN_UPDATED,
} from 'firebase-electron';

// Listen for service successfully started
ipcRenderer.on(NOTIFICATION_SERVICE_STARTED, (_, token) => // do something);
// Handle notification errors
ipcRenderer.on(NOTIFICATION_SERVICE_ERROR, (_, error) => // do something);
// Send FCM token to backend
ipcRenderer.on(TOKEN_UPDATED, (_, token) => // Send token);
// Display notification
ipcRenderer.on(ON_NOTIFICATION_RECEIVED, (_, notification) => // display notification);
// Start service
ipcRenderer.send(START_NOTIFICATION_SERVICE, { appId, apiKey, projectId, vapidKey });
```

### Where to find `appId`, `apiKey`, `projectId` and `vapidKey`

1. Go to [Firebase Console](https://console.firebase.google.com/) & login to your account
2. Select your project
3. Click on the `Project Settings` cog icon
4. Click on `Project Settings`
5. Make sure you're on the `General` tab
6. Scroll down to the `Your apps` section
7. If you don't have an app, click on `Add app`
   - Select `Web`
   - Fill in the required fields
   - Click on `Register`
8. Copy the `appId`, `apiKey`, `projectId` listed under the `SDK setup and configuration` section
9. (Optional) Copy the `vapidKey` listed under the `Cloud Messaging` tab and `Web Configuration > Web Push certificates` section
10. (Optional) Generate a new `key pair` and use the value in the `Key pair` column as your `vapidKey`

## Moving from `electron-push-receiver`

[`electron-push-receiver`](https://github.com/MatthieuLemoine/electron-push-receiver) library stopped working because it depends on the [Legacy FCM API](https://firebase.google.com/docs/cloud-messaging/migrate-v1) which was deprecated on June 21st, 2024 by Google.

This package is a fork of the `electron-push-receiver` package that has been updated to work with the new Firebase Cloud Messaging (FCM) protocol.

I'm giving all credits to [Matthieu Lemoine](https://github.com/MatthieuLemoine) for the initial work and all the contributors for the `electron-push-receiver` package. I only updated the package to work with the new FCM protocol.

### What's new

- Uses the new FCM protocol ([HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/migrate-v1))
- Uses updated dependencies (without any critical vulnerabilities)
- Remove unnecessary, deprecated and vulnerable dependencies (e.g. `request-promise`, `electron-config`)
- Simplified the codebase
- Latest Node.js (v22)
- Refactor tests and use [vitest](https://vitest.dev/) for testing
- Completely written in TypeScript

> [!CAUTION]
> Breaking changes - Instead of providing just a `senderId`, you now must provide `appId`, `apiKey`, `projectId` and optionally a `vapidKey`. See the updated [usage example](#usage).
>
> > Google deprecated https://fcm.googleapis.com/fcm/connect/subscribe (/send too), which is slated for full removal on June 22, 2024. (Source: https://firebase.google.com/docs/cloud-messaging/migrate-v1)

## Development

1. Make sure you have the right Node.js version installed (specified in `.nvmrc` file)
2. Install dependencies with `npm install`
3. Duplicate `.env.template` to `.env` and fill in the required fields
4. Run tests with `npm run test`
5. Everything should works :)
