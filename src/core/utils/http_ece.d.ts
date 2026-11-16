declare module 'http_ece' {
  interface EceParams {
    version: string;
    authSecret: string;
    dh: string | Buffer;
    privateKey: crypto.ECDH;
    salt: string;
  }

  function decrypt(buffer: Buffer, params: EceParams): Buffer;
  function encrypt(buffer: Buffer, params: EceParams): Buffer;

  export = {
    decrypt: decrypt,
    encrypt: encrypt,
  };
}
