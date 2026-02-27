import { createContext, useContext } from "react";
import type { TelegramWebApp } from "@/types/telegram";

export type TelegramWebAppContextValue = {
  webApp: TelegramWebApp | null;
  isTelegramContext: boolean;
  colorScheme: "light" | "dark";
};

export const TelegramWebAppContext = createContext<TelegramWebAppContextValue | null>(null);

export const useTelegramWebAppContext = () => {
  const ctx = useContext(TelegramWebAppContext);
  if (!ctx) throw new Error("useTelegramWebAppContext must be used within TelegramWebAppProvider");
  return ctx;
};

export const useRequiredTelegramWebApp = () => {
  const ctx = useTelegramWebAppContext();
  if (!ctx.isTelegramContext || !ctx.webApp || !ctx.webApp.initData) {
    throw new Error("useRequiredTelegramWebApp must be used inside Telegram WebApp context");
  }

  return ctx.webApp;
};
