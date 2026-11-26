import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/ui";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

export const MONO_FONT = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
});

export const MONO_TEXT: TextStyle = {
  fontFamily: MONO_FONT,
  fontVariant: ["tabular-nums"],
};

/** React Native Web adds `hovered` to the pressable state. */
function isHovered(state: PressableStateCallbackType): boolean {
  return (state as PressableStateCallbackType & { hovered?: boolean }).hovered === true;
}

export function IconButton({
  theme,
  icon,
  label,
  onPress,
  active,
  disabled,
  size = "md",
  primary,
}: {
  theme: PluginTheme;
  icon: string;
  label: string;
  onPress(): void;
  active?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  primary?: boolean;
}) {
  const { colors } = theme;
  const box = size === "lg" ? 34 : size === "sm" ? 26 : 28;
  const glyph = size === "lg" ? 16 : size === "sm" ? 13 : 15;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      disabled={disabled}
      onPress={onPress}
      style={(state) => ({
        width: box,
        height: box,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: primary || active ? colors.accent : state.pressed || isHovered(state) ? colors.border : "transparent",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: primary
          ? colors.accent
          : state.pressed || isHovered(state) || active
            ? colors.surface2
            : "transparent",
        opacity: disabled ? 0.4 : state.pressed && primary ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={glyph} color={primary ? colors.accentForeground : active ? colors.accent : colors.foreground} />
    </Pressable>
  );
}

export function Button({
  theme,
  icon,
  label,
  onPress,
  disabled,
  primary,
  active,
  busy,
  compact,
  accessibilityLabel,
}: {
  theme: PluginTheme;
  icon?: string;
  label?: string;
  onPress(): void;
  disabled?: boolean;
  primary?: boolean;
  active?: boolean;
  busy?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = theme;
  const foreground = primary ? colors.accentForeground : active ? colors.accent : colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      disabled={disabled || busy}
      onPress={onPress}
      style={(state) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: compact ? 25 : 29,
        paddingHorizontal: label ? (compact ? 8 : 11) : compact ? 5 : 7,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: primary || active ? colors.accent : isHovered(state) ? colors.accent : colors.border,
        backgroundColor: primary ? colors.accent : state.pressed || isHovered(state) || active ? colors.surface2 : colors.surface0,
        opacity: disabled ? 0.45 : state.pressed && primary ? 0.85 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : icon ? (
        <Icon name={icon} size={compact ? 13 : 14} color={foreground} />
      ) : null}
      {label ? (
        <Text numberOfLines={1} style={[MONO_TEXT, { color: foreground, fontSize: compact ? 11 : 12, fontWeight: "700" }]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** A crisp monospace text toggle for toolbars: speed, quality. */
export function TextToggle({
  theme,
  label,
  onPress,
  accessibilityLabel,
  active,
}: {
  theme: PluginTheme;
  label: string;
  onPress(): void;
  accessibilityLabel: string;
  active?: boolean;
}) {
  const { colors } = theme;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={(state) => ({
        height: 28,
        minWidth: 30,
        paddingHorizontal: 7,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: active ? colors.accent : state.pressed || isHovered(state) ? colors.border : "transparent",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: state.pressed || isHovered(state) ? colors.surface2 : "transparent",
      })}
    >
      <Text style={[MONO_TEXT, { color: active ? colors.accent : colors.foreground, fontSize: 11, fontWeight: "700" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Visually joins related controls in a crisp TUI bar. */
export function Group({ theme, children, style }: { theme: PluginTheme; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
          padding: 2,
          borderRadius: 2,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A terminal tag: a filter, a toggle, or context with an optional action. */
export function Chip({
  theme,
  label,
  icon,
  active,
  onPress,
  count,
  trailingIcon,
  accessibilityLabel,
  dense,
}: {
  theme: PluginTheme;
  label: string;
  icon?: string;
  active?: boolean;
  onPress?: () => void;
  count?: number;
  trailingIcon?: string;
  accessibilityLabel?: string;
  mono?: boolean;
  dense?: boolean;
}) {
  const { colors } = theme;
  const color = active ? colors.accent : colors.foregroundMuted;
  const content = (state?: PressableStateCallbackType) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: dense ? 4 : 5,
    height: 24,
    paddingHorizontal: dense ? 6 : 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: active ? colors.accent : state && (state.pressed || isHovered(state)) ? colors.border : "transparent",
    backgroundColor: active ? colors.surface2 : state && (state.pressed || isHovered(state)) ? colors.surface1 : "transparent",
    maxWidth: "100%" as const,
    minWidth: 0,
  });
  const inner = (
    <>
      {icon ? <Icon name={icon} size={12} color={active ? colors.accent : colors.foregroundMuted} /> : null}
      <Text numberOfLines={1} style={[MONO_TEXT, { color, fontSize: 11, fontWeight: active ? "700" : "500", flexShrink: 1 }]}>
        {label}
      </Text>
      {count !== undefined ? <Text style={[MONO_TEXT, { color: colors.foregroundMuted, fontSize: 10 }]}>[{count}]</Text> : null}
      {trailingIcon ? <Icon name={trailingIcon} size={11} color={colors.foregroundMuted} /> : null}
    </>
  );
  if (!onPress) return <View style={content()}>{inner}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ selected: !!active }} onPress={onPress} style={(state) => content(state)}>
      {inner}
    </Pressable>
  );
}

export function Segmented<Value extends string>({
  theme,
  value,
  options,
  onChange,
}: {
  theme: PluginTheme;
  value: Value;
  options: readonly { value: Value; label: string; icon?: string }[];
  onChange(value: Value): void;
}) {
  const { colors } = theme;
  return (
    <View
      style={{
        flexDirection: "row",
        padding: 2,
        gap: 2,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface0,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={(state) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              height: 24,
              borderRadius: 1,
              backgroundColor: selected ? colors.surface2 : isHovered(state) ? colors.surface1 : "transparent",
              borderWidth: 1,
              borderColor: selected ? colors.accent : "transparent",
            })}
          >
            {option.icon ? <Icon name={option.icon} size={12} color={selected ? colors.accent : colors.foregroundMuted} /> : null}
            <Text style={[MONO_TEXT, { color: selected ? colors.accent : colors.foregroundMuted, fontSize: 11, fontWeight: selected ? "700" : "500" }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Badge({ theme, label, tone = "muted" }: { theme: PluginTheme; label: string; tone?: "muted" | "accent" | "warning" }) {
  const { colors } = theme;
  const color = tone === "accent" ? colors.accent : tone === "warning" ? colors.statusWarning : colors.foregroundMuted;
  return (
    <View
      style={{
        paddingHorizontal: 5,
        height: 18,
        justifyContent: "center",
        borderRadius: 2,
        borderWidth: 1,
        borderColor: tone === "muted" ? colors.border : color,
        backgroundColor: colors.surface0,
      }}
    >
      <Text numberOfLines={1} style={[MONO_TEXT, { color, fontSize: 10, fontWeight: "700" }]}>
        {label}
      </Text>
    </View>
  );
}

/** A terminal key cap for shortcut hints. */
export function Kbd({ theme, children }: { theme: PluginTheme; children: string }) {
  const { colors } = theme;
  return (
    <View
      style={{
        minWidth: 20,
        height: 20,
        paddingHorizontal: 5,
        borderRadius: 2,
        borderWidth: 1,
        borderBottomWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.surface0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={[MONO_TEXT, { color: colors.foreground, fontSize: 10, fontWeight: "700" }]}>{children}</Text>
    </View>
  );
}

export function ProgressBar({ theme, value, tone }: { theme: PluginTheme; value: number; tone?: "accent" | "danger" | "success" | "warning" }) {
  const { colors } = theme;
  const color = tone === "danger" ? colors.statusDanger : tone === "success" ? colors.statusSuccess : tone === "warning" ? colors.statusWarning : colors.accent;
  return (
    <View
      style={{
        height: 6,
        borderRadius: 1,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface0,
        padding: 1,
        overflow: "hidden",
      }}
    >
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: "100%", backgroundColor: color }} />
    </View>
  );
}

export function Message({
  theme,
  icon,
  text,
  loading,
  tone,
  children,
  style,
}: {
  theme: PluginTheme;
  icon?: string;
  text: string;
  loading?: boolean;
  tone?: "danger" | "muted";
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const color = tone === "danger" ? theme.colors.statusDanger : theme.colors.foregroundMuted;
  return (
    <View style={[{ alignItems: "center", justifyContent: "center", gap: 10, padding: 20 }, style]}>
      {loading ? <ActivityIndicator color={theme.colors.accent} /> : icon ? <Icon name={icon} size={20} color={color} /> : null}
      {text ? <Text style={[MONO_TEXT, { color, fontSize: 12, textAlign: "center" }]}>{text}</Text> : null}
      {children}
    </View>
  );
}

/** Removes the browser's focus outline from a text field that draws its own frame (web only). */
export const NO_OUTLINE = { outlineWidth: 0, outlineStyle: "none" } as unknown as Record<string, never>;

export function kindIcon(kind: string): string {
  if (kind === "video") return "Film";
  if (kind === "audio") return "AudioLines";
  if (kind === "image") return "Image";
  if (kind === "directory") return "Folder";
  return "File";
}

/** Relative time formatted in Simplified Chinese. */
export function timeAgo(iso: string, _locale: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const seconds = Math.round((then - Date.now()) / 1000);
  const format = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto", style: "short" });
  const abs = Math.abs(seconds);
  if (abs < 60) return format.format(seconds, "second");
  if (abs < 3600) return format.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return format.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return format.format(Math.round(seconds / 86_400), "day");
  return new Date(then).toLocaleDateString("zh-CN");
}
