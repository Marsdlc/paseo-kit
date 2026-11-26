import type { PluginTheme } from "@getpaseo/plugin";
import { Pressable, Text, View, type PressableStateCallbackType } from "react-native";
import type { PeriodKind, UsagePeriod } from "../shared/usage";
import { agentSwatch, foldAgents, OTHER_AGENT, type Swatch } from "./data";
import { agentLabel, formatPeriodLong, formatPeriodShort, formatTokens } from "./format";
import { MONO_TEXT } from "./terminal";

const SEGMENT_GAP = 2;

type HoverState = PressableStateCallbackType & { hovered?: boolean };

export interface SegmentedOption<Value extends string> {
  value: Value;
  label: string;
}

/** Terminal-style sharp bordered tab group. */
export function Segmented<Value extends string>({
  theme,
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  theme: PluginTheme;
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onChange(value: Value): void;
  accessibilityLabel: string;
}) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: "row",
        padding: 2,
        gap: 2,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface0,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ hovered }: HoverState) => ({
              minWidth: 32,
              paddingVertical: 3,
              paddingHorizontal: 8,
              borderRadius: 1,
              alignItems: "center" as const,
              borderWidth: 1,
              borderColor: selected ? theme.colors.accent : "transparent",
              backgroundColor: selected
                ? theme.colors.surface2
                : hovered
                  ? theme.colors.surface1
                  : "transparent",
            })}
          >
            <Text
              style={[
                MONO_TEXT,
                {
                  fontSize: 11,
                  color: selected ? theme.colors.accent : theme.colors.foregroundMuted,
                  fontWeight: selected ? "700" : "400",
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const PERIOD_OPTIONS: readonly SegmentedOption<PeriodKind>[] = [
  { value: "daily", label: "日" },
  { value: "weekly", label: "周" },
  { value: "monthly", label: "月" },
];

export function SwatchDot({ swatch, size = 8 }: { swatch: Swatch; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 1,
        backgroundColor: swatch.color,
        opacity: swatch.opacity,
      }}
    />
  );
}

export interface ShareSegment {
  key: string;
  value: number;
  swatch: Swatch;
}

/** A sharp horizontal 100% bar: each segment's width is its share. */
export function ShareBar({
  theme,
  segments,
  height = 6,
}: {
  theme: PluginTheme;
  segments: readonly ShareSegment[];
  height?: number;
}) {
  const visible = segments.filter((segment) => segment.value > 0);
  return (
    <View
      style={{
        flexDirection: "row",
        height,
        gap: visible.length > 1 ? SEGMENT_GAP : 0,
        borderRadius: 1,
        overflow: "hidden",
        backgroundColor: visible.length === 0 ? theme.colors.surface2 : undefined,
      }}
    >
      {visible.map((segment) => (
        <View
          key={segment.key}
          style={{
            flexGrow: segment.value,
            flexBasis: 0,
            minWidth: 2,
            backgroundColor: segment.swatch.color,
            opacity: segment.swatch.opacity,
          }}
        />
      ))}
    </View>
  );
}

/** Today against a typical day, rendered as a crisp bordered TUI gauge with tick mark. */
export function PaceBar({
  theme,
  segments,
  typical,
  estimated = false,
  height = 7,
}: {
  theme: PluginTheme;
  segments: readonly ShareSegment[];
  typical: number;
  estimated?: boolean;
  height?: number;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
  const scale = Math.max(total, typical * 2, 1);
  const tickHeight = height + 4;
  return (
    <View style={{ height: tickHeight, justifyContent: "center" }}>
      <View
        style={{
          height,
          borderRadius: 1,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: "hidden",
          backgroundColor: theme.colors.surface0,
          padding: 1,
        }}
      >
        {total > 0 ? (
          <View style={{ width: `${(total / scale) * 100}%`, minWidth: 2 }}>
            <ShareBar theme={theme} segments={segments} height={Math.max(height - 4, 2)} />
          </View>
        ) : null}
      </View>
      <View
        style={{
          position: "absolute",
          left: `${(typical / scale) * 100}%`,
          width: 2,
          height: tickHeight,
          marginLeft: -1,
          borderRadius: 0,
          backgroundColor: estimated ? theme.colors.foregroundMuted : theme.colors.foreground,
        }}
      />
    </View>
  );
}

export function agentSegments(
  theme: PluginTheme,
  order: readonly string[],
  period: UsagePeriod | undefined,
  measure: "totalTokens" | "cost" = "totalTokens",
): ShareSegment[] {
  if (!period) return [];
  return foldAgents(period.agents, order).map((agent) => ({
    key: agent.agent,
    value: agent.usage[measure],
    swatch: agentSwatch(theme, order, agent.agent),
  }));
}

/** Stacked sharp rectangular columns with terminal baseline. */
export function PeriodBars({
  theme,
  kind,
  periods,
  order,
  selected,
  onSelect,
  height,
  labelEvery,
}: {
  theme: PluginTheme;
  kind: PeriodKind;
  periods: readonly UsagePeriod[];
  order: readonly string[];
  selected: number;
  onSelect(index: number): void;
  height: number;
  /** Label every Nth column, counted back from the newest. */
  labelEvery: number;
}) {
  const peak = Math.max(1, ...periods.map((period) => period.usage.totalTokens));
  const columnGap = periods.length > 20 ? 2 : 3;
  const lastIndex = periods.length - 1;
  return (
    <View style={{ gap: 4 }}>
      <View
        style={{
          height: height + 6,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: columnGap,
          paddingTop: 4,
          paddingBottom: 2,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        {periods.map((period, index) => {
          const isSelected = index === selected;
          const barHeight = (period.usage.totalTokens / peak) * height;
          const segments = agentSegments(theme, order, period).filter((s) => s.value > 0);
          return (
            <Pressable
              key={period.period}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${formatPeriodLong(kind, period.period)}：${formatTokens(period.usage.totalTokens)} tokens`}
              onPress={() => onSelect(index)}
              style={({ hovered }: HoverState) => ({
                flex: 1,
                height: "100%" as const,
                justifyContent: "flex-end" as const,
                borderRadius: 1,
                backgroundColor: hovered && !isSelected ? theme.colors.surface2 : undefined,
              })}
            >
              {segments.length === 0 ? (
                <View style={{ height: 2, backgroundColor: theme.colors.surface2 }} />
              ) : (
                <View
                  style={{
                    height: Math.max(barHeight, 3),
                    flexDirection: "column-reverse",
                    gap: barHeight > segments.length * 4 ? 1 : 0,
                    borderRadius: 0,
                    overflow: "hidden",
                    opacity: isSelected ? 1 : 0.55,
                  }}
                >
                  {segments.map((segment) => (
                    <View
                      key={segment.key}
                      style={{
                        flexGrow: segment.value,
                        flexBasis: 0,
                        backgroundColor: segment.swatch.color,
                        opacity: segment.swatch.opacity,
                      }}
                    />
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: columnGap }}>
        {periods.map((period, index) => {
          const labelled = (lastIndex - index) % labelEvery === 0 || index === selected;
          return (
            <View
              key={period.period}
              style={{ flex: 1, alignItems: "center", overflow: "visible" }}
            >
              {labelled ? (
                <Text
                  numberOfLines={1}
                  style={[
                    MONO_TEXT,
                    {
                      width: 48,
                      textAlign: "center",
                      fontSize: 10,
                      fontWeight: index === selected ? "700" : "400",
                      color: index === selected ? theme.colors.accent : theme.colors.foregroundMuted,
                    },
                  ]}
                >
                  {formatPeriodShort(kind, period.period)}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** One line per agent present in the window: swatch and name. */
export function Legend({
  theme,
  order,
  periods,
}: {
  theme: PluginTheme;
  order: readonly string[];
  periods: readonly UsagePeriod[];
}) {
  const present = new Set(
    periods.flatMap((period) => foldAgents(period.agents, order).map((a) => a.agent)),
  );
  const keys = [
    ...order.filter((agent) => present.has(agent)),
    ...(present.has(OTHER_AGENT) ? [OTHER_AGENT] : []),
  ];
  if (keys.length < 2) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 }}>
      {keys.map((agent) => (
        <View key={agent} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <SwatchDot swatch={agentSwatch(theme, order, agent)} />
          <Text style={[MONO_TEXT, { fontSize: 11, color: theme.colors.foregroundMuted }]}>
            {agentLabel(agent)}
          </Text>
        </View>
      ))}
    </View>
  );
}
