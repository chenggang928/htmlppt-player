# HtmlPPT Player

[English README](README.md)

HtmlPPT Player 是一个用于演示本地 HTML 幻灯片的桌面应用。它可以打开 `.html` / `.htmlppt` 演示稿，并像正式 PPT 一样播放：没有浏览器标签栏、地址栏和 URL。

它适合新的 AI 演示稿工作流：让 AI agent 生成一个单文件 HTML 演示稿，然后用 HtmlPPT Player 打开，获得全屏播放、演讲者备注、缩略图、计时器和投屏分离。

## 预览

![HtmlPPT Player 投屏演示场景](docs/images/readme-projection-hero.png)

![HtmlPPT Player 普通演示界面](docs/images/readme-player.png)

![HtmlPPT Player 演讲者模式](docs/images/readme-presenter.png)

## 下载

从 GitHub Releases 下载最新版：

```text
https://github.com/chenggang928/htmlppt-player/releases/latest
```

当前提供：

- macOS arm64：`.dmg`
- Windows x64：`.exe` 安装器

目前安装包还没有签名。macOS Gatekeeper 或 Windows SmartScreen 第一次打开时可能会提示安全警告。

### macOS 首次打开

当前 macOS 包还没有签名和 notarization。如果系统提示“已损坏，无法打开”或“无法验证开发者”，可以用下面任一方式处理。

方式 A：在系统设置里手动允许：

1. 先把 `HtmlPPT Player.app` 拖到 `/Applications`。
2. 双击打开一次；如果 macOS 拦截，点取消。
3. 打开 `System Settings > Privacy & Security`。
4. 滚动到 `Security`，找到 `HtmlPPT Player` 被阻止的提示，点击 `Open Anyway` / `仍要打开`。
5. 再次确认 `Open` / `打开`。

Apple 官方说明里也提到，`Open Anyway` 通常只会在你尝试打开 App 后约一小时内出现。

方式 B：用终端移除 quarantine 标记：

```bash
xattr -dr com.apple.quarantine "/Applications/HtmlPPT Player.app"
open "/Applications/HtmlPPT Player.app"
```

## 怎么使用

1. 下载并打开 HtmlPPT Player。
2. 打开或拖入本地 `.html`、`.htm`、`.htmlppt` 演示稿。
3. 使用按钮或键盘快捷键翻页。
4. 点击 Play，从当前页开始全屏演示。
5. 点击 Presenter，进入演讲者模式：主屏显示备注、计时和缩略图，投屏端只显示当前幻灯片。

快捷键：

- `Right`、`Down`、`Space`、`PageDown`：下一页
- `Left`、`Up`、`PageUp`：上一页
- `Esc`：退出全屏、Play 模式或 Presenter 模式

## 演示模式

HtmlPPT Player 有两种演示模式：

- Play 模式：当前屏幕进入全屏；如果有外接屏，外接屏显示同一页。
- Presenter 模式：外接屏只显示当前页全屏内容；演讲者主屏保留备注、计时、控制按钮和全部缩略图。

如果只有一个屏幕，Presenter 模式会进入排练布局。

## 演示稿格式

推荐格式非常小：

```html
<main class="deck" data-aspect-ratio="16:9">
  <section class="slide" data-title="封面">
    <h1>观众可见内容</h1>
    <aside class="notes">只给演讲者看的备注。</aside>
  </section>
</main>
```

规则：

- 每页使用一个 `<section class="slide">`。
- 演讲者备注放在当前页内部的 `<aside class="notes">`。
- `data-title` 用于演讲者模式里的缩略图标题。
- 默认使用 `data-aspect-ratio="16:9"`。
- 不要用 CSS 隐藏私密备注；必须使用 `.notes`，播放器才会在投屏端移除备注。

如果 HTML 文件里没有 `.slide`，播放器会把整个文件作为单页演示稿打开。

## Demo

公开 demo 位于：

```text
HtmlPPT-demo/ppt/index.html
```

它是一个自包含本地 HTML 文件，不依赖远程资源。

## Agent Skill

仓库内置了一个 agent skill，用于告诉 AI 编程 agent 如何生成兼容 HtmlPPT Player 的演示稿。

安装到 Codex 风格的 skills 目录：

```bash
mkdir -p ~/.codex/skills
cp -R HtmlPPT-skill ~/.codex/skills/htmlppt
```

然后可以这样要求 agent：

```text
Use $htmlppt to create a single-file HTML presentation deck for HtmlPPT Player.
```

完整规范见 [HtmlPPT-skill/SKILL.md](HtmlPPT-skill/SKILL.md)。

## 开发者

安装依赖：

```bash
cd HtmlPPT-Player
npm install
```

开发启动：

```bash
npm run dev
```

运行测试：

```bash
npm test
```

构建：

```bash
npm run build
```

打包：

```bash
npm run dist:mac      # macOS DMG
npm run dist:win      # Windows 安装器，推荐在 Windows 或 GitHub Actions 上运行
npm run dist:win:zip  # Windows 免安装 zip
```

仓库内置的 GitHub Actions workflow 会在推送 `v*` tag 时自动构建 macOS 和 Windows release 包。

## 仓库结构

```text
.
├── HtmlPPT-Player/   # Electron 桌面播放器
├── HtmlPPT-skill/    # 给 agent 使用的 HTMLPPT 生成规范
├── HtmlPPT-demo/     # 公开演示 deck
├── docs/images/      # README 图片
├── README.md
├── README.zh-CN.md
└── LICENSE
```

## 安全模型

HtmlPPT deck 被视为本地可信文件。Electron 渲染窗口禁用 Node integration，并通过 preload 暴露最小 API。投屏端渲染的 slide HTML 会先移除 `.notes`。

不要打开不可信 HTML deck，除非你本来也信任这个本地 HTML 文件。

## Roadmap

- 签名和 notarized 的 macOS release。
- 签名的 Windows release。
- Linux 打包。
- 更完善的文件关联和安装器流程。
- PDF / 图片导出。
- 遥控器或手机翻页。
- 更多官方 demo 主题。
- 协议文档和 agent 生成兼容性测试。

## License

Apache-2.0。见 [LICENSE](LICENSE)。
