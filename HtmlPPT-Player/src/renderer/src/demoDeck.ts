export const DEMO_DECK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>HtmlPPT Player Demo</title>
    <style>
      :root {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #172026;
      }

      body {
        margin: 0;
      }

      .slide {
        width: 100vw;
        height: 100vh;
        box-sizing: border-box;
        padding: 72px;
        display: grid;
        align-content: center;
        gap: 24px;
        background: linear-gradient(135deg, #ffffff 0%, #eef6f7 100%);
      }

      .slide:nth-child(2) {
        background: #172026;
        color: #ffffff;
      }

      .slide h1 {
        max-width: 900px;
        margin: 0;
        font-size: 72px;
        line-height: 1;
        letter-spacing: 0;
      }

      .slide p {
        max-width: 720px;
        margin: 0;
        color: #52636b;
        font-size: 24px;
        line-height: 1.42;
      }

      .slide:nth-child(2) p {
        color: #b9c8ce;
      }

      .notes {
        display: none;
      }
    </style>
  </head>
  <body>
    <main class="deck" data-aspect-ratio="16:9">
      <section class="slide" data-title="Cover">
        <h1>HTML slides deserve a proper stage.</h1>
        <p>Open a single HTML file, present fullscreen, and keep the browser out of the room.</p>
        <aside class="notes">Introduce HtmlPPT Player as a native-feeling shell for AI-generated decks.</aside>
      </section>

      <section class="slide" data-title="Presenter">
        <h1>Presenter mode keeps private context private.</h1>
        <p>The projected screen gets only this slide. Notes and next preview stay with the speaker.</p>
        <aside class="notes">Point out that the audience window never receives the notes DOM.</aside>
      </section>
    </main>
  </body>
</html>`;
