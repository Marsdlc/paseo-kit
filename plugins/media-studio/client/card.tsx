import type { PluginTheme } from "@getpaseo/plugin";
import { useAgent, useTranslation, useWorkspace, type PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { z } from "zod";
import type { cardSchema } from "../shared/cards";
import { baseName, formatDuration, mediaKindOf } from "../shared/media";
import { messages } from "./i18n";
import { MediaViewer } from "./player";
import { usePoster, useProbe } from "./queries";
import { openInMediaPanel } from "./state";
import { IconButton, kindIcon, MONO_TEXT } from "./ui";

function Tile({ theme, path, cwd, selected, onPress }: { theme: PluginTheme; path: string; cwd: string | null; selected: boolean; onPress(): void }) {
  const probe = useProbe(path, cwd);
  const poster = usePoster(probe.data, 320);
  const { colors } = theme;
  const kind = probe.data?.kind ?? mediaKindOf(path) ?? "video";
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={baseName(path)} onPress={onPress} style={{ width: 148, gap: 4 }}>
      {(state) => (
        <>
          <View
            style={{
              width: 148,
              height: 84,
              borderRadius: 2,
              overflow: "hidden",
              backgroundColor: colors.surface2,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? colors.accent : (state as { hovered?: boolean }).hovered ? colors.accent : colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {poster.data ? (
              <Image source={{ uri: poster.data }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
            ) : (
              <Icon name={probe.isError ? "FileX" : kindIcon(kind)} size={20} color={probe.isError ? colors.statusDanger : colors.foregroundMuted} />
            )}
            {probe.data?.duration ? (
              <View style={{ position: "absolute", right: 4, bottom: 4, paddingHorizontal: 4, height: 15, justifyContent: "center", borderRadius: 1, backgroundColor: "rgba(0,0,0,0.82)" }}>
                <Text style={[MONO_TEXT, { color: "#fff", fontSize: 10, fontWeight: "700" }]}>{formatDuration(probe.data.duration)}</Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={[MONO_TEXT, { color: selected ? colors.accent : colors.foregroundMuted, fontSize: 11, fontWeight: selected ? "700" : "400" }]}>
            {baseName(path)}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function MediaCard({ agentId, item, theme, layout }: PluginTimelineItemProps<z.output<typeof cardSchema>>) {
  const { t } = useTranslation(messages);
  const data = item.data;
  const agentCwd = useAgent(agentId, (agent) => agent.cwd);
  const workspaceId = useAgent(agentId, (agent) => agent.workspaceId);
  const workspaceRoot = useWorkspace(workspaceId ?? "", (workspace) => workspace.directory);
  const cwd = data.cwd ?? agentCwd ?? null;
  const [selected, setSelected] = useState<number | null>(data.paths.length === 1 ? 0 : null);
  const { colors } = theme;
  const count = data.paths.length + data.more;
  const changedOnly = data.source === "turn" && data.shown === 0;
  const mixed = data.source === "turn" && data.shown > 0 && count > data.shown;
  const title =
    data.title?.trim() ||
    (changedOnly ? t("card.turnTitle", { count }) : mixed ? t("card.turnMixed", { count }) : count === 1 ? t("card.title") : t("card.titleMany", { count }));
  const open = (path: string | null) => {
    if (workspaceId) openInMediaPanel(workspaceId, path);
  };

  return (
    <View
      style={{
        marginVertical: 6,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 2,
        backgroundColor: colors.surface0,
        maxWidth: 780,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: layout.compact ? 10 : 12,
          paddingVertical: 7,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface1,
        }}
      >
        <Icon name={changedOnly ? "FolderClock" : "Clapperboard"} size={14} color={colors.accent} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text numberOfLines={1} style={[MONO_TEXT, { color: colors.foreground, fontSize: 12, fontWeight: "700" }]}>
            {title}
          </Text>
          {count > 1 || data.title?.trim() ? (
            <Text numberOfLines={1} style={[MONO_TEXT, { color: colors.foregroundMuted, fontSize: 10 }]}>
              {t("card.files", { count })}
            </Text>
          ) : null}
        </View>
        {workspaceId ? <IconButton theme={theme} icon="PanelRightOpen" size="sm" label={t("card.openPanel")} onPress={() => open(null)} /> : null}
      </View>
      <View style={{ padding: layout.compact ? 10 : 12, gap: 10 }}>
        {data.note?.trim() ? <Text style={[MONO_TEXT, { color: colors.foreground, fontSize: 12, lineHeight: 18 }]}>{data.note.trim()}</Text> : null}
        {data.state === "failed" ? (
          <Text style={[MONO_TEXT, { color: colors.statusDanger, fontSize: 11 }]}>{data.error ?? t("card.failed")}</Text>
        ) : null}
        {data.paths.length > 1 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {data.paths.map((path, index) => (
              <Tile key={path} theme={theme} path={path} cwd={cwd} selected={selected === index} onPress={() => setSelected(selected === index ? null : index)} />
            ))}
            {data.more > 0 ? (
              <Pressable
                onPress={() => open(null)}
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 2,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={[MONO_TEXT, { color: colors.foregroundMuted, fontSize: 11 }]}>{t("card.more", { count: data.more })}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {selected !== null && data.paths[selected] ? (
          <MediaViewer
            key={data.paths[selected]}
            theme={theme}
            compact={layout.compact}
            path={data.paths[selected]!}
            cwd={cwd}
            workspaceId={workspaceId}
            workspaceRoot={workspaceRoot ?? cwd}
            agentId={agentId}
            variant="inline"
            onOpenInPanel={workspaceId ? (path) => open(path) : undefined}
          />
        ) : null}
      </View>
    </View>
  );
}
