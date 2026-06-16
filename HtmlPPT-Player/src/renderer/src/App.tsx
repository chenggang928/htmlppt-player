import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Columns2,
  FileUp,
  MonitorUp,
  Play,
  Square
} from "lucide-react";
import appIconUrl from "../../../assets/icon/icon.png";
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { parseDeckHtml } from "../../shared/deckParser";
import type { DeckManifest, PresentationState, Slide } from "../../shared/types";
import { DEMO_DECK_HTML } from "./demoDeck";

type Route = "player" | "audience";
type FrameKeyboardHandler = (event: KeyboardEvent) => void;

function getRoute(): Route {
  return window.location.hash.includes("audience") ? "audience" : "player";
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function baseHrefFor(sourcePath?: string): string {
  if (!sourcePath || !sourcePath.includes("/")) {
    return "";
  }

  if (sourcePath.startsWith("http://") || sourcePath.startsWith("https://") || sourcePath.startsWith("file://")) {
    return sourcePath.slice(0, sourcePath.lastIndexOf("/") + 1);
  }

  const normalized = sourcePath.replaceAll("\\", "/");
  const directory = normalized.slice(0, normalized.lastIndexOf("/") + 1);
  const encodedDirectory = directory
    .split("/")
    .map((segment, index) => (index === 0 && /^[A-Za-z]:$/.test(segment) ? segment : encodeURIComponent(segment)))
    .join("/");
  return `file://${directory.startsWith("/") ? "" : "/"}${encodedDirectory}`;
}

function aspectRatioToNumber(aspectRatio: string): number {
  const ratioParts = aspectRatio.split("/").map((part) => Number(part.trim()));
  if (ratioParts.length === 2 && ratioParts[0] > 0 && ratioParts[1] > 0) {
    return ratioParts[0] / ratioParts[1];
  }

  const numericRatio = Number(aspectRatio);
  return Number.isFinite(numericRatio) && numericRatio > 0 ? numericRatio : 16 / 9;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  const element = target as (Element & { isContentEditable?: boolean; tagName?: string }) | null;
  if (!element || typeof element !== "object") {
    return false;
  }

  const tagName = typeof element.tagName === "string" ? element.tagName.toLowerCase() : "";
  if (element.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  return typeof element.closest === "function"
    ? Boolean(element.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"))
    : false;
}

function handlePresentationKeyboardEvent(event: KeyboardEvent, isPresenterMode: boolean): boolean {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isEditableKeyboardTarget(event.target)) {
    return false;
  }

  if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === " " || event.key === "Spacebar" || event.key === "PageDown") {
    event.preventDefault();
    void window.htmlppt.navigate("next");
    return true;
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "PageUp") {
    event.preventDefault();
    void window.htmlppt.navigate("previous");
    return true;
  }

  if (event.key === "Escape") {
    event.preventDefault();

    if (isPresenterMode) {
      void window.htmlppt.stopPresenterMode();
      return true;
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void window.htmlppt.stopSlideshowMode();
    }

    return true;
  }

  return false;
}

function preventButtonMouseFocus(event: ReactMouseEvent<HTMLElement>) {
  if (event.button !== 0) {
    return;
  }

  const target = event.target as Element | null;
  if (target?.closest("button")) {
    event.preventDefault();
  }
}

type PresenterLayout = {
  stageWidth: number;
  stageHeight: number;
  notesHeight: number;
};

function computePresenterLayout(width: number, height: number, aspectRatio: number): PresenterLayout {
  const controlsHeight = 54;
  const minNotesHeight = 104;
  const preferredNotesHeight = Math.min(136, Math.max(minNotesHeight, height * 0.11));
  const minThumbnailsWidth = Math.min(320, Math.max(250, width * 0.13));
  const minStageWidth = 640;

  let stageHeight = Math.max(360, height - preferredNotesHeight - controlsHeight);
  let stageWidth = stageHeight * aspectRatio;

  if (stageWidth > width - minThumbnailsWidth) {
    stageWidth = Math.max(minStageWidth, width - minThumbnailsWidth);
    stageHeight = stageWidth / aspectRatio;
  }

  const notesHeight = Math.max(minNotesHeight, height - stageHeight - controlsHeight);

  return {
    stageWidth,
    stageHeight,
    notesHeight
  };
}

function usePresenterLayout(aspectRatio: string) {
  const ref = useRef<HTMLElement | null>(null);
  const numericAspectRatio = useMemo(() => aspectRatioToNumber(aspectRatio), [aspectRatio]);
  const [layout, setLayout] = useState<PresenterLayout | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const updateLayout = () => {
      const bounds = element.getBoundingClientRect();
      const nextLayout = computePresenterLayout(bounds.width, bounds.height, numericAspectRatio);
      setLayout((previousLayout) => {
        if (
          previousLayout &&
          Math.abs(previousLayout.stageWidth - nextLayout.stageWidth) < 0.5 &&
          Math.abs(previousLayout.stageHeight - nextLayout.stageHeight) < 0.5 &&
          Math.abs(previousLayout.notesHeight - nextLayout.notesHeight) < 0.5
        ) {
          return previousLayout;
        }

        return nextLayout;
      });
    };

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(element);
    return () => observer.disconnect();
  }, [numericAspectRatio]);

  return { ref, layout };
}

