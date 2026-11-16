import Long from 'long';
import path from 'path';
import protobuf from 'protobufjs';
import request from 'request-promise';

import fcmKey from '../fcm/server-key.js';
import { toBase64 } from '../utils/base64.js';
import {
  getGcmRetryDelayMs,
  isTransientGcmError,
  MAX_GCM_REGISTER_RETRIES,
  POST_CHECKIN_DELAY_MS,
  shouldRecheckIn,
} from '../utils/gcm-retry.js';
import { waitFor } from '../utils/timeout.js';

// HACK: fix PHONE_REGISTRATION_ERROR when bundled with webpack
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
  let options = await checkIn();
  // NOTE: Google may return PHONE_REGISTRATION_ERROR until a new android_id propagates
  await waitFor(POST_CHECKIN_DELAY_MS);
  const credentials = await doRegister(options, appId, async () => {
    options = await checkIn(options.androidId, options.securityToken);
    await waitFor(POST_CHECKIN_DELAY_MS);
    return options;
  });

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

async function doRegister(
  checkInOptions: CheckInOptions,
  appId: string,
  recheckIn: () => Promise<CheckInOptions>,
): Promise<GCMRegistrationResult> {
  let { androidId, securityToken } = checkInOptions;
  const body = {
    app: 'org.chromium.linux',
    'X-subtype': appId,
    device: androidId,
    sender: serverKey,
  };

  const response = await postRegister({
    getAuth: () => ({ androidId, securityToken }),
    body,
    onTransientFailure: async (retry) => {
      if (shouldRecheckIn(retry)) {
        const refreshed = await recheckIn();
        androidId = refreshed.androidId;
        securityToken = refreshed.securityToken;
        body.device = androidId;
      }
    },
  });
  const token = response.split('=')[1]!;

  return {
    token,
    androidId,
    securityToken,
    appId,
  };
}

interface PostRegisterOptions {
  getAuth: () => { androidId: string; securityToken: string };
  body: Record<string, string>;
  retry?: number;
  onTransientFailure?: (retry: number) => Promise<void>;
}

async function postRegister({
  getAuth,
  body,
  retry = 0,
  onTransientFailure,
}: PostRegisterOptions): Promise<string> {
  const { androidId, securityToken } = getAuth();
  const response = await request({
    url: REGISTER_URL,
    method: 'POST',
    headers: {
      Authorization: `AidLogin ${androidId}:${securityToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3234.0 Safari/537.36',
    },
    form: body,
  });

  if (response.includes('Error')) {
    console.warn(`GCM register request has failed with ${response}`);

    if (!isTransientGcmError(response) || retry >= MAX_GCM_REGISTER_RETRIES) {
      throw new Error(`GCM register has failed with ${response.trim()}`);
    }

    console.warn(`Retry... ${retry + 1}`);
    await onTransientFailure?.(retry + 1);
    await waitFor(getGcmRetryDelayMs(retry));

    return postRegister({ getAuth, body, retry: retry + 1, onTransientFailure });
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
