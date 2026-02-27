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

export const getActionHistory = async (initData?: string): Promise<ActionHistoryEntry[]> => {
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