export function createSlideSrcDoc(deck: DeckManifest, slide: Slide): string {
  const baseHref = baseHrefFor(deck.sourcePath);
  const base = baseHref ? `<base href="${escapeAttribute(baseHref)}">` : "";
  const bodyClass = deck.bodyClass ? ` class="${escapeAttribute(deck.bodyClass)}"` : "";
  const aspectRatio = escapeAttribute(deck.aspectRatio);

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8">
    ${base}
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #ffffff;
      }
      body {
        display: grid;
        place-items: center;
      }
      .slide {
        box-sizing: border-box;
        width: 100vw;
        height: 100vh;
      }
    </style>
    ${deck.headHtml}
    <style>
      #deck.htmlppt-single-slide {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        display: flex !important;
        flex-wrap: nowrap !important;
        transform: none !important;
      }
      #deck.htmlppt-single-slide > .slide {
        flex: 0 0 100vw !important;
      }
      .notes { display: none !important; }
    </style>
  </head>
  <body${bodyClass}><main id="deck" class="deck htmlppt-single-slide" data-aspect-ratio="${aspectRatio}">${slide.html}</main></body>
</html>`;
}

function useSlideScale() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [frameTransform, setFrameTransform] = useState({ scale: 1, x: 0, y: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const updateScale = () => {
      const bounds = element.getBoundingClientRect();
      const scale = Math.min(bounds.width / 1280, bounds.height / 720);
      setFrameTransform({
        scale,
        x: Math.max(0, (bounds.width - 1280 * scale) / 2),
        y: Math.max(0, (bounds.height - 720 * scale) / 2)
      });
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, frameTransform };
}

function usePresentationState(route: Route) {
  const [state, setState] = useState<PresentationState | null>(null);

  useEffect(() => {
    let active = true;
    let hasReceivedStateUpdate = false;

    window.htmlppt.getState().then((nextState) => {
      if (active && !hasReceivedStateUpdate) {
        setState(nextState);
      }
    });

    const unsubscribe = window.htmlppt.subscribeState((nextState) => {
      hasReceivedStateUpdate = true;
      setState(nextState);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const demoMode = new URLSearchParams(window.location.search).get("demo") === "1";
    if (demoMode) {
      window.htmlppt.deckLoaded(parseDeckHtml(DEMO_DECK_HTML, "demo.html"));
      return () => {
        active = false;
      };
    }

    if (route === "audience") {
      return;
    }

    window.htmlppt.getStartupDeckPath().then(async (filePath) => {
      if (!active || !filePath) {
        return;
      }

      const result = await window.htmlppt.openDeck(filePath);
      if (!result) {
        return;
      }

      const deck = parseDeckHtml(result.html, result.filePath);
      await window.htmlppt.deckLoaded(deck);
    });

    return () => {
      active = false;
    };
  }, [route]);

  useEffect(() => {
    if (route === "audience") {
      return;
    }

    return window.htmlppt.subscribeDeckFileChange((result) => {
      try {
        const deck = parseDeckHtml(result.html, result.filePath);
        void window.htmlppt.deckLoaded(deck, { preserveIndex: true, preserveSession: true });
      } catch (error) {
        console.error("Unable to hot reload HtmlPPT deck", error);
      }
    });
  }, [route]);

  return state;
}

function SlideFrame({
  deck,
  slide,
  className = "",
  onFrameKeyDown
}: {
  deck: DeckManifest;
  slide: Slide;
  className?: string;
  onFrameKeyDown?: FrameKeyboardHandler;
}) {
  const srcDoc = useMemo(() => createSlideSrcDoc(deck, slide), [deck, slide]);
  const { ref, frameTransform } = useSlideScale();
  const onFrameKeyDownRef = useRef(onFrameKeyDown);
  const cleanupFrameKeyboardRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    onFrameKeyDownRef.current = onFrameKeyDown;
  }, [onFrameKeyDown]);

  useEffect(
    () => () => {
      cleanupFrameKeyboardRef.current?.();
    },
    []
  );

  const bindFrameKeyboard = useCallback((event: SyntheticEvent<HTMLIFrameElement>) => {
    cleanupFrameKeyboardRef.current?.();

    const frameWindow = event.currentTarget.contentWindow;
    if (!frameWindow || !onFrameKeyDownRef.current) {
      cleanupFrameKeyboardRef.current = undefined;
      return;
    }

    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      onFrameKeyDownRef.current?.(keyboardEvent);
    };

    frameWindow.addEventListener("keydown", onKeyDown, true);
    cleanupFrameKeyboardRef.current = () => frameWindow.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return (
    <div className={`slide-viewport ${className}`} ref={ref}>
      <iframe
        className="slide-frame"
        title={slide.title}
        srcDoc={srcDoc}
        onLoad={bindFrameKeyboard}
        sandbox="allow-scripts allow-same-origin"
        style={{ transform: `translate(${frameTransform.x}px, ${frameTransform.y}px) scale(${frameTransform.scale})` }}
      />
    </div>
  );
}

function EmptyState({ onOpen }: { onOpen: () => void }) {
  return (
    <main className="empty-shell">
      <div className="empty-panel">
        <img className="empty-app-icon" src={appIconUrl} alt="" />
        <h1>HtmlPPT Player</h1>
        <p>打开或拖入一个 HTMLPPT 演示稿。</p>
        <button className="primary-button" onClick={onOpen}>
          <FileUp size={18} />
          打开演示稿
        </button>
        <div className="empty-meta">支持 .html / .htm / .htmlppt</div>
      </div>
    </main>
  );
}

function Toolbar({
  state,
  onOpen,
  onPresenter,
  onStartSlideshow
}: {
  state: PresentationState;
  onOpen: () => void;
  onPresenter: () => void;
  onStartSlideshow: () => void;
}) {
  const current = state.currentIndex + 1;
  const total = state.deck.slides.length;

  return (
    <header className="toolbar" onMouseDown={preventButtonMouseFocus}>
      <div className="toolbar-file">
        <button aria-label="Open presentation deck" title="Open presentation deck" onClick={onOpen}>
          <FileUp size={18} />
        </button>
      </div>
      <div className="toolbar-center">
        <button title="Previous slide" onClick={() => window.htmlppt.navigate("previous")}>
          <ChevronLeft size={18} />
        </button>
        <span className="slide-count">
          {current} / {total}
        </span>
        <button title="Next slide" onClick={() => window.htmlppt.navigate("next")}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="toolbar-window-drag" aria-hidden="true" />
      <div className="toolbar-actions">
        <button
          aria-label="Start slideshow from current slide"
          title="Start slideshow from current slide"
          onClick={onStartSlideshow}
        >
          <Play size={18} />
        </button>
        <button className="accent-button" title="Presenter mode" onClick={onPresenter}>
          <MonitorUp size={18} />
          Presenter
        </button>
      </div>
    </header>
  );
}

function ProgressRail({ state }: { state: PresentationState }) {
  const total = Math.max(state.deck.slides.length - 1, 1);
  const progress = state.deck.slides.length <= 1 ? 100 : (state.currentIndex / total) * 100;

  return (
    <div className="progress-rail" aria-hidden="true">
      <div style={{ width: `${progress}%` }} />
    </div>
  );
}

function PlayerView({
  state,
  onOpen,
  onPresenter,
  onStartSlideshow,
  onFrameKeyDown
}: {
  state: PresentationState;
  onOpen: () => void;
  onPresenter: () => void;
  onStartSlideshow: () => void;
  onFrameKeyDown: FrameKeyboardHandler;
}) {
  const slide = state.deck.slides[state.currentIndex];

  return (
    <div className="app-shell">
      <Toolbar state={state} onOpen={onOpen} onPresenter={onPresenter} onStartSlideshow={onStartSlideshow} />
      <main className="stage-shell">
        <div className="stage-surface">
          <SlideFrame deck={state.deck} slide={slide} onFrameKeyDown={onFrameKeyDown} />
        </div>
      </main>
      <ProgressRail state={state} />
    </div>
  );
}

function PresenterView({
  state,
  onStop,
  onFrameKeyDown
}: {
  state: PresentationState;
  onStop: () => void;
  onFrameKeyDown: FrameKeyboardHandler;
}) {
  const currentSlide = state.deck.slides[state.currentIndex];
  const { ref: presenterGridRef, layout } = usePresenterLayout(state.deck.aspectRatio);
  const presenterGridStyle = layout
    ? ({
        "--presenter-stage-width": `${layout.stageWidth}px`,
        "--presenter-stage-height": `${layout.stageHeight}px`,
        "--presenter-notes-height": `${layout.notesHeight}px`
      } as CSSProperties)
    : undefined;

  return (
    <div className="presenter-shell">
      <header className="presenter-topbar">
        <div className="presenter-window-drag" aria-hidden="true" />
      </header>

      <main className="presenter-grid" ref={presenterGridRef} style={presenterGridStyle}>
        <section className="presenter-stage-panel" aria-label="Current slide">
          <div className="presenter-current">
            <SlideFrame deck={state.deck} slide={currentSlide} onFrameKeyDown={onFrameKeyDown} />
          </div>
        </section>
        <SlideNavigator state={state} />
        <section className="notes-panel">
          <div className="panel-heading">
            <Play size={16} />
            <span>Notes</span>
          </div>
          <NotesEditor slideIndex={state.currentIndex} notesText={currentSlide.notesText} />
        </section>
        <section className="presenter-controls" aria-label="Presenter controls" onMouseDown={preventButtonMouseFocus}>
          <div className="presenter-status" aria-label="Presenter status">
            <span>
              <Clock3 size={16} />
              {formatTime(state.elapsedSeconds)}
            </span>
            <span>
              {state.currentIndex + 1} / {state.deck.slides.length}
            </span>
          </div>
          <div className="presenter-action-group">
            <button className="presenter-nav-button" onClick={() => window.htmlppt.navigate("previous")}>
              <ChevronLeft size={18} />
              Previous
            </button>
            <button className="primary-button presenter-nav-button is-primary" onClick={() => window.htmlppt.navigate("next")}>
              Next
              <ChevronRight size={18} />
            </button>
            <button className="presenter-stop-button" title="Stop presenter mode" onClick={onStop}>
              <Square size={16} />
              Stop
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function NotesEditor({ slideIndex, notesText }: { slideIndex: number; notesText: string }) {
  const [draft, setDraft] = useState(notesText);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const saveNotes = useCallback(
    (nextNotes: string) => {
      void window.htmlppt.updateSlideNotes(slideIndex, nextNotes).catch((error) => {
        console.error("Unable to update slide notes", error);
      });
    },
    [slideIndex]
  );

  useEffect(() => {
    setDraft(notesText);
  }, [slideIndex, notesText]);

  useEffect(
    () => () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    },
    []
  );

  const scheduleSave = (nextNotes: string) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      saveNotes(nextNotes);
      saveTimer.current = undefined;
    }, 450);
  };

  const flushSave = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = undefined;
    }
    saveNotes(draft);
  };

  return (
    <textarea
      className="notes-editor"
      aria-label="Speaker notes"
      placeholder="Add speaker notes for this slide..."
      value={draft}
      onBlur={flushSave}
      onChange={(event) => {
        const nextNotes = event.target.value;
        setDraft(nextNotes);
        scheduleSave(nextNotes);
      }}
    />
  );
}

function SlideNavigator({ state }: { state: PresentationState }) {
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    const active = activeRef.current;

    if (!list || !active) {
      return;
    }

    const listRect = list.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const preferredTopInset = Math.max(12, list.clientHeight * 0.18);
    const targetScrollTop = list.scrollTop + activeRect.top - listRect.top - preferredTopInset;
    const maxScrollTop = Math.max(0, list.scrollHeight - list.clientHeight);
    const nextScrollTop = Math.min(Math.max(0, targetScrollTop), maxScrollTop);

    if (Math.abs(list.scrollTop - nextScrollTop) > 1) {
      list.scrollTo({ top: nextScrollTop, behavior: "smooth" });
    }
  }, [state.currentIndex]);

  return (
    <section className="thumbnail-panel" aria-label="Slide thumbnails">
      <div className="panel-heading">
        <Columns2 size={16} />
        <span>Slides</span>
      </div>
      <div className="thumbnail-list" ref={listRef}>
        {state.deck.slides.map((slide, index) => {
          const isActive = index === state.currentIndex;
          const title = slide.title || `Slide ${index + 1}`;

          return (
            <button
              key={slide.id}
              ref={isActive ? activeRef : undefined}
              className={`thumbnail-card${isActive ? " is-active" : ""}`}
              type="button"
              data-slide-index={index}
              data-testid="slide-thumbnail"
              title={`Go to slide ${index + 1}: ${title}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => window.htmlppt.navigate(index)}
            >
              <span className="thumbnail-meta">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{title}</span>
              </span>
              <SlideFrame deck={state.deck} slide={slide} className="thumbnail-frame" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AudienceView({ state, onFrameKeyDown }: { state: PresentationState; onFrameKeyDown: FrameKeyboardHandler }) {
  const slide = state.deck.slides[state.currentIndex];

  return (
    <main className="audience-shell">
      <SlideFrame deck={state.deck} slide={slide} className="audience-frame" onFrameKeyDown={onFrameKeyDown} />
    </main>
  );
}

