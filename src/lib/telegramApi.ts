import { retrieveRawInitData } from "@telegram-apps/sdk";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const safeRetrieveRawInitData = () => {
  try {
    const initData = retrieveRawInitData();
    return typeof initData === "string" && initData.trim().length > 0 ? initData : undefined;
  } catch {
    return undefined;
  }
};

export const getCurrentInitData = () => {
  if (typeof window === "undefined") return undefined;
  const direct = window.Telegram?.WebApp?.initData;
  if (typeof direct === "string" && direct.trim().length > 0) return direct;
  return safeRetrieveRawInitData();
};

export const waitForInitData = async (timeoutMs = 1500, intervalMs = 50) => {
  const deadline = Date.now() + timeoutMs;
  let initData = getCurrentInitData();

  while (!initData && Date.now() < deadline) {
    await sleep(intervalMs);
    initData = getCurrentInitData();
  }

  return initData;
};

type FetchTelegramJsonOptions = {
  initData?: string;
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
};

export const fetchTelegramJson = async <T = JsonValue>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchTelegramJsonOptions = {},
): Promise<{ response: Response; data: T | null }> => {
  const {
    initData: initDataOverride,
    retries = 2,
    retryDelayMs = 150,
    timeoutMs = 4000,
  } = options;

  let attempt = 0;
  let lastError: unknown;
  let initData = initDataOverride;

  while (attempt <= retries) {
    const effectiveInitData = initData || await waitForInitData();
    const headers = new Headers(init.headers ?? {});
    if (effectiveInitData) {
      headers.set("X-Telegram-Init-Data", effectiveInitData);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") ?? "";
      const isJson = contentType.includes("application/json");
      const data = isJson ? (await response.json().catch(() => null)) as T | null : null;

      if (response.ok) {
        return { response, data };
      }

      const errorCode =
        data && typeof data === "object" && "error" in (data as Record<string, unknown>)
          ? (data as Record<string, unknown>).error
          : undefined;
      const isInvalidInitData = response.status === 401 && errorCode === "invalid_init_data";
      const isRetriable = response.status >= 500 || response.status === 0;

      if ((isInvalidInitData || isRetriable) && attempt < retries) {
        if (isInvalidInitData) {
          initData = await waitForInitData(1200);
        } else {
          await sleep(retryDelayMs);
        }
        attempt += 1;
        continue;
      }

      return { response, data };
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      if (attempt < retries) {
        await sleep(retryDelayMs);
        attempt += 1;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("request_failed");
};
