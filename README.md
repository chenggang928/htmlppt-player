# HtmlPPT Player

[中文说明](README.zh-CN.md)

HtmlPPT Player is a desktop player for HTML presentation decks. It lets AI agents and humans create a normal local `.html` file, then present it without browser tabs, address bars, URLs, or other browser chrome.

The project includes three parts:

- `HtmlPPT-Player` - an Electron desktop app for opening and presenting HTML decks.
- `HtmlPPT-skill` - an agent skill/spec that teaches AI coding agents how to generate compatible decks.
- `HtmlPPT-demo` - a public demo deck showing what a polished HtmlPPT presentation can look like.

## Preview

![HtmlPPT Player projection hero](docs/images/readme-projection-hero.png)

![HtmlPPT Player main presentation view](docs/images/readme-player.png)

![HtmlPPT Player presenter mode](docs/images/readme-presenter.png)

## Why

AI coding agents are already good at generating rich HTML presentations. The awkward part starts when you need to present them: the browser shell is visible, speaker notes are missing, and projected content is not separated from presenter controls.

HtmlPPT Player gives HTML decks a presentation-native stage:

- Open local `.html`, `.htm`, and `.htmlppt` files.
- Present fullscreen without browser chrome.
- Use Play mode to mirror the current slide on the local display and projector.
- Use Presenter mode to show only the current slide on the projected display while the speaker sees notes, timer, controls, and slide thumbnails.
- Extract speaker notes from deck HTML and remove them from the audience render.
- Hot reload local HTML changes while preserving the current slide/session.

## Current Status

This is an MVP. The first target is macOS, with an Electron architecture that can be extended to Windows and Linux.

What works today:

- File picker, drag-and-drop, and command-line deck opening.
- Standard `.deck / .slide / .notes` parsing.
- Fallback single-slide rendering for non-standard HTML.
- Play mode and Presenter mode.
- Speaker notes editing with local file save-back.
- Slide thumbnails, timer, keyboard navigation, and hot reload.
- macOS app packaging through `electron-builder`.

## HtmlPPT Format

The recommended deck format is intentionally small:

```html
<main class="deck" data-aspect-ratio="16:9">
  <section class="slide" data-title="Cover">
    <h1>Visible slide content</h1>
    <aside class="notes">Speaker-only notes.</aside>
  </section>
</main>
```

Rules:

- Use one `<section class="slide">` per page.
- Put speaker notes inside that slide's `<aside class="notes">`.
- Use `data-title` for the title shown in presenter thumbnails.
- Use `data-aspect-ratio="16:9"` by default.
- Keep every slide non-scrolling and viewport-sized.
- Do not hide private notes with CSS; use `.notes` so the player can remove them from projected HTML.

See [HtmlPPT-skill/SKILL.md](HtmlPPT-skill/SKILL.md) for the full agent-facing specification.

## Quick Start

### Download the App

For most users, download the latest prebuilt app from GitHub Releases:

```text
https://github.com/chenggang928/htmlppt-player/releases
```

The source code lives in this repository. Release assets, such as macOS `.dmg`
or zipped app builds, should be attached to GitHub Releases instead of committed
to the repository.

The first public macOS builds may be unsigned. If so, mention this clearly in
the release notes so users know macOS may show a security prompt on first open.

### Build from Source

Install dependencies:

```bash
cd HtmlPPT-Player
npm install
```

Run the app in development:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Package a macOS app directory:

```bash
npm run pack:mac
```

Create a macOS release artifact:

```bash
npm run dist:mac
```

Create a Windows installer on Windows or GitHub Actions:

```bash
npm run dist:win
```

Windows `.exe` installers are best built on a Windows machine or the included
GitHub Actions workflow. macOS can be used for some cross-build targets, but
installer generation may require extra Windows packaging tools.

Create a Windows portable zip:

```bash
npm run dist:win:zip
```

Open the demo deck from the app:

```text
HtmlPPT-demo/ppt/index.html
```

## Keyboard Shortcuts

- `Right`, `Down`, `Space`, `PageDown` - next slide
- `Left`, `Up`, `PageUp` - previous slide
- `Esc` - exit fullscreen, Play mode, or Presenter mode

## Presenter Behavior

HtmlPPT Player has two presentation modes:

- Play mode: the current display enters fullscreen, and an external display mirrors the same current slide when available.
- Presenter mode: the external display shows only the current slide fullscreen. The main display shows current slide preview, notes, timer, slide thumbnails, and controls.

If there is only one display, Presenter mode enters rehearsal mode in the main window.

## Agent Skill

The `HtmlPPT-skill` folder is designed to be copied into an agent skill directory, usually as `htmlppt`.

Example:

```bash
mkdir -p ~/.codex/skills
cp -R HtmlPPT-skill ~/.codex/skills/htmlppt
```

Then ask an agent:

```text
Use $htmlppt to create a single-file HTML presentation deck for HtmlPPT Player.
```

## Demo

The public demo is:

```text
HtmlPPT-demo/ppt/index.html
```

It is a self-contained HTMLPPT deck with no remote assets. It demonstrates the protocol, speaker notes, presenter-safe rendering, and a more expressive HTML-native visual style.

## Repository Layout

```text
.
├── HtmlPPT-Player/   # Electron + Vite + React + TypeScript desktop app
├── HtmlPPT-skill/    # Agent skill/spec for compatible HTMLPPT decks
├── HtmlPPT-demo/     # Public demo deck
├── README.md
├── README.zh-CN.md
└── LICENSE
```

## Security Model

HtmlPPT decks are treated as local trusted files. The Electron app disables Node integration in renderer windows and exposes a minimal preload API. The projected audience window receives slide HTML with `.notes` removed.

Do not open untrusted HTML decks unless you would also trust opening that HTML locally.

## Roadmap

- Signed and notarized macOS releases.
- Windows and Linux packaging.
- Better file association and installer flows.
- PDF/image export.
- Remote clicker or phone controller.
- More official demo themes.
- Protocol docs and compatibility tests for agent-generated decks.

## License

Apache-2.0. See [LICENSE](LICENSE).
