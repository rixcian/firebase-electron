import Long from 'long';
import path from 'path';
import protobuf from 'protobufjs';
import request from 'request-promise';

import fcmKey from '../fcm/server-key.js';
import { toBase64 } from '../utils/base64.js';
import { waitFor } from '../utils/timeout.js';

// Hack to fix PHONE_REGISTRATION_ERROR #17 when bundled with webpack
// https://github.com/dcodeIO/protobuf.js#browserify-integration
protobuf.util.Long = Long;
protobuf.configure();

const serverKey = toBase64(Buffer.from(fcmKey));

const REGISTER_URL = 'https://android.clients.google.com/c2dm/register3';
const CHECKIN_URL = 'https://android.clients.google.com/checkin';

let root: protobuf.Root;
let AndroidCheckinResponse: protobuf.Type;

export interface CheckInOptions {
  androidId: string;
  securityToken: string;
}

export interface GCMRegistrationResult extends CheckInOptions {
  token: string;
  appId: string;
}

export async function registerGCM(appId: string): Promise<GCMRegistrationResult> {
  const options = await checkIn();
  const credentials = await doRegister(options, appId);

  return credentials;
}

export async function checkIn(androidId?: string, securityToken?: string): Promise<CheckInOptions> {
  await loadProtoFile();

  const buffer = getCheckinRequest(androidId, securityToken);

  const body = await request({
    url: CHECKIN_URL,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-protobuf',
    },
    body: buffer,
    encoding: null,
  });

  const message = AndroidCheckinResponse.decode(body);

  const object = AndroidCheckinResponse.toObject(message, {
    longs: String,
    enums: String,
    bytes: String,
  }) as CheckInOptions;

  return object;
}

async function doRegister({ androidId, securityToken }: CheckInOptions, appId: string): Promise<GCMRegistrationResult> {
  const body = {
    app: 'org.chromium.linux',
    'X-subtype': appId,
    device: androidId,
    sender: serverKey,
  };

  const response = await postRegister({ androidId, securityToken, body });
  const token = response.split('=')[1]!;

  return {
    token,
    androidId,
    securityToken,
    appId,
  };
}

interface PostRegisterOptions {
  androidId: string;
  securityToken: string;
  body: Record<string, string>;
  retry?: number;
}

async function postRegister({ androidId, securityToken, body, retry = 0 }: PostRegisterOptions): Promise<string> {
  const response = await request({
    url: REGISTER_URL,
    method: 'POST',
    headers: {
      Authorization: `AidLogin ${androidId}:${securityToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    form: body,
  });

  if (response.includes('Error')) {
    console.warn(`GCM register request has failed with ${response}`);
    if (retry >= 10) throw new Error('GCM register has failed');

    console.warn(`Retry... ${retry + 1}`);

    await waitFor(1000);

    return postRegister({ androidId, securityToken, body, retry: retry + 1 });
  }

  return response;
}

async function loadProtoFile(): Promise<void> {
  if (root) return;

  root = await protobuf.load(path.join(__dirname, 'checkin.proto'));
}

function getCheckinRequest(androidId?: string, securityToken?: string): Uint8Array {
  const AndroidCheckinRequest = root.lookupType('checkin_proto.AndroidCheckinRequest');

  AndroidCheckinResponse = root.lookupType('checkin_proto.AndroidCheckinResponse');

  const payload = {
    userSerialNumber: 0,
    checkin: {
      type: 3,
      chromeBuild: {
        platform: 2,
        chromeVersion: '63.0.3234.0',
        channel: 1,
      },
    },
    version: 3,
    id: androidId ? Long.fromString(androidId) : undefined,
    securityToken: securityToken ? Long.fromString(securityToken, true) : undefined,
  };

  const errMsg = AndroidCheckinRequest.verify(payload);

  if (errMsg) throw Error(errMsg);

  const message = AndroidCheckinRequest.create(payload);

  return AndroidCheckinRequest.encode(message).finish();
}
