import { describe, expect, it } from "vitest";
import { createSlideSrcDoc } from "../src/renderer/src/App";
import { parseDeckHtml } from "../src/shared/deckParser";

describe("parseDeckHtml", () => {
  it("splits standard .slide sections and extracts .notes", () => {
    const deck = parseDeckHtml(
      `<!doctype html>
      <html>
        <head><title>Quarterly Review</title></head>
        <body>
          <main class="deck">
            <section class="slide" data-title="Cover">
              <h1>Q4 Review</h1>
              <aside class="notes"><p>Open with the revenue story.</p></aside>
            </section>
            <section class="slide">
              <h2>Pipeline</h2>
              <aside class="notes">Mention enterprise renewals.</aside>
            </section>
          </main>
        </body>
      </html>`,
      "/tmp/review.html"
    );

    expect(deck.title).toBe("Quarterly Review");
    expect(deck.sourcePath).toBe("/tmp/review.html");
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]).toMatchObject({
      index: 0,
      title: "Cover",
      notesText: "Open with the revenue story."
    });
    expect(deck.slides[1]).toMatchObject({
      index: 1,
      title: "Pipeline",
      notesText: "Mention enterprise renewals."
    });
  });

  it("removes notes from audience html", () => {
    const deck = parseDeckHtml(`
      <section class="slide">
        <h1>Visible</h1>
        <aside class="notes"><strong>Secret note</strong></aside>
      </section>
    `);

    expect(deck.slides[0].notesHtml).toContain("Secret note");
    expect(deck.slides[0].html).toContain("Visible");
    expect(deck.slides[0].html).not.toContain("notes");
    expect(deck.slides[0].html).not.toContain("Secret note");
  });

  it("preserves line breaks in speaker notes", () => {
    const deck = parseDeckHtml(`
      <section class="slide">
        <h1>Notes</h1>
        <aside class="notes">
          First cue
          Second cue
        </aside>
      </section>
    `);

    expect(deck.slides[0].notesText).toBe("First cue\nSecond cue");
  });

  it("falls back to a single slide when no .slide exists", () => {
    const deck = parseDeckHtml("<h1>Loose HTML Deck</h1><p>No markers yet.</p>");

    expect(deck.slides).toHaveLength(1);
    expect(deck.slides[0]).toMatchObject({
      index: 0,
      title: "Loose HTML Deck",
      notesHtml: "",
      notesText: ""
    });
    expect(deck.slides[0].html).toContain("Loose HTML Deck");
  });

  it("preserves document head markup for slide frame rendering", () => {
    const deck = parseDeckHtml(`
      <html>
        <head>
          <style>.slide { color: red; }</style>
        </head>
        <body><section class="slide"><h1>Styled</h1></section></body>
      </html>
    `);

    expect(deck.headHtml).toContain(".slide { color: red; }");
  });

  it("preserves body classes for slide frame rendering", () => {
    const deck = parseDeckHtml(`
      <html>
        <head>
          <style>body.canvas-mode .slide { padding: 0; }</style>
        </head>
        <body class="canvas-mode">
          <section class="slide"><h1>Canvas slide</h1></section>
        </body>
      </html>
    `);

    expect(deck.bodyClass).toBe("canvas-mode");
    expect(createSlideSrcDoc(deck, deck.slides[0])).toContain('<body class="canvas-mode">');
  });
});
