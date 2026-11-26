import type { PluginClientContext } from "@getpaseo/plugin/client";
import { useSyncExternalStore } from "react";
import { closeRpc, hostRpc, openRpc, readRpc } from "../shared/download";
import { base64ToBytes, readFocusedTab, saveFile } from "./web";

type Rpc = PluginClientContext["rpc"];

export interface DownloadRecord {
  id: string;
  /** As the file tab holds it; the daemon resolves it against the workspace. */
  path: string;
  name: string;
  workspaceId: string;
  startedAt: number;
  status: "downloading" | "done" | "failed";
  received: number;
  total: number;
  error: string | null;
}

export interface Notice {
  message: string;
  variant: "info" | "success" | "error";
}

// History lives in this page's memory only: a reload starts it over.
let records: readonly DownloadRecord[] = [];
const recordListeners = new Set<() => void>();
const noticeListeners = new Set<(notice: Notice) => void>();
let nextId = 1;

function setRecords(next: readonly DownloadRecord[]): void {
  records = next;
  for (const listener of recordListeners) listener();
}

function updateRecord(id: string, patch: Partial<DownloadRecord>): void {
  setRecords(records.map((record) => (record.id === id ? { ...record, ...patch } : record)));
}

export function useDownloadRecords(): readonly DownloadRecord[] {
  return useSyncExternalStore(
    (listener) => {
      recordListeners.add(listener);
      return () => recordListeners.delete(listener);
    },
    () => records,
  );
}

export function removeRecord(id: string): void {
  setRecords(records.filter((record) => record.id !== id));
}

export function clearFinishedRecords(): void {
  setRecords(records.filter((record) => record.status === "downloading"));
}

/** Shows a toast through the mounted notice host, if any; see NoticeHost. */
export function notify(notice: Notice): void {
  for (const listener of noticeListeners) listener(notice);
}

export function subscribeNotices(listener: (notice: Notice) => void): () => void {
  noticeListeners.add(listener);
  return () => noticeListeners.delete(listener);
}

export const NOT_A_FILE = "当前标签页不是文件，请先打开一个文件预览。";

/** Downloads the given file tab path in chunks and records it in the history. */
export async function downloadFile(rpc: Rpc, workspaceId: string, path: string): Promise<void> {
  const id = String(nextId++);
  const name = path.split("/").filter(Boolean).at(-1) ?? path;
  setRecords([
    { id, path, name, workspaceId, startedAt: Date.now(), status: "downloading", received: 0, total: 0, error: null },
    ...records,
  ]);
  notify({ message: `正在下载 ${name}`, variant: "info" });
  let transferId: string | null = null;
  try {
    const transfer = await rpc(openRpc, { workspaceId, path });
    transferId = transfer.transferId;
    updateRecord(id, { total: transfer.size });
    const parts: Uint8Array[] = [];
    let offset = 0;
    while (offset < transfer.size) {
      const chunk = await rpc(readRpc, { transferId, offset });
      parts.push(base64ToBytes(chunk.base64));
      offset = chunk.nextOffset;
      updateRecord(id, { received: offset });
      if (chunk.done) break;
    }
    saveFile(parts, transfer.name);
    updateRecord(id, { status: "done", received: transfer.size });
    notify({ message: `已下载 ${name}`, variant: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateRecord(id, { status: "failed", error: message });
    notify({ message: `下载失败 ${name}：${message}`, variant: "error" });
  } finally {
    if (transferId) void rpc(closeRpc, { transferId }).catch(() => undefined);
  }
}

export function createHostCheck(rpc: Rpc): (serverId: string) => boolean {
  let own: string | null = null;
  void rpc(hostRpc, {})
    .then((result) => {
      own = result.serverId;
      return undefined;
    })
    .catch(() => undefined);
  return (serverId) => own === null || own === serverId;
}

export function downloadFocusedFile(rpc: Rpc, ownsServer: (serverId: string) => boolean): boolean {
  const focused = readFocusedTab();
  if (!focused || !ownsServer(focused.serverId)) return false;
  if (focused.filePath) void downloadFile(rpc, focused.workspaceId, focused.filePath);
  return true;
}
