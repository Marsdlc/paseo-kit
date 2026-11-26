import type { PluginTheme } from "@getpaseo/plugin";
import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View, type PressableStateCallbackType } from "react-native";
import type { PeriodKind, SessionUsage, UsagePeriod } from "../shared/usage";
import { Legend, PERIOD_OPTIONS, PeriodBars, Segmented, SwatchDot } from "./charts";
import { agentSwatch, useUsageReport, type UsageReport } from "./data";
import {
  agentLabel,
  CURRENT_LABEL,
  formatAgo,
  formatCost,
  formatPercent,
  formatPeriodLong,
  formatTokens,
  shortSessionId,
} from "./format";
import {
  ClaudeLimitsOffNote,
  ClaudeLimitsSection,
  LimitsRefreshButton,
  useClaudeLimits,
} from "./limits";
import { AgentList, Composition, FONT, Headline } from "./summary";
import { MONO_TEXT } from "./terminal";

type HoverState = PressableStateCallbackType & { hovered?: boolean };

const MAX_CONTENT_WIDTH = 900;

/** Crisp terminal-style bordered frame with a header strip. */
export function Card({
  theme,
  title,
  trailing,
  children,
}: {
  theme: PluginTheme;
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface0,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.surface1,
        }}
      >
        <Text style={[MONO_TEXT, { color: theme.colors.accent, fontSize: FONT.title, fontWeight: "700" }]}>
          ▸
        </Text>
        <Text
          style={[
            MONO_TEXT,
            {
              flex: 1,
              fontSize: FONT.title,
              fontWeight: "700",
              color: theme.colors.foreground,
            },
          ]}
        >
          {title}
        </Text>
        {trailing}
      </View>
      <View style={{ gap: 12, padding: 14 }}>{children}</View>
    </View>
  );
}

/** Framed TUI telemetry cell. */
export function Stat({
  theme,
  label,
  value,
  detail,
}: {
  theme: PluginTheme;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: 140,
        gap: 3,
        padding: 10,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
      }}
    >
      <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          MONO_TEXT,
          {
            fontSize: 18,
            fontWeight: "700",
            color: theme.colors.foreground,
          },
        ]}
      >
        {value}
      </Text>
      {detail ? (
        <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

function Stats({ theme, period }: { theme: PluginTheme; period: UsagePeriod }) {
  const { usage } = period;
  const prompt = usage.inputTokens + usage.cacheCreationTokens + usage.cacheReadTokens;
  const perMillion = usage.totalTokens > 0 ? usage.cost / (usage.totalTokens / 1_000_000) : 0;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 10, columnGap: 10 }}>
      <Stat
        theme={theme}
        label="估算费用"
        value={formatCost(usage.cost)}
        detail={`每百万 Token ${formatCost(perMillion)}`}
      />
      <Stat
        theme={theme}
        label="缓存命中率"
        value={prompt > 0 ? formatPercent(usage.cacheReadTokens / prompt) : "—"}
        detail="提示词命中缓存占比"
      />
      <Stat
        theme={theme}
        label="输出总量"
        value={formatTokens(usage.outputTokens)}
        detail="生成 Token 数"
      />
      <Stat
        theme={theme}
        label="活跃 Agent"
        value={`${period.agents.length}`}
        detail={`涉及 ${new Set(period.agents.flatMap((a) => a.models.map((m) => m.model))).size} 个模型`}
      />
    </View>
  );
}

function SessionRow({
  theme,
  order,
  session,
  last,
}: {
  theme: PluginTheme;
  order: readonly string[];
  session: SessionUsage;
  last: boolean;
}) {
  const topModel = session.models[0]?.model;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 36,
        paddingVertical: 5,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <SwatchDot swatch={agentSwatch(theme, order, session.agent)} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text numberOfLines={1} style={[MONO_TEXT, { fontSize: FONT.body, color: theme.colors.foreground }]}>
          {agentLabel(session.agent)}
          <Text style={{ color: theme.colors.foregroundMuted }}>
            {"  #"}
            {shortSessionId(session.id)}
          </Text>
        </Text>
        <Text
          numberOfLines={1}
          style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}
        >
          {[topModel, session.lastActivity ? formatAgo(Date.parse(session.lastActivity)) : null]
            .filter(Boolean)
            .join(" | ")}
        </Text>
      </View>
      <Text style={[MONO_TEXT, { fontSize: FONT.body, color: theme.colors.foreground }]}>
        {formatTokens(session.usage.totalTokens)}
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
        {formatCost(session.usage.cost)}
      </Text>
    </View>
  );
}

