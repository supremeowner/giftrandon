import { useEffect, useMemo, useRef, useState } from "react";
import {
  bindMiniAppCssVars,
  bindViewportCssVars,
  expandViewport,
  isMiniAppCssVarsBound,
  isMiniAppMounted,
  isViewportCssVarsBound,
  isViewportMounted,
  miniAppReady,
  mountMiniApp,
  mountViewport,
  requestContentSafeAreaInsets,
  requestFullscreen,
  requestSafeAreaInsets,
  requestViewport,
  retrieveRawInitData,
} from "@telegram-apps/sdk";
import type {
  TelegramColorScheme,
  TelegramInsets,
  TelegramWebApp,
  TelegramWebAppInitDataUnsafe,
  TelegramWebAppUser,
} from "@/types/telegram";

// Minimal Telegram WebApp integration (safe fallback for non-Telegram browsers).
// Theme + language are handled by SettingsProvider.

type TelegramThemeParams = Record<string, unknown>;

const getTelegramWebApp = () => window.Telegram?.WebApp ?? null;

const getRawInitDataFromSdk = () => {
  try {
    const initData = retrieveRawInitData();
    return typeof initData === "string" && initData.trim().length > 0 ? initData : undefined;
  } catch {
    return undefined;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object";
};

export const isTelegramWebAppUser = (value: unknown): value is TelegramWebAppUser => {
  if (!isRecord(value)) return false;
  return typeof value.id === "number";
};

export const getTelegramInitDataUnsafe = (webApp: TelegramWebApp | null | undefined): TelegramWebAppInitDataUnsafe | null => {
  if (!isRecord(webApp?.initDataUnsafe)) return null;
  return webApp.initDataUnsafe;
};

export const getTelegramUser = (webApp: TelegramWebApp | null | undefined): TelegramWebAppUser | null => {
  const unsafeData = getTelegramInitDataUnsafe(webApp);
  if (!unsafeData || !isTelegramWebAppUser(unsafeData.user)) return null;
  return unsafeData.user;
};

const hasValidInitData = (webApp: TelegramWebApp | null | undefined) => {
  if (typeof webApp?.initData === "string" && webApp.initData.trim().length > 0) {
    return true;
  }

  return Boolean(getRawInitDataFromSdk());
};

const setRootPxVar = (name: string, value: number | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return;
  document.documentElement.style.setProperty(name, `${value}px`);
};

const applyInsets = (prefix: string, insets?: TelegramInsets) => {
  if (!insets) return;
  setRootPxVar(`--${prefix}-top`, insets.top);
  setRootPxVar(`--${prefix}-bottom`, insets.bottom);
  setRootPxVar(`--${prefix}-left`, insets.left);
  setRootPxVar(`--${prefix}-right`, insets.right);
};

const getCssVarPx = (name: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getCssSafeAreaInsets = (): TelegramInsets => {
  return {
    top: getCssVarPx("--safe-area-top"),
    bottom: getCssVarPx("--safe-area-bottom"),
    left: getCssVarPx("--safe-area-left"),
    right: getCssVarPx("--safe-area-right"),
  };
};

const getViewportInsets = (): TelegramInsets => {
  const viewport = window.visualViewport;
  if (!viewport) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const top = Math.max(0, viewport.offsetTop || 0);
  const left = Math.max(0, viewport.offsetLeft || 0);
  const bottom = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
  const right = Math.max(0, window.innerWidth - viewport.width - viewport.offsetLeft);

  return { top, bottom, left, right };
};

const resolveInsets = (preferred: TelegramInsets | undefined, fallback: TelegramInsets): TelegramInsets => {
  return {
    top: Math.max(preferred?.top ?? 0, fallback.top),
    bottom: Math.max(preferred?.bottom ?? 0, fallback.bottom),
    left: Math.max(preferred?.left ?? 0, fallback.left),
    right: Math.max(preferred?.right ?? 0, fallback.right),
  };
};

const applyViewportVars = (webApp?: TelegramWebApp | null) => {
  const fallbackHeight = window.visualViewport?.height ?? window.innerHeight;
  const fallbackWidth = window.visualViewport?.width ?? window.innerWidth;
  const shouldSetViewportVars = !isViewportCssVarsBound();
  if (shouldSetViewportVars) {
    setRootPxVar("--tg-viewport-height", webApp?.viewportHeight ?? fallbackHeight);
    setRootPxVar("--tg-viewport-stable-height", webApp?.viewportStableHeight ?? fallbackHeight);
    setRootPxVar("--tg-viewport-width", fallbackWidth);
  }
  const cssSafeInsets = getCssSafeAreaInsets();
  const viewportInsets = getViewportInsets();
  const baseInsets: TelegramInsets = {
    top: Math.max(cssSafeInsets.top, viewportInsets.top),
    bottom: Math.max(cssSafeInsets.bottom, viewportInsets.bottom),
    left: Math.max(cssSafeInsets.left, viewportInsets.left),
    right: Math.max(cssSafeInsets.right, viewportInsets.right),
  };
  const safeInsets = resolveInsets(webApp?.safeAreaInset, baseInsets);
  const contentInsets = resolveInsets(webApp?.contentSafeAreaInset ?? webApp?.safeAreaInset, baseInsets);

  if (webApp?.safeAreaInset || webApp?.contentSafeAreaInset) {
    applyInsets("tg-safe-area-inset", safeInsets);
    applyInsets("tg-content-safe-area-inset", contentInsets);
  }
  if (shouldSetViewportVars) {
    applyInsets("tg-viewport-safe-area-inset", safeInsets);
    applyInsets("tg-viewport-content-safe-area-inset", contentInsets);
  }
};

const initTmaSdkViewport = async () => {
  try {
    if (!isMiniAppMounted()) {
      await mountMiniApp();
    }

    if (!isMiniAppCssVarsBound()) {
      bindMiniAppCssVars();
    }

    if (!isViewportMounted()) {
      await mountViewport();
    }

    if (!isViewportCssVarsBound()) {
      bindViewportCssVars();
    }

    await Promise.allSettled([
      requestViewport(),
      requestSafeAreaInsets(),
      requestContentSafeAreaInsets(),
    ]);

    expandViewport();
    requestFullscreen();
    miniAppReady();
  } catch {
    // ignore SDK init errors outside Telegram context
  }
};

export const initTelegramWebApp = () => {
  const root = document.documentElement;

  // Keep safe-area vars for iOS.
  // Telegram sets env(safe-area-inset-bottom) in some cases; we mirror it for CSS usage.
  root.style.setProperty("--safe-area-top", "env(safe-area-inset-top, 0px)");
  root.style.setProperty("--safe-area-bottom", "env(safe-area-inset-bottom, 0px)");
  root.style.setProperty("--safe-area-left", "env(safe-area-inset-left, 0px)");
  root.style.setProperty("--safe-area-right", "env(safe-area-inset-right, 0px)");

  try {
    const wa = getTelegramWebApp();
    wa?.ready?.();
    wa?.expand?.();
    wa?.requestFullscreen?.();
    applyViewportVars(wa);
    void initTmaSdkViewport();
  } catch {
    // ignore
  }
};

export const useTelegramWebApp = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(() => {
    return getTelegramWebApp();
  });
  const [colorScheme, setColorScheme] = useState<TelegramColorScheme>(() => {
    const scheme = getTelegramWebApp()?.colorScheme;
    return scheme === "light" ? "light" : "dark";
  });
  const initializedRef = useRef(false);

  useEffect(() => {
    if (webApp) return;

    const maxAttempts = 20;
    let attempts = 0;

    const attachWebApp = () => {
      const wa = getTelegramWebApp();
      attempts += 1;

      if (wa || attempts >= maxAttempts) {
        setWebApp(wa);
        return true;
      }

      return false;
    };

    if (attachWebApp()) return;

    const intervalId = window.setInterval(() => {
      if (attachWebApp()) {
        window.clearInterval(intervalId);
      }
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [webApp]);

  useEffect(() => {
    if (!initializedRef.current && webApp) {
      initTelegramWebApp();
      initializedRef.current = true;
    }

    applyViewportVars(webApp);

    const scheme = webApp?.colorScheme;
    setColorScheme(scheme === "light" ? "light" : "dark");
  }, [webApp]);

  useEffect(() => {
    const syncTheme = () => {
      const scheme = getTelegramWebApp()?.colorScheme;
      setColorScheme(scheme === "light" ? "light" : "dark");
    };

    const wa = getTelegramWebApp();
    wa?.onEvent?.("themeChanged", syncTheme);
    wa?.onEvent?.("theme_changed", syncTheme);
    window.addEventListener("focus", syncTheme);
    document.addEventListener("visibilitychange", syncTheme);

    return () => {
      wa?.offEvent?.("themeChanged", syncTheme);
      wa?.offEvent?.("theme_changed", syncTheme);
      window.removeEventListener("focus", syncTheme);
      document.removeEventListener("visibilitychange", syncTheme);
    };
  }, []);

  useEffect(() => {
    const handleViewportChange = () => {
      const currentWebApp = getTelegramWebApp();
      applyViewportVars(currentWebApp);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleViewportChange();
      }
    };

    handleViewportChange();
    const wa = getTelegramWebApp();
    wa?.onEvent?.("viewportChanged", handleViewportChange);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("focus", handleViewportChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);

    return () => {
      wa?.offEvent?.("viewportChanged", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("focus", handleViewportChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
    };
  }, []);

  return useMemo(() => {
    const hasTelegramWebApp = Boolean(getTelegramWebApp());
    const fallbackInitData = getRawInitDataFromSdk();
    const normalizedWebApp = webApp
      ? {
          ...webApp,
          initData: webApp.initData ?? fallbackInitData,
        }
      : null;

    return {
      webApp: normalizedWebApp,
      isTelegramContext: hasTelegramWebApp && hasValidInitData(normalizedWebApp),
      colorScheme,
      isExpanded: Boolean(normalizedWebApp?.isExpanded),
      themeParams: (normalizedWebApp?.themeParams ?? {}) as TelegramThemeParams,
    };
  }, [colorScheme, webApp]);
};
