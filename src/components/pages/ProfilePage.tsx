import { FC, useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import starBadgeSvg from "@/assets/gifts/star-badge.svg";
import teddyBearSvg from "@/assets/gifts/teddy-bear.svg";
import heartBoxSvg from "@/assets/gifts/heart-box.svg";
import giftBoxSvg from "@/assets/gifts/gift-box.svg";
import roseSvg from "@/assets/gifts/rose.svg";
import elkaSvg from "@/assets/gifts/elka.svg";
import newTeddySvg from "@/assets/gifts/newteddy.svg";
import cakeSvg from "@/assets/gifts/cake.svg";
import bouquetSvg from "@/assets/gifts/bouquet.svg";
import rocketSvg from "@/assets/gifts/rocket.svg";
import champagneSvg from "@/assets/gifts/champagne.svg";
import trophySvg from "@/assets/gifts/trophy.svg";
import ringSvg from "@/assets/gifts/ring.svg";
import diamondSvg from "@/assets/gifts/diamond.svg";
import { useRequiredTelegramWebApp } from "@/contexts/TelegramWebAppContext";
import { getTelegramUser } from "@/hooks/useTelegramWebApp";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getActionHistory } from "@/lib/actionHistory";
import historyPlaceholderAnimation from "@/assets/gifts/animation/istoria.json";
import giftAnimation from "@/assets/gifts/animation/giftanimation.json";
import styles from "./ProfilePage.module.scss";

type RecentAction = {
  type: "won" | "received";
  occurredAt: string;
  giftId: string;
  giftName: string;
  spinPrice?: number;
};

const giftIconById: Record<string, string> = {
  "heart-box": heartBoxSvg,
  "teddy-bear": teddyBearSvg,
  "gift-box": giftBoxSvg,
  rose: roseSvg,
  elka: elkaSvg,
  newteddy: newTeddySvg,
  cake: cakeSvg,
  bouquet: bouquetSvg,
  rocket: rocketSvg,
  champagne: champagneSvg,
  trophy: trophySvg,
  ring: ringSvg,
  diamond: diamondSvg,
};


