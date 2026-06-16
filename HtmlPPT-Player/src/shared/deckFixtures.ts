import type { DeckManifest } from "./types";

export function createEmptyDeck(slideCount = 1): DeckManifest {
  return {
    title: "Untitled Deck",
    aspectRatio: "16:9",
    bodyClass: "",
    headHtml: "",
    slides: Array.from({ length: slideCount }, (_, index) => ({
      id: `slide-${index + 1}`,
      index,
      title: `Slide ${index + 1}`,
      html: `<section class="slide"><h1>Slide ${index + 1}</h1></section>`,
      notesHtml: "",
      notesText: ""
    }))
  };
}
