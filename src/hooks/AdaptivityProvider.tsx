import { FC, ReactNode, useEffect, useRef, useState } from "react";
import {
  AdaptivityContext,
  type AdaptivityContextType,
  type Platform,
  type SizeX,
  type SizeY,
} from "./useAdaptivity";

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
};

const getSizeX = (width: number): SizeX => {
  return width < 600 ? "compact" : "regular";
};

const getSizeY = (height: number): SizeY => {
  return height < 600 ? "compact" : "regular";
};

interface AdaptivityProviderProps {
  children: ReactNode;
}

export const AdaptivityProvider: FC<AdaptivityProviderProps> = ({ children }) => {
  const rafId = useRef<number | null>(null);

  const getViewportSize = () => {
    const viewport = window.visualViewport;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    return { width, height };
  };

  const [state, setState] = useState<AdaptivityContextType>(() => ({
    platform: detectPlatform(),
    sizeX: getSizeX(getViewportSize().width),
    sizeY: getSizeY(getViewportSize().height),
    viewportWidth: getViewportSize().width,
    viewportHeight: getViewportSize().height,
    isTouch: "ontouchstart" in window,
  }));

  useEffect(() => {
    const handleResize = () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;

        const { width, height } = getViewportSize();
        const nextSizeX = getSizeX(width);
        const nextSizeY = getSizeY(height);

        setState((prev) => {
          if (
            prev.viewportWidth === width
            && prev.viewportHeight === height
            && prev.sizeX === nextSizeX
            && prev.sizeY === nextSizeY
          ) {
            return prev;
          }

          return {
            ...prev,
            sizeX: nextSizeX,
            sizeY: nextSizeY,
            viewportWidth: width,
            viewportHeight: height,
          };
        });
      });
    };

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }

      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, []);

  return (
    <AdaptivityContext.Provider value={state}>
      {children}
    </AdaptivityContext.Provider>
  );
};
