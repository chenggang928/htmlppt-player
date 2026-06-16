import type {
  DeckLoadOptions,
  DeckManifest,
  NavigateTarget,
  PresentationState,
  PresenterModeOptions
} from "./types";

type Listener = (state: PresentationState) => void;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createInitialState(deck: DeckManifest): PresentationState {
  return {
    deck,
    currentIndex: 0,
    elapsedSeconds: 0,
    isPresenterMode: false,
    audienceWindowActive: false,
    rehearsalMode: false
  };
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export class PresentationStore {
  private state: PresentationState;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private startedAt = 0;

  constructor(deck: DeckManifest) {
    this.state = createInitialState(deck);
  }

  getState(): PresentationState {
    return { ...this.state };
  }

  setDeck(deck: DeckManifest, options: DeckLoadOptions = {}): void {
    const nextIndex = options.preserveIndex
      ? clamp(this.state.currentIndex, 0, Math.max(deck.slides.length - 1, 0))
      : 0;

    if (options.preserveSession && this.state.isPresenterMode) {
      this.state = {
        ...this.state,
        deck,
        currentIndex: nextIndex
      };
      this.emit();
      return;
    }

    this.stopTimer();
    this.state = {
      ...createInitialState(deck),
      currentIndex: nextIndex
    };
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  navigate(target: NavigateTarget): void {
    const maxIndex = Math.max(this.state.deck.slides.length - 1, 0);
    const nextIndex =
      target === "next"
        ? this.state.currentIndex + 1
        : target === "previous"
          ? this.state.currentIndex - 1
          : target;

    const clampedIndex = clamp(nextIndex, 0, maxIndex);
    if (clampedIndex === this.state.currentIndex) {
      return;
    }

    this.state = { ...this.state, currentIndex: clampedIndex };
    this.emit();
  }

  updateSlideNotes(slideIndex: number, notesText: string): void {
    if (slideIndex < 0 || slideIndex >= this.state.deck.slides.length) {
      return;
    }

    const slides = this.state.deck.slides.map((slide, index) =>
      index === slideIndex
        ? {
            ...slide,
            notesHtml: escapeHtml(notesText),
            notesText
          }
        : slide
    );

    this.state = {
      ...this.state,
      deck: {
        ...this.state.deck,
        slides
      }
    };
    this.emit();
  }

  startPresenterMode(options: PresenterModeOptions): void {
    this.stopTimer();
    this.startedAt = Date.now();
    this.state = {
      ...this.state,
      elapsedSeconds: 0,
      isPresenterMode: true,
      audienceWindowActive: options.audienceWindowActive,
      rehearsalMode: options.rehearsalMode
    };
    this.emit();

    this.timer = setInterval(() => {
      this.state = {
        ...this.state,
        elapsedSeconds: Math.floor((Date.now() - this.startedAt) / 1000)
      };
      this.emit();
    }, 1000);
  }

  stopPresenterMode(): void {
    this.stopTimer();
    this.state = {
      ...this.state,
      elapsedSeconds: 0,
      isPresenterMode: false,
      audienceWindowActive: false,
      rehearsalMode: false
    };
    this.emit();
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private emit(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
