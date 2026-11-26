export type TreeThemeId =
  | "classic"
  | "fairy"
  | "pine"
  | "snow"
  | "midnight"
  | "blush"
  | "aurora"
  | "silver"
  | "ember"
  | "mint";

export interface TreeTheme {
  id: TreeThemeId;
  label: string;
  swatch: string;
  foliage: [string, string, string, string];
  lights: [string, string, string, string];
  garland: string;
  star: string;
  trunk: string;
  qrDark: string;
  qrFinder: string;
  qrBg: string;
  glyphRamp: string;
  snowColor: string;
}

export const TREE_THEMES: Record<TreeThemeId, TreeTheme> = {
  classic: {
    id: "classic",
    label: "Classic",
    swatch: "#E5484D",
    foliage: ["#1C4B38", "#2E7353", "#429E70", "#7EF5AC"],
    lights: ["#E5484D", "#F5C451", "#5BD18B", "#8FD3FF"],
    garland: "#F5C451",
    star: "#FFD86B",
    trunk: "#946444",
    qrDark: "#5BD18B",
    qrFinder: "#F5C451",
    qrBg: "#0B0D12",
    glyphRamp: "@#%O*+=:-.",
    snowColor: "#F2EDE4",
  },
  fairy: {
    id: "fairy",
    label: "Fairy",
    swatch: "#F5C451",
    foliage: ["#234245", "#356869", "#4B948F", "#87D8CE"],
    lights: ["#3CCBFF", "#FF4FA3", "#F5C451", "#5EEAD4"],
    garland: "#F5C451",
    star: "#FFDD72",
    trunk: "#8E6E52",
    qrDark: "#87D8CE",
    qrFinder: "#F5C451",
    qrBg: "#0B0D12",
    glyphRamp: "@#%O*+=:-.",
    snowColor: "#FFF5DB",
  },
  pine: {
    id: "pine",
    label: "Pine",
    swatch: "#3FCB74",
    foliage: ["#173F30", "#26644B", "#3A946D", "#86FAAE"],
    lights: ["#8FD3FF", "#F5C451", "#3FCB74", "#FFE08A"],
    garland: "#8FD3FF",
    star: "#F5C451",
    trunk: "#7D5C43",
    qrDark: "#74E39A",
    qrFinder: "#F2EDE4",
    qrBg: "#0B0D12",
    glyphRamp: "/\\^#%@*+=-.",
    snowColor: "#DDFCE9",
  },
  snow: {
    id: "snow",
    label: "Snowy",
    swatch: "#8FD3FF",
    foliage: ["#243B52", "#3A5D80", "#6898C7", "#D9F0FF"],
    lights: ["#8FD3FF", "#FFFFFF", "#F5C451", "#A8E1FF"],
    garland: "#F2EDE4",
    star: "#FFE08A",
    trunk: "#6E7B8C",
    qrDark: "#8FD3FF",
    qrFinder: "#F2EDE4",
    qrBg: "#0B0D12",
    glyphRamp: "@#%O*+=:-.",
    snowColor: "#A8DCFF",
  },
  midnight: {
    id: "midnight",
    label: "Midnight",
    swatch: "#4F74E8",
    foliage: ["#1E2F5E", "#314C94", "#547BE0", "#9EC0FF"],
    lights: ["#4F74E8", "#3CCBFF", "#F5C451", "#C7A2FF"],
    garland: "#F5C451",
    star: "#FFE08A",
    trunk: "#627194",
    qrDark: "#7FA2FF",
    qrFinder: "#F5C451",
    qrBg: "#0B0D12",
    glyphRamp: "▓▒#%@O*+:.",
    snowColor: "#D2E2FF",
  },
  blush: {
    id: "blush",
    label: "Blush",
    swatch: "#FF8FB1",
    foliage: ["#3D2235", "#663656", "#AA5B8A", "#FFACD0"],
    lights: ["#FF8FB1", "#FFD7E5", "#F5C451", "#C7A2FF"],
    garland: "#F2EDE4",
    star: "#FFE08A",
    trunk: "#805A5A",
    qrDark: "#FF8FB1",
    qrFinder: "#F5C451",
    qrBg: "#0B0D12",
    glyphRamp: "@#%O*+=:-.",
    snowColor: "#FFDFEB",
  },
  aurora: {
    id: "aurora",
    label: "Aurora",
    swatch: "#4CE8C0",
    foliage: ["#16404A", "#246E6B", "#3EB89A", "#B894FF"],
    lights: ["#4CE8C0", "#B388FF", "#3CCBFF", "#7EF7D4"],
    garland: "#7EF7D4",
    star: "#F5C451",
    trunk: "#526573",
    qrDark: "#4CE8C0",
    qrFinder: "#B388FF",
    qrBg: "#0B0D12",
    glyphRamp: "@#%O*~+=:.",
    snowColor: "#D1FFF3",
  },
  silver: {
    id: "silver",
    label: "Silver",
    swatch: "#D7DCE8",
    foliage: ["#4B5161", "#7D859B", "#BFC7D9", "#FAF6EE"],
    lights: ["#F2EDE4", "#D7DCE8", "#8FD3FF", "#F5C451"],
    garland: "#F5C451",
    star: "#FFF3D1",
    trunk: "#6F7585",
    qrDark: "#D7DCE8",
    qrFinder: "#F5C451",
    qrBg: "#0B0D12",
    glyphRamp: "▓▒#%@*+:.",
    snowColor: "#FFFFFF",
  },
  ember: {
    id: "ember",
    label: "Ember",
    swatch: "#FF9F43",
    foliage: ["#421D1A", "#732C24", "#BF4D32", "#FFA952"],
    lights: ["#FF9F43", "#E5484D", "#FFD97D", "#FFF3D1"],
    garland: "#F5C451",
    star: "#FFE08A",
    trunk: "#734938",
    qrDark: "#FF9F43",
    qrFinder: "#E5484D",
    qrBg: "#0B0D12",
    glyphRamp: "@#%O*+=~.",
    snowColor: "#FFE5C2",
  },
  mint: {
    id: "mint",
    label: "Mint",
    swatch: "#A8F0C6",
    foliage: ["#1A4035", "#2B6955", "#4EBA93", "#B2FAD1"],
    lights: ["#A8F0C6", "#FF8FB1", "#F2EDE4", "#4CE8C0"],
    garland: "#FF8FB1",
    star: "#FFF5DB",
    trunk: "#607068",
    qrDark: "#A8F0C6",
    qrFinder: "#FF8FB1",
    qrBg: "#0B0D12",
    glyphRamp: "@#%O*+=:-.",
    snowColor: "#EAFFF3",
  },
};

