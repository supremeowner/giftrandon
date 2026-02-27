import { ReactNode, useMemo } from "react";
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp";
import { TelegramWebAppContext, type TelegramWebAppContextValue } from "./TelegramWebAppContext";

export const TelegramWebAppProvider = ({ children }: { children: ReactNode }) => {
  const { webApp, colorScheme, isTelegramContext } = useTelegramWebApp();

  const value = useMemo<TelegramWebAppContextValue>(() => {
    return {
      webApp,
      colorScheme,
      isTelegramContext,
    };
  }, [webApp, colorScheme, isTelegramContext]);

  // useTelegramWebApp must stay at the app root: duplicating it in child screens
  // re-subscribes Telegram/window listeners and can cause duplicate side effects.
  return <TelegramWebAppContext.Provider value={value}>{children}</TelegramWebAppContext.Provider>;
};
