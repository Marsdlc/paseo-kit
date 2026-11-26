import type { PluginClientContext } from "@getpaseo/plugin/client";
import { ClosedAgentsPanel } from "./client/closed-panel";

export default function contribute(client: PluginClientContext) {
  client.addWorkspacePanel({
    id: "closed",
    title: "已关闭的 Agent",
    icon: "ArchiveRestore",
    context: "workspace",
    locations: ["workspace", "explorer"],
    Component: ClosedAgentsPanel,
  });
  client.addCommandCenterItem({
    id: "reopen-closed-agent",
    title: "恢复已关闭的 Agent",
    icon: "ArchiveRestore",
    keywords: ["closed", "archived", "restore", "undo", "tab", "unarchive", "关闭", "归档", "恢复", "标签"],
    context: "workspace",
    onSelect({ openPanel }) {
      openPanel("closed");
    },
  });
  return () => {};
}
