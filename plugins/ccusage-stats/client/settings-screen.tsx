import { useSettings, type PluginSurfaceProps } from "@getpaseo/plugin/client";
import {
  SettingsAction,
  SettingsCard,
  SettingsInput,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  SettingsSwitch,
} from "@getpaseo/plugin/client/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import {
  MIN_REFRESH_OPTIONS,
  settingsDefinition,
  type ClaudeLimitsSettings,
  type ClaudeLimitsState,
} from "../shared/limits";
import { formatAgo } from "./format";
import { LIMITS_QUERY_KEY, useClaudeLimits } from "./limits";
import { MONO_TEXT } from "./terminal";

function statusHint(state: ClaudeLimitsState | undefined): string {
  if (!state?.enabled) return "开启订阅额度后显示状态。";
  if (state.missingClaude) return "本机未找到 Claude Code (claude)。";
  if (state.refreshing && !state.fetchedAt) return "正在执行 /usage...";
  const how =
    state.method === "headless"
      ? "通过 claude -p /usage 读取。"
      : state.method === "interactive"
        ? "通过交互式 Claude Code 会话 /usage 读取。"
        : "";
  const last = state.error
    ? ` 上次执行失败：${state.error}`
    : state.fetchedAt
      ? ` 更新于 ${formatAgo(state.fetchedAt)}。`
      : "";
  return `${how}${last}`.trim() || "尚未读取。";
}

export function SettingsScreen({ theme }: PluginSurfaceProps) {
  const settings = useSettings(settingsDefinition);
  const limits = useClaudeLimits();
  const queryClient = useQueryClient();
  const [claudePath, setClaudePath] = useState<string | null>(null);

  if (settings.status !== "ready") {
    return (
      <Text style={[MONO_TEXT, { color: theme.colors.foregroundMuted }]}>
        {settings.status === "loading" ? "$ 正在加载设置..." : settings.error}
      </Text>
    );
  }
  const values = settings.values;
  const current = values.claudeLimits;
  const save = (patch: Partial<ClaudeLimitsSettings>) =>
    void settings
      .save({ ...values, claudeLimits: { ...current, ...patch } }, settings.revision)
      .then((saved) => {
        if (saved) void queryClient.invalidateQueries({ queryKey: LIMITS_QUERY_KEY });
        return undefined;
      });
  const pathDirty = claudePath !== null && claudePath.trim() !== current.claudePath;

  return (
    <View style={{ gap: 24 }}>
      <SettingsSection title="Claude 订阅额度">
        <SettingsCard>
          <SettingsSwitch
            label="显示 Claude 订阅额度"
            hint={`默认关闭。开启后，守护进程最多每 ${current.minRefreshMinutes} 分钟在本机执行一次 Claude Code 自带的 /usage（仅在 Paseo 界面打开时触发），以展示 5 小时与每周额度。数据由 Claude Code 使用自身登录获取，插件不读取凭据，且 /usage 不消耗对话额度。`}
            value={current.enabled}
            onValueChange={(enabled) => save({ enabled })}
          />
          <SettingsSelect
            label="最短刷新间隔"
            hint="同时适用于手动刷新。执行失败时退避间隔会自动拉长（最长 1 小时）。"
            value={String(current.minRefreshMinutes)}
            options={MIN_REFRESH_OPTIONS.map((minutes) => ({
              value: String(minutes),
              label: `${minutes} 分钟`,
            }))}
            onValueChange={(minutes) => save({ minRefreshMinutes: Number(minutes) })}
          />
          <SettingsSwitch
            label="交互式回退模式"
            hint="使用 claude setup-token 凭据时，claude -p /usage 不会返回订阅额度。开启后将通过系统 script 命令在独立空目录的伪终端中启动交互式 Claude Code 读取 /usage（支持 Linux 与 macOS）。"
            value={current.interactiveFallback}
            onValueChange={(interactiveFallback) => save({ interactiveFallback })}
          />
          <SettingsInput
            label="Claude Code 可执行路径"
            hint="留空则依次在守护进程 PATH、~/.local/bin 与 ~/.claude/local 中查找 claude。"
            initialValue={current.claudePath}
            placeholder="claude"
            onChangeText={setClaudePath}
          />
          <SettingsAction
            label={settings.saveError ?? "保存 Claude Code 路径"}
            actionLabel="保存"
            disabled={!pathDirty || settings.saving}
            onPress={() => {
              save({ claudePath: (claudePath ?? "").trim() });
              setClaudePath(null);
            }}
          />
          <SettingsRow label="运行状态" hint={statusHint(limits.data)} />
        </SettingsCard>
      </SettingsSection>
    </View>
  );
}
