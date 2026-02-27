import { FC, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequiredTelegramWebApp } from "@/contexts/TelegramWebAppContext";
import styles from "./LeaderboardPage.module.scss";
import { buildApiUrl } from "@/lib/api";
import { fetchTelegramJson } from "@/lib/telegramApi";
import { getTelegramUser } from "@/hooks/useTelegramWebApp";

interface LeaderboardUser {
  userId?: number | string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  spentStars?: number;
}

type LeaderboardApiUser = LeaderboardUser & {
  user_id?: number | string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  spent_stars?: number;
};

type LeaderboardResponse = {
  leaderboard?: LeaderboardApiUser[];
  users?: LeaderboardApiUser[];
  error?: string;
};

type LeaderboardEmptyReason = "empty_leaderboard" | "load_error" | null;

let leaderboardCache: LeaderboardUser[] | null = null;
let leaderboardPrefetchPromise: Promise<LeaderboardUser[]> | null = null;
let leaderboardCacheInitData: string | undefined;

const formatXp = (count: number) => `${count} xp`;

const getDisplayName = (user: LeaderboardUser) => {
  if (user.firstName) return user.firstName;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  if (fullName) return fullName;
  return user.username || "Без имени";
};

const getPhotoUrl = (user: LeaderboardUser) => user.photoUrl ?? "";

const getUserId = (user: LeaderboardUser) => user.userId;

const getXpCount = (user: LeaderboardUser) => user.spentStars ?? 0;

const getPositionLabel = (position: number) => {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return `#${position}`;
};


const normalizeLeaderboardUser = (user: LeaderboardApiUser): LeaderboardUser => ({
  userId: user.userId ?? user.user_id,
  username: user.username,
  firstName: user.firstName ?? user.first_name,
  lastName: user.lastName ?? user.last_name,
  photoUrl: user.photoUrl ?? user.photo_url,
  spentStars: user.spentStars ?? user.spent_stars,
});

const dedupeUsers = (users: LeaderboardUser[]) => {
  const byKey = new Map<string, LeaderboardUser>();

  users.forEach((user, index) => {
    const key = String(getUserId(user) ?? user.username ?? `row-${index}`);
    if (!byKey.has(key)) {
      byKey.set(key, user);
    }
  });

  return [...byKey.values()];
};

const preloadAvatarImage = (photoUrl: string) => {
  if (!photoUrl || typeof Image === "undefined") return;
  const image = new Image();
  image.src = photoUrl;
};

const requestLeaderboard = async (initData?: string) => {
  const { response, data } = await fetchTelegramJson<LeaderboardResponse>(
    buildApiUrl("/api/leaderboard"),
    { cache: "no-store" },
    { initData },
  );

  return { response, data: data ?? {} };
};

const fetchLeaderboard = async (initData?: string) => {
  const { response, data } = await requestLeaderboard(initData);

  if (!response.ok) {
    if (data?.error === "invalid_init_data") {
      console.warn("invalid_init_data: leaderboard request must be made inside Telegram");
    }
    throw new Error("failed_to_load_leaderboard");
  }

  const rawUsers = Array.isArray(data?.leaderboard)
    ? data.leaderboard
    : Array.isArray(data?.users)
      ? data.users
      : [];
  const apiUsers = rawUsers;
  const list = dedupeUsers(apiUsers.map(normalizeLeaderboardUser));
  list.forEach((user) => preloadAvatarImage(getPhotoUrl(user)));
  return list;
};

const preloadLeaderboard = (initData?: string) => {
  if (leaderboardCache && leaderboardCacheInitData === initData) {
    return Promise.resolve(leaderboardCache);
  }

  if (leaderboardPrefetchPromise && leaderboardCacheInitData === initData) {
    return leaderboardPrefetchPromise;
  }

  leaderboardCacheInitData = initData;
  leaderboardPrefetchPromise = fetchLeaderboard(initData)
    .then((list) => {
      leaderboardCache = list;
      return list;
    })
    .finally(() => {
      leaderboardPrefetchPromise = null;
    });

  return leaderboardPrefetchPromise;
};

