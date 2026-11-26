import type { PluginTheme } from "@getpaseo/plugin";
import type { PluginPopoverProps, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useCallback, useState } from "react";
import {
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type PressableStateCallbackType,
} from "react-native";
import type { PeriodKind } from "../shared/usage";
import { agentSegments, Legend, PaceBar, PERIOD_OPTIONS, PeriodBars, Segmented } from "./charts";
import {
  TYPICAL_DAYS,
  typicalDay,
  useUsageReport,
  type TypicalDay,
  type UsageReport,
} from "./data";
import { formatAgo, formatCost, formatPercent, formatTokens } from "./format";
import {
  ClaudeLimitsSection,
  limitsAccessibilityText,
  LimitsSidebarLine,
  useClaudeLimits,
} from "./limits";
import { AgentList, FONT, Headline } from "./summary";
import { MONO_TEXT } from "./terminal";

const ICON_SIZE = 13;
const ICON_GAP = 5;
const TEXT_GAP = 7;
const MIN_METER_WIDTH = 24;
const WIDTH_FOR_COST = 120;
const WIDTH_FOR_METER = 170;
const POPOVER_PERIODS: Record<PeriodKind, number> = { daily: 14, weekly: 8, monthly: 6 };

type HoverState = PressableStateCallbackType & { hovered?: boolean };

function triggerStyle(theme: PluginTheme) {
  return ({ hovered }: HoverState) => ({
    width: "100%" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    overflow: "hidden" as const,
    minHeight: 26,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: hovered ? theme.colors.border : "transparent",
    backgroundColor: hovered ? theme.colors.surface2 : theme.colors.surface1,
  });
}

function todayOf(report: UsageReport) {
  return report.daily[report.daily.length - 1];
}

export function UsageSidebarItem({ theme, openPopover }: PluginSidebarItemProps) {
  const { data, error } = useUsageReport();
  const { data: limits } = useClaudeLimits();
  const [available, setAvailable] = useState<number | null>(null);
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => setAvailable(event.nativeEvent.layout.width),
    [],
  );

  const showUsage = Boolean(data || error);
  const showLimits = limits?.enabled === true;
  if (!showUsage && !showLimits) return null;
  const today = data ? todayOf(data) : undefined;
  const typical = data ? typicalDay(data.daily) : null;
  const width = available ?? WIDTH_FOR_COST;
  const pace =
    today && typical && !typical.estimated
      ? `，为典型日的 ${formatPercent(today.usage.cost / typical.cost)}`
      : "";
  const label =
    (today
      ? `今日 Token 用量：${formatTokens(today.usage.totalTokens)} tokens${pace}，估算费用 ${formatCost(today.usage.cost)}`
      : "Token 用量暂不可用") + limitsAccessibilityText(limits);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => openPopover(UsagePopover)}
      style={triggerStyle(theme)}
    >
      <View onLayout={onLayout} style={{ flex: 1, minWidth: 0, gap: 4, overflow: "hidden" }}>
        {showUsage ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <Icon name="Coins" size={ICON_SIZE} color={theme.colors.accent} />
            {today && data && typical ? (
              <>
                <Text
                  numberOfLines={1}
                  style={[
                    MONO_TEXT,
                    {
                      marginLeft: ICON_GAP,
                      fontSize: FONT.body,
                      color: theme.colors.foreground,
                    },
                  ]}
                >
                  {formatTokens(today.usage.totalTokens)}
                </Text>
                {width >= WIDTH_FOR_METER ? (
                  <View style={{ flex: 1, minWidth: MIN_METER_WIDTH, marginLeft: TEXT_GAP }}>
                    <PaceBar
                      theme={theme}
                      segments={agentSegments(theme, data.agents, today, "cost")}
                      typical={typical.cost}
                      estimated={typical.estimated}
                    />
                  </View>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                {width >= WIDTH_FOR_COST ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      MONO_TEXT,
                      {
                        marginLeft: TEXT_GAP,
                        fontSize: FONT.body,
                        color: theme.colors.foregroundMuted,
                      },
                    ]}
                  >
                    {formatCost(today.usage.cost)}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text
                numberOfLines={1}
                style={[
                  MONO_TEXT,
                  {
                    marginLeft: ICON_GAP,
                    fontSize: FONT.body,
                    color: theme.colors.foregroundMuted,
                  },
                ]}
              >
                用量暂不可用
              </Text>
            )}
          </View>
        ) : null}
        {showLimits ? <LimitsSidebarLine theme={theme} state={limits} width={width} /> : null}
      </View>
    </Pressable>
  );
}

