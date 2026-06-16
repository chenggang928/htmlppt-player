import { createEmptyDeck } from "../../shared/deckFixtures";
import { PresentationStore } from "../../shared/presentationState";
import type { HtmlPptApi, OpenDeckResult, PresentationState } from "../../shared/types";

function chooseHtmlFile(): Promise<OpenDeckResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".html,.htm,.htmlppt,text/html";
    input.style.display = "none";

    input.addEventListener(
      "change",
      async () => {
        const file = input.files?.[0];
        input.remove();

        if (!file) {
          resolve(null);
          return;
        }

        resolve({
          filePath: file.name,
          html: await file.text()
        });
      },
      { once: true }
    );

    document.body.append(input);
    input.click();
  });
}

export function installBrowserFallbackApi(): void {
  if (window.htmlppt) {
    return;
  }

  const store = new PresentationStore(createEmptyDeck());
  const listeners = new Set<(state: PresentationState) => void>();

  const emit = () => {
    const state = store.getState();
    listeners.forEach((listener) => listener(state));
  };

  store.subscribe(emit);

  const api: HtmlPptApi = {
    openDeck: async () => chooseHtmlFile(),
    getPathForFile: () => undefined,
    getStartupDeckPath: async () => null,
    deckLoaded: async (deck, options) => {
      store.setDeck(deck, options);
      return store.getState();
    },
    navigate: async (target) => {
      store.navigate(target);
      return store.getState();
    },
    updateSlideNotes: async (slideIndex, notesText) => {
      store.updateSlideNotes(slideIndex, notesText);
      return store.getState();
    },
    startSlideshowMode: async () => ({ audienceWindowActive: false }),
    stopSlideshowMode: async () => ({ audienceWindowActive: false }),
    startPresenterMode: async () => {
      store.startPresenterMode({ audienceWindowActive: false, rehearsalMode: true });
      return store.getState();
    },
    stopPresenterMode: async () => {
      store.stopPresenterMode();
      return store.getState();
    },
    getState: async () => store.getState(),
    subscribeState: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeDeckFileChange: () => () => {},
    subscribeMenuCommand: () => () => {},
    subscribeSlideshowExit: () => () => {}
  };

  window.htmlppt = api;
}
