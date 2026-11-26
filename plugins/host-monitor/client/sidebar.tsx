import type { PluginTheme, RpcOutput } from "@getpaseo/plugin";
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
import type { hostStatsRpc } from "../shared/stats";
import { formatBytes, formatCompactRate, formatPercent, formatRate, formatUptime } from "./format";
import {
  Meter,
  Sparkline,
  diskPercent,
  loadColor,
  memoryPercent,
  memorySeverity,
  percentSeverity,
  scaleToPeak,
  severityColor,
  sumDisks,
  useHostStats,
  type Severity,
} from "./stats";
import { MONO_TEXT } from "./terminal";

// Compact terminal status-bar geometry.
const ICON_SIZE = 13;
const FONT_SIZE = 11;
const ICON_GAP = 5;
const METRIC_GAP = 9;
const MIN_METER_WIDTH = 16;
const METER_GAP = 4;
const METER_HEIGHT = 7;
// Between the download and upload numbers that share one icon.
const PAIR_SEPARATOR = "/";
const PAIR_SEPARATOR_WIDTH = 7;

type HostStats = RpcOutput<typeof hostStatsRpc>;

type MetricKey = "cpu" | "memory" | "disk" | "network";

/** Which metrics fit, and whether the percentages get meters. */
interface LineLayout {
  shown: readonly Metric[];
  meters: boolean;
}

interface Metric {
  key: MetricKey;
  icon: string;
  /** One number, or two (download and upload) sharing the icon. */
  texts: readonly string[];
  percent?: number;
  /** Sets the color of a metric with a percent. */
  severity?: Severity;
}

const PRESSURE_LABEL: Record<Severity, string> = {
  normal: "正常",
  warning: "偏高",
  critical: "紧缺",
};

// On a narrow sidebar, network goes first, then disk; CPU and RAM always stay.
const DROP_ORDER: readonly MetricKey[] = ["network", "disk"];

function metricsOf(stats: HostStats): Metric[] {
  const { current, memory, network, disks } = stats;
  const ram = memoryPercent(memory);
  const metrics: Metric[] = [
    {
      key: "cpu",
      icon: "Cpu",
      texts: [formatPercent(current.cpuPercent)],
      percent: current.cpuPercent,
      severity: percentSeverity(current.cpuPercent),
    },
    {
      key: "memory",
      icon: "MemoryStick",
      texts: [formatPercent(ram)],
      percent: ram,
      severity: memorySeverity(memory),
    },
  ];
  if (disks.length > 0) {
    const { percent } = sumDisks(disks);
    metrics.push({
      key: "disk",
      icon: "HardDrive",
      texts: [formatPercent(percent)],
      percent,
      severity: percentSeverity(percent),
    });
  }
  if (network) {
    metrics.push({
      key: "network",
      icon: "ArrowDownUp",
      texts: [formatCompactRate(current.rxBytesPerSec), formatCompactRate(current.txBytesPerSec)],
    });
  }
  return metrics;
}

// The widest text a slot can hold: rounded percents top out at 100%, compact rates at 4 characters.
const SLOT_TEMPLATES = ["100%", "888K", "8.8M"];
// Used until the templates are measured.
const ESTIMATED_SLOT_WIDTH = FONT_SIZE * 2.6;
const TEXT_GAP = 4;

