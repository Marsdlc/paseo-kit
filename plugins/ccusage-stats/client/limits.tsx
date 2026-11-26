import type { PluginTheme } from "@getpaseo/plugin";
import { useRpc } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, Text, View, type PressableStateCallbackType } from "react-native";
import {
  claudeLimitsRpc,
  refreshClaudeLimitsRpc,
  type ClaudeLimitsState,
  type LimitWindow,
} from "../shared/limits";
import { formatAgo } from "./format";
import { FONT } from "./summary";
import { MONO_TEXT } from "./terminal";

type HoverState = PressableStateCallbackType & { hovered?: boolean };

export const LIMITS_QUERY_KEY = ["claude-limits"] as const;
const LIMITS_POLL_MS = 60_000;
const LIMITS_REFRESHING_POLL_MS = 3_000;

export function useClaudeLimits() {
  const read = useRpc(claudeLimitsRpc);
  return useQuery({
    queryKey: LIMITS_QUERY_KEY,
    queryFn: () => read({}),
    refetchInterval: (query) =>
      query.state.data?.refreshing ? LIMITS_REFRESHING_POLL_MS : LIMITS_POLL_MS,
  });
}

function useRefreshLimits() {
  const refresh = useRpc(refreshClaudeLimitsRpc);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => refresh({}),
    onSuccess: (state) => queryClient.setQueryData(LIMITS_QUERY_KEY, state),
  });
}

/** Re-renders every `ms` so relative times and countdowns stay current. */
function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

/** The same thresholds as host-monitor's meters: yellow from 70%, red from 90%. */
export function limitColor(theme: PluginTheme, percent: number | null): string {
  if (percent === null) return theme.colors.foregroundMuted;
  if (percent >= 90) return theme.colors.statusDanger;
  if (percent >= 70) return theme.colors.statusWarning;
  return theme.colors.accent;
}

export function formatPercentUsed(percent: number | null): string {
  if (percent === null) return "—";
  if (percent > 0 && percent < 1) return "<1%";
  return `${Math.round(percent)}%`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const timeOf = (date: Date) =>
  date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });

/** "今天 19:00", "明天 09:00", "11月21日 09:00". */
export function formatReset(resetsAt: number, now = Date.now()): string {
  const date = new Date(resetsAt);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(date, new Date(now))) return `今天 ${timeOf(date)}`;
  if (sameDay(date, tomorrow)) return `明天 ${timeOf(date)}`;
  const day = `${date.getMonth() + 1}月${date.getDate()}日`;
  return `${day} ${timeOf(date)}`;
}

