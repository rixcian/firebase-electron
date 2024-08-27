export function escape(string: string): string {
  return string.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function toBase64(input: Buffer | string): string {
  return escape(Buffer.from(input).toString('base64'));
}