function Body({
  theme,
  compact,
  report,
}: {
  theme: PluginTheme;
  compact: boolean;
  report: UsageReport;
}) {
  const [kind, setKind] = useState<PeriodKind>("daily");
  const [picked, setPicked] = useState<number | null>(null);
  const all = report[kind];
  const periods = compact ? all.slice(-Math.ceil(all.length / 2)) : all;
  const selected = picked !== null && picked < periods.length ? picked : periods.length - 1;
  const period = periods[selected];
  const changeKind = (next: PeriodKind) => {
    setKind(next);
    setPicked(null);
  };
  const periodTitle = period
    ? selected === periods.length - 1
      ? CURRENT_LABEL[kind]
      : formatPeriodLong(kind, period.period)
    : "";

  return (
    <View style={{ gap: compact ? 12 : 14 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Text
          style={[
            MONO_TEXT,
            { fontSize: FONT.title, fontWeight: "700", color: theme.colors.foreground },
          ]}
        >
          <Text style={{ color: theme.colors.accent }}>$ </Text>ccusage --stats
        </Text>
        <Segmented
          theme={theme}
          options={PERIOD_OPTIONS}
          value={kind}
          onChange={changeKind}
          accessibilityLabel="统计周期"
        />
        <Text
          style={[
            MONO_TEXT,
            {
              flex: 1,
              fontSize: FONT.caption,
              color: theme.colors.foregroundMuted,
              textAlign: "right",
            },
          ]}
        >
          更新于 {formatAgo(report.generatedAt)} | {report.timezone}
        </Text>
      </View>
      {report.refreshError ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            padding: 8,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: theme.colors.statusWarning,
            backgroundColor: theme.colors.surface1,
          }}
        >
          <Icon name="TriangleAlert" size={14} color={theme.colors.statusWarning} />
          <Text style={[MONO_TEXT, { flex: 1, fontSize: FONT.body, color: theme.colors.statusWarning }]}>
            当前展示旧数据：{report.refreshError}
          </Text>
        </View>
      ) : null}

      <LimitsCard theme={theme} />

      <Card theme={theme} title="Token 趋势">
        <Headline
          theme={theme}
          kind={kind}
          periods={periods}
          index={selected}
          heroSize={compact ? 24 : 28}
        />
        <PeriodBars
          theme={theme}
          kind={kind}
          periods={periods}
          order={report.agents}
          selected={selected}
          onSelect={setPicked}
          height={compact ? 110 : 150}
          labelEvery={kind === "daily" ? 7 : kind === "weekly" ? 2 : compact ? 2 : 1}
        />
        <Legend theme={theme} order={report.agents} periods={periods} />
      </Card>

      {period ? (
        <>
          <Card theme={theme} title={`周期明细 · ${periodTitle}`}>
            <Stats theme={theme} period={period} />
            <Composition theme={theme} usage={period.usage} />
          </Card>
          <Card
            theme={theme}
            title="按 Agent 分布"
            trailing={
              <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
                点击行展开模型明细
              </Text>
            }
          >
            <AgentList theme={theme} order={report.agents} period={period} expandable />
          </Card>
        </>
      ) : null}

      <Card theme={theme} title="最近会话">
        {report.recentSessions.length === 0 ? (
          <Text style={[MONO_TEXT, { fontSize: FONT.body, color: theme.colors.foregroundMuted }]}>
            暂无会话记录。
          </Text>
        ) : (
          <View>
            {report.recentSessions.map((session, index) => (
              <SessionRow
                key={`${session.agent}:${session.id}`}
                theme={theme}
                order={report.agents}
                session={session}
                last={index === report.recentSessions.length - 1}
              />
            ))}
          </View>
        )}
      </Card>

      <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
        # 数据由 ccusage 从本机 Agent 日志离线读取，费用按内置 API 标价估算，并非实际账单。
      </Text>
      <ClaudeLimitsOffNote theme={theme} />
    </View>
  );
}

/** Claude plan limits, only once they are turned on in the settings. */
function LimitsCard({ theme }: { theme: PluginTheme }) {
  const { data } = useClaudeLimits();
  if (!data?.enabled) return null;
  return (
    <Card theme={theme} title="Claude 订阅额度" trailing={<LimitsRefreshButton theme={theme} />}>
      <ClaudeLimitsSection theme={theme} />
    </Card>
  );
}

export function UsageScreen({ theme, layout }: PluginScreenProps) {
  const { data, error, isPending, refetch, isRefetching } = useUsageReport();
  const padding = layout.compact ? 14 : 20;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.surface0 }}
      contentContainerStyle={{ padding, alignItems: "center" }}
    >
      <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH }}>
        {data ? (
          <Body theme={theme} compact={layout.compact} report={data} />
        ) : (
          <View style={{ gap: 12, paddingVertical: 48, alignItems: "center" }}>
            <Icon
              name={isPending ? "Hourglass" : "CircleAlert"}
              size={20}
              color={isPending ? theme.colors.foregroundMuted : theme.colors.statusDanger}
            />
            <Text
              style={[
                MONO_TEXT,
                { fontSize: FONT.title, color: theme.colors.foreground, textAlign: "center" },
              ]}
            >
              {isPending ? "$ 正在读取用量日志..." : "无法读取 Token 用量"}
            </Text>
            {error ? (
              <Text
                style={[
                  MONO_TEXT,
                  {
                    fontSize: FONT.body,
                    color: theme.colors.foregroundMuted,
                    textAlign: "center",
                  },
                ]}
              >
                {error.message}
              </Text>
            ) : null}
            {!isPending ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="重试"
                disabled={isRefetching}
                onPress={() => void refetch()}
                style={({ hovered }: HoverState) => ({
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                  borderRadius: 2,
                  borderWidth: 1,
                  borderColor: hovered ? theme.colors.accent : theme.colors.border,
                  backgroundColor: hovered ? theme.colors.surface2 : theme.colors.surface1,
                })}
              >
                <Text style={[MONO_TEXT, { fontSize: FONT.body, color: theme.colors.foreground }]}>
                  {isRefetching ? "[ 重试中... ]" : "[ 重试 ]"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
