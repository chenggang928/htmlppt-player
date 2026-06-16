# Open Source Upload Plan / 开源上传方案

This plan prepares HtmlPPT Player for a clean public GitHub release.

本方案用于把 HtmlPPT Player 干净地发布到 GitHub，避免上传依赖、构建产物、临时文件或私人素材。

## 1. Repository Positioning / 仓库定位

Recommended repository name:

```text
htmlppt-player
```

Recommended GitHub description:

```text
Desktop player for AI-generated HTML presentation decks with presenter mode.
```

Recommended topics:

```text
html presentation slides electron presenter-mode ai-agents desktop-app htmlppt
```

## 2. What to Publish / 应该发布什么

Publish the source repository and release packages separately:

- GitHub repository: source code, docs, protocol skill, demo deck, tests, license.
- GitHub Releases: downloadable app builds such as `.dmg`, `.zip`, or future `.exe` installers.

开源仓库和用户下载包要分开处理：

- GitHub 仓库：源码、文档、协议 skill、demo、测试、许可证。
- GitHub Releases：给用户下载的 app 安装包，比如 `.dmg`、`.zip`，以及未来的 `.exe`。

Commit these:

- `HtmlPPT-Player/src/`
- `HtmlPPT-Player/assets/`
- `HtmlPPT-Player/examples/`
- `HtmlPPT-Player/tests/`
- `HtmlPPT-Player/package.json`
- `HtmlPPT-Player/package-lock.json`
- `HtmlPPT-Player/tsconfig.json`
- `HtmlPPT-Player/electron.vite.config.ts`
- `HtmlPPT-Player/vitest.config.ts`
- `HtmlPPT-skill/`
- `HtmlPPT-demo/`
- `docs/images/`
- `README.md`
- `README.zh-CN.md`
- `OPEN_SOURCE_PLAN.md`
- `.gitignore`
- `LICENSE`

Do not commit these:

- `node_modules/`
- `out/`
- `release/`
- `tmp/`
- `.DS_Store`
- local logs, caches, profiles, or screenshots

GitHub recommends committing a repository-level `.gitignore` so ignore rules are shared with collaborators.

## 3. License / 开源许可证

The repository is prepared for Apache-2.0.

Why Apache-2.0:

- permissive for individual and commercial use;
- clearer patent grant than MIT;
- suitable for a protocol-like developer tool.

Before publishing, confirm you are comfortable with Apache-2.0. If you prefer a shorter permissive license, switch to MIT before the first public release.

## 4. Preflight Checklist / 发布前检查

Run:

```bash
cd /Users/chenggang/HTML-PPT/HtmlPPT-Player
npm install
npm test
npm run build
```

Check:

- README links work.
- `HtmlPPT-demo/ppt/index.html` opens in the player.
- `HtmlPPT-skill/SKILL.md` contains the current `.deck / .slide / .notes` contract.
- `release/`, `out/`, `node_modules/`, and `tmp/` are ignored.
- No private business content remains in the public demo.

Optional package check:

```bash
npm run pack:mac
```

Do not commit the generated `release/` directory. Attach release builds to GitHub Releases instead.

## 5. First Commit / 首次提交

From the repository root:

```bash
cd /Users/chenggang/HTML-PPT
git init
git add README.md README.zh-CN.md OPEN_SOURCE_PLAN.md LICENSE .gitignore
git add HtmlPPT-Player HtmlPPT-skill HtmlPPT-demo
git status --short
git commit -m "Initial open source release"
```

Before committing, inspect `git status --short`. If you see `node_modules`, `out`, `release`, `tmp`, `.DS_Store`, or local screenshots, stop and fix `.gitignore` or remove those files from the index.

## 6. Create GitHub Repository / 创建 GitHub 仓库

Option A: using GitHub CLI:

```bash
gh repo create htmlppt-player --public --source=. --remote=origin --push
```

Option B: using the GitHub website:

1. Create an empty public repository named `htmlppt-player`.
2. Do not initialize it with README, license, or `.gitignore` because this local project already has them.
3. Push:

```bash
git remote add origin git@github.com:<your-name>/htmlppt-player.git
git branch -M main
git push -u origin main
```

## 7. First GitHub Release / 首个 Release

Build the macOS release artifact:

```bash
cd /Users/chenggang/HTML-PPT/HtmlPPT-Player
npm run dist:mac
```

Recommended first tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Then create a GitHub Release:

- Title: `HtmlPPT Player v0.1.0`
- Notes:
  - MVP desktop player for HTMLPPT decks.
  - Play mode and Presenter mode.
  - `.deck / .slide / .notes` parser.
  - Public demo and agent skill included.
  - macOS-first, unsigned build.

If you provide a macOS app build, upload it as a release asset instead of committing it to the repository.

GitHub Releases are designed for packaging software, release notes, and downloadable binary assets.

If you use GitHub CLI after pushing the source repository:

```bash
gh release create v0.1.0 HtmlPPT-Player/release/*.dmg \
  --title "HtmlPPT Player v0.1.0" \
  --notes "First public MVP release. macOS-first unsigned build."
```

If the build is unsigned, keep `macOS-first unsigned build` in the release notes.

## 8. Suggested GitHub Settings / 建议的 GitHub 设置

Enable:

- Issues
- Discussions
- Releases

Add pinned/first issues:

- Sign and notarize macOS releases
- Add Windows/Linux packaging
- Add CI for tests and build
- Improve `.htmlppt` file association
- Add export to PDF/images
- Add more official demo themes

After the first public push, consider adding:

- `.github/ISSUE_TEMPLATE/`
- `.github/PULL_REQUEST_TEMPLATE.md`
- GitHub Actions CI
- `CONTRIBUTING.md`
- `SECURITY.md`

## 9. Release Strategy / 发布策略

Suggested versioning:

- `v0.1.x` - MVP fixes and packaging cleanup.
- `v0.2.x` - cross-platform packaging and better file associations.
- `v0.3.x` - export, clicker, more protocol checks.
- `v1.0.0` - signed stable builds, protocol docs, and compatibility test suite.

Keep the core player open source. Monetization, if needed later, should live around signed enterprise builds, support, white-label packaging, or advanced workflows rather than blocking the basic player/protocol.
