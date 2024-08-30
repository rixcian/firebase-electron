import EventEmitter from 'events';
import Long from 'long';
import path from 'path';
import tls from 'tls';
import net from 'net';
import { load, Root } from 'protobufjs';

import { EVENTS } from './events.d.js';
import { checkIn, type CheckInOptions } from './gcm/index.js';
import { decrypt } from './utils/decrypt.js';
import { kMCSVersion, MCSProtoTag } from './utils/constants.js';
import Parser from './utils/parser.js';

const HOST = 'mtalk.google.com';
const PORT = 5228;
const MAX_RETRY_TIMEOUT = 15;

let proto: Root | null = null;

export interface Credentials {
  gcm: {
    androidId: string;
    securityToken: string;
  };
  keys: {
    privateKey: string;
    authSecret: string;
  };
}

export interface Message {
  notification: any;
  persistentId: string;
}

export interface ClientCredentials {
  gcm: {
    androidId: string;
    securityToken: string;
  };
  keys: {
    privateKey: string;
    authSecret: string;
  };
}

export class Client extends EventEmitter {
  private _tcpSocket: net.Socket | null;
  private _credentials: Credentials;
  private _persistentIds: string[];
  private _retryCount: number;
  private _socket: tls.TLSSocket | null;
  private _parser: Parser | null;
  private _retryTimeout: NodeJS.Timeout | null;

  static async init(): Promise<void> {
    if (proto) {
      return;
    }
    proto = await load(path.resolve(__dirname, 'utils', 'mcs.proto'));
  }

  constructor(credentials: ClientCredentials, persistentIds: string[]) {
    super();
    this._credentials = credentials;
    this._persistentIds = persistentIds;
    this._retryCount = 0;
    this._tcpSocket = null;
    this._socket = null;
    this._parser = null;
    this._retryTimeout = null;
  }

  async connect(): Promise<void> {
    await Client.init();
    await this._checkIn();
    this._connect();
    // can happen if the socket immediately closes after being created
    if (!this._socket) {
      return;
    }
    await Parser.init();
    // can happen if the socket immediately closes after being created
    if (!this._socket) {
      return;
    }
    this._parser = new Parser(this._socket);
    this._parser.on('message', this._onMessage);
    this._parser.on('error', this._onParserError);
  }

  destroy(): void {
    this._destroy();
  }

  checkConnection(): boolean {
    if (!this._socket) return false;

    return !this._socket.destroyed && this._socket.writable;
  }

  private async _checkIn(): Promise<CheckInOptions> {
    return checkIn(this._credentials.gcm.androidId, this._credentials.gcm.securityToken);
  }

  private _connect(): void {
    // @ts-ignore
    this._socket = new tls.TLSSocket();
    this._socket.setKeepAlive(true);
    this._socket.on('connect', this._onSocketConnect);
    this._socket.on('close', this._onSocketClose);
    this._socket.on('error', this._onSocketError);
    this._socket.connect({ host: HOST, port: PORT });
    this._socket.write(this._loginBuffer());
  }

  private _destroy(): void {
    if (this._retryTimeout) {
      clearTimeout(this._retryTimeout);
    }
    if (this._socket) {
      this._socket.removeListener('connect', this._onSocketConnect);
      this._socket.removeListener('close', this._onSocketClose);
      this._socket.removeListener('error', this._onSocketError);
      this._socket.destroy();
      this._socket = null;
    }
    if (this._parser) {
      this._parser.removeListener('message', this._onMessage);
      this._parser.removeListener('error', this._onParserError);
      this._parser.destroy();
      this._parser = null;
    }
  }

  private _loginBuffer(): Buffer {
    if (!proto) {
      throw new Error('Proto is not initialized');
    }
    const LoginRequestType = proto.lookupType('mcs_proto.LoginRequest');
    const hexAndroidId = Long.fromString(this._credentials.gcm.androidId).toString(16);
    const loginRequest = {
      adaptiveHeartbeat: false,
      authService: 2,
      authToken: this._credentials.gcm.securityToken,
      id: 'chrome-63.0.3234.0',
      domain: 'mcs.android.com',
      deviceId: `android-${hexAndroidId}`,
      networkType: 1,
      resource: this._credentials.gcm.androidId,
      user: this._credentials.gcm.androidId,
      useRmq2: true,
      setting: [{ name: 'new_vc', value: '1' }],
      // Id of the last notification received
      clientEvent: [],
      receivedPersistentId: this._persistentIds,
    };

    const errorMessage = LoginRequestType.verify(loginRequest);
    if (errorMessage) {
      throw new Error(errorMessage);
    }

    const buffer = LoginRequestType.encodeDelimited(loginRequest).finish();

    return Buffer.concat([Buffer.from([kMCSVersion, MCSProtoTag.kLoginRequestTag]), buffer]);
  }

  private _onSocketConnect = (): void => {
    this._retryCount = 0;
    this.emit('connect');
  };

  private _onSocketClose = (): void => {
    this.emit('disconnect');
    this._retry();
  };

  private _onSocketError = (error: Error): void => {
    // ignore, the close handler takes care of retry
    console.error('Socket error', error);
  };

  private _onParserError = (error: Error): void => {
    console.error('Parser error', error);
    this._retry();
  };

  private _retry(): void {
    this._destroy();
    const timeout = Math.min(++this._retryCount, MAX_RETRY_TIMEOUT) * 1000;
    this._retryTimeout = setTimeout(() => this.connect(), timeout);
  }

  private _onMessage = ({ tag, object }: { tag: number; object: any }): void => {
    console.log('Message', tag, object);
    if (tag === MCSProtoTag.kLoginResponseTag) {
      // clear persistent ids, as we just sent them to the server while logging
      // in
      this._persistentIds = [];
    } else if (tag === MCSProtoTag.kDataMessageStanzaTag) {
      console.log('calling _onDataMessage');
      this._onDataMessage(object);
    }

    console.log('the message tag was not handled', tag);
  };

  private _onDataMessage(object: any): void {
    console.log('Data message', object);
    if (this._persistentIds.includes(object.persistentId)) {
      return;
    }

    let message;
    try {
      message = decrypt(object, this._credentials.keys);
    } catch (error) {
      if (error instanceof Error) {
        switch (true) {
          case error.message.includes('Unsupported state or unable to authenticate data'):
          case error.message.includes('crypto-key is missing'):
          case error.message.includes('salt is missing'):
            // NOTE(ibash) Periodically we're unable to decrypt notifications. In
            // all cases we've been able to receive future notifications using the
            // same keys. So, we silently drop this notification.
            console.warn('Message dropped as it could not be decrypted: ' + error.message);
            this._persistentIds.push(object.persistentId);
            return;
          default: {
            throw error;
          }
        }
      } else {
        throw error;
      }
    }

    // Maintain persistentIds updated with the very last received value
    this._persistentIds.push(object.persistentId);
    // Send notification
    this.emit(EVENTS.ON_NOTIFICATION_RECEIVED, {
      notification: message,
      // Needs to be saved by the client
      persistentId: object.persistentId,
    } as Message);
  }
}
