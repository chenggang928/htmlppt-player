# HtmlPPT Player

[English README](README.md)

HtmlPPT Player 是一个面向 HTML 演示稿的桌面播放器。它让 AI agent 或人类生成一个普通的本地 `.html` 文件，然后像正式 PPT 一样演示：没有浏览器标签栏、地址栏、URL，也有演讲者备注和投屏分离。

这个项目包含三部分：

- `HtmlPPT-Player`：Electron 桌面播放器。
- `HtmlPPT-skill`：给 AI 编程 agent 使用的生成规范/技能，让它们产出兼容播放器的 HTMLPPT。
- `HtmlPPT-demo`：公开演示 demo，展示一个高完成度 HTMLPPT 可以是什么样。

## 预览

![HtmlPPT Player 投屏演示场景](docs/images/readme-projection-hero.png)

![HtmlPPT Player 普通演示界面](docs/images/readme-player.png)

![HtmlPPT Player 演讲者模式](docs/images/readme-presenter.png)

## 为什么做

AI 编程 agent 已经很擅长生成 HTML 演示稿，但真正汇报时会遇到几个尴尬问题：浏览器外壳会露出来，没有演讲者备注，投屏内容和演讲者控制区无法分离。

HtmlPPT Player 要解决的是“上台演示”的最后一公里：

- 打开本地 `.html`、`.htm`、`.htmlppt` 文件。
- 全屏演示时没有浏览器外壳。
- Play 模式下，当前屏幕和外接投屏显示同一页。
- Presenter 模式下，投屏端只显示当前页，主屏显示备注、计时、缩略图和控制区。
- 从 HTML 中提取演讲者备注，并在投屏端渲染前移除备注 DOM。
- 支持本地 HTML 热加载，保留当前页和演示状态。

## 当前状态

这是一个 MVP。第一版优先保证 macOS 可用，Electron 架构后续可以扩展到 Windows 和 Linux。

目前已经支持：

- 文件选择、拖拽打开、命令行传入 deck。
- `.deck / .slide / .notes` 标准解析。
- 非标准 HTML fallback 为单页 deck。
- Play 模式和 Presenter 模式。
- 演讲者备注编辑，并写回本地文件。
- 缩略图、计时、键盘翻页、热加载。
- 通过 `electron-builder` 打包 macOS app。

## HtmlPPT 格式

推荐格式非常小：

```html
<main class="deck" data-aspect-ratio="16:9">
  <section class="slide" data-title="Cover">
    <h1>观众可见内容</h1>
    <aside class="notes">只给演讲者看的备注。</aside>
  </section>
</main>
```

规则：

- 每一页使用一个 `<section class="slide">`。
- 演讲者备注只放在当前页内部的 `<aside class="notes">`。
- `data-title` 用于演讲者模式右侧缩略图标题。
- 默认使用 `data-aspect-ratio="16:9"`。
- 每页应该是固定视口页面，不要做成滚动网页。
- 不要用 CSS 隐藏私密备注；必须使用 `.notes`，播放器才会在投屏端移除它。

完整 agent 规范见 [HtmlPPT-skill/SKILL.md](HtmlPPT-skill/SKILL.md)。

## 快速开始

### 下载应用

普通用户建议直接从 GitHub Releases 下载最新打包版本：

```text
本仓库的 Releases 页面
```

源码保存在这个仓库里。macOS `.dmg` 或压缩后的 app 等安装包应该作为
GitHub Release 附件上传，不要提交到源码仓库。

第一版公开 macOS 包可能还没有签名和 notarization。如果是这样，需要在
Release Notes 里明确说明，用户第一次打开时 macOS 可能会出现安全提示。

### 从源码构建

安装依赖：

```bash
cd HtmlPPT-Player
npm install
```

开发启动：

```bash
npm run dev
```

构建：

```bash
npm run build
```

测试：

```bash
npm test
```

打包 macOS app 目录：

```bash
npm run pack:mac
```

生成 macOS release 安装包：

```bash
npm run dist:mac
```

在播放器中打开公开 demo：

```text
HtmlPPT-demo/ppt/index.html
```

## 键盘快捷键

- `Right`、`Down`、`Space`、`PageDown`：下一页
- `Left`、`Up`、`PageUp`：上一页
- `Esc`：退出全屏、Play 模式或 Presenter 模式

## 演示模式

HtmlPPT Player 有两种演示模式：

- Play 模式：当前屏幕进入全屏；如果存在外接屏，外接屏显示同一页内容。
- Presenter 模式：外接屏只显示当前页全屏内容；主屏显示当前页预览、备注、计时、缩略图和控制按钮。

如果只有一个屏幕，Presenter 模式会进入排练模式。

## Agent Skill

`HtmlPPT-skill` 目录可以复制到 agent 的 skills 目录，建议安装后的目录名为 `htmlppt`。

示例：

```bash
mkdir -p ~/.codex/skills
cp -R HtmlPPT-skill ~/.codex/skills/htmlppt
```

然后可以这样要求 agent：

```text
Use $htmlppt to create a single-file HTML presentation deck for HtmlPPT Player.
```

## Demo

公开 demo 位于：

```text
HtmlPPT-demo/ppt/index.html
```

它是一个自包含 HTMLPPT 文件，不依赖远程资源，用于展示协议、演讲者备注、投屏安全渲染，以及 HTML 原生的视觉表现力。

## 仓库结构

```text
.
├── HtmlPPT-Player/   # Electron + Vite + React + TypeScript 桌面播放器
├── HtmlPPT-skill/    # 给 agent 使用的 HTMLPPT 生成规范
├── HtmlPPT-demo/     # 公开演示 deck
├── README.md
├── README.zh-CN.md
├── OPEN_SOURCE_PLAN.md
└── LICENSE
```

## 安全模型

HtmlPPT deck 被视为本地可信文件。Electron 渲染窗口禁用 Node integration，并通过 preload 暴露最小 API。投屏端渲染的 slide HTML 会先移除 `.notes`。

不要打开不可信 HTML deck，除非你本来也信任这个本地 HTML 文件。

## Roadmap

- 签名和 notarized 的 macOS release。
- Windows / Linux 打包。
- 更完善的文件关联和安装器流程。
- PDF / 图片导出。
- 遥控器或手机翻页。
- 更多官方 demo 主题。
- 协议文档和 agent 生成兼容性测试。

## License

Apache-2.0。见 [LICENSE](LICENSE)。
