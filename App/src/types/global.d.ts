import type { EdifyBridge } from '../../electron/preload';

declare global {
  interface Window {
    edify?: EdifyBridge;
  }
}

export {};
