import { buildApiUrl } from "@/lib/api";
import { fetchTelegramJson } from "@/lib/telegramApi";

export type ActionHistoryType = "won" | "received";

export type ActionHistoryEntry = {
  type: ActionHistoryType;
  occurredAt: string;
  giftId: string;
  giftName: string;
  spinPrice?: number;
};

type ActionHistoryCacheEntry = {
  data: ActionHistoryEntry[];
  cachedAt: number;
};

const ACTION_HISTORY_CACHE_TTL_MS = 30_000;
const ACTION_HISTORY_CACHE_KEY = "__history__no_init_data__";
const actionHistoryCache = new Map<string, ActionHistoryCacheEntry>();
const actionHistoryRequests = new Map<string, Promise<ActionHistoryEntry[]>>();

const isActionHistoryEntry = (value: unknown): value is ActionHistoryEntry => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ActionHistoryEntry>;

  return (
    (candidate.type === "won" || candidate.type === "received") &&
    typeof candidate.occurredAt === "string" &&
    typeof candidate.giftId === "string" &&
    typeof candidate.giftName === "string" &&
    (candidate.spinPrice === undefined || typeof candidate.spinPrice === "number")
  );
};

const getHistoryCacheKey = (initData?: string): string => {
  const normalized = initData?.trim();
  return normalized ? normalized : ACTION_HISTORY_CACHE_KEY;
};

const getCachedHistory = (cacheKey: string): ActionHistoryEntry[] | null => {
  const cachedEntry = actionHistoryCache.get(cacheKey);
  if (!cachedEntry) return null;

  if (Date.now() - cachedEntry.cachedAt > ACTION_HISTORY_CACHE_TTL_MS) {
    actionHistoryCache.delete(cacheKey);
    return null;
  }

  return cachedEntry.data;
};

export const peekActionHistory = (initData?: string): ActionHistoryEntry[] | null =>
  getCachedHistory(getHistoryCacheKey(initData));

const fetchActionHistoryFromApi = async (initData?: string): Promise<ActionHistoryEntry[]> => {
  const { response, data } = await fetchTelegramJson<{ history?: unknown }>(
    buildApiUrl("/api/history"),
    {},
    { initData },
  );

  if (!response.ok) {
    throw new Error("Не удалось загрузить историю действий.");
  }

  const payload = data ?? {};
  if (!Array.isArray(payload.history)) return [];

  return payload.history.filter(isActionHistoryEntry);
};

export const getActionHistory = async (initData?: string): Promise<ActionHistoryEntry[]> => {
  const cacheKey = getHistoryCacheKey(initData);
  const cachedHistory = getCachedHistory(cacheKey);
  if (cachedHistory) {
    return cachedHistory;
  }

  const pendingRequest = actionHistoryRequests.get(cacheKey);
  if (pendingRequest) {
    return pendingRequest;
  }

  const request = fetchActionHistoryFromApi(initData)
    .then((history) => {
      actionHistoryCache.set(cacheKey, {
        data: history,
        cachedAt: Date.now(),
      });
      return history;
    })
    .finally(() => {
      actionHistoryRequests.delete(cacheKey);
    });

  actionHistoryRequests.set(cacheKey, request);
  return request;
};

export const preloadActionHistory = async (initData?: string): Promise<void> => {
  try {
    await getActionHistory(initData);
  } catch {
    // Silent prefetch: page-level loader/error UI handles visible states.
  }
};
