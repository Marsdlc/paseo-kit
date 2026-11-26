import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useState } from "react";
import { Pressable, Text, View, type PressableStateCallbackType } from "react-native";
import type { AgentUsage, PeriodKind, Usage, UsagePeriod } from "../shared/usage";
import { ShareBar, SwatchDot, type ShareSegment } from "./charts";
import { agentSwatch, foldAgents } from "./data";
import {
  agentLabel,
  CURRENT_LABEL,
  formatCost,
  formatPercent,
  formatPeriodLong,
  formatTokens,
  PREVIOUS_LABEL,
} from "./format";
import { MONO_TEXT } from "./terminal";

type HoverState = PressableStateCallbackType & { hovered?: boolean };

export const FONT = { caption: 11, body: 12, title: 13, hero: 24 } as const;

/** The period's headline: a label, then total tokens with cost and change beside them. */
export function Headline({
  theme,
  kind,
  periods,
  index,
  heroSize = FONT.hero,
}: {
  theme: PluginTheme;
  kind: PeriodKind;
  periods: readonly UsagePeriod[];
  index: number;
  heroSize?: number;
}) {
  const period = periods[index];
  if (!period) return null;
  const previous = periods[index - 1];
  const isCurrent = index === periods.length - 1;
  const label = isCurrent ? CURRENT_LABEL[kind] : formatPeriodLong(kind, period.period);
  return (
    <View style={{ gap: 3 }}>
      <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
        [{label}]
      </Text>
      <View
        style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: 8 }}
      >
        <Text
          style={[
            MONO_TEXT,
            {
              fontSize: heroSize,
              fontWeight: "700",
              color: theme.colors.foreground,
            },
          ]}
        >
          {formatTokens(period.usage.totalTokens)}
        </Text>
        <Text style={[MONO_TEXT, { fontSize: FONT.body, color: theme.colors.foregroundMuted }]}>
          tokens
        </Text>
        <Text
          style={[
            MONO_TEXT,
            {
              fontSize: FONT.title,
              fontWeight: "700",
              color: theme.colors.accent,
            },
          ]}
        >
          {formatCost(period.usage.cost)}
        </Text>
      </View>
      {previous ? (
        <Change
          theme={theme}
          current={period.usage.totalTokens}
          previous={previous.usage.totalTokens}
          against={isCurrent ? PREVIOUS_LABEL[kind] : "上一周期"}
        />
      ) : null}
    </View>
  );
}

/** Change against the previous period, in muted ink: more usage is not a fault. */
function Change({
  theme,
  current,
  previous,
  against,
}: {
  theme: PluginTheme;
  current: number;
  previous: number;
  against: string;
}) {
  let icon = "Minus";
  let text = `与${against}持平`;
  if (previous === 0) {
    if (current === 0) return null;
    icon = "TrendingUp";
    text = `${against}无用量`;
  } else if (current !== previous) {
    const ratio = current / previous - 1;
    icon = ratio > 0 ? "TrendingUp" : "TrendingDown";
    text = `较${against} ${ratio > 0 ? "+" : "−"}${formatPercent(Math.abs(ratio))} (${formatTokens(previous)})`;
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Icon name={icon} size={12} color={theme.colors.foregroundMuted} />
      <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
        {text}
      </Text>
    </View>
  );
}

