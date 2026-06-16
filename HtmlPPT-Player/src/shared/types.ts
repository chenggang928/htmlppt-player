export interface Slide {
  id: string;
  index: number;
  title: string;
  html: string;
  notesHtml: string;
  notesText: string;
}

export interface DeckManifest {
  title: string;
  sourcePath?: string;
  aspectRatio: string;
  bodyClass: string;
  headHtml: string;
  slides: Slide[];
}

export interface PresentationState {
  deck: DeckManifest;
  currentIndex: number;
  elapsedSeconds: number;
  isPresenterMode: boolean;
  audienceWindowActive: boolean;
  rehearsalMode: boolean;
}

export type NavigateTarget = "next" | "previous" | number;
export type MenuCommand = "open-deck" | "start-slideshow" | "start-presenter" | "stop-presenter";

export interface PresenterModeOptions {
  audienceWindowActive: boolean;
  rehearsalMode: boolean;
}

export interface OpenDeckResult {
  filePath: string;
  html: string;
}

export interface SlideshowModeResult {
  audienceWindowActive: boolean;
}

export interface DeckLoadOptions {
  preserveIndex?: boolean;
  preserveSession?: boolean;
}

export interface HtmlPptApi {
  openDeck: (filePath?: string) => Promise<OpenDeckResult | null>;
  getPathForFile: (file: File) => string | undefined;
  getStartupDeckPath: () => Promise<string | null>;
  deckLoaded: (deck: DeckManifest, options?: DeckLoadOptions) => Promise<PresentationState>;
  navigate: (target: NavigateTarget) => Promise<PresentationState>;
  updateSlideNotes: (slideIndex: number, notesText: string) => Promise<PresentationState>;
  startSlideshowMode: () => Promise<SlideshowModeResult>;
  stopSlideshowMode: () => Promise<SlideshowModeResult>;
  startPresenterMode: () => Promise<PresentationState>;
  stopPresenterMode: () => Promise<PresentationState>;
  getState: () => Promise<PresentationState>;
  subscribeState: (listener: (state: PresentationState) => void) => () => void;
  subscribeDeckFileChange: (listener: (result: OpenDeckResult) => void) => () => void;
  subscribeMenuCommand: (listener: (command: MenuCommand) => void) => () => void;
  subscribeSlideshowExit: (listener: () => void) => () => void;
}
