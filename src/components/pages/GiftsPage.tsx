import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Lottie from "lottie-react";
import { PriceTabs } from "../PriceTabs";
import StarSvg from "@/assets/gifts/star-badge.svg";
import ButtonIcon from "@/assets/gifts/svg-image-1.svg";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdaptivity } from "@/hooks/useAdaptivity";
import { useRequiredTelegramWebApp } from "@/contexts/TelegramWebAppContext";
import { buildApiUrl } from "@/lib/api";
import { fetchTelegramJson } from "@/lib/telegramApi";
import loadingAnimation from "@/assets/gifts/animation/loading.json";
import { GIFTS_CATALOG, type GiftId } from "@/components/gifts/constants";

const prices = [25, 50, 100];

type GiftIcon = { src: string };
type RouletteGift = { id: GiftId; icon: GiftIcon; label: string; price: number; chance: number };
type WinPrize = { icon: GiftIcon; label: string; price: number; chance: string };

type ChanceConfig = { weight: number; label: string };

const chanceBySelectedPrice: Record<number, Record<GiftId, ChanceConfig>> = {
  25: {
    "heart-box": { weight: 18, label: "18%" },
    "teddy-bear": { weight: 18, label: "18%" },
    "gift-box": { weight: 26, label: "26%" },
    rose: { weight: 26, label: "26%" },
    elka: { weight: 2, label: "2%" },
    newteddy: { weight: 2, label: "2%" },
    cake: { weight: 2, label: "2%" },
    bouquet: { weight: 2, label: "2%" },
    rocket: { weight: 2, label: "2%" },
    champagne: { weight: 2, label: "2%" },
    trophy: { weight: 0.33, label: "0.33%" },
    ring: { weight: 0.33, label: "0.33%" },
    diamond: { weight: 0.34, label: "0.34%" },
  },
  50: {
    "heart-box": { weight: 7, label: "7%" },
    "teddy-bear": { weight: 7, label: "7%" },
    "gift-box": { weight: 24, label: "24%" },
    rose: { weight: 24, label: "24%" },
    elka: { weight: 5.5, label: "5.5%" },
    newteddy: { weight: 5.5, label: "5.5%" },
    cake: { weight: 5.5, label: "5.5%" },
    bouquet: { weight: 5.5, label: "5.5%" },
    rocket: { weight: 5.5, label: "5.5%" },
    champagne: { weight: 5.5, label: "5.5%" },
    trophy: { weight: 1.33, label: "1.33%" },
    ring: { weight: 1.33, label: "1.33%" },
    diamond: { weight: 1.34, label: "1.34%" },
  },
  100: {
    "heart-box": { weight: 1, label: "1%" },
    "teddy-bear": { weight: 1, label: "1%" },
    "gift-box": { weight: 2, label: "2%" },
    rose: { weight: 2, label: "2%" },
    elka: { weight: 12, label: "12%" },
    newteddy: { weight: 12, label: "12%" },
    cake: { weight: 12, label: "12%" },
    bouquet: { weight: 12, label: "12%" },
    rocket: { weight: 12, label: "12%" },
    champagne: { weight: 12, label: "12%" },
    trophy: { weight: 6.67, label: "6.67%" },
    ring: { weight: 6.67, label: "6.67%" },
    diamond: { weight: 6.66, label: "6.66%" },
  },
};

const giftsCatalog = GIFTS_CATALOG;

// Create extended array for smooth roulette spinning
const createExtendedRoulette = (gifts: RouletteGift[]) => {
  const extended: RouletteGift[] = [];
  for (let i = 0; i < 10; i++) {
    extended.push(...gifts);
  }
  return extended;
};

