/// <reference types="vite/client" />

declare const __AUTH_USER__: string;
declare const __AUTH_PASS__: string;

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
