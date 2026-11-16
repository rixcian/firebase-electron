import crypto from 'crypto';
import ece from 'http_ece';
import { describe, expect, it } from 'vitest';

import { decrypt } from './decrypt.js';

function createKeys() {
  const dh = crypto.createECDH('prime256v1');
  dh.generateKeys();

  return {
    privateKey: dh.getPrivateKey('base64'),
    publicKey: dh.getPublicKey('base64'),
    authSecret: crypto.randomBytes(16).toString('base64'),
    localDh: dh,
  };
}

function encryptPayload(keys: ReturnType<typeof createKeys>, payload: object) {
  const sender = crypto.createECDH('prime256v1');
  sender.generateKeys();
  const salt = crypto.randomBytes(16);

  const encrypted = ece.encrypt(Buffer.from(JSON.stringify(payload)), {
    version: 'aesgcm',
    authSecret: keys.authSecret,
    dh: keys.localDh.getPublicKey(),
    privateKey: sender,
    salt: salt.toString('base64'),
  });

  return {
    rawData: encrypted,
    senderPublicKey: sender.getPublicKey('base64'),
    salt: salt.toString('base64'),
  };
}

describe('decrypt', () => {
  it('decrypts when crypto-key only contains dh', () => {
    const keys = createKeys();
    const payload = { title: 'hello', body: 'world' };
    const encrypted = encryptPayload(keys, payload);

    const result = decrypt(
      {
        rawData: encrypted.rawData,
        appData: [
          { key: 'crypto-key', value: `dh=${encrypted.senderPublicKey}` },
          { key: 'encryption', value: `salt=${encrypted.salt}` },
        ],
      },
      {
        privateKey: keys.privateKey,
        authSecret: keys.authSecret,
      },
    );

    expect(result).toEqual(payload);
  });

  it('decrypts when crypto-key also contains p256ecdsa', () => {
    const keys = createKeys();
    const payload = { title: 'hello', body: 'world' };
    const encrypted = encryptPayload(keys, payload);
    const p256ecdsa = crypto.createECDH('prime256v1').generateKeys('base64');

    const result = decrypt(
      {
        rawData: encrypted.rawData,
        appData: [
          {
            key: 'crypto-key',
            value: `dh=${encrypted.senderPublicKey};p256ecdsa=${p256ecdsa}`,
          },
          { key: 'encryption', value: `salt=${encrypted.salt}` },
        ],
      },
      {
        privateKey: keys.privateKey,
        authSecret: keys.authSecret,
      },
    );

    expect(result).toEqual(payload);
  });

  it('throws when dh parameter is missing', () => {
    expect(() =>
      decrypt(
        {
          rawData: Buffer.from('x'),
          appData: [
            { key: 'crypto-key', value: 'p256ecdsa=abc' },
            { key: 'encryption', value: 'salt=abc' },
          ],
        },
        { privateKey: 'abc', authSecret: 'abc' },
      ),
    ).toThrow('dh parameter is missing from crypto-key');
  });
});
