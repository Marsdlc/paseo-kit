import type { PluginTheme } from "@getpaseo/plugin";
import type { PluginAgentPanelProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View, type PressableStateCallbackType } from "react-native";
import {
  addUsage,
  EMPTY_USAGE,
  type ChildAgentUsage,
  type ModelUsage,
  type SubagentUsage,
  type Usage,
} from "../shared/usage";
import { ShareBar, SwatchDot, type ShareSegment } from "./charts";
import { useSessionDetail, type SessionDetail, type Swatch } from "./data";
import {
  agentLabel,
  formatAgo,
  formatCost,
  formatPercent,
  formatTokens,
  shortSessionId,
} from "./format";
import { Card, Stat } from "./screen";
import { Composition, FONT } from "./summary";
import { MONO_TEXT } from "./terminal";

type HoverState = PressableStateCallbackType & { hovered?: boolean };

const MAX_CONTENT_WIDTH = 960;
const WIDE_MIN_WIDTH = 640;
const SUBAGENTS_SHOWN = 6;
const CHILDREN_SHOWN = 8;

function subtract(a: Usage, b: Usage): Usage {
  return {
    inputTokens: Math.max(a.inputTokens - b.inputTokens, 0),
    outputTokens: Math.max(a.outputTokens - b.outputTokens, 0),
    cacheCreationTokens: Math.max(a.cacheCreationTokens - b.cacheCreationTokens, 0),
    cacheReadTokens: Math.max(a.cacheReadTokens - b.cacheReadTokens, 0),
    totalTokens: Math.max(a.totalTokens - b.totalTokens, 0),
    cost: Math.max(a.cost - b.cost, 0),
  };
}

function sumUsage(usages: readonly Usage[]): Usage {
  return usages.reduce(addUsage, EMPTY_USAGE);
}

function Muted({ theme, children }: { theme: PluginTheme; children: ReactNode }) {
  return (
    <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
      {children}
    </Text>
  );
}

function Numbers({ theme, usage, share }: { theme: PluginTheme; usage: Usage; share?: number }) {
  const number = [MONO_TEXT, { fontSize: FONT.body }];
  return (
    <>
      {share !== undefined ? (
        <Text
          style={[...number, { width: 42, textAlign: "right", color: theme.colors.foregroundMuted }]}
        >
          {formatPercent(share)}
        </Text>
      ) : null}
      <Text style={[...number, { width: 56, textAlign: "right", color: theme.colors.foreground }]}>
        {formatTokens(usage.totalTokens)}
      </Text>
      <Text style={[...number, { width: 58, textAlign: "right", color: theme.colors.foreground }]}>
        {formatCost(usage.cost)}
      </Text>
    </>
  );
}

function Row({
  theme,
  swatch,
  title,
  detail,
  usage,
  share,
  last,
}: {
  theme: PluginTheme;
  swatch?: Swatch;
  title: string;
  detail?: string | null;
  usage: Usage;
  share?: number;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 32,
        paddingVertical: 4,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      {swatch ? <SwatchDot swatch={swatch} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[MONO_TEXT, { fontSize: FONT.body, color: theme.colors.foreground }]}>
          {title}
        </Text>
        {detail ? (
          <Text
            numberOfLines={1}
            style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      <Numbers theme={theme} usage={usage} share={share} />
    </View>
  );
}

function ColumnHeader({ theme, share }: { theme: PluginTheme; share?: boolean }) {
  const label = [
    MONO_TEXT,
    {
      fontSize: FONT.caption,
      color: theme.colors.foregroundMuted,
      textAlign: "right" as const,
    },
  ];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View style={{ flex: 1 }} />
      {share ? <Text style={[...label, { width: 42 }]}>占比</Text> : null}
      <Text style={[...label, { width: 56 }]}>Token</Text>
      <Text style={[...label, { width: 58 }]}>费用</Text>
    </View>
  );
}

function Notice({
  theme,
  icon,
  color,
  children,
}: {
  theme: PluginTheme;
  icon: string;
  color?: string;
  children: ReactNode;
}) {
  const tint = color ?? theme.colors.foregroundMuted;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
      <View style={{ paddingTop: 1 }}>
        <Icon name={icon} size={13} color={tint} />
      </View>
      <Text style={[MONO_TEXT, { flex: 1, fontSize: FONT.caption, color: tint }]}>{children}</Text>
    </View>
  );
}