function MetricLine({
  theme,
  layout,
  slotWidth,
}: {
  theme: PluginTheme;
  layout: LineLayout;
  slotWidth: number;
}) {
  return layout.shown.map((metric, index) => {
    const metered = layout.meters && metric.percent !== undefined;
    const valueColor =
      metric.severity !== undefined && metric.severity !== "normal"
        ? severityColor(theme, metric.severity)
        : theme.colors.foreground;
    const textStyle = [MONO_TEXT, { color: valueColor, fontSize: FONT_SIZE }];
    const [first, second] = metric.texts;
    return (
      <View
        key={metric.key}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginLeft: index === 0 ? 0 : METRIC_GAP,
          flexGrow: metered ? 1 : 0,
          flexShrink: metered ? 1 : 0,
        }}
      >
        <Icon name={metric.icon} size={ICON_SIZE} color={theme.colors.foregroundMuted} />
        {metered ? (
          <Meter
            theme={theme}
            percent={metric.percent ?? 0}
            severity={metric.severity}
            height={METER_HEIGHT}
            style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: MIN_METER_WIDTH, marginLeft: ICON_GAP }}
          />
        ) : null}
        <Text
          numberOfLines={1}
          style={[textStyle, { width: slotWidth, marginLeft: metered ? METER_GAP : TEXT_GAP, textAlign: "right" }]}
        >
          {first}
        </Text>
        {second !== undefined ? (
          <>
            <Text
              style={[
                MONO_TEXT,
                {
                  width: PAIR_SEPARATOR_WIDTH,
                  textAlign: "center",
                  color: theme.colors.foregroundMuted,
                  fontSize: FONT_SIZE,
                },
              ]}
            >
              {PAIR_SEPARATOR}
            </Text>
            <Text numberOfLines={1} style={[textStyle, { width: slotWidth, textAlign: "left" }]}>
              {second}
            </Text>
          </>
        ) : null}
      </View>
    );
  });
}

/** Width of a meterless line; depends only on fixed sizes, never on values. */
function lineWidth(metrics: readonly Metric[], slotWidth: number): number {
  let width = Math.max(metrics.length - 1, 0) * METRIC_GAP;
  for (const { texts } of metrics) {
    width += ICON_SIZE + TEXT_GAP + texts.length * slotWidth + (texts.length - 1) * PAIR_SEPARATOR_WIDTH;
  }
  return width;
}

/** Meters when everything fits, else plain numbers; when neither fits, drop a metric and retry. */
function chooseLayout(available: number | null, metrics: readonly Metric[], slotWidth: number): LineLayout {
  let shown = metrics;
  if (available === null) return { shown, meters: false };
  for (const drop of [...DROP_ORDER, null]) {
    const plain = lineWidth(shown, slotWidth);
    const meterCount = shown.filter((m) => m.percent !== undefined).length;
    if (plain + meterCount * (ICON_GAP + MIN_METER_WIDTH + METER_GAP - TEXT_GAP) <= available) {
      return { shown, meters: true };
    }
    if (plain <= available || drop === null) return { shown, meters: false };
    shown = shown.filter((m) => m.key !== drop);
  }
  return { shown, meters: false };
}

