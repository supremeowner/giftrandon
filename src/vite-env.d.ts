/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_PUBLIC_URL?: string;
  readonly TELEGRAM_APP_URL?: string;
  readonly NEWS_URL?: string;
  readonly SUPPORT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const value: string;
  export default value;
}