/** The popover's short form: "19:00" today, "周四 09:00" this week, else "11/21". */
function formatResetShort(resetsAt: number, now: number): string {
  const date = new Date(resetsAt);
  if (sameDay(date, new Date(now))) return timeOf(date);
  if (resetsAt - now < 6 * 24 * 60 * 60_000) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${weekdays[date.getDay()]} ${timeOf(date)}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** "2小时5分钟后", "3天4小时后". */
function formatIn(resetsAt: number, now: number): string {
  const minutes = Math.max(0, Math.round((resetsAt - now) / 60_000));
  if (minutes < 60) return `${minutes}分钟后`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}小时${minutes % 60}分钟后`;
  return `${Math.floor(hours / 24)}天${hours % 24}小时后`;
}

const METHOD_LABEL = {
  headless: "claude -p /usage",
  interactive: "交互式 Claude Code 会话 /usage",
} as const;

/** Why there are no numbers, or null when there are (or will be shortly). */
function problemText(state: ClaudeLimitsState): string | null {
  if (state.missingClaude) {
    return "本机未找到 Claude Code (claude)。请先安装，或在插件设置中指定路径。";
  }
  if (!state.limits && state.error) return `无法读取订阅额度：${state.error}`;
  return null;
}

/** The short form for the sidebar. */
function problemShort(state: ClaudeLimitsState): string | null {
  if (state.missingClaude) return "未找到 Claude Code";
  if (!state.limits && state.error) return "额度暂不可用";
  return null;
}

export function LimitBar({
  theme,
  percent,
  height = 7,
}: {
  theme: PluginTheme;
  percent: number | null;
  height?: number;
}) {
  const fill = Math.min(Math.max(percent ?? 0, 0), 100) / 100;
  return (
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
      {fill > 0 ? (
        <View
          style={{
            width: `${fill * 100}%`,
            minWidth: 2,
            height: "100%",
            backgroundColor: limitColor(theme, percent),
          }}
        />
      ) : null}
    </View>
  );
}

const SIDEBAR_WIDTH_FOR_BARS = 170;
const SIDEBAR_WIDTH_FOR_BOTH = 104;

function SidebarWindow({
  theme,
  label,
  span,
  bar,
}: {
  theme: PluginTheme;
  label: string;
  span: LimitWindow | null;
  bar: boolean;
}) {
  const percent = span?.percent ?? null;
  const hot = percent !== null && percent >= 70;
  return (
    <View
      style={{
        flex: bar ? 1 : undefined,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        minWidth: 0,
      }}
    >
      <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
        {label}
      </Text>
      {bar ? (
        <View style={{ flex: 1, minWidth: 16 }}>
          <LimitBar theme={theme} percent={percent} height={6} />
        </View>
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          MONO_TEXT,
          {
            fontSize: FONT.body,
            color: hot ? limitColor(theme, percent) : theme.colors.foreground,
          },
        ]}
      >
        {formatPercentUsed(percent)}
      </Text>
    </View>
  );
}

/** Text for the sidebar trigger's accessibility label; empty when the feature is off. */
export function limitsAccessibilityText(state: ClaudeLimitsState | undefined): string {
  if (!state?.enabled) return "";
  const problem = problemShort(state);
  if (problem) return `。${problem}`;
  const { limits } = state;
  if (!limits) return "";
  const five = formatPercentUsed(limits.fiveHour?.percent ?? null);
  const week = formatPercentUsed(limits.sevenDay?.percent ?? null);
  return `。Claude 订阅额度：5小时已用 ${five}，本周已用 ${week}`;
}

export function LimitsSidebarLine({
  theme,
  state,
  width,
}: {
  theme: PluginTheme;
  state: ClaudeLimitsState | undefined;
  width: number;
}) {
  if (!state?.enabled) return null;
  const problem = problemShort(state);
  const { limits } = state;
  if (!problem && !limits) return null;
  let content;
  if (problem || !limits) {
    content = (
      <Text
        numberOfLines={1}
        style={[
          MONO_TEXT,
          {
            flex: 1,
            marginLeft: 6,
            fontSize: FONT.caption,
            color: theme.colors.foregroundMuted,
          },
        ]}
      >
        {problem}
      </Text>
    );
  } else if (width >= SIDEBAR_WIDTH_FOR_BOTH) {
    const bars = width >= SIDEBAR_WIDTH_FOR_BARS;
    content = (
      <View
        style={{
          flex: 1,
          minWidth: 0,
          flexDirection: "row",
          alignItems: "center",
          marginLeft: 6,
          gap: 10,
        }}
      >
        <SidebarWindow theme={theme} label="5h" span={limits.fiveHour} bar={bars} />
        <SidebarWindow theme={theme} label="7d" span={limits.sevenDay} bar={bars} />
      </View>
    );
  } else {
    const fiveHour = limits.fiveHour?.percent ?? -1;
    const sevenDay = limits.sevenDay?.percent ?? -1;
    const [label, span] =
      sevenDay > fiveHour ? (["7d", limits.sevenDay] as const) : (["5h", limits.fiveHour] as const);
    content = (
      <View style={{ flex: 1, minWidth: 0, flexDirection: "row", marginLeft: 6 }}>
        <SidebarWindow theme={theme} label={label} span={span} bar={false} />
      </View>
    );
  }
  const full = Math.max(limits?.fiveHour?.percent ?? 0, limits?.sevenDay?.percent ?? 0) >= 100;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", overflow: "hidden" }}>
      <Icon
        name="Gauge"
        size={13}
        color={full ? theme.colors.statusDanger : theme.colors.foregroundMuted}
      />
      {content}
    </View>
  );
}

function resetLine(span: LimitWindow | null, now: number): string {
  if (!span) return "/usage 未返回该项";
  if (span.resetsAt) {
    return `重置于 ${formatReset(span.resetsAt, now)}（${formatIn(span.resetsAt, now)}）`;
  }
  if (span.resetsText) return `重置于 ${span.resetsText}`;
  return "未显示重置时间";
}

function WindowRow({
  theme,
  label,
  span,
  now,
}: {
  theme: PluginTheme;
  label: string;
  span: LimitWindow | null;
  now: number;
}) {
  const percent = span?.percent ?? null;
  const hot = percent !== null && percent >= 70;
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={[MONO_TEXT, { flex: 1, fontSize: FONT.body, color: theme.colors.foreground }]}>
          {label}
        </Text>
        <Text
          style={[
            MONO_TEXT,
            {
              fontSize: 16,
              fontWeight: "700",
              color: hot ? limitColor(theme, percent) : theme.colors.foreground,
            },
          ]}
        >
          {span ? `已用 ${formatPercentUsed(percent)}` : "—"}
        </Text>
      </View>
      <LimitBar theme={theme} percent={percent} height={9} />
      <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
        {resetLine(span, now)}
        {percent !== null && percent >= 100 ? " | 已达上限" : ""}
      </Text>
    </View>
  );
}

function CompactWindowRow({
  theme,
  label,
  span,
  now,
}: {
  theme: PluginTheme;
  label: string;
  span: LimitWindow | null;
  now: number;
}) {
  const percent = span?.percent ?? null;
  const hot = percent !== null && percent >= 70;
  const reset = span?.resetsAt ? formatResetShort(span.resetsAt, now) : (span?.resetsText ?? "");
  return (
    <View
      accessible
      accessibilityLabel={`${label}：${span ? `已用 ${formatPercentUsed(percent)}` : "未显示"}${span ? `，${resetLine(span, now)}` : ""}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
    >
      <Text style={[MONO_TEXT, { width: 44, fontSize: FONT.body, color: theme.colors.foreground }]}>
        {label}
      </Text>
      <View style={{ flex: 1, minWidth: 24 }}>
        <LimitBar theme={theme} percent={percent} />
      </View>
      <Text
        style={[
          MONO_TEXT,
          {
            width: 34,
            textAlign: "right",
            fontSize: FONT.body,
            fontWeight: "700",
            color: hot ? limitColor(theme, percent) : theme.colors.foreground,
          },
        ]}
      >
        {formatPercentUsed(percent)}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          MONO_TEXT,
          {
            width: 72,
            textAlign: "right",
            fontSize: FONT.caption,
            color: theme.colors.foregroundMuted,
          },
        ]}
      >
        {reset}
      </Text>
    </View>
  );
}

