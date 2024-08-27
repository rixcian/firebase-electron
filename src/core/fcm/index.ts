import crypto from 'crypto';
import request from 'request-promise';

import { escape } from '../utils/base64.js';
import { type FirebaseCredentials } from '../register.js';

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';
const FCM_REGISTRATION_ENDPOINT = 'https://fcmregistrations.googleapis.com/v1';
const FCM_INSTALLATION_ENDPOINT = 'https://firebaseinstallations.googleapis.com/v1';

export interface FCMRegistrationResult {
  keys: {
    privateKey: string;
    publicKey: string;
    authSecret: string;
  };
  fcm: {
    token: string;
  };
}

let credentials: FirebaseCredentials;

export async function registerFCM(
  gcmToken: string,
  firebaseCredentials: FirebaseCredentials,
): Promise<FCMRegistrationResult> {
  credentials = firebaseCredentials;
  const keys = await createKeys();
  const installationAuthToken = await installRequest();
  const fcmToken = await registerRequest(installationAuthToken, gcmToken, keys);

  return {
    keys,
    fcm: {
      token: fcmToken,
    },
  };
}

async function createKeys(): Promise<{
  privateKey: string;
  publicKey: string;
  authSecret: string;
}> {
  const dh = crypto.createECDH('prime256v1');
  dh.generateKeys();
  const buf = crypto.randomBytes(16);

  return {
    privateKey: escape(dh.getPrivateKey('base64')),
    publicKey: escape(dh.getPublicKey('base64')),
    authSecret: escape(buf.toString('base64')),
  };
}

async function registerRequest(
  installationAuthToken: string,
  gcmToken: string,
  keys: { authSecret: string; publicKey: string },
): Promise<string> {
  const response = await request({
    url: `${FCM_REGISTRATION_ENDPOINT}/projects/${credentials.projectId}/registrations`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': credentials.apiKey,
      'x-goog-firebase-installations-auth': installationAuthToken,
    },
    body: JSON.stringify({
      web: {
        applicationPubKey: credentials.vapidKey || '',
        auth: keys.authSecret.replace(/=/g, '').replace(/\+/g, '').replace(/\//g, ''),
        endpoint: `${FCM_ENDPOINT}/${gcmToken}`,
        p256dh: keys.publicKey.replace(/=/g, '').replace(/\+/g, '').replace(/\//g, ''),
      },
    }),
  });

  const parsedResponse = JSON.parse(response);

  if (!parsedResponse || !parsedResponse.token) {
    console.error(`Failed to get FCM token: ${parsedResponse}`);
    throw new Error('Failed to get FCM token');
  }

  return parsedResponse.token;
}

async function installRequest(): Promise<string> {
  const fid = await generateFirebaseFID();

  const response = await request({
    url: `${FCM_INSTALLATION_ENDPOINT}/projects/${credentials.projectId}/installations`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-firebase-client': Buffer.from(
        JSON.stringify({
          heartbeats: [],
          version: 2,
        }),
      ).toString('base64'),
      'x-goog-api-key': credentials.apiKey,
    },
    body: JSON.stringify({
      appId: credentials.appId,
      authVersion: 'FIS_v2',
      fid,
      sdkVersion: 'w:0.6.4',
    }),
  });

  const parsedResponse = JSON.parse(response);

  if (!parsedResponse || !parsedResponse.authToken || !parsedResponse.authToken.token) {
    console.error(`Failed to get auth token: ${parsedResponse}`);
    throw new Error('Failed to get auth token');
  }

  return parsedResponse.authToken.token;
}

async function generateFirebaseFID(): Promise<string> {
  const buf = crypto.randomBytes(17);

  // Replace the first 4 bits with the constant FID header of 0b0111
  buf[0] = 0b01110000 | (buf[0]! & 0b00001111);

  // Encode to base64 and remove padding
  return buf.toString('base64').replace(/=/g, '');
}
