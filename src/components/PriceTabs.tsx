import { FC, useEffect, useLayoutEffect, useRef, useState } from "react";
import starBadgeSvg from "@/assets/gifts/star-badge.svg";

interface PriceTabsProps {
  prices: number[];
  selectedPrice: number;
  onSelect: (price: number) => void;
  disabled?: boolean;
}

export const PriceTabs: FC<PriceTabsProps> = ({ prices, selectedPrice, onSelect, disabled = false }) => {
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollGestureRef = useRef(false);
  const lastTouchMoveAtRef = useRef(0);
  const [activeStyle, setActiveStyle] = useState<{ width: number; left: number }>({ width: 0, left: 0 });
  const [isAnimated, setIsAnimated] = useState(false);

  useLayoutEffect(() => {
    const updateActiveStyle = () => {
      const activeIndex = prices.findIndex((price) => price === selectedPrice);
      if (activeIndex < 0) {
        setActiveStyle({ width: 0, left: 0 });
        return;
      }

      const container = tabsRef.current;
      const activeButton = buttonRefs.current[activeIndex];
      if (!container || !activeButton) return;

      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      const nextStyle = {
        width: buttonRect.width,
        left: buttonRect.left - containerRect.left,
      };

      setActiveStyle((prev) => {
        if (prev.width === nextStyle.width && prev.left === nextStyle.left) {
          return prev;
        }
        return nextStyle;
      });
    };

    updateActiveStyle();
    window.addEventListener("resize", updateActiveStyle);
    return () => window.removeEventListener("resize", updateActiveStyle);
  }, [prices, selectedPrice]);

  useEffect(() => {
    const handleTouchMove = () => {
      lastTouchMoveAtRef.current = Date.now();
      isScrollGestureRef.current = true;
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: true, capture: true });

    return () => {
      document.removeEventListener("touchmove", handleTouchMove, true);
    };
  }, []);

  return (
    <div className="tg-tabs" ref={tabsRef}>
      <span
        className={isAnimated ? "tg-tab--active is-animated" : "tg-tab--active"}
        aria-hidden="true"
        style={{
          width: `${activeStyle.width}px`,
          left: `${activeStyle.left}px`,
          opacity: activeStyle.width > 0 ? 1 : 0,
        }}
      />
      {prices.map((price, index) => {
        const isSelected = selectedPrice === price;
        return (
          <button
            key={price}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              if (!touch) return;
              touchStartRef.current = { x: touch.clientX, y: touch.clientY };
              isScrollGestureRef.current = false;
            }}
            onTouchMove={(event) => {
              const touch = event.touches[0];
              const start = touchStartRef.current;
              if (!touch || !start) return;
              const dx = Math.abs(touch.clientX - start.x);
              const dy = Math.abs(touch.clientY - start.y);
              if (dx > 8 || dy > 8) {
                isScrollGestureRef.current = true;
                lastTouchMoveAtRef.current = Date.now();
              }
            }}
            onTouchEnd={() => {
              window.setTimeout(() => {
                isScrollGestureRef.current = false;
              }, 0);
            }}
            onTouchCancel={() => {
              isScrollGestureRef.current = true;
              lastTouchMoveAtRef.current = Date.now();
            }}
            onClick={(event) => {
              const recentlyScrolled = Date.now() - lastTouchMoveAtRef.current < 260;
              if (isScrollGestureRef.current || recentlyScrolled) {
                event.preventDefault();
                return;
              }
              if (disabled) return;
              setIsAnimated(true);
              onSelect(price);
            }}
            className={isSelected ? "tg-tab is-selected" : "tg-tab"}
            disabled={disabled}
            aria-disabled={disabled}
            type="button"
          >
            <img src={starBadgeSvg} alt="star" className="tg-tab__star" />
            <span className="tg-tab__text">{price}</span>
          </button>
        );
      })}
    </div>
  );
};
