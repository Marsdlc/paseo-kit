import type { PluginClientContext } from "@getpaseo/plugin/client";
import { Appearance } from "react-native";
import { claudeDark, claudeLight } from "./client/palettes";

/**
 * Paseo lets only one contributed theme be active, and a theme has a fixed
 * appearance. To follow the system like Paseo's built-in "System" option,
 * "Claude 跟随系统" keeps one stable theme id and re-registers itself with the
 * light or dark palette whenever the OS color scheme changes. The app looks
 * the selected theme up by id, so the selection survives the swap.
 */
const AUTO_ID = "claude-auto";
const AUTO_NAME = "Claude 跟随系统";

export default function contribute(client: PluginClientContext) {
  const removeLight = client.addTheme(claudeLight);
  const removeDark = client.addTheme(claudeDark);

  let current: "light" | "dark" | null = null;
  let removeAuto: (() => void | Promise<void>) | null = null;

  const apply = (scheme: string | null | undefined) => {
    const next = scheme === "dark" ? "dark" : "light";
    if (next === current) return;
    const palette = next === "dark" ? claudeDark : claudeLight;
    void removeAuto?.();
    removeAuto = client.addTheme({ ...palette, id: AUTO_ID, name: AUTO_NAME });
    current = next;
  };

  apply(Appearance.getColorScheme());
  const subscription = Appearance.addChangeListener(({ colorScheme }) => apply(colorScheme));

  return () => {
    subscription.remove();
    void removeAuto?.();
    void removeLight();
    void removeDark();
  };
}
