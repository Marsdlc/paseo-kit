import type { PluginClientContext } from "@getpaseo/plugin/client";

type ThemeInput = Parameters<PluginClientContext["addTheme"]>[0];

/**
 * Warm, paper-like light palette: ivory canvas, white composer cards,
 * soft sand sidebar, clay accent.
 */
export const claudeLight: ThemeInput = {
  id: "claude-light",
  name: "Claude 亮色",
  appearance: "light",
  colors: {
    background: "#FAF9F5", // ivory canvas
    foreground: "#141413", // near-black ink
    raised: "#FFFFFF", // cards, composer, popovers
    control: "#F0EEE6", // inputs, buttons
    border: "#E3E1D7",
    accent: "#C96442", // clay
    mutedForeground: "#6B6A64",
    ring: "#D97757",
    sidebar: "#F3F1EA",
    sidebarHover: "#EAE7DD",
    sidebarSelected: "#E3E0D5",
    surface3: "#E8E6DC",
    surface4: "#DCD9CE",
    foregroundExtraMuted: "#8F8D85",
  },
};

/**
 * Warm charcoal dark palette: brown-tinted grays instead of blue-gray,
 * a deeper sidebar, and a brighter clay accent.
 */
export const claudeDark: ThemeInput = {
  id: "claude-dark",
  name: "Claude 暗色",
  appearance: "dark",
  colors: {
    background: "#2E2D2A", // warm charcoal canvas
    foreground: "#FAF9F5", // ivory text
    raised: "#393835", // cards, composer, popovers
    control: "#42413D",
    border: "#4D4C47",
    accent: "#E08A6A", // clay
    mutedForeground: "#BDBAB0",
    ring: "#E08A6A",
    sidebar: "#272623",
    sidebarHover: "#33322F",
    sidebarSelected: "#3E3D39",
    surface3: "#484743",
    surface4: "#55544F",
    foregroundExtraMuted: "#918F86",
  },
};