function ShowAllToggle({
  theme,
  total,
  showAll,
  onToggle,
}: {
  theme: PluginTheme;
  total: number;
  showAll: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onToggle}
      style={({ hovered }: HoverState) => ({
        alignSelf: "flex-start",
        marginTop: 6,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: hovered ? theme.colors.accent : theme.colors.border,
        backgroundColor: hovered ? theme.colors.surface2 : theme.colors.surface1,
      })}
    >
      <Text style={[MONO_TEXT, { fontSize: FONT.caption, color: theme.colors.foreground }]}>
        {showAll ? "[ 收起 ]" : `[ 展开全部 ${total} 项 ]`}
      </Text>
    </Pressable>
  );
}

function Overview({
  theme,
  usage,
  childTotal,
  childCount,
}: {
  theme: PluginTheme;
  usage: Usage;
  childTotal: Usage;
  childCount: number;
}) {
  const prompt = usage.inputTokens + usage.cacheCreationTokens + usage.cacheReadTokens;
  const perMillion = usage.totalTokens > 0 ? usage.cost / (usage.totalTokens / 1_000_000) : 0;
  return (
    <Card theme={theme} title="当前会话">
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 10, columnGap: 10 }}>
        <Stat
          theme={theme}
          label="估算费用"
          value={formatCost(usage.cost)}
          detail={`每百万 Token ${formatCost(perMillion)}`}
        />
        <Stat
          theme={theme}
          label="Token 总量"
          value={formatTokens(usage.totalTokens)}
          detail={`输出 ${formatTokens(usage.outputTokens)}`}
        />
        <Stat
          theme={theme}
          label="缓存命中率"
          value={prompt > 0 ? formatPercent(usage.cacheReadTokens / prompt) : "—"}
          detail="提示词命中缓存占比"
        />
        {childTotal.totalTokens > 0 ? (
          <Stat
            theme={theme}
            label="含子 Agent 总计"
            value={formatCost(usage.cost + childTotal.cost)}
            detail={`+${formatCost(childTotal.cost)}（${childCount} 个子 Agent）`}
          />
        ) : null}
      </View>
      <Composition theme={theme} usage={usage} />
    </Card>
  );
}

function subagentTitle(subagent: SubagentUsage): string {
  return subagent.description ?? subagent.type ?? shortSessionId(subagent.id);
}