/** Input, output, cache write, cache read: what the total is made of. */
export function Composition({ theme, usage }: { theme: PluginTheme; usage: Usage }) {
  const parts: { key: string; label: string; value: number; swatch: ShareSegment["swatch"] }[] = [
    {
      key: "input",
      label: "输入",
      value: usage.inputTokens,
      swatch: { color: theme.colors.accent, opacity: 1 },
    },
    {
      key: "output",
      label: "输出",
      value: usage.outputTokens,
      swatch: { color: theme.colors.accent, opacity: 0.5 },
    },
    {
      key: "cache-write",
      label: "缓存写入",
      value: usage.cacheCreationTokens,
      swatch: { color: theme.colors.foregroundMuted, opacity: 0.9 },
    },
    {
      key: "cache-read",
      label: "缓存读取",
      value: usage.cacheReadTokens,
      swatch: { color: theme.colors.foregroundMuted, opacity: 0.45 },
    },
  ];
  const total = Math.max(usage.totalTokens, 1);
  return (
    <View style={{ gap: 6 }}>
      <ShareBar theme={theme} segments={parts} height={6} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 }}>
        {parts.map((part) => (
          <View key={part.key} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <SwatchDot swatch={part.swatch} />
            <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
              {part.label}
            </Text>
            <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foreground }]}>
              {formatTokens(part.value)}
            </Text>
            <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
              {formatPercent(part.value / total)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ModelRows({ theme, agent }: { theme: PluginTheme; agent: AgentUsage }) {
  return (
    <View
      style={{
        gap: 4,
        paddingLeft: 14,
        paddingVertical: 4,
        borderLeftWidth: 1,
        borderLeftColor: theme.colors.border,
        marginLeft: 3,
      }}
    >
      {agent.models.map((model) => (
        <View key={model.model} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            numberOfLines={1}
            style={[
              MONO_TEXT,
              {
                flex: 1,
                minWidth: 0,
                fontSize: FONT.caption,
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            ├─ {model.model}
          </Text>
          <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foreground }]}>
            {formatTokens(model.usage.totalTokens)}
          </Text>
          <Text
            style={[
              MONO_TEXT,
              {
                width: 52,
                textAlign: "right",
                fontSize: FONT.caption,
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {formatCost(model.usage.cost)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** One row per agent: swatch, name, share of the period, tokens, cost. */
export function AgentList({
  theme,
  order,
  period,
  expandable = false,
}: {
  theme: PluginTheme;
  order: readonly string[];
  period: UsagePeriod | undefined;
  expandable?: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const agents = period ? foldAgents(period.agents, order) : [];
  if (!period || agents.length === 0) {
    return (
      <Text style={[MONO_TEXT, { fontSize: FONT.body, color: theme.colors.foregroundMuted }]}>
        该周期暂无用量记录。
      </Text>
    );
  }
  const total = Math.max(period.usage.totalTokens, 1);
  return (
    <View style={{ gap: 2 }}>
      {agents.map((agent, index) => {
        const open = expandable && expanded === agent.agent;
        const share = agent.usage.totalTokens / total;
        const row = (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              minHeight: 26,
              borderBottomWidth: index === agents.length - 1 && !open ? 0 : 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <SwatchDot swatch={agentSwatch(theme, order, agent.agent)} />
            <Text
              numberOfLines={1}
              style={[MONO_TEXT, { flexShrink: 1, fontSize: FONT.body, color: theme.colors.foreground }]}
            >
              {agentLabel(agent.agent)}
            </Text>
            <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
              {formatPercent(share)}
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={[MONO_TEXT, { fontSize: FONT.body, color: theme.colors.foreground }]}>
              {formatTokens(agent.usage.totalTokens)}
            </Text>
            <Text
              style={[
                MONO_TEXT,
                {
                  width: 56,
                  textAlign: "right",
                  fontSize: FONT.body,
                  color: theme.colors.foregroundMuted,
                },
              ]}
            >
              {formatCost(agent.usage.cost)}
            </Text>
            {expandable ? (
              <Icon
                name={open ? "ChevronUp" : "ChevronDown"}
                size={13}
                color={theme.colors.foregroundMuted}
              />
            ) : null}
          </View>
        );
        return (
          <View key={agent.agent} style={{ gap: 4 }}>
            {expandable ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={`${agentLabel(agent.agent)}：${formatTokens(agent.usage.totalTokens)} tokens，${formatCost(agent.usage.cost)}`}
                onPress={() => setExpanded(open ? null : agent.agent)}
                style={({ hovered }: HoverState) => ({
                  marginHorizontal: -6,
                  paddingHorizontal: 6,
                  borderRadius: 2,
                  backgroundColor: hovered ? theme.colors.surface2 : undefined,
                })}
              >
                {row}
              </Pressable>
            ) : (
              row
            )}
            {open ? <ModelRows theme={theme} agent={agent} /> : null}
          </View>
        );
      })}
    </View>
  );
}
