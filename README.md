# firebase-electron

Receive Firebase push notifications in your Electron app.

## Usage

```
npm install firebase-electron
```

## Differences from the `electron-push-receiver` package

`electron-push-receiver` library stopped working because it depends on the [Legacy FCM API](https://firebase.google.com/docs/cloud-messaging/migrate-v1) which was deprecated on June 21st, 2024 by Google.

This package is a fork of the `electron-push-receiver` package that has been updated to work with the new Firebase Cloud Messaging (FCM) protocol.

As a plus it uses updated dependencies and it's completely written in TypeScript.
