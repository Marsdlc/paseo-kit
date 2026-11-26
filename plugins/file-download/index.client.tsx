import type { PluginClientContext } from "@getpaseo/plugin/client";
import { createHostCheck, downloadFile, downloadFocusedFile, NOT_A_FILE } from "./client/downloads";
import { createHistoryPanel } from "./client/history-panel";
import { NoticeHost } from "./client/notice-host";
import { listenForSaveShortcut, readFocusedTab } from "./client/web";

export default function contribute(client: PluginClientContext) {
  const ownsServer = createHostCheck(client.rpc);

  client.addCommandCenterItem({
    id: "download-current-file",
    title: "下载当前文件",
    icon: "Download",
    keywords: ["download", "save", "file", "export", "下载", "保存", "文件", "导出"],
    context: "workspace",
    onSelect() {
      const focused = readFocusedTab();
      // Paseo shows a thrown error as a toast.
      if (!focused?.filePath) throw new Error(NOT_A_FILE);
      void downloadFile(client.rpc, focused.workspaceId, focused.filePath);
    },
  });
  client.addCommandCenterItem({
    id: "open-downloads",
    title: "打开下载记录",
    icon: "FolderDown",
    keywords: ["download", "history", "files", "下载", "历史", "记录"],
    context: "workspace",
    onSelect({ openPanel }) {
      openPanel("downloads");
    },
  });
  client.addWorkspacePanel({
    id: "downloads",
    title: "下载记录",
    icon: "FolderDown",
    context: "workspace",
    locations: ["workspace", "explorer"],
    Component: createHistoryPanel(client.rpc),
  });
  client.addSidebarFooterItem({ id: "notices", title: "下载通知", Component: NoticeHost });

  return listenForSaveShortcut((event) => {
    if (downloadFocusedFile(client.rpc, ownsServer)) event.preventDefault();
  });
}
