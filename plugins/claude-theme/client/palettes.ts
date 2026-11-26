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
    background: "#262624", // warm charcoal canvas
    foreground: "#F5F4EE", // ivory text
    raised: "#30302E", // cards, composer, popovers
    control: "#393937",
    border: "#42413D",
    accent: "#D97757", // clay
    mutedForeground: "#A8A69D",
    ring: "#D97757",
    sidebar: "#1F1E1D",
    sidebarHover: "#2A2A27",
    sidebarSelected: "#34332F",
    surface3: "#3E3D3A",
    surface4: "#4A4945",
    foregroundExtraMuted: "#7E7C75",
  },
};
