# claude-theme

参考 Claude 桌面端风格的 Paseo 主题（亮色为暖色纸感，暗色为冷调深灰），提供「Claude 亮色」「Claude 暗色」与「Claude 跟随系统」三种外观。

详细说明见 [OVERVIEW.md](OVERVIEW.md)。

## 安装

```bash
paseo plugin install github:Marsdlc/paseo-kit:plugins/claude-theme
```

安装后在 **Settings → Appearance** 中选择主题。

## 配色

| | Claude 亮色 | Claude 暗色 |
| --- | --- | --- |
| 主背景 | `#FAF9F5` | `#26282C` |
| 卡片 / 输入框 | `#FFFFFF` | `#303338` |
| 侧边栏 | `#F3F1EA` | `#1F2124` |
| 正文 | `#141413` | `#F3F4F6` |
| 次要文字 | `#6B6A64` | `#B0B4BC` |
| 强调色 | `#C96442`（陶土橙） | `#E08A6A`（陶土橙） |

配色定义在 [`client/palettes.ts`](client/palettes.ts)。

## 跟随系统的实现

Paseo 插件主题只能声明固定的 `light` 或 `dark`，且同一时间只能启用一个插件主题。「Claude 跟随系统」保持同一个主题 ID，监听系统外观变化后用另一套配色重新注册自己；Paseo 按 ID 查找已选主题，因此选择会保留。该行为依赖 Paseo 当前实现，若未来失效，可改用固定的亮色或暗色主题。

## 开发

```bash
npm install
npm run typecheck
paseo plugin reload claude-theme
paseo plugin logs claude-theme
```
