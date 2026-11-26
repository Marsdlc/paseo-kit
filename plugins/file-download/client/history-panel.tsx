import type { PluginTheme } from "@getpaseo/plugin";
import { useWorkspace, type PluginClientContext, type PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { copyText, FlatList, Icon, useToast } from "@getpaseo/plugin/client/react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import {
  clearFinishedRecords,
  downloadFile,
  removeRecord,
  useDownloadRecords,
  type DownloadRecord,
} from "./downloads";
import { formatAgo, formatBytes, formatPercent } from "./format";
import { MONO_TEXT } from "./terminal";
import { SAVE_SHORTCUT } from "./web";

type Rpc = PluginClientContext["rpc"];

/** The downloads started in this window, newest first. */
export function createHistoryPanel(rpc: Rpc) {
  return function HistoryPanel({ theme, layout }: PluginWorkspacePanelProps) {
    const records = useDownloadRecords();
    const padding = layout.compact ? 12 : 16;
    const muted = theme.colors.foregroundMuted;
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface0 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            padding,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.surface1,
          }}
        >
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[MONO_TEXT, { color: theme.colors.foreground, fontSize: 13, fontWeight: "700" }]}>
              <Text style={{ color: theme.colors.accent }}>$ </Text>下载记录 [{records.length}]
            </Text>
            <Text style={[MONO_TEXT, { color: muted, fontSize: 11 }]}>
              本页加载以来通过 {SAVE_SHORTCUT} 或「下载当前文件」保存的文件，刷新页面后清空。
            </Text>
          </View>
          {records.some((record) => record.status !== "downloading") ? (
            <Pressable
              accessibilityRole="button"
              onPress={clearFinishedRecords}
              style={(state) => ({
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 2,
                borderWidth: 1,
                borderColor: (state as { hovered?: boolean }).hovered ? theme.colors.accent : theme.colors.border,
                backgroundColor: (state as { hovered?: boolean }).hovered ? theme.colors.surface2 : theme.colors.surface0,
              })}
            >
              <Text style={[MONO_TEXT, { color: theme.colors.foreground, fontSize: 11 }]}>[ 清空 ]</Text>
            </Pressable>
          ) : null}
        </View>
        {records.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 }}>
            <Icon name="Download" size={22} color={muted} />
            <Text style={[MONO_TEXT, { color: muted, fontSize: 12, textAlign: "center", maxWidth: 380 }]}>
              # 暂无下载记录。打开任意文件预览后按 {SAVE_SHORTCUT} 即可下载。
            </Text>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(record) => record.id}
            contentContainerStyle={{ padding, gap: 6, paddingBottom: 24 }}
            renderItem={({ item }) => <RecordRow theme={theme} compact={layout.compact} record={item} rpc={rpc} />}
          />
        )}
      </View>
    );
  };
}

function RecordRow({
  theme,
  compact,
  record,
  rpc,
}: {
  theme: PluginTheme;
  compact: boolean;
  record: DownloadRecord;
  rpc: Rpc;
}) {
  const toast = useToast();
  const workspaceName = useWorkspace(record.workspaceId, (workspace) => ({ name: workspace.title ?? workspace.name }))?.name;
  const muted = theme.colors.foregroundMuted;
  const directory = record.path.includes("/") ? record.path.slice(0, record.path.lastIndexOf("/")) || "/" : "";
  const status =
    record.status === "downloading"
      ? record.total > 0
        ? `下载中 ${formatPercent(record.received, record.total)} · ${formatBytes(record.total)}`
        : "准备中..."
      : record.status === "failed"
        ? `失败：${record.error ?? "未知错误"}`
        : `${formatBytes(record.total)} | ${formatAgo(record.startedAt)}`;
  const badgeColor =
    record.status === "failed"
      ? theme.colors.statusDanger
      : record.status === "done"
        ? theme.colors.statusSuccess
        : theme.colors.accent;
  const badgeLabel = record.status === "failed" ? "ERR" : record.status === "done" ? "OK" : "DL";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: compact ? 10 : 12,
        paddingVertical: 9,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
      }}
    >
      {record.status === "downloading" ? (
        <ActivityIndicator size="small" color={theme.colors.accent} />
      ) : (
        <View
          style={{
            minWidth: 32,
            paddingHorizontal: 5,
            paddingVertical: 2,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: badgeColor,
            backgroundColor: theme.colors.surface0,
            alignItems: "center",
          }}
        >
          <Text style={[MONO_TEXT, { color: badgeColor, fontSize: 10, fontWeight: "700" }]}>
            {badgeLabel}
          </Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={[MONO_TEXT, { color: theme.colors.foreground, fontSize: 12, fontWeight: "700" }]}>
          {record.name}
        </Text>
        <Text numberOfLines={1} style={[MONO_TEXT, { color: muted, fontSize: 11 }]}>
          {[directory, workspaceName].filter(Boolean).join(" | ")}
        </Text>
        <Text
          numberOfLines={2}
          selectable
          style={[MONO_TEXT, { color: record.status === "failed" ? theme.colors.statusDanger : muted, fontSize: 11 }]}
        >
          {status}
        </Text>
      </View>
      <RowButton
        theme={theme}
        icon="RotateCcw"
        label={`重新下载 ${record.name}`}
        disabled={record.status === "downloading"}
        onPress={() => void downloadFile(rpc, record.workspaceId, record.path)}
      />
      <RowButton
        theme={theme}
        icon="Copy"
        label={`复制 ${record.name} 的路径`}
        onPress={() => {
          copyText(record.path).then(
            () => toast.show("已复制路径", { variant: "success" }),
            () => toast.error("无法复制路径。"),
          );
        }}
      />
      <RowButton
        theme={theme}
        icon="X"
        label={`从列表移除 ${record.name}`}
        disabled={record.status === "downloading"}
        onPress={() => removeRecord(record.id)}
      />
    </View>
  );
}

function RowButton({
  theme,
  icon,
  label,
  onPress,
  disabled,
}: {
  theme: PluginTheme;
  icon: string;
  label: string;
  onPress(): void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={(state) => ({
        padding: 6,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: (state as { hovered?: boolean }).hovered || state.pressed ? theme.colors.border : "transparent",
        opacity: disabled ? 0.4 : 1,
        backgroundColor: (state as { hovered?: boolean }).hovered || state.pressed ? theme.colors.surface2 : "transparent",
      })}
    >
      <Icon name={icon} size={15} color={theme.colors.foregroundMuted} />
    </Pressable>
  );
}