const shuffleGifts = (gifts: RouletteGift[]) => {
  const copy = [...gifts];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Select winner based on chances
const selectWinnerByChance = (gifts: RouletteGift[]) => {
  const totalChance = gifts.reduce((sum, g) => sum + g.chance, 0);
  if (totalChance <= 0) return 0;
  const random = Math.random() * totalChance;
  let cumulative = 0;

  for (let i = 0; i < gifts.length; i++) {
    cumulative += gifts[i].chance;
    if (random <= cumulative) {
      return i;
    }
  }
  return 0;
};

export const GiftsPage: FC = () => {
  const { sizeX, platform } = useAdaptivity();
  const webApp = useRequiredTelegramWebApp();
  const [selectedPrice, setSelectedPrice] = useState(25);
  const [demoMode, setDemoMode] = useState(false);
  const [spinWasDemo, setSpinWasDemo] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<{ id: GiftId; icon: GiftIcon; label: string; price: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [loadedIcons, setLoadedIcons] = useState<Record<string, boolean>>({});
  const rouletteRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollOffsetRef = useRef(0);
  const autoScrollLastTimestampRef = useRef<number | null>(null);

  const chanceMap = chanceBySelectedPrice[selectedPrice];

  const baseRouletteGifts = useMemo<RouletteGift[]>(
    () =>
      giftsCatalog.map((gift) => ({
        id: gift.id,
        icon: { src: gift.icon },
        label: gift.label,
        price: gift.price,
        chance: chanceMap?.[gift.id]?.weight ?? 0,
      })),
    [chanceMap]
  );

  const rouletteGifts = useMemo<RouletteGift[]>(
    () => shuffleGifts(baseRouletteGifts),
    [baseRouletteGifts]
  );

  const allWinPrizes = useMemo<WinPrize[]>(
    () =>
      giftsCatalog.map((gift) => ({
        icon: { src: gift.icon },
        label: gift.label,
        price: gift.price,
        chance: chanceMap?.[gift.id]?.label ?? "—",
      })),
    [chanceMap]
  );

  const extendedRoulette = useMemo(
    () => createExtendedRoulette(rouletteGifts),
    [rouletteGifts]
  );
  const wonPrizeIconLoaded = wonPrize ? Boolean(loadedIcons[wonPrize.icon.src]) : false;

  const baseCardWidth = sizeX === "compact" ? 154 : 174;
  const baseCardHeight = sizeX === "compact" ? 182 : 206;
  const rouletteCardWidth = baseCardWidth;
  const winCardWidth = sizeX === "compact" ? 126 : 146;
  const winCardHeight = sizeX === "compact" ? 150 : 170;
  const cardGap = 12;
  const autoScrollSpeed = 14;
  const spinDurationMs = 5200;

  const isBusy = isSpinning || isProcessingPayment;

  const markIconLoaded = useCallback((src: string) => {
    setLoadedIcons((prev) => (prev[src] ? prev : { ...prev, [src]: true }));
  }, []);

  const clearTimers = () => {
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
    autoScrollLastTimestampRef.current = null;
  }, []);

  const renderRouletteOffset = useCallback((offset: number) => {
    if (!rouletteRef.current) return;
    rouletteRef.current.style.transition = "none";
    rouletteRef.current.style.transform = `translate3d(-${offset.toFixed(3)}px, 0, 0)`;
  }, []);

  const shouldAutoScroll = useCallback(() => {
    if (document.visibilityState === "hidden") return false;
    if (typeof window !== "undefined" && "matchMedia" in window) {
      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return true;
  }, []);

  const startAutoScroll = useCallback(() => {
    if (!shouldAutoScroll()) return;
    const itemWidth = rouletteCardWidth + cardGap;
    const cycleWidth = rouletteGifts.length * itemWidth;
    if (!rouletteRef.current || cycleWidth <= 0) return;

    stopAutoScroll();

    const tick = (timestamp: number) => {
      const prev = autoScrollLastTimestampRef.current ?? timestamp;
      const deltaSeconds = (timestamp - prev) / 1000;
      autoScrollLastTimestampRef.current = timestamp;

      autoScrollOffsetRef.current += autoScrollSpeed * deltaSeconds;
      if (autoScrollOffsetRef.current >= cycleWidth) {
        autoScrollOffsetRef.current %= cycleWidth;
      }

      renderRouletteOffset(autoScrollOffsetRef.current);
      autoScrollFrameRef.current = requestAnimationFrame(tick);
    };

    autoScrollFrameRef.current = requestAnimationFrame(tick);
  }, [shouldAutoScroll, rouletteCardWidth, cardGap, rouletteGifts, stopAutoScroll, renderRouletteOffset, autoScrollSpeed]);

  useEffect(
    () => () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }

      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      stopAutoScroll();
    },
    [stopAutoScroll]
  );

  useEffect(() => {
    if (isSpinning) {
      stopAutoScroll();
      return;
    }

    startAutoScroll();

    return () => {
      stopAutoScroll();
    };
  }, [isSpinning, startAutoScroll, stopAutoScroll]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopAutoScroll();
        return;
      }
      if (!isSpinning) {
        startAutoScroll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSpinning, startAutoScroll, stopAutoScroll]);

  const startSpin = (mode: "demo" | "paid") => {
    if (isSpinning) return;

    clearTimers();
    stopAutoScroll();
    
    setIsSpinning(true);
    setSpinWasDemo(mode === "demo");
    setWonPrize(null);
    setShowResult(false);
    
    // Select winner based on chances
    const winnerIndex = selectWinnerByChance(rouletteGifts);
    const winner = rouletteGifts[winnerIndex];
    
    // Calculate spin position
    const itemWidth = rouletteCardWidth + cardGap; // card width + gap
    const containerWidth = containerRef.current?.offsetWidth || 360;
    // Slightly bias to the right to match the in-app pointer positioning
    const centerOffset = (containerWidth / 2) - (rouletteCardWidth / 2) + 6;
    
    const startOffset = autoScrollOffsetRef.current;

    // Land on winner in the middle of extended array
    const targetIndex = (rouletteGifts.length * 5) + winnerIndex;
    const targetPosition = (targetIndex * itemWidth) - centerOffset;
    
    if (rouletteRef.current) {
      // Reset position instantly
      rouletteRef.current.style.transition = 'none';
      rouletteRef.current.style.transform = `translateX(-${startOffset}px)`;
      
      // Force reflow
      void rouletteRef.current.offsetHeight;
      
      // Start spin animation with platform-specific easing
      const easing = platform === "ios"
        ? "cubic-bezier(0.15, 0.85, 0.25, 1)"
        : "cubic-bezier(0.12, 0.78, 0.2, 1)";
      
      requestAnimationFrame(() => {
        if (rouletteRef.current) {
          rouletteRef.current.style.transition = `transform ${spinDurationMs}ms ${easing}`;
          rouletteRef.current.style.transform = `translate3d(-${targetPosition}px, 0, 0)`;
        }
      });
    }

    spinTimeoutRef.current = setTimeout(async () => {
      const itemWidth = rouletteCardWidth + cardGap;
      const cycleWidth = rouletteGifts.length * itemWidth;
      if (cycleWidth > 0) {
        autoScrollOffsetRef.current = ((targetPosition % cycleWidth) + cycleWidth) % cycleWidth;
      }

      if (mode === "paid") {
        try {
          await sendWonGift(winner.id, selectedPrice);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Ошибка отправки подарка.";
          window.alert(message);
        }
      }

      setIsSpinning(false);
      setWonPrize(winner);
      setShowResult(true);
      spinTimeoutRef.current = null;

      // Haptic feedback on supported devices
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 100]);
      }
    }, spinDurationMs);
  };


  const sendWonGift = async (giftKey: GiftId, spinPrice: number) => {
    const { response } = await fetchTelegramJson(
      buildApiUrl("/api/roulette/win"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gift_key: giftKey, spin_price: spinPrice }),
      },
      { initData: webApp.initData },
    );

    if (!response.ok) {
      throw new Error("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0432\u044b\u0438\u0433\u0440\u0430\u043d\u043d\u044b\u0439 \u043f\u043e\u0434\u0430\u0440\u043e\u043a \u0432 Telegram.");
    }
  };

  const handlePayment = async () => {
    if (isBusy) return;
    if (!webApp.openInvoice) {
      window.alert("\u041e\u043f\u043b\u0430\u0442\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0432 \u0432\u0430\u0448\u0435\u0439 \u0432\u0435\u0440\u0441\u0438\u0438 Telegram.");
      return;
    }

    try {
      setIsProcessingPayment(true);
      const { response, data } = await fetchTelegramJson<{ invoice_link?: string }>(
        buildApiUrl(`/api/invoice?amount=${selectedPrice}`),
        {},
        { initData: webApp.initData },
      );

      if (!response.ok) {
        throw new Error("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0441\u0447\u0435\u0442 \u043d\u0430 \u043e\u043f\u043b\u0430\u0442\u0443.");
      }

      const payload = data ?? {};
      if (!payload.invoice_link) {
        throw new Error("\u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0430 \u043e\u043f\u043b\u0430\u0442\u0443 \u043d\u0435 \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u0430.");
      }

      webApp.openInvoice(payload.invoice_link, (status) => {
        setIsProcessingPayment(false);

        if (status === "paid") {
          startSpin("paid");
        } else if (status === "failed") {
          window.alert("\u041f\u043b\u0430\u0442\u0435\u0436 \u043d\u0435 \u043f\u0440\u043e\u0448\u0435\u043b. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430.");
        }
      });
    } catch (error) {
      setIsProcessingPayment(false);
      const message = error instanceof Error ? error.message : "\u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u043f\u043b\u0430\u0442\u044b.";
      window.alert(message);
    }
  };

  const closeResultPanel = () => {
    setShowResult(false);

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = setTimeout(() => {
      setWonPrize(null);
      closeTimeoutRef.current = null;
    }, 460);
  };

  const handleDisableDemo = () => {
    setDemoMode(false);
    closeResultPanel();
  };

  const handleDemoModeChange = (checked: boolean) => {
    if (isBusy) return;
    setDemoMode(checked);
  };

  // Button text based on state
  const getButtonContent = () => {
    const contentKey = isBusy ? "spinning" : demoMode ? "demo" : "gift";

    if (isBusy) {
      return (
        <span key={contentKey} className="button-content button-content--animated">
          <Lottie
            animationData={loadingAnimation}
            loop
            autoplay
            className="button-loading-lottie"
            aria-label="Загрузка"
          />
        </span>
      );
    }

    if (demoMode) {
      return (
        <span key={contentKey} className="button-content button-content--animated button-content--gift text-primary-foreground font-semibold">
          <span className="text-lg">Испытать удачу!</span>
        </span>
      );
    }

    return (
      <span key={contentKey} className="button-content button-content--animated button-content--gift">
        <span className="text-lg">Испытать удачу!</span>
        <span className="button-price">
          <img src={ButtonIcon} alt="" className="button-price-icon" />
          <span className="text-lg font-semibold price-value button-price-value">{selectedPrice}</span>
        </span>
      </span>
    );
  };

  return (
    <div className="flex-1 px-3 pb-6">
      <div className="pt-6 mb-8">
        <PriceTabs
          prices={prices}
          selectedPrice={selectedPrice}
          onSelect={setSelectedPrice}
          disabled={isBusy}
        />
      </div>

      {/* Roulette Section */}
      <div className="relative mb-4">
        {/* Center Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
          {/* Top triangle */}
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "10px solid color-mix(in srgb, #007AFF 85%, transparent)",
              borderBottom: "0px solid transparent",
              filter: "drop-shadow(0 -2px 6px rgba(0,0,0,0.35))",
            }}
          />
          <div className="w-0.5 rounded-full gpu-accelerated" style={{ height: `${baseCardHeight}px`, background: "color-mix(in srgb, #007AFF 65%, transparent)" }} />
          {/* Bottom triangle */}
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "0px solid transparent",
              borderBottom: "10px solid color-mix(in srgb, #007AFF 85%, transparent)",
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.35))",
            }}
          />
        </div>

        {/* Roulette Container */}
        <div 
          ref={containerRef}
          className="relative overflow-hidden"
          style={{ height: `${baseCardHeight + 18}px` }}
        >
          {/* Gradient overlays */}
          <div
            className="absolute left-0 top-0 bottom-0 w-14 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right, var(--app-bg), transparent)" }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-14 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to left, var(--app-bg), transparent)" }}
          />
          
          {/* Scrolling roulette */}
          <div
            ref={rouletteRef}
            className="flex h-full items-center gpu-accelerated"
            style={{ width: "fit-content", gap: `${cardGap}px` }}
          >
            {extendedRoulette.map((gift, index) => {
              const iconLoaded = Boolean(loadedIcons[gift.icon.src]);

              return (
                <Skeleton
                  key={index}
                  visible={!iconLoaded}
                  className="flex-shrink-0 rounded-[12px] px-[10px] relative"
                  style={{
                    width: rouletteCardWidth,
                    height: baseCardHeight,
                    backgroundColor: "var(--gift-card-bg)",
                    boxShadow: "none",
                    ["--tgui--secondary_bg_color" as string]: "var(--gift-card-bg)",
                  }}
                >
                  <div className={iconLoaded ? "opacity-100" : "opacity-0"}>
                    {/* Centered icon - takes most of the space */}
                    <div className="absolute inset-0 flex items-center justify-center pb-12">
                      <img
                        src={gift.icon.src}
                        alt={gift.label}
                        className="gift-icon w-[124px] h-[124px] drop-shadow-lg"
                        loading="eager"
                        decoding="async"
                        onLoad={() => markIconLoaded(gift.icon.src)}
                        onError={(event) => {
                          event.currentTarget.style.opacity = "0";
                        }}
                      />
                    </div>
                    {/* Price badge centered at bottom */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 star-badge star-badge--center star-badge--tight">
                      <span className="price-row">
                        <img src={StarSvg} alt="star" className="star-icon" style={{ width: "1.9em", height: "1.9em" }} />
                        <span className="text-[15px] font-normal">{gift.price}</span>
                      </span>
                    </div>
                  </div>
                </Skeleton>
              );
            })}
          </div>
        </div>

        {/* Win Result Overlay */}
        {wonPrize && (
          <div
            className={`win-result-overlay ${showResult ? "is-visible" : ""}`}
            role="dialog"
            aria-live="polite"
          >
            <div className="win-result-panel">
              <div className="win-result-content">
                <Skeleton
                  visible={!wonPrizeIconLoaded}
                  className="inline-flex items-center justify-center w-[120px] h-[120px] rounded-[18px]"
                >
                  <img
                    src={wonPrize.icon.src}
                    alt={wonPrize.label}
                    className={`gift-icon w-full h-full drop-shadow-xl ${wonPrizeIconLoaded ? "opacity-100" : "opacity-0"}`}
                    loading="eager"
                    decoding="async"
                    onLoad={() => markIconLoaded(wonPrize.icon.src)}
                    onError={(event) => {
                      event.currentTarget.style.opacity = "0";
                    }}
                  />
                </Skeleton>
                <p className="text-foreground font-semibold text-2xl">Вы выиграли подарок!</p>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {spinWasDemo
                    ? "Демо-режим нужен для тестирования шансов выпадения подарков."
                    : "Подарок уже отправлен на ваш аккаунт."}
                </p>
              </div>
              <div className="win-result-actions">
                {spinWasDemo && (
                  <button
                    type="button"
                    className="win-result-primary-button touch-feedback"
                    onClick={handleDisableDemo}
                  >
                    Отключить демо-режим
                  </button>
                )}
                <button
                  type="button"
                  className="win-result-secondary-button touch-feedback"
                  onClick={closeResultPanel}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Demo Mode Toggle */}
      <div className="flex items-center justify-between pt-1 pb-4">
        <span className="text-base" style={{ color: "var(--tg-text)" }}>Демо режим</span>
        <Switch
          checked={demoMode}
          disabled={isBusy}
          onCheckedChange={handleDemoModeChange}
          className="demo-switch"
        />
      </div>

      {/* Get Gift Button */}
      <div className="pb-3 mt-2">
        <button
          onClick={demoMode ? () => startSpin("demo") : handlePayment}
          disabled={isBusy}
          className="primary-button touch-feedback"
        >
          {getButtonContent()}
        </button>
      </div>

      {/* Win Prizes Section - Horizontal Scroll */}
      <div className="pt-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-medium">
          ВЫ МОЖЕТЕ ВЫИГРАТЬ
        </p>
        
        <div 
          className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
          style={{ 
            scrollSnapType: "x mandatory",
            scrollPaddingLeft: 0,
            scrollPaddingRight: 0,
          }}
        >
          {allWinPrizes.map((prize, index) => {
            const iconLoaded = Boolean(loadedIcons[prize.icon.src]);

            return (
              <Skeleton
                key={index}
                visible={!iconLoaded}
                className="win-prize-card flex-shrink-0 rounded-[12px] relative"
                style={{
                  scrollSnapAlign: "start",
                  width: winCardWidth,
                  height: winCardHeight,
                  backgroundColor: "var(--gift-card-bg)",
                  boxShadow: "none",
                  ["--tgui--secondary_bg_color" as string]: "var(--gift-card-bg)",
                }}
              >
                <div className={iconLoaded ? "opacity-100" : "opacity-0"}>
                  {/* Centered icon */}
                <div className="absolute inset-0 flex items-center justify-center pb-16">
                  <img
                    src={prize.icon.src}
                    alt={prize.label}
                    className="gift-icon w-[86px] h-[86px]"
                    loading="eager"
                    decoding="async"
                    onLoad={() => markIconLoaded(prize.icon.src)}
                      onError={(event) => {
                        event.currentTarget.style.opacity = "0";
                      }}
                    />
                  </div>
                  {/* Price badge centered */}
                  <div className="absolute bottom-7 left-1/2 -translate-x-1/2 star-badge star-badge--center star-badge--bottom">
                    <span className="price-row">
                      <img src={StarSvg} alt="star" className="star-icon" />
                      <span className="text-[15px] font-normal">{prize.price}</span>
                    </span>
                  </div>
                  {/* Chance at bottom center */}
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 chance-text">{prize.chance}</span>
                </div>
              </Skeleton>
            );
          })}
        </div>
      </div>
    </div>
  );
};