export const ProfilePage: FC = () => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyActions, setHistoryActions] = useState<RecentAction[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const webApp = useRequiredTelegramWebApp();
  const telegramUser = getTelegramUser(webApp);
  const displayName = telegramUser?.first_name || [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ") || telegramUser?.username || "Без имени";
  const avatarSrc = telegramUser?.photo_url || "";
  const fallbackLetter = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!isHistoryOpen) return;

    let isCancelled = false;
    setIsHistoryLoading(true);

    const loadHistory = async () => {
      try {
        const history = await getActionHistory(webApp.initData);
        if (!isCancelled) {
          setHistoryActions(history);
        }
      } catch (error) {
        if (!isCancelled) {
          setHistoryActions([]);
          const message = error instanceof Error
            ? error.message
            : "\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0438\u0441\u0442\u043e\u0440\u0438\u0438.";
          window.alert(message);
        }
      } finally {
        if (!isCancelled) {
          setIsHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [isHistoryOpen, webApp.initData]);

  useEffect(() => {
    if (!isHistoryOpen || !webApp.BackButton) return;

    const handleBackButtonClick = () => {
      setIsHistoryOpen(false);
    };

    webApp.BackButton.show();
    webApp.BackButton.onClick(handleBackButtonClick);

    return () => {
      webApp.BackButton?.offClick(handleBackButtonClick);
      webApp.BackButton?.hide();
    };
  }, [isHistoryOpen, webApp]);

  const historyActionsByDate = useMemo(() => {
    const sortedActions = [...historyActions].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    const grouped = sortedActions.reduce<Record<string, RecentAction[]>>((acc, action) => {
      const actionDate = new Date(action.occurredAt);
      const key = actionDate
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
        .toUpperCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(action);
      return acc;
    }, {});

    return Object.entries(grouped).map(([day, actions]) => ({ day, actions }));
  }, [historyActions]);

  const formatActionTime = (occurredAt: string) =>
    new Date(occurredAt).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const closeHistoryBySwipe = (touchStartX: number, touchStartY: number, touchEndX: number, touchEndY: number) => {
    const swipeDistance = touchEndX - touchStartX;
    const verticalDistance = Math.abs(touchEndY - touchStartY);
    const minSwipeDistance = 60;

    if (Math.abs(swipeDistance) >= minSwipeDistance && verticalDistance < 48) {
      setIsHistoryOpen(false);
    }
  };

  if (isHistoryOpen) {
    return (
      <div className={styles.page}>
        <div
          className={styles.historyPage}
          onTouchStart={(event) => {
            const touchStartX = event.changedTouches[0]?.clientX ?? 0;
            const touchStartY = event.changedTouches[0]?.clientY ?? 0;
            event.currentTarget.dataset.touchStartX = String(touchStartX);
            event.currentTarget.dataset.touchStartY = String(touchStartY);
          }}
          onTouchEnd={(event) => {
            const touchStartX = Number(event.currentTarget.dataset.touchStartX ?? 0);
            const touchStartY = Number(event.currentTarget.dataset.touchStartY ?? 0);
            const touchEndX = event.changedTouches[0]?.clientX ?? 0;
            const touchEndY = event.changedTouches[0]?.clientY ?? 0;
            closeHistoryBySwipe(touchStartX, touchStartY, touchEndX, touchEndY);
          }}
        >
          <header className={styles.historyHeader}>
            <h2 className={styles.historyTitle}>История действий</h2>
            <p className={styles.historySubtitle}>Здесь отображается история ваших действий</p>
          </header>

          {isHistoryLoading && historyActionsByDate.length === 0 ? (
            <div className={styles.emptyHistory}>
              <Lottie animationData={historyPlaceholderAnimation} loop autoplay className={styles.emptyHistoryAnimation} />
              <p className={styles.emptyHistoryText}>{"\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430..."}</p>
            </div>
          ) : historyActionsByDate.length === 0 ? (
            <div className={styles.emptyHistory}>
              <Lottie animationData={historyPlaceholderAnimation} loop autoplay className={styles.emptyHistoryAnimation} />
              <p className={styles.emptyHistoryText}>Пока нет записей</p>
            </div>
          ) : (
            <div className={styles.actionsList}>
              {historyActionsByDate.map(({ day, actions }) => (
                <section key={day} className={styles.actionsByDate}>
                  <h3 className={styles.actionDateHeader}>{day}</h3>
                  {actions.map((action, index) => (
                    <article key={`${action.occurredAt}-${action.giftName}-${index}`} className={styles.actionCard}>
                      <div className={styles.actionIcon}>
                        <img src={giftIconById[action.giftId] ?? starBadgeSvg} alt="Иконка подарка" className={styles.actionGiftIconImage} loading="lazy" />
                      </div>

                      <div className={styles.actionBody}>
                        <p className={styles.actionOperation}>{action.type === "won" ? "\u041f\u043e\u0434\u0430\u0440\u043e\u043a \u0432\u044b\u0438\u0433\u0440\u0430\u043d" : "\u041f\u043e\u0434\u0430\u0440\u043e\u043a \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d"}</p>
                        <p className={styles.actionTime}>{formatActionTime(action.occurredAt)}</p>
                      </div>

                      <div className={styles.actionMeta}>
                        {action.type === "won" && action.spinPrice && (
                          <span className={styles.actionPrice}>
                            {action.spinPrice}
                            <img src={starBadgeSvg} alt="Stars" className={styles.actionPriceIcon} loading="lazy" />
                          </span>
                        )}
                      </div>

                      {index !== actions.length - 1 && <span className={styles.actionDivider} aria-hidden="true" />}
                    </article>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.avatarSection}>
          <Avatar className={styles.avatar}>
            <AvatarImage src={avatarSrc} alt={displayName} loading="eager" className={styles.avatarImage} />
            <AvatarFallback>{fallbackLetter}</AvatarFallback>
          </Avatar>
          <div className={styles.profileName}>{displayName}</div>
          <p className={styles.profileXp}>
            У вас есть <span className={styles.profileXpValue}>0</span>
            <img src={starBadgeSvg} alt="" aria-hidden="true" className={styles.profileXpIcon} loading="lazy" />
            <span className={styles.profileXpUnit}>xp</span>
          </p>
          <button type="button" className={styles.historyButton} onClick={() => setIsHistoryOpen(true)}>
            <span className={styles.historyButtonIcon} aria-hidden="true" />
            История действий ›
          </button>

          <div className={styles.historyPreviewWrap}>
            <div className={styles.historyPreviewPlaceholder}>
              <Lottie animationData={giftAnimation} loop autoplay className={styles.historyPreviewAnimation} />
              <p className={styles.historyPreviewText}>Нет не распределённых подарков</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
