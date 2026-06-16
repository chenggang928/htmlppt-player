import type { DeckManifest, Slide } from "./types";

function getDocumentTitle(document: Document): string {
  const title = document.querySelector("title")?.textContent?.trim();
  if (title) {
    return title;
  }

  const heading = document.querySelector("h1, h2, h3")?.textContent?.trim();
  return heading || "Untitled Deck";
}

function getBodyClass(document: Document): string {
  return document.body.className.trim();
}

function getSlideTitle(slideElement: Element, index: number): string {
  const explicitTitle = slideElement.getAttribute("data-title")?.trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const heading = slideElement.querySelector("h1, h2, h3")?.textContent?.trim();
  return heading || `Slide ${index + 1}`;
}

function normalizeText(element: Element | null): string {
  return (
    element?.textContent
      ?.replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() ?? ""
  );
}

function cloneWithoutNotes(slideElement: Element): Element {
  const clone = slideElement.cloneNode(true) as Element;
  clone.querySelectorAll(".notes").forEach((node) => node.remove());
  return clone;
}

function createSlide(slideElement: Element, index: number): Slide {
  const notesElement = slideElement.querySelector(".notes");
  const audienceElement = cloneWithoutNotes(slideElement);
  const id = slideElement.id || `slide-${index + 1}`;

  return {
    id,
    index,
    title: getSlideTitle(slideElement, index),
    html: audienceElement.outerHTML,
    notesHtml: notesElement?.innerHTML.trim() ?? "",
    notesText: normalizeText(notesElement)
  };
}

function parseWithDomParser(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

export function parseDeckHtml(html: string, sourcePath?: string): DeckManifest {
  const document = parseWithDomParser(html);
  const slideElements = Array.from(document.querySelectorAll(".slide"));
  const aspectRatio =
    document.querySelector(".deck")?.getAttribute("data-aspect-ratio")?.trim() ||
    document.documentElement.getAttribute("data-aspect-ratio")?.trim() ||
    "16:9";

  if (slideElements.length > 0) {
    return {
      title: getDocumentTitle(document),
      sourcePath,
      aspectRatio,
      bodyClass: getBodyClass(document),
      headHtml: document.head.innerHTML.trim(),
      slides: slideElements.map(createSlide)
    };
  }

  const bodyContent = document.body.innerHTML.trim() || html.trim();
  const fallbackWrapper = document.createElement("section");
  fallbackWrapper.className = "slide";
  fallbackWrapper.innerHTML = bodyContent;

  return {
    title: getDocumentTitle(document),
    sourcePath,
    aspectRatio,
    bodyClass: getBodyClass(document),
    headHtml: document.head.innerHTML.trim(),
    slides: [createSlide(fallbackWrapper, 0)]
  };
}
