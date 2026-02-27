import bouquetSvg from "@/assets/gifts/bouquet.svg";
import cakeSvg from "@/assets/gifts/cake.svg";
import champagneSvg from "@/assets/gifts/champagne.svg";
import diamondSvg from "@/assets/gifts/diamond.svg";
import elkaSvg from "@/assets/gifts/elka.svg";
import giftBoxSvg from "@/assets/gifts/gift-box.svg";
import heartBoxSvg from "@/assets/gifts/heart-box.svg";
import newTeddySvg from "@/assets/gifts/newteddy.svg";
import ringSvg from "@/assets/gifts/ring.svg";
import rocketSvg from "@/assets/gifts/rocket.svg";
import roseSvg from "@/assets/gifts/rose.svg";
import teddyBearSvg from "@/assets/gifts/teddy-bear.svg";
import trophySvg from "@/assets/gifts/trophy.svg";

export const CARD_DIMENSIONS = {
  compact: { width: 132, height: 152 },
  regular: { width: 150, height: 170 },
};

export const ICON_SIZES = {
  roulette: 96,
  prize: 70,
  card: 78,
  win: 110,
};

export type GiftId =
  | "heart-box"
  | "teddy-bear"
  | "gift-box"
  | "rose"
  | "elka"
  | "newteddy"
  | "cake"
  | "bouquet"
  | "rocket"
  | "champagne"
  | "trophy"
  | "ring"
  | "diamond";

export const GIFTS_CATALOG: { id: GiftId; icon: string; label: string; price: number }[] = [
  { id: "heart-box", icon: heartBoxSvg, label: "Сердце", price: 15 },
  { id: "teddy-bear", icon: teddyBearSvg, label: "Медвежонок", price: 15 },
  { id: "gift-box", icon: giftBoxSvg, label: "Коробка", price: 25 },
  { id: "rose", icon: roseSvg, label: "Роза", price: 25 },
  { id: "elka", icon: elkaSvg, label: "Ёлка", price: 50 },
  { id: "newteddy", icon: newTeddySvg, label: "Мишка", price: 50 },
  { id: "cake", icon: cakeSvg, label: "Торт", price: 50 },
  { id: "bouquet", icon: bouquetSvg, label: "Букет", price: 50 },
  { id: "rocket", icon: rocketSvg, label: "Ракета", price: 50 },
  { id: "champagne", icon: champagneSvg, label: "Шампанское", price: 50 },
  { id: "trophy", icon: trophySvg, label: "Кубок", price: 100 },
  { id: "ring", icon: ringSvg, label: "Кольцо", price: 100 },
  { id: "diamond", icon: diamondSvg, label: "Алмаз", price: 100 },
];

export const CRITICAL_GIFT_IDS: GiftId[] = ["heart-box", "teddy-bear", "gift-box", "rose"];

export const CRITICAL_GIFT_IMAGE_SOURCES = GIFTS_CATALOG
  .filter((gift) => CRITICAL_GIFT_IDS.includes(gift.id))
  .map((gift) => gift.icon);

export const SECONDARY_GIFT_IMAGE_SOURCES = GIFTS_CATALOG
  .filter((gift) => !CRITICAL_GIFT_IDS.includes(gift.id))
  .map((gift) => gift.icon);

export const GIFT_IMAGE_SOURCES = GIFTS_CATALOG.map((gift) => gift.icon);