export const TREE_THEME_LIST: TreeTheme[] = Object.values(TREE_THEMES);

export interface OrnamentStyle {
  id: number;
  name: string;
  glyph: string;
  pattern: string[];
}

export const ORNAMENT_TYPES: OrnamentStyle[] = [
  { id: 0, name: "Bauble", glyph: "O", pattern: [" O ", "o@o", " o "] },
  { id: 1, name: "Star", glyph: "*", pattern: [" * ", "*@*", " * "] },
  { id: 2, name: "Candy cane", glyph: "J", pattern: [" /=", " | ", " J "] },
  { id: 3, name: "Bell", glyph: "n", pattern: [" ^ ", "/n\\", "o=o"] },
  { id: 4, name: "Gift", glyph: "#", pattern: ["+-+", "|#|", "+-+"] },
  { id: 5, name: "Snowflake", glyph: "x", pattern: ["\\|/", "-x-", "/|\\"] },
  { id: 6, name: "Heart", glyph: "v", pattern: ["o o", "@v@", " v "] },
  { id: 7, name: "Lantern", glyph: "0", pattern: ["[=]", "|0|", "[_]"] },
  { id: 8, name: "Ginger", glyph: "&", pattern: [" o ", "/&\\", "/ \\"] },
  { id: 9, name: "Stocking", glyph: "L", pattern: [" _ ", "| |", "|L_"] },
  { id: 10, name: "Ribbon", glyph: "%", pattern: ["~%~", " % ", "/ \\"] },
  { id: 11, name: "Wreath", glyph: "@", pattern: ["/@\\", "| |", "\\@/"] },
  { id: 12, name: "Moon", glyph: ")", pattern: [" .)", "  )", " ')"] },
  { id: 13, name: "Angel", glyph: "^", pattern: [" o ", "/^\\", "=== "] },
  { id: 14, name: "Candle", glyph: "i", pattern: [" * ", " | ", "[i]"] },
  { id: 15, name: "Bow", glyph: "8", pattern: [">o<", " 8 ", "/ \\"] },
];

export const ORNAMENT_COLORS = [
  "#F5C451", // gold
  "#E5484D", // red
  "#8FD3FF", // ice
  "#FF8FB1", // rose
  "#C7A2FF", // lavender
  "#F2EDE4", // warm white
  "#5BD18B", // pine green
  "#FF9F43", // ember amber
  "#4CE8C0", // aurora teal
  "#FFD89B", // champagne
] as const;

export function isTreeThemeId(value: string | null): value is TreeThemeId {
  return Boolean(value && value in TREE_THEMES);
}