function subagentDetail(subagent: SubagentUsage): string {
  return [
    subagent.description ? subagent.type : null,
    subagent.models[0]?.model,
    subagent.lastActivity ? formatAgo(Date.parse(subagent.lastActivity)) : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function Breakdown({
  theme,
  usage,
  subagents,
  subagentsError,
  childTotal,
  childCount,
}: {
  theme: PluginTheme;
  usage: Usage;
  subagents: readonly SubagentUsage[];
  subagentsError: string | null;
  childTotal: Usage;
  childCount: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const subagentTotal = sumUsage(subagents.map((subagent) => subagent.usage));
  const main = subtract(usage, subagentTotal);
  const swatches = {
    main: { color: theme.colors.accent, opacity: 1 },
    subagents: { color: theme.colors.accent, opacity: 0.45 },
    children: { color: theme.colors.foregroundMuted, opacity: 0.6 },
  } satisfies Record<string, Swatch>;
  const grand = Math.max(usage.cost + childTotal.cost, Number.EPSILON);
  const segments: ShareSegment[] = [
    { key: "main", value: main.cost, swatch: swatches.main },
    { key: "subagents", value: subagentTotal.cost, swatch: swatches.subagents },
    { key: "children", value: childTotal.cost, swatch: swatches.children },
  ];
  const shown = showAll ? subagents : subagents.slice(0, SUBAGENTS_SHOWN);

  return (
    <Card theme={theme} title="消耗分布" trailing={<Muted theme={theme}>按费用占比</Muted>}>
      <ShareBar theme={theme} segments={segments} height={8} />
      <View>
        <ColumnHeader theme={theme} share />
        <Row
          theme={theme}
          swatch={swatches.main}
          title="主对话"
          usage={main}
          share={main.cost / grand}
          last={subagents.length === 0 && childCount === 0}
        />
        {subagents.length > 0 ? (
          <Row
            theme={theme}
            swatch={swatches.subagents}
            title={`子任务 Agent (${subagents.length})`}
            detail="Claude Code Task 子代理"
            usage={subagentTotal}
            share={subagentTotal.cost / grand}
            last={childCount === 0}
          />
        ) : null}
        {childCount > 0 ? (
          <Row
            theme={theme}
            swatch={swatches.children}
            title={`子 Agent (${childCount})`}
            detail="通过 Paseo 启动"
            usage={childTotal}
            share={childTotal.cost / grand}
            last
          />
        ) : null}
      </View>
      {subagentsError ? (
        <Notice theme={theme} icon="TriangleAlert" color={theme.colors.statusWarning}>
          无法读取子任务费用：{subagentsError}。会话总量中仍已包含此部分。
        </Notice>
      ) : null}
      {subagents.length > 0 ? (
        <View style={{ gap: 2 }}>
          <Text
            style={[
              MONO_TEXT,
              {
                fontSize: FONT.caption,
                fontWeight: "700",
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            // 子任务明细
          </Text>
          {shown.map((subagent, index) => (
            <Row
              key={subagent.id}
              theme={theme}
              title={subagentTitle(subagent)}
              detail={subagentDetail(subagent)}
              usage={subagent.usage}
              last={index === shown.length - 1}
            />
          ))}
          {subagents.length > SUBAGENTS_SHOWN ? (
            <ShowAllToggle
              theme={theme}
              total={subagents.length}
              showAll={showAll}
              onToggle={() => setShowAll((value) => !value)}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function Models({
  theme,
  models,
  wide,
}: {
  theme: PluginTheme;
  models: readonly ModelUsage[];
  wide: boolean;
}) {
  const columns: { key: string; label: string; value: (usage: Usage) => string; width: number }[] =
    wide
      ? [
          { key: "input", label: "输入", value: (u) => formatTokens(u.inputTokens), width: 56 },
          { key: "output", label: "输出", value: (u) => formatTokens(u.outputTokens), width: 56 },
          {
            key: "write",
            label: "缓存写入",
            value: (u) => formatTokens(u.cacheCreationTokens),
            width: 68,
          },
          {
            key: "read",
            label: "缓存读取",
            value: (u) => formatTokens(u.cacheReadTokens),
            width: 68,
          },
          { key: "cost", label: "费用", value: (u) => formatCost(u.cost), width: 58 },
        ]
      : [
          { key: "tokens", label: "Token", value: (u) => formatTokens(u.totalTokens), width: 56 },
          { key: "cost", label: "费用", value: (u) => formatCost(u.cost), width: 58 },
        ];
  const cell = [
    MONO_TEXT,
    {
      fontSize: FONT.body,
      textAlign: "right" as const,
    },
  ];
  return (
    <Card theme={theme} title="模型明细">
      {models.length === 0 ? (
        <Muted theme={theme}>暂无模型用量记录。</Muted>
      ) : (
        <View style={{ gap: 2 }}>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              paddingBottom: 4,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Text style={[MONO_TEXT, { flex: 1, fontSize: FONT.caption, color: theme.colors.foregroundMuted }]}>
              模型
            </Text>
            {columns.map((column) => (
              <Text
                key={column.key}
                style={[
                  MONO_TEXT,
                  {
                    width: column.width,
                    fontSize: FONT.caption,
                    color: theme.colors.foregroundMuted,
                    textAlign: "right",
                  },
                ]}
              >
                {column.label}
              </Text>
            ))}
          </View>
          {models.map((model, index) => (
            <View
              key={model.model}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                minHeight: 28,
                borderBottomWidth: index === models.length - 1 ? 0 : 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <Text
                numberOfLines={1}
                style={[MONO_TEXT, { flex: 1, fontSize: FONT.body, color: theme.colors.foreground }]}
              >
                {model.model}
              </Text>
              {columns.map((column) => (
                <Text
                  key={column.key}
                  style={[...cell, { width: column.width, color: theme.colors.foreground }]}
                >
                  {column.value(model.usage)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function childStatus(child: ChildAgentUsage): string {
  const parts = [agentLabel(child.provider)];
  if (child.unlisted) parts.push("项目已移除");
  else if (child.archived) parts.push("已归档");
  if (child.match.status === "pending") parts.push("暂无用量记录");
  if (child.match.status === "unknown") parts.push("无 provider 会话");
  if (child.match.status === "matched" && child.match.session.lastActivity) {
    parts.push(formatAgo(Date.parse(child.match.session.lastActivity)));
  }
  return parts.join(" | ");
}

function Children({
  theme,
  children,
}: {
  theme: PluginTheme;
  children: readonly ChildAgentUsage[];
}) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? children : children.slice(0, CHILDREN_SHOWN);
  return (
    <Card theme={theme} title={`子 Agent (${children.length})`}>
      <Muted theme={theme}>
        由当前 Agent 通过 Paseo 启动的子 Agent。它们各自独立会话，不包含在当前会话总量内。
      </Muted>
      <View>
        <ColumnHeader theme={theme} />
        {shown.map((child, index) => (
          <Row
            key={child.agentId}
            theme={theme}
            title={child.title ?? "未命名 Agent"}
            detail={childStatus(child)}
            usage={child.match.status === "matched" ? child.match.session.usage : EMPTY_USAGE}
            last={index === shown.length - 1}
          />
        ))}
      </View>
      {children.length > CHILDREN_SHOWN ? (
        <ShowAllToggle
          theme={theme}
          total={children.length}
          showAll={showAll}
          onToggle={() => setShowAll((value) => !value)}
        />
      ) : null}
    </Card>
  );
}

function Header({ theme, detail }: { theme: PluginTheme; detail: SessionDetail }) {
  const { match } = detail;
  const facts =
    match.status === "matched"
      ? [
          `${agentLabel(match.session.agent)} #${shortSessionId(match.providerSessionId)}`,
          match.session.lastActivity
            ? `最近活跃 ${formatAgo(Date.parse(match.session.lastActivity))}`
            : null,
        ]
      : match.status === "pending"
        ? [`会话 #${shortSessionId(match.providerSessionId)}`]
        : [];
  return (
    <View
      style={{
        gap: 4,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Text style={[MONO_TEXT, { fontSize: 15, fontWeight: "700", color: theme.colors.foreground }]}>
        <Text style={{ color: theme.colors.accent }}>$ </Text>会话用量
      </Text>
      {facts.length > 0 ? <Muted theme={theme}>{facts.filter(Boolean).join(" | ")}</Muted> : null}
      {match.status === "matched" && match.earlierSegments > 0 ? (
        <Notice theme={theme} icon="History">
          已合并此前 {match.earlierSegments} 段历史会话（由恢复或分叉延续）。
        </Notice>
      ) : null}
    </View>
  );
}

function Body({
  theme,
  detail,
  wide,
}: {
  theme: PluginTheme;
  detail: SessionDetail;
  wide: boolean;
}) {
  const { match, subagents, subagentsError, children } = detail;
  const childTotal = sumUsage(
    children.map((child) =>
      child.match.status === "matched" ? child.match.session.usage : EMPTY_USAGE,
    ),
  );
  const childCard = children.length > 0 ? <Children theme={theme} children={children} /> : null;

  if (match.status !== "matched") {
    return (
      <View style={{ gap: 12 }}>
        <Card theme={theme} title="当前会话">
          <Muted theme={theme}>
            {match.status === "pending"
              ? "暂无用量记录。ccusage 会读取 Claude Code、Codex 等支持的 Agent 日志，首轮对话结束后即可显示。"
              : "当前 Agent 尚未启动 provider 会话。"}
          </Muted>
        </Card>
        {childCard}
      </View>
    );
  }

  const { usage, models } = match.session;
  const overview = (
    <Overview theme={theme} usage={usage} childTotal={childTotal} childCount={children.length} />
  );
  const breakdown =
    subagents.length > 0 || children.length > 0 || subagentsError ? (
      <Breakdown
        theme={theme}
        usage={usage}
        subagents={subagents}
        subagentsError={subagentsError}
        childTotal={childTotal}
        childCount={children.length}
      />
    ) : null;
  const modelCard = <Models theme={theme} models={models} wide={wide} />;

  if (!wide) {
    return (
      <View style={{ gap: 12 }}>
        {overview}
        {breakdown}
        {childCard}
        {modelCard}
      </View>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      {overview}
      {breakdown && childCard ? (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>{breakdown}</View>
          <View style={{ flex: 1, minWidth: 0 }}>{childCard}</View>
        </View>
      ) : (
        (breakdown ?? childCard)
      )}
      {modelCard}
    </View>
  );
}

export function SessionUsagePanel({ theme, layout, agentId }: PluginAgentPanelProps) {
  const { data, error, isPending } = useSessionDetail(agentId);
  const [width, setWidth] = useState(0);
  const padding = layout.compact ? 12 : 16;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.surface0 }}
      contentContainerStyle={{ padding, alignItems: "center" }}
    >
      <View
        style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH, gap: 12 }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        {data ? (
          <>
            <Header theme={theme} detail={data} />
            <Body theme={theme} detail={data} wide={!layout.compact && width >= WIDE_MIN_WIDTH} />
            <Muted theme={theme}>
              # 数据由 ccusage 从本机 Agent 日志读取，费用为内置标价估算。更新于{" "}
              {formatAgo(data.generatedAt)}。
            </Muted>
          </>
        ) : (
          <View style={{ gap: 8, paddingVertical: 48, alignItems: "center" }}>
            <Icon
              name={isPending ? "Hourglass" : "CircleAlert"}
              size={20}
              color={isPending ? theme.colors.foregroundMuted : theme.colors.statusDanger}
            />
            <Text
              style={[
                MONO_TEXT,
                { fontSize: FONT.title, color: theme.colors.foreground, textAlign: "center" },
              ]}
            >
              {isPending ? "$ 正在读取用量日志..." : "无法读取会话用量"}
            </Text>
            {error ? <Muted theme={theme}>{error.message}</Muted> : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
