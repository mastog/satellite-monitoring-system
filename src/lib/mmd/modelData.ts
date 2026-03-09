import { PRICE_MODEL } from "@/lib/points/economy";

export interface CharacterModel {
  id: string;
  pmxPath: string;
  name: { zh: string; en: string };
  title: { zh: string; en: string };
  element: string;
  elementIcon: string;
  elementColor: string;
  region: { zh: string; en: string };
  sdgId: number;
  sdgNote: { zh: string; en: string };
}

export interface ModelItem {
  id: string;
  name: string;
  pmxPath: string;
  elementColor: string;
  price: number;
}

export interface DanceItem {
  id: string;
  name: string;
  vmdPath: string;
  price: number;
}

export const MODELS: ModelItem[] = [
  {
    id: "xingqiu",
    name: "Xingqiu",
    pmxPath: "/models/xingqiu/\u884C\u79CB.pmx",
    elementColor: "#4cc2f1",
    price: PRICE_MODEL,
  },
  {
    id: "wulang",
    name: "Gorou",
    pmxPath: "/models/wulang/wulang.pmx",
    elementColor: "#f0b232",
    price: PRICE_MODEL,
  },
  {
    id: "dulin",
    name: "Durin",
    pmxPath: "/models/dulin/dulin.pmx",
    elementColor: "#ef7938",
    price: PRICE_MODEL,
  },
];

/** CharacterModel shapes needed by preBakeAll */
export const CHARACTER_MODELS: CharacterModel[] = [
  {
    id: "xingqiu",
    pmxPath: "/models/xingqiu/\u884C\u79CB.pmx",
    name: { zh: "\u884C\u79CB", en: "Xingqiu" },
    title: { zh: "\u5C11\u5E74\u6625\u886B\u8584", en: "Juvenile Galant" },
    element: "Hydro",
    elementIcon: "",
    elementColor: "#4cc2f1",
    region: { zh: "\u7483\u6708", en: "Liyue" },
    sdgId: 6,
    sdgNote: { zh: "", en: "" },
  },
  {
    id: "wulang",
    pmxPath: "/models/wulang/wulang.pmx",
    name: { zh: "\u4E94\u90CE", en: "Gorou" },
    title: { zh: "\u6208\u72AC\u9535\u9535", en: "Canine Warrior" },
    element: "Geo",
    elementIcon: "",
    elementColor: "#f0b232",
    region: { zh: "\u7A3B\u59BB", en: "Inazuma" },
    sdgId: 15,
    sdgNote: { zh: "", en: "" },
  },
  {
    id: "dulin",
    pmxPath: "/models/dulin/dulin.pmx",
    name: { zh: "\u675C\u6797", en: "Durin" },
    title: { zh: "\u4E0D\u7184\u706D\u7684\u706B", en: "The Undying Flame" },
    element: "Pyro",
    elementIcon: "",
    elementColor: "#ef7938",
    region: { zh: "\u8499\u5FB7", en: "Mondstadt" },
    sdgId: 15,
    sdgNote: { zh: "", en: "" },
  },
];
