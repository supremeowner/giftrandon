import { createContext, useContext } from "react";

export type Platform = "ios" | "android" | "desktop";
export type SizeX = "compact" | "regular";
export type SizeY = "compact" | "regular";

export interface AdaptivityContextType {
  platform: Platform;
  sizeX: SizeX;
  sizeY: SizeY;
  viewportWidth: number;
  viewportHeight: number;
  isTouch: boolean;
}

export const AdaptivityContext = createContext<AdaptivityContextType>({
  platform: "desktop",
  sizeX: "regular",
  sizeY: "regular",
  viewportWidth: 0,
  viewportHeight: 0,
  isTouch: false,
});

export const useAdaptivity = () => useContext(AdaptivityContext);
