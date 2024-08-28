declare module 'electron-config' {
  export default class ElectronConfig {
    constructor(options?: { defaults: { [key: string]: any } });
    get(key: string): any;
    set(key: string, value: any): void;
    delete(key: string): void;
  }
}
