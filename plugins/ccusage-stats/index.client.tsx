import type { PluginClientContext } from "@getpaseo/plugin/client";
import { UsageScreen } from "./client/screen";
import { contributeSessionPills, SESSION_PANEL_ID } from "./client/session";
import { SessionUsagePanel } from "./client/session-panel";
import { SettingsScreen } from "./client/settings-screen";
import { UsageSidebarItem } from "./client/sidebar";

export default function contribute(client: PluginClientContext) {
  client.addScreen({ id: "usage", title: "Token 用量", Component: UsageScreen });
  client.addSidebarFooterItem({
    id: "usage-today",
    title: "Token 用量",
    Component: UsageSidebarItem,
  });
  client.addSettingsScreen({
    id: "settings",
    title: "Token 用量",
    icon: "Coins",
    Component: SettingsScreen,
  });
  client.addWorkspacePanel({
    id: SESSION_PANEL_ID,
    title: "会话用量",
    icon: "Coins",
    context: "agent",
    locations: ["workspace", "explorer"],
    Component: SessionUsagePanel,
  });
  client.addCommandCenterItem({
    id: "open-session-usage",
    title: "打开当前会话用量",
    icon: "Coins",
    keywords: ["ccusage", "tokens", "cost", "session", "subagents", "用量", "会话", "费用"],
    context: "agent",
    onSelect({ openPanel }) {
      openPanel(SESSION_PANEL_ID);
    },
  });
  client.addCommandCenterItem({
    id: "open-usage",
    title: "打开 Token 用量面板",
    icon: "Coins",
    keywords: ["ccusage", "tokens", "cost", "spend", "用量", "统计", "费用"],
    context: "global",
    onSelect({ openScreen }) {
      openScreen({ screenId: "usage" });
    },
  });
  return contributeSessionPills(client);
}
