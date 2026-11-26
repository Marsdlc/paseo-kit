import type { PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";
import { sessionUsageRpc, type SessionMatch } from "../shared/usage";
import { formatCost, formatTokens } from "./format";

const PILL_ID = "session-usage";
export const SESSION_PANEL_ID = "session-usage";
const PILL_REFRESH_MS = 60_000;
const AFTER_TURN_DELAY_MS = 8_000;

function pillLabel(match: SessionMatch | undefined): {
  visible: boolean;
  label?: string;
  title?: string;
} {
  if (match?.status !== "matched" || match.session.usage.totalTokens <= 0)
    return { visible: false };
  const { usage } = match.session;
  return {
    visible: true,
    label: formatTokens(usage.totalTokens),
    title: `会话用量：${formatTokens(usage.totalTokens)} tokens，估算费用 ${formatCost(usage.cost)}`,
  };
}

interface AgentLike {
  id: string;
  workspaceId?: string | null;
  status?: string;
  archivedAt?: string | null;
}

export function contributeSessionPills(client: PluginClientContext): () => void {
  const pills = new Map<string, PluginButtonRegistration>();
  const statuses = new Map<string, string | undefined>();
  const lifetime = new AbortController();
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  const refresh = async () => {
    const agentIds = [...pills.keys()];
    if (agentIds.length === 0 || lifetime.signal.aborted) return;
    try {
      const { sessions } = await client.rpc(sessionUsageRpc, { agentIds: agentIds.slice(0, 200) });
      if (lifetime.signal.aborted) return;
      for (const match of sessions) pills.get(match.agentId)?.update(pillLabel(match));
    } catch (error) {
      if (!lifetime.signal.aborted)
        console.warn("[ccusage-stats] Session usage refresh failed", error);
    }
  };

  const scheduleRefresh = (delay: number) => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void refresh();
    }, delay);
  };

  const register = (agent: AgentLike) => {
    if (lifetime.signal.aborted || !agent.workspaceId || agent.archivedAt) return false;
    const previous = statuses.get(agent.id);
    statuses.set(agent.id, agent.status);
    if (pills.has(agent.id)) {
      if (previous === "running" && agent.status !== "running")
        scheduleRefresh(AFTER_TURN_DELAY_MS);
      return false;
    }
    const { workspaceId } = agent;
    pills.set(
      agent.id,
      client.addComposerPill({
        id: PILL_ID,
        workspaceId,
        agentId: agent.id,
        button: {
          title: "会话 Token 用量",
          icon: "Coins",
          visible: false,
          behavior: {
            kind: "action",
            onPress: () => client.openPanel(SESSION_PANEL_ID, { workspaceId, agentId: agent.id }),
          },
        },
      }),
    );
    return true;
  };

  const unregister = (agentId: string) => {
    pills.get(agentId)?.remove();
    pills.delete(agentId);
    statuses.delete(agentId);
  };

  const removeAll = () => {
    for (const pill of pills.values()) pill.remove();
    pills.clear();
    statuses.clear();
  };

  void client.paseo.agents
    .list({ subscribe: {}, signal: lifetime.signal })
    .then(({ subscription }) => {
      subscription.subscribe({
        snapshot: ({ entries }) => {
          removeAll();
          for (const { agent } of entries) register(agent);
          void refresh();
        },
        update: (message) => {
          if (message.type !== "agent_update") return;
          const update = message.payload;
          if (update.kind === "upsert") {
            if (update.agent.archivedAt) unregister(update.agent.id);
            else if (register(update.agent)) scheduleRefresh(1_000);
            return;
          }
          unregister(update.agentId);
        },
      });
      return undefined;
    })
    .catch((error) => {
      if (!lifetime.signal.aborted)
        console.error("[ccusage-stats] Agent observation failed", error);
    });

  const interval = setInterval(() => void refresh(), PILL_REFRESH_MS);

  return () => {
    lifetime.abort();
    clearInterval(interval);
    if (refreshTimer) clearTimeout(refreshTimer);
    removeAll();
  };
}