export function LimitsRefreshButton({ theme }: { theme: PluginTheme }) {
  const { data: state } = useClaudeLimits();
  const refresh = useRefreshLimits();
  const now = useNow(30_000);
  if (!state?.enabled) return null;
  const busy = state.refreshing || refresh.isPending;
  const waitMs = state.nextManualAt !== null ? state.nextManualAt - now : 0;
  const disabled = busy || waitMs > 0;
  const label = busy
    ? "刷新中..."
    : waitMs > 0
      ? `${Math.max(1, Math.ceil(waitMs / 60_000))}分后可刷`
      : "刷新";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        waitMs > 0 && !busy
          ? `${formatIn(state.nextManualAt ?? now, now)}可刷新订阅额度`
          : "刷新订阅额度"
      }
      disabled={disabled}
      onPress={() => refresh.mutate()}
      style={({ hovered }: HoverState) => ({
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 4,
        paddingVertical: 2,
        paddingHorizontal: 7,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: hovered && !disabled ? theme.colors.surface2 : theme.colors.surface0,
        opacity: disabled ? 0.55 : 1,
      })}
    >
      <Icon name="RefreshCw" size={11} color={theme.colors.foregroundMuted} />
      <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ClaudeLimitsSection({
  theme,
  compact = false,
}: {
  theme: PluginTheme;
  compact?: boolean;
}) {
  const { data: state, error, isPending } = useClaudeLimits();
  const now = useNow(30_000);
  if (isPending || (!state && !error) || (state && !state.enabled)) return null;

  const note = (text: string, color = theme.colors.foregroundMuted) => (
    <Text style={[MONO_TEXT, { fontSize: FONT.caption, color }]}>{text}</Text>
  );
  const problem = state ? problemText(state) : null;
  const limits = state?.limits ?? null;
  const updated = state?.fetchedAt ? `更新于 ${formatAgo(state.fetchedAt, now)}` : null;
  const scope = limits?.partial
    ? "仅显示 5 小时与每周额度：当前登录方式在 /usage 中未提供其他项。"
    : "仅显示 5 小时与每周额度（与 setup-token 模式下 /usage 输出一致）。";

  return (
    <View style={{ gap: compact ? 8 : 10 }}>
      {compact ? (
        <>
          <View style={{ height: 1, backgroundColor: theme.colors.border }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={[
                MONO_TEXT,
                { flex: 1, fontSize: FONT.title, fontWeight: "700", color: theme.colors.foreground },
              ]}
            >
              ▸ Claude 订阅额度
            </Text>
            <LimitsRefreshButton theme={theme} />
          </View>
        </>
      ) : null}
      {!state
        ? note(
            `订阅额度暂不可用：${error?.message ?? "无响应"}`,
            theme.colors.statusDanger,
          )
        : null}
      {problem ? (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
          <View style={{ paddingTop: 1 }}>
            <Icon name="CircleAlert" size={12} color={theme.colors.statusWarning} />
          </View>
          <Text
            style={[MONO_TEXT, { flex: 1, fontSize: FONT.caption, color: theme.colors.statusWarning }]}
          >
            {problem}
          </Text>
        </View>
      ) : null}
      {state && !limits && !problem
        ? note(state.refreshing ? "$ 正在执行 Claude Code /usage..." : "尚未读取到订阅额度。")
        : null}
      {limits && compact ? (
        <>
          <CompactWindowRow theme={theme} label="5小时" span={limits.fiveHour} now={now} />
          <CompactWindowRow theme={theme} label="每周" span={limits.sevenDay} now={now} />
        </>
      ) : null}
      {limits && !compact ? (
        <>
          <WindowRow
            theme={theme}
            label="当前窗口（5 小时）"
            span={limits.fiveHour}
            now={now}
          />
          <WindowRow
            theme={theme}
            label="本周额度（全部模型）"
            span={limits.sevenDay}
            now={now}
          />
        </>
      ) : null}
      {limits && state?.error
        ? note(`当前展示缓存数据：${state.error}`, theme.colors.statusWarning)
        : null}
      {compact
        ? note([updated, scope].filter(Boolean).join(" | "))
        : note(
            [
              updated,
              state?.method ? `来源：守护进程主机 ${METHOD_LABEL[state.method]}。` : null,
              scope,
            ]
              .filter(Boolean)
              .join(" "),
          )}
    </View>
  );
}

/** The Details screen's single line while the feature is off. */
export function ClaudeLimitsOffNote({ theme }: { theme: PluginTheme }) {
  const { data } = useClaudeLimits();
  if (!data || data.enabled) return null;
  return (
    <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
      # Claude 订阅额度（5 小时 / 每周）默认关闭，可在插件设置中开启。
    </Text>
  );
}
