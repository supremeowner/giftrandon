import { FC } from "react";
import { useTelegramWebAppContext } from "@/contexts/TelegramWebAppContext";

const openFallbackLink = (url: string) => {
  if (!url) return;

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.href = url;
  }
};

export const OpenInTelegramPage: FC = () => {
  const { webApp } = useTelegramWebAppContext();
  const telegramAppUrl = import.meta.env.TELEGRAM_APP_URL ?? "";

  const openInTelegram = () => {
    if (!telegramAppUrl) return;

    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(telegramAppUrl);
      return;
    }

    if (webApp?.openLink) {
      webApp.openLink(telegramAppUrl);
      return;
    }

    openFallbackLink(telegramAppUrl);
  };

  return (
    <div className="app-container flex min-h-screen items-center justify-center px-6">
      <button
        className="rounded-2xl bg-[#2AABEE] px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
        type="button"
        onClick={openInTelegram}
      >
        Открыть в Telegram
      </button>
    </div>
  );
};
