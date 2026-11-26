import { Platform, type TextStyle } from "react-native";

export const MONO_FONT = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
});

export const MONO_TEXT: TextStyle = {
  fontFamily: MONO_FONT,
  fontVariant: ["tabular-nums"],
};
