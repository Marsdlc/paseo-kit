import type { PluginTheme } from "@getpaseo/plugin";
import { useAgent, useRpc, type PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { FlatList, Icon, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { closedAgentsRpc, restoreAgentRpc, type ClosedAgent } from "../shared/agents";
import { MONO_TEXT } from "./terminal";

const REFRESH_MS = 5_000;
const OPEN_TIMEOUT_MS = 15_000;

type Navigation = NonNullable<PluginWorkspacePanelProps["navigation"]>;

export function ClosedAgentsPanel({ theme, layout, workspaceId, navigation }: PluginWorkspacePanelProps) {
  const listClosed = useRpc(closedAgentsRpc);
  const restore = useRpc(restoreAgentRpc);
  const toast = useToast();
  const closed = useQuery({
    queryKey: ["closed-agents", workspaceId],
    queryFn: () => listClosed({ workspaceId }),
    refetchInterval: REFRESH_MS,
  });
  const [restoring, setRestoring] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  async function reopen(agent: ClosedAgent) {
    if (restoring) return;
    setRestoring(agent.id);
    try {
      await restore({ workspaceId, agentId: agent.id });
      setOpening(agent.id);
      void closed.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setRestoring(null);
    }
  }

  const padding = layout.compact ? 12 : 16;
  const muted = theme.colors.foregroundMuted;
  const agents = closed.data?.agents ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface0 }}>
      <View
        style={{
          gap: 3,
          padding,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.surface1,
        }}
      >
        <Text style={[MONO_TEXT, { color: theme.colors.foreground, fontSize: 13, fontWeight: "700" }]}>
          <Text style={{ color: theme.colors.accent }}>$ </Text>已关闭的 Agent [{agents.length}]
        </Text>
        <Text style={[MONO_TEXT, { color: muted, fontSize: 11 }]}>
          关闭 Agent 标签页会将其归档。点击「恢复」可重新打开标签页并保留完整对话历史。
        </Text>
      </View>
      {closed.isError ? (
        <Empty theme={theme} icon="TriangleAlert" text={String(closed.error)} />
      ) : !closed.data ? (
        <Empty theme={theme} loading text="$ 正在加载已归档列表..." />
      ) : agents.length === 0 ? (
        <Empty theme={theme} icon="ArchiveRestore" text="# 当前工作区没有已关闭的 Agent。" />
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(agent) => agent.id}
          contentContainerStyle={{ padding, gap: 6, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <AgentRow
              theme={theme}
              compact={layout.compact}
              agent={item}
              busy={restoring === item.id}
              disabled={restoring !== null && restoring !== item.id}
              onReopen={() => void reopen(item)}
            />
          )}
        />
      )}
      {opening ? (
        <OpenWhenRunning
          key={opening}
          agentId={opening}
          navigation={navigation}
          onDone={(opened) => {
            setOpening(null);
            if (!opened) toast.show("Agent 已恢复，请从侧边栏打开。", { variant: "success" });
          }}
        />
      ) : null}
    </View>
  );
}

function OpenWhenRunning({
  agentId,
  navigation,
  onDone,
}: {
  agentId: string;
  navigation: Navigation | undefined;
  onDone(opened: boolean): void;
}) {
  const status = useAgent(agentId, (agent) => ({ status: agent.status }))?.status ?? null;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const timer = setTimeout(() => done.current(false), OPEN_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!navigation) {
      done.current(false);
    } else if (status && status !== "closed") {
      navigation.openAgent({ agentId });
      done.current(true);
    }
  }, [status, navigation, agentId]);
  return null;
}

function AgentRow({
  theme,
  compact,
  agent,
  busy,
  disabled,
  onReopen,
}: {
  theme: PluginTheme;
  compact: boolean;
  agent: ClosedAgent;
  busy: boolean;
  disabled: boolean;
  onReopen(): void;
}) {
  const muted = theme.colors.foregroundMuted;
  const model = agent.model ? `${agent.provider} | ${agent.model}` : agent.provider;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`恢复 ${agent.title ?? "未命名 Agent"}`}
      disabled={busy || disabled}
      onPress={onReopen}
      style={(state) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: compact ? 10 : 12,
        paddingVertical: 10,
        borderRadius: 2,
        borderWidth: 1,
        borderColor:
          (state as { hovered?: boolean }).hovered || state.pressed ? theme.colors.accent : theme.colors.border,
        opacity: disabled ? 0.5 : 1,
        backgroundColor:
          (state as { hovered?: boolean }).hovered || state.pressed ? theme.colors.surface2 : theme.colors.surface1,
      })}
    >
      <Text style={[MONO_TEXT, { color: theme.colors.accent, fontSize: 12, fontWeight: "700" }]}>▸</Text>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={[MONO_TEXT, { color: theme.colors.foreground, fontSize: 12, fontWeight: "700" }]}>
          {agent.title ?? "未命名 Agent"}
        </Text>
        <Text numberOfLines={1} style={[MONO_TEXT, { color: muted, fontSize: 11 }]}>
          关闭于 {formatAgo(Date.parse(agent.archivedAt))} | {model}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={theme.colors.accent} />
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface0,
          }}
        >
          <Icon name="RotateCcw" size={13} color={theme.colors.accent} />
          {compact ? null : (
            <Text style={[MONO_TEXT, { color: theme.colors.foreground, fontSize: 11 }]}>恢复</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

function Empty({ theme, text, icon, loading }: { theme: PluginTheme; text: string; icon?: string; loading?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 }}>
      {loading ? <ActivityIndicator color={theme.colors.foregroundMuted} /> : null}
      {icon ? <Icon name={icon} size={22} color={theme.colors.foregroundMuted} /> : null}
      <Text selectable style={[MONO_TEXT, { color: theme.colors.foregroundMuted, fontSize: 12, textAlign: "center", maxWidth: 380 }]}>
        {text}
      </Text>
    </View>
  );
}

function formatAgo(timeMs: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timeMs) / 1000));
  if (seconds < 60) return "刚刚";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(timeMs).toLocaleDateString("zh-CN");
}
