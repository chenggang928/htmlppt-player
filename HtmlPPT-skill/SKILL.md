---
name: htmlppt
description: Create or adapt single-file HTML presentation decks for HtmlPPT Player. Use when a user asks for an HTML PPT, HTML slide deck, browserless presentation, speaker notes, presenter mode compatibility, or files that should open cleanly in HtmlPPT Player.
---

# HtmlPPT Deck Skill

Create one local-first HTML presentation that opens cleanly in HtmlPPT Player.

## Contract

Use this exact structure:

```html
<main class="deck" data-aspect-ratio="16:9">
  <section class="slide" data-title="Cover">
    <h1>Visible slide content</h1>
    <aside class="notes">Speaker-only notes.</aside>
  </section>
</main>
```

- Use `.deck` as the recommended outer wrapper.
- Use one `.slide` per presentation page.
- Put speaker notes inside that slide's `.notes` only.
- Use `data-title` when the sidebar thumbnail title should differ from the visible heading.
- Use `data-aspect-ratio="16:9"` by default. The player also reads it from `<html data-aspect-ratio="16:9">`.

HtmlPPT Player parses every `.slide`, extracts the first `.notes`, removes all `.notes` from audience HTML, preserves document `<head>` styles, and renders each slide in an isolated frame.

## Workflow

1. Plan the deck as slide-sized pages, not as a scrolling webpage.
2. Generate a single `.html` file unless the user explicitly wants a folder with local assets.
3. Keep all visible content inside `.slide`; never depend on browser UI, URL state, tabs, address bars, or page scroll.
4. Write concise speaker notes for each slide in `.notes`.
5. Verify the compatibility checklist before finishing.

## Page Template

Use this baseline unless the user provides an existing design system:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Deck title</title>
    <style>
      :root {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #172026;
        background: #ffffff;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: #ffffff;
      }

      .deck {
        width: 100%;
      }

      .slide {
        width: 100vw;
        height: 100vh;
        padding: 64px 72px;
        overflow: hidden;
        display: grid;
        align-content: center;
        gap: 24px;
        background: #ffffff;
      }

      .slide h1 {
        margin: 0;
        max-width: 920px;
        font-size: 64px;
        line-height: 1.02;
        letter-spacing: 0;
      }

      .slide p {
        margin: 0;
        max-width: 760px;
        font-size: 24px;
        line-height: 1.38;
        color: #52636b;
      }

      .notes {
        display: none;
      }
    </style>
  </head>
  <body>
    <main class="deck" data-aspect-ratio="16:9">
      <section class="slide" data-title="Opening">
        <h1>Opening slide</h1>
        <p>Visible slide content.</p>
        <aside class="notes">Private speaker cue.</aside>
      </section>
    </main>
  </body>
</html>
```

## Design Rules

- Design for a 16:9, 1280x720 presentation frame.
- Keep every slide self-contained and non-scrolling; reduce content, columns, or font size before allowing overflow.
- Use stable dimensions for grids, charts, image areas, and cards so thumbnails and fullscreen playback do not shift.
- Use code-native text for important content; avoid baking all text into images.
- Prefer local relative images, inline SVG, or data URLs. Avoid network-only assets and CDNs unless requested.
- Use images with meaningful `alt` text and ensure relative paths resolve from the HTML file location.
- Let HtmlPPT Player handle keyboard navigation and presentation controls; do not add in-slide navigation chrome.
- Keep slide UI visually quiet and presentation-like. Avoid website landing-page patterns unless the user explicitly asks for a web page.

## Notes Rules

- Put all speaker-only content in `<aside class="notes">...</aside>`.
- Do not hide notes in regular slide elements with CSS, comments, data attributes, or offscreen positioning.
- Do not make visible slide content depend on `.notes`; the player removes notes from projected/audience rendering.
- Write notes as editable plain speaker cues. HTML is allowed, but simple text is safest.

## Avoid

- A deck with no `.slide` markers. The player can fallback to one slide, but generated decks should not rely on fallback.
- Scroll-driven layouts, full-page websites, browser-based routers, hash navigation, or custom keyboard handlers.
- Remote fonts/scripts/images that are required for the deck to look correct offline.
- Global CSS that breaks isolated slide rendering, such as assuming `.deck` must be horizontally translated.
- Content that touches slide edges. Keep a safe margin unless the design intentionally uses full-bleed media.

## Compatibility Checklist

Before finishing, check:

- The file is a valid single HTML document with a meaningful `<title>`.
- Every page is a `<section class="slide">`.
- The deck uses `<main class="deck" data-aspect-ratio="16:9">`.
- Every slide has a useful heading or `data-title`.
- Speaker notes exist only in `.notes`.
- No `.notes` content is needed by the audience slide.
- Each slide fits inside a 16:9 frame without scrolling or clipped text.
- Images are local/relative, inline, or intentionally remote.
- The deck works with Play mode and Presenter mode without in-slide controls.