function triggerStyle(theme: PluginTheme) {
  return ({ hovered }: PressableStateCallbackType & { hovered?: boolean }) => ({
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

function describe(stats: HostStats): string {
  const { current, memory, network, disks } = stats;
  const parts = [
    `CPU ${formatPercent(current.cpuPercent)}`,
    `内存 ${formatPercent(memoryPercent(memory))}`,
  ];
  if (memory.pressure) parts.push(`内存压力 ${PRESSURE_LABEL[memory.pressure]}`);
  if (disks.length > 0) parts.push(`磁盘 ${formatPercent(sumDisks(disks).percent)}`);
  if (network) {
    parts.push(
      `下载 ${formatRate(current.rxBytesPerSec)}`,
      `上传 ${formatRate(current.txBytesPerSec)}`,
    );
  }
  return `主机状态：${parts.join("，")}`;
}

function layoutWidth(event: LayoutChangeEvent): number {
  return event.nativeEvent.layout.width;
}

export function HostStatusItem({ theme, openPopover }: PluginSidebarItemProps) {
  const { data } = useHostStats();
  const [available, setAvailable] = useState<number | null>(null);
  const [measuredSlot, setMeasuredSlot] = useState<number | null>(null);
  const onAvailable = useCallback((e: LayoutChangeEvent) => setAvailable(layoutWidth(e)), []);
  const onTemplate = useCallback((e: LayoutChangeEvent) => {
    const width = Math.ceil(layoutWidth(e));
    setMeasuredSlot((current) => Math.max(current ?? 0, width));
  }, []);

  if (!data) return null;
  const metrics = metricsOf(data);
  const slotWidth = measuredSlot ?? ESTIMATED_SLOT_WIDTH;
  const layout = chooseLayout(available, metrics, slotWidth);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={describe(data)}
      onPress={() => openPopover(HostPopover)}
      style={triggerStyle(theme)}
    >
      <View
        style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", overflow: "hidden" }}
        onLayout={onAvailable}
      >
        <MetricLine theme={theme} layout={layout} slotWidth={slotWidth} />
      </View>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: "absolute", top: 0, left: 0, width: 10_000, opacity: 0 }}
      >
        {SLOT_TEMPLATES.map((template) => (
          <Text
            key={template}
            onLayout={onTemplate}
            style={[MONO_TEXT, { alignSelf: "flex-start", fontSize: FONT_SIZE }]}
          >
            {template}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}

interface PreviewRowProps {
  theme: PluginTheme;
  icon: string;
  label: string;
  value: string;
  color: string;
  values: readonly number[];
  /** A muted line under the label. */
  detail?: string;
}

function PreviewRow({ theme, icon, label, value, color, values, detail }: PreviewRowProps) {
  return (
    <View
      style={{
        gap: 5,
        padding: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 2,
        backgroundColor: theme.colors.surface0,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: ICON_GAP }}>
        <Icon name={icon} size={ICON_SIZE} color={color} />
        <Text style={[MONO_TEXT, { flex: 1, color: theme.colors.foregroundMuted, fontSize: FONT_SIZE }]}>
          {label}
        </Text>
        <Text style={[MONO_TEXT, { color: theme.colors.foreground, fontSize: FONT_SIZE, fontWeight: "700" }]}>
          {value}
        </Text>
      </View>
      {detail ? <Caption theme={theme} text={detail} /> : null}
      <Sparkline
        values={values}
        color={color}
        height={18}
        borderColor={theme.colors.border}
        backgroundColor={theme.colors.surface1}
      />
    </View>
  );
}

function Caption({ theme, text }: { theme: PluginTheme; text: string }) {
  return (
    <Text
      style={[
        MONO_TEXT,
        { paddingLeft: ICON_SIZE + ICON_GAP, color: theme.colors.foregroundMuted, fontSize: FONT_SIZE - 1 },
      ]}
    >
      {text}
    </Text>
  );
}

/** macOS: what the RAM figure leaves out, and the pressure that colors it. */
function memoryDetail(memory: HostStats["memory"]): string | undefined {
  const parts: string[] = [];
  if (memory.cachedBytes !== null) parts.push(`文件缓存 ${formatBytes(memory.cachedBytes)}`);
  if (memory.pressure !== null) parts.push(`压力 ${PRESSURE_LABEL[memory.pressure]}`);
  return parts.length > 0 ? parts.join(" | ") : undefined;
}

function DiskSection({ theme, disks }: { theme: PluginTheme; disks: HostStats["disks"] }) {
  const total = sumDisks(disks);
  return (
    <View
      style={{
        gap: 6,
        padding: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 2,
        backgroundColor: theme.colors.surface0,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: ICON_GAP }}>
        <Icon name="HardDrive" size={ICON_SIZE} color={loadColor(theme, total.percent)} />
        <Text style={[MONO_TEXT, { flex: 1, color: theme.colors.foregroundMuted, fontSize: FONT_SIZE }]}>
          磁盘 | {formatBytes(total.usedBytes)} / {formatBytes(total.totalBytes)}
        </Text>
        <Text style={[MONO_TEXT, { color: theme.colors.foreground, fontSize: FONT_SIZE, fontWeight: "700" }]}>
          {formatPercent(total.percent)}
        </Text>
      </View>
      {disks.some((disk) => disk.fsType === "apfs") ? (
        <Caption theme={theme} text="APFS 容器：包含共享该容器的所有宗卷" />
      ) : null}
      {disks.length === 1 ? <Meter theme={theme} percent={total.percent} height={METER_HEIGHT} /> : null}
      {disks.length > 1
        ? disks.map((disk) => {
            const percent = diskPercent(disk);
            return (
              <View key={disk.mount} style={{ gap: 3, paddingLeft: ICON_SIZE + ICON_GAP }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: ICON_GAP }}>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="middle"
                    style={[MONO_TEXT, { flex: 1, color: theme.colors.foreground, fontSize: FONT_SIZE - 1 }]}
                  >
                    {disk.mount}
                  </Text>
                  <Text style={[MONO_TEXT, { color: theme.colors.foregroundMuted, fontSize: FONT_SIZE - 1 }]}>
                    {formatBytes(disk.usedBytes)} / {formatBytes(disk.totalBytes)} |{" "}
                    <Text style={{ color: percent >= 70 ? loadColor(theme, percent) : theme.colors.foreground }}>
                      {formatPercent(percent)}
                    </Text>
                  </Text>
                </View>
                <Meter theme={theme} percent={percent} height={METER_HEIGHT - 1} />
              </View>
            );
          })
        : null}
    </View>
  );
}

function HostPopover({ theme, layout }: PluginPopoverProps) {
  const { data } = useHostStats();
  const rootStyle = {
    gap: 8,
    padding: layout.compact ? 14 : 10,
    minWidth: 272,
    backgroundColor: theme.colors.surface1,
  };
  if (!data) {
    return (
      <View style={rootStyle}>
        <Text style={[MONO_TEXT, { color: theme.colors.foregroundMuted, fontSize: FONT_SIZE }]}>
          $ 正在读取主机状态...
        </Text>
      </View>
    );
  }

  const { current, history, memory, network, disks } = data;

  return (
    <View style={rootStyle}>
      <View
        style={{
          gap: 3,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[MONO_TEXT, { color: theme.colors.accent, fontSize: FONT_SIZE + 1, fontWeight: "700" }]}>
            ❯
          </Text>
          <Text
            numberOfLines={1}
            style={[MONO_TEXT, { flex: 1, color: theme.colors.foreground, fontSize: FONT_SIZE + 1, fontWeight: "700" }]}
          >
            {data.hostname}
          </Text>
          <View
            style={{
              paddingHorizontal: 5,
              paddingVertical: 1,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 2,
              backgroundColor: theme.colors.surface0,
            }}
          >
            <Text style={[MONO_TEXT, { color: theme.colors.statusSuccess, fontSize: FONT_SIZE - 2, fontWeight: "700" }]}>
              ONLINE
            </Text>
          </View>
        </View>
        <Text style={[MONO_TEXT, { color: theme.colors.foregroundMuted, fontSize: FONT_SIZE - 1 }]}>
          运行 {formatUptime(data.uptimeSeconds)} | 负载{" "}
          {data.loadAverage.map((n) => n.toFixed(2)).join(" ")}
        </Text>
      </View>
      <PreviewRow
        theme={theme}
        icon="Cpu"
        label={`CPU | ${data.cpuCount} 核`}
        value={formatPercent(current.cpuPercent)}
        color={loadColor(theme, current.cpuPercent)}
        values={history.map((s) => s.cpuPercent)}
      />
      <PreviewRow
        theme={theme}
        icon="MemoryStick"
        label={`内存 | ${formatBytes(memory.usedBytes)} / ${formatBytes(memory.totalBytes)}`}
        value={formatPercent(memoryPercent(memory))}
        color={severityColor(theme, memorySeverity(memory))}
        values={history.map((s) => s.memoryPercent)}
        detail={memoryDetail(memory)}
      />
      {network ? (
        <>
          <PreviewRow
            theme={theme}
            icon="ArrowDown"
            label="下载速率 (RX)"
            value={formatRate(current.rxBytesPerSec)}
            color={theme.colors.accent}
            values={scaleToPeak(history, (s) => s.rxBytesPerSec)}
          />
          <PreviewRow
            theme={theme}
            icon="ArrowUp"
            label="上传速率 (TX)"
            value={formatRate(current.txBytesPerSec)}
            color={theme.colors.accent}
            values={scaleToPeak(history, (s) => s.txBytesPerSec)}
          />
        </>
      ) : null}
      {disks.length > 0 ? <DiskSection theme={theme} disks={disks} /> : null}
    </View>
  );
}