export const LeaderboardPage: FC = () => {
  const webApp = useRequiredTelegramWebApp();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef(true);
  const isRefreshingRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [emptyReason, setEmptyReason] = useState<LeaderboardEmptyReason>(null);
  const telegramUser = getTelegramUser(webApp);
  const currentUserId = telegramUser?.id;
  const deferredSearchValue = useDeferredValue(searchValue);
  const skeletonRows = useMemo(() => Array.from({ length: 8 }), []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadLeaderboard = useCallback(
    async (options?: { showLoading?: boolean; preserveOnError?: boolean; useCache?: boolean }) => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;

      if (options?.showLoading) {
        setIsLoading(true);
      }
      setHasError(false);

      try {
        const list = options?.useCache
          ? await preloadLeaderboard(webApp.initData)
          : await fetchLeaderboard(webApp.initData);

        if (!isMountedRef.current) return;
        leaderboardCache = list;
        leaderboardCacheInitData = webApp.initData;
        setLeaderboard(list);
        setHasError(false);
        setEmptyReason(list.length === 0 ? "empty_leaderboard" : null);
      } catch (error) {
        console.error("Leaderboard fetch error:", error);
        if (!isMountedRef.current) return;
        setHasError(true);
        if (!options?.preserveOnError) {
          setLeaderboard([]);
          setEmptyReason("load_error");
        }
      } finally {
        if (isMountedRef.current && options?.showLoading) {
          setIsLoading(false);
        }
        isRefreshingRef.current = false;
      }
    },
    [webApp.initData],
  );

  useEffect(() => {
    setEmptyReason(null);
    void loadLeaderboard({ showLoading: true, preserveOnError: false, useCache: true });

    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setInterval(() => {
      void loadLeaderboard({ showLoading: false, preserveOnError: true, useCache: false });
    }, 10_000);

    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [loadLeaderboard]);

  const rankedUsers = useMemo(() => {
    return [...leaderboard].sort((a, b) => getXpCount(b) - getXpCount(a));
  }, [leaderboard]);

  const filteredUsers = useMemo(() => {
    const trimmed = deferredSearchValue.trim().toLowerCase();
    if (!trimmed) return rankedUsers;
    return rankedUsers.filter((leader) => getDisplayName(leader).toLowerCase().includes(trimmed));
  }, [rankedUsers, deferredSearchValue]);

  useEffect(() => {
    if (!emptyReason) return;

    const detail = {
      event: "leaderboard_empty_state",
      reason: emptyReason,
      hasError,
      timestamp: Date.now(),
    };

    window.dispatchEvent(new CustomEvent("app:telemetry", { detail }));
    console.info("leaderboard_empty_state", detail);
  }, [emptyReason, hasError]);

  const handleUserClick = (user: LeaderboardUser) => {
    const username = user.username;
    const userId = getUserId(user);
    const telegramLink = username ? `https://t.me/${username}` : userId ? `tg://user?id=${userId}` : "";

    if (!telegramLink) return;

    if (webApp.openTelegramLink) {
      webApp.openTelegramLink(telegramLink);
    } else if (webApp.openLink) {
      webApp.openLink(telegramLink);
    } else {
      window.open(telegramLink, "_blank", "noopener,noreferrer");
    }
  };

  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <Skeleton className={styles.searchSkeleton} />
        </div>
        <div className={styles.scrollbox}>
          {skeletonRows.map((_, index) => (
            <div key={`leaderboard-skeleton-${index}`} className={styles.skeletonRow}>
              <Skeleton className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <Skeleton className={styles.skeletonName} />
                <Skeleton className={styles.skeletonXp} />
              </div>
              <Skeleton className={styles.skeletonValue} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!rankedUsers.length) {
    return (
      <div className={styles.emptyState} data-empty-reason={emptyReason ?? undefined}>
        <div className={styles.emptyTitle}>Рейтинг пуст</div>
        <div className={styles.emptySubtitle}>Пока нет пользователей для отображения.</div>
        {hasError && <div className={styles.emptyHint}>Не удалось загрузить данные. Попробуйте позже.</div>}
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.inputWrapper}>
          <input
            ref={searchInputRef}
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            aria-label="Поиск по рейтингу"
          />
          <div className={styles.placeholder}>Поиск</div>
        </div>
      </div>

      {searchValue.trim().length > 0 && !filteredUsers.length ? (
        <div className={styles.noItems}>
          <div className={styles.noItemsTitle}>Совпадений не найдено</div>
        </div>
      ) : (
        <div className={styles.scrollbox}>
          {filteredUsers.map((leader, index) => {
            const name = getDisplayName(leader);
            const photoUrl = getPhotoUrl(leader);
            const isMe =
              currentUserId !== undefined && currentUserId !== null && String(getUserId(leader)) === String(currentUserId);
            const xpCount = getXpCount(leader);
            const initial = name.charAt(0).toUpperCase();

            return (
              <button
                className={styles.row}
                key={`${getUserId(leader) ?? name}-${index}`}
                type="button"
                onClick={() => handleUserClick(leader)}
              >
                <Avatar className={styles.avatar}>
                  <AvatarImage src={photoUrl} alt={name} />
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <div className={styles.body}>
                  <div className={styles.name}>
                    {name}
                    {isMe && <span>YOU</span>}
                  </div>
                  <div className={styles.count}>{formatXp(xpCount)}</div>
                </div>
                <div className={styles.value}>{getPositionLabel(index + 1)}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