export function UsagePopover({ theme, layout, openScreen }: PluginPopoverProps) {
  const { data, error, isPending } = useUsageReport();
  const [kind, setKind] = useState<PeriodKind>("daily");
  const [picked, setPicked] = useState<number | null>(null);
  const rootStyle = {
    gap: 10,
    padding: layout.compact ? 14 : 12,
    width: layout.compact ? undefined : 332,
    backgroundColor: theme.colors.surface1,
  };

  if (!data) {
    return (
      <View style={rootStyle}>
        <Text style={[MONO_TEXT, { fontSize: FONT.title, fontWeight: "700", color: theme.colors.foreground }]}>
          ❯ Token 用量
        </Text>
        <Text
          style={[
            MONO_TEXT,
            {
              fontSize: FONT.body,
              color: isPending ? theme.colors.foregroundMuted : theme.colors.statusDanger,
            },
          ]}
        >
          {isPending ? "$ 正在读取用量日志..." : (error?.message ?? "用量数据暂不可用。")}
        </Text>
      </View>
    );
  }

  const periods = data[kind].slice(-POPOVER_PERIODS[kind]);
  const typical = typicalDay(data.daily);
  const selected = picked !== null && picked < periods.length ? picked : periods.length - 1;
  const changeKind = (next: PeriodKind) => {
    setKind(next);
    setPicked(null);
  };

  return (
    <View style={rootStyle}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Text
          style={[
            MONO_TEXT,
            { flex: 1, fontSize: FONT.title, fontWeight: "700", color: theme.colors.foreground },
          ]}
        >
          <Text style={{ color: theme.colors.accent }}>❯ </Text>Token 用量
        </Text>
        <Segmented
          theme={theme}
          options={PERIOD_OPTIONS}
          value={kind}
          onChange={changeKind}
          accessibilityLabel="统计周期"
        />
      </View>
      <Headline theme={theme} kind={kind} periods={periods} index={selected} heroSize={22} />
      {kind === "daily" ? (
        <View style={{ gap: 2 }}>
          {typicalCaption(typical).map((line) => (
            <Text
              key={line}
              style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}
            >
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      <View
        style={{
          padding: 8,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 2,
          backgroundColor: theme.colors.surface0,
          gap: 6,
        }}
      >
        <PeriodBars
          theme={theme}
          kind={kind}
          periods={periods}
          order={data.agents}
          selected={selected}
          onSelect={setPicked}
          height={54}
          labelEvery={kind === "daily" ? 7 : kind === "weekly" ? 4 : 3}
        />
        <Legend theme={theme} order={data.agents} periods={periods} />
      </View>
      <AgentList theme={theme} order={data.agents} period={periods[selected]} />
      <ClaudeLimitsSection theme={theme} compact />
      <Footer theme={theme} report={data} onMore={() => openScreen({ screenId: "usage" })} />
    </View>
  );
}

function typicalCaption(typical: TypicalDay): string[] {
  const cost = formatCost(typical.cost);
  if (!typical.average) {
    return [`典型日基准 ${cost}（按 API 标价默认估算，待积累历史用量）`];
  }
  const { average } = typical;
  return [
    `典型日 ${cost} | 近 ${TYPICAL_DAYS} 天中 ${typical.activeDays} 个活跃日中位数`,
    `日均 ${formatCost(average.cost)}/天（统计 ${average.days} 天）| 折合 ~${formatCost(average.cost * 30)}/月`,
  ];
}

function Footer({
  theme,
  report,
  onMore,
}: {
  theme: PluginTheme;
  report: UsageReport;
  onMore(): void;
}) {
  return (
    <View style={{ gap: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
      {report.refreshError ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="TriangleAlert" size={12} color={theme.colors.statusWarning} />
          <Text
            numberOfLines={2}
            style={[MONO_TEXT, { flex: 1, fontSize: FONT.caption, color: theme.colors.statusWarning }]}
          >
            当前展示旧数据：{report.refreshError}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={[MONO_TEXT, { flex: 1, fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
          更新于 {formatAgo(report.generatedAt)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="打开用量详情"
          onPress={onMore}
          style={({ hovered }: HoverState) => ({
            flexDirection: "row" as const,
            alignItems: "center" as const,
            gap: 4,
            paddingVertical: 3,
            paddingHorizontal: 8,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: hovered ? theme.colors.accent : theme.colors.border,
            backgroundColor: hovered ? theme.colors.surface2 : theme.colors.surface0,
          })}
        >
          <Text style={[MONO_TEXT, { fontSize: FONT.body, color: theme.colors.foreground }]}>
            详情
          </Text>
          <Icon name="ChevronRight" size={13} color={theme.colors.accent} />
        </Pressable>
      </View>
    </View>
  );
}
