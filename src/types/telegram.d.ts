export type TelegramColorScheme = "light" | "dark";

export interface TelegramWebAppUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

export interface TelegramWebAppInitDataUnsafe {
  user?: TelegramWebAppUser;
  [key: string]: unknown;
}

export interface TelegramInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TelegramWebApp {
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  themeParams?: Record<string, unknown>;
  colorScheme?: TelegramColorScheme;
  isExpanded?: boolean;
  version?: string;
  platform?: string;
  initData?: string;
  viewportHeight?: number;
  viewportStableHeight?: number;
  safeAreaInset?: TelegramInsets;
  contentSafeAreaInset?: TelegramInsets;
  initDataUnsafe?: unknown;
  isVersionAtLeast?: (version: string) => boolean;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  onEvent?: (event: "viewportChanged" | "themeChanged" | (string & {}), cb: () => void) => void;
  offEvent?: (event: "viewportChanged" | "themeChanged" | (string & {}), cb: () => void) => void;
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string) => void;
  openInvoice?: (url: string, cb?: (status: "paid" | "cancelled" | "failed" | "pending") => void) => void;
  showPopup?: (
    params: {
      title?: string;
      message: string;
      buttons?: Array<{ id?: string; type?: "default" | "ok" | "close" | "cancel" | "destructive"; text?: string }>;
    },
    callback?: (buttonId: string) => void
  ) => void;
  expand?: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  ready?: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}