function isInitialEmptyDeck(state: PresentationState): boolean {
  return (
    state.deck.title === "Untitled Deck" &&
    !state.deck.sourcePath &&
    state.deck.slides.length === 1 &&
    state.deck.slides[0].id === "slide-1" &&
    state.deck.slides[0].notesText === ""
  );
}

export function App() {
  const route = getRoute();
  const state = usePresentationState(route);

  const openDeck = useCallback(async () => {
    const result = await window.htmlppt.openDeck();
    if (!result) {
      return;
    }

    const deck = parseDeckHtml(result.html, result.filePath);
    await window.htmlppt.deckLoaded(deck);
  }, []);

  const openDroppedDeck = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0] as (File & { path?: string }) | undefined;
    if (!file) {
      return;
    }

    const filePath = window.htmlppt.getPathForFile(file) ?? file.path;
    if (filePath) {
      const result = await window.htmlppt.openDeck(filePath);
      if (result) {
        await window.htmlppt.deckLoaded(parseDeckHtml(result.html, result.filePath));
      }
      return;
    }

    const html = await file.text();
    await window.htmlppt.deckLoaded(parseDeckHtml(html, file.name));
  }, []);

  const startPresenter = useCallback(() => {
    void window.htmlppt.startPresenterMode();
  }, []);

  const stopPresenter = useCallback(() => {
    void window.htmlppt.stopPresenterMode();
  }, []);

  const startSlideshow = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (error) {
        console.error("Unable to start local slideshow fullscreen", error);
        return;
      }
    }

    void window.htmlppt.startSlideshowMode();
  }, []);

  const onPresentationKeyDown = useCallback(
    (event: KeyboardEvent) => {
      handlePresentationKeyboardEvent(event, Boolean(state?.isPresenterMode));
    },
    [state?.isPresenterMode]
  );

  useEffect(() => {
    window.addEventListener("keydown", onPresentationKeyDown, true);
    return () => window.removeEventListener("keydown", onPresentationKeyDown, true);
  }, [onPresentationKeyDown]);

  useEffect(() => {
    if (route === "audience") {
      return;
    }

    return window.htmlppt.subscribeSlideshowExit(() => {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      }
    });
  }, [route]);

  useEffect(() => {
    if (route === "audience") {
      return;
    }

    const stopSlideshowWhenLeavingFullscreen = () => {
      if (!document.fullscreenElement && !state?.isPresenterMode) {
        void window.htmlppt.stopSlideshowMode();
      }
    };

    document.addEventListener("fullscreenchange", stopSlideshowWhenLeavingFullscreen);
    return () => document.removeEventListener("fullscreenchange", stopSlideshowWhenLeavingFullscreen);
  }, [route, state?.isPresenterMode]);

  useEffect(() => {
    if (route === "audience") {
      return;
    }

    return window.htmlppt.subscribeMenuCommand((command) => {
      if (command === "open-deck") {
        void openDeck();
      }
      if (command === "start-slideshow") {
        void startSlideshow();
      }
      if (command === "start-presenter") {
        startPresenter();
      }
      if (command === "stop-presenter") {
        stopPresenter();
      }
    });
  }, [openDeck, route, startPresenter, startSlideshow, stopPresenter]);

  if (!state) {
    return <div className="loading-screen">Loading HtmlPPT Player</div>;
  }

  if (route === "audience") {
    return <AudienceView state={state} onFrameKeyDown={onPresentationKeyDown} />;
  }

  if (isInitialEmptyDeck(state)) {
    return (
      <div className="drop-surface" onDrop={openDroppedDeck} onDragOver={(event) => event.preventDefault()}>
        <EmptyState onOpen={openDeck} />
      </div>
    );
  }

  return (
    <div className="drop-surface" onDrop={openDroppedDeck} onDragOver={(event) => event.preventDefault()}>
      {state.isPresenterMode ? (
        <PresenterView state={state} onStop={stopPresenter} onFrameKeyDown={onPresentationKeyDown} />
      ) : (
        <PlayerView
          state={state}
          onOpen={openDeck}
          onPresenter={startPresenter}
          onStartSlideshow={startSlideshow}
          onFrameKeyDown={onPresentationKeyDown}
        />
      )}
    </div>
  );
}
