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
 * Cool dark gray palette: slightly blue-tinted grays for a crisp, clean
 * canvas, a deeper sidebar, and the warm clay accent for contrast.
 */
export const claudeDark: ThemeInput = {
  id: "claude-dark",
  name: "Claude 暗色",
  appearance: "dark",
  colors: {
    background: "#26282C", // cool dark gray canvas
    foreground: "#F3F4F6",
    raised: "#303338", // cards, composer, popovers
    control: "#393C42",
    border: "#44474E",
    accent: "#E08A6A", // clay
    mutedForeground: "#B0B4BC",
    ring: "#E08A6A",
    sidebar: "#1F2124",
    sidebarHover: "#2A2D31",
    sidebarSelected: "#34373C",
    surface3: "#40434A",
    surface4: "#4D5058",
    foregroundExtraMuted: "#878B94",
  },
};
