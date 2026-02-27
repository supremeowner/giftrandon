import "../tma-overrides.css";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SettingsProvider } from "./contexts/SettingsContext";
import { TelegramWebAppProvider } from "./contexts/TelegramWebAppProvider";
import { GIFT_IMAGE_SOURCES } from "./components/gifts/constants";
import ButtonIconSvg from "@/assets/gifts/svg-image-1.svg";
import "./index.css";

const preloadImages = (images: string[]) => {
  if (typeof Image === "undefined") return;
  images.forEach((src) => {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
  });
};

preloadImages([...GIFT_IMAGE_SOURCES, ButtonIconSvg]);

export const RootApp = () => {
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleCopy = (event: ClipboardEvent) => {
      event.preventDefault();
    };

    const handleGestureStart = (event: Event) => {
      event.preventDefault();
    };

    const handleMultiTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("gesturestart", handleGestureStart, true);
    document.addEventListener("touchmove", handleMultiTouchMove, { passive: false, capture: true });

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("gesturestart", handleGestureStart, true);
      document.removeEventListener("touchmove", handleMultiTouchMove, true);
    };
  }, []);
  return (
    <App />
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TelegramWebAppProvider>
      <SettingsProvider>
        <RootApp />
      </SettingsProvider>
    </TelegramWebAppProvider>
  </StrictMode>,
);
