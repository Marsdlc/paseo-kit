import type { PluginTheme } from "@getpaseo/plugin";
import { useRpc, useTranslation } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { formatTimecodeShort } from "../shared/media";
import { notesListRpc, notesRemoveRpc, type MediaInfo, type ReviewNote } from "../shared/rpc";
import { messages } from "./i18n";
import { MONO_TEXT, timeAgo } from "./ui";

export function useNotes(path: string) {
  const list = useRpc(notesListRpc);
  return useQuery({
    queryKey: ["media-studio", "notes", path],
    queryFn: async () => (await list({ path })).notes.slice().reverse(),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function NotesList({
  theme,
  info,
  notes,
  onJump,
  locale,
}: {
  theme: PluginTheme;
  info: MediaInfo;
  notes: readonly ReviewNote[];
  onJump(note: ReviewNote): void;
  locale: string;
}) {
  const { t } = useTranslation(messages);
  const remove = useRpc(notesRemoveRpc);
  const queryClient = useQueryClient();
  const { colors } = theme;
  const short = (value: number) => formatTimecodeShort(value, info.fps, info.duration);
  if (notes.length === 0) {
    return (
      <View style={{ paddingVertical: 16, alignItems: "center", gap: 6 }}>
        <Icon name="MessagesSquare" size={16} color={colors.foregroundMuted} />
        <Text style={[MONO_TEXT, { color: colors.foregroundMuted, fontSize: 11, textAlign: "center" }]}># {t("notes.empty")}</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      {notes.map((note) => {
        const stale = note.fileModifiedAt !== info.modifiedAt;
        const where = note.inPoint !== null ? `${short(note.inPoint)} → ${short(note.outPoint ?? note.inPoint)}` : short(note.time);
        return (
          <Pressable
            key={note.id}
            accessibilityRole="button"
            onPress={() => onJump(note)}
            style={(state) => ({
              padding: 9,
              borderRadius: 2,
              borderWidth: 1,
              borderColor: state.pressed || (state as { hovered?: boolean }).hovered ? colors.accent : colors.border,
              gap: 5,
              backgroundColor: state.pressed || (state as { hovered?: boolean }).hovered ? colors.surface2 : colors.surface1,
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ paddingHorizontal: 5, height: 18, borderRadius: 2, justifyContent: "center", backgroundColor: colors.accent }}>
                <Text style={[MONO_TEXT, { color: colors.accentForeground, fontSize: 10, fontWeight: "700" }]}>{where}</Text>
              </View>
              {stale ? (
                <View style={{ paddingHorizontal: 5, height: 18, borderRadius: 2, borderWidth: 1, borderColor: colors.statusWarning, justifyContent: "center", backgroundColor: colors.surface0 }}>
                  <Text style={[MONO_TEXT, { color: colors.statusWarning, fontSize: 10, fontWeight: "700" }]}>{t("notes.stale")}</Text>
                </View>
              ) : null}
              <View style={{ flex: 1 }} />
              <Text style={[MONO_TEXT, { color: colors.foregroundMuted, fontSize: 10 }]}>{timeAgo(note.createdAt, locale)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("notes.delete")}
                onPress={() => {
                  void remove({ path: info.path, id: note.id }).then(() => queryClient.invalidateQueries({ queryKey: ["media-studio", "notes", info.path] }));
                }}
                hitSlop={6}
              >
                <Icon name="X" size={12} color={colors.foregroundMuted} />
              </Pressable>
            </View>
            <Text style={[MONO_TEXT, { color: colors.foreground, fontSize: 12, lineHeight: 17 }]} numberOfLines={4}>
              {note.text}
            </Text>
            {note.agentTitle ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Icon name="Bot" size={11} color={colors.foregroundMuted} />
                <Text numberOfLines={1} style={[MONO_TEXT, { color: colors.foregroundMuted, fontSize: 10, flex: 1 }]}>
                  {note.agentTitle}
                  {note.framePath ? ` | ${t("notes.withFrame")}` : ""}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
