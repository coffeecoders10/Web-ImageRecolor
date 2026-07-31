export interface PaletteColor {
  hex: string;
  role: "dominant" | "secondary" | "accent";
}

export interface PredefinedPalette {
  id: string;
  name: string;
  description: string;
  temperature: "warm" | "cool" | "neutral";
  colors: PaletteColor[];
}

export const predefinedPalettes: PredefinedPalette[] = [
  {
    id: "warm-cinematic",
    name: "Warm Cinematic",
    description: "Amber highlights, deep teal shadows",
    temperature: "warm",
    colors: [
      { hex: "#D98E4A", role: "dominant" },
      { hex: "#8C5A2B", role: "dominant" },
      { hex: "#3A2E2A", role: "secondary" },
      { hex: "#1F3B3B", role: "secondary" },
      { hex: "#E8C07D", role: "accent" },
      { hex: "#B5432A", role: "accent" },
    ],
  },
  {
    id: "cool-editorial",
    name: "Cool Editorial",
    description: "Slate blues and crisp neutrals",
    temperature: "cool",
    colors: [
      { hex: "#4A6B8A", role: "dominant" },
      { hex: "#2E3E4E", role: "dominant" },
      { hex: "#8FA5B3", role: "secondary" },
      { hex: "#D8DEE3", role: "secondary" },
      { hex: "#6FA3A0", role: "accent" },
      { hex: "#3D5A6C", role: "accent" },
    ],
  },
  {
    id: "pastel-dream",
    name: "Pastel Dream",
    description: "Soft lavender, blush, and mint",
    temperature: "neutral",
    colors: [
      { hex: "#E8B7D4", role: "dominant" },
      { hex: "#B8C9E8", role: "dominant" },
      { hex: "#F5E1C8", role: "secondary" },
      { hex: "#C9E8D4", role: "secondary" },
      { hex: "#D8B7E8", role: "accent" },
      { hex: "#F0C9C9", role: "accent" },
    ],
  },
  {
    id: "retro-sunset",
    name: "Retro Sunset",
    description: "Faded orange, magenta, and mustard",
    temperature: "warm",
    colors: [
      { hex: "#E0703A", role: "dominant" },
      { hex: "#C4453F", role: "dominant" },
      { hex: "#E8A33D", role: "secondary" },
      { hex: "#7A3B5E", role: "secondary" },
      { hex: "#F2C14E", role: "accent" },
      { hex: "#9C3B6B", role: "accent" },
    ],
  },
  {
    id: "forest-earth",
    name: "Forest Earth",
    description: "Mossy greens and warm browns",
    temperature: "neutral",
    colors: [
      { hex: "#4C6B3F", role: "dominant" },
      { hex: "#6B8A4E", role: "dominant" },
      { hex: "#8A6B4C", role: "secondary" },
      { hex: "#3F4C2E", role: "secondary" },
      { hex: "#C9B26B", role: "accent" },
      { hex: "#A6522E", role: "accent" },
    ],
  },
];
