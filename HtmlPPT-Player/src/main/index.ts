import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  screen,
  type MenuItemConstructorOptions,
  type OpenDialogOptions
} from "electron";
import { watch, type FSWatcher } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { createEmptyDeck } from "../shared/deckFixtures";
import { PresentationStore } from "../shared/presentationState";
import type { DeckLoadOptions, DeckManifest, MenuCommand, NavigateTarget } from "../shared/types";

let mainWindow: BrowserWindow | null = null;
let audienceWindow: BrowserWindow | null = null;
let startupDeckPath: string | null = null;
let deckWatcher: FSWatcher | null = null;
let watchedDeckPath: string | null = null;
let deckChangeTimer: ReturnType<typeof setTimeout> | undefined;
let mainWindowWasFullscreenBeforePresenter = false;

const presentationStore = new PresentationStore(createEmptyDeck());
const APP_NAME = "HtmlPPT Player";

app.setName(APP_NAME);

function findDeckPath(argv: string[]): string | null {
  const deckArg = argv.find((arg) => {
    const extension = extname(arg).toLowerCase();
    return extension === ".html" || extension === ".htm" || extension === ".htmlppt";
  });

  return deckArg ? resolve(deckArg) : null;
}

function rendererEntryFor(view: "player" | "audience"): string {
  return `/${view}`;
}

async function loadRenderer(window: BrowserWindow, view: "player" | "audience"): Promise<void> {
  const route = rendererEntryFor(view);
  const devServerUrl = process.env.ELECTRON_RENDERER_URL;

  if (devServerUrl) {
    await window.loadURL(`${devServerUrl}#${route}`);
    return;
  }

  await window.loadFile(join(__dirname, "../renderer/index.html"), { hash: route });
}

function sendState(): void {
  const state = presentationStore.getState();
  mainWindow?.webContents.send("presentation:state", state);
  audienceWindow?.webContents.send("presentation:state", state);
}

presentationStore.subscribe(sendState);

function sendMenuCommand(command: MenuCommand): void {
  mainWindow?.webContents.send("menu:command", command);
}

function requestMainSlideshowExit(): void {
  mainWindow?.webContents.send("slideshow:exit-local");
}

function buildApplicationMenu(): Menu {
  const isMac = process.platform === "darwin";
  const appMenu: MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: APP_NAME,
          submenu: [
            { label: `About ${APP_NAME}`, role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { label: `Hide ${APP_NAME}`, role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { label: `Quit ${APP_NAME}`, role: "quit" }
          ]
        }
      ]
    : [];

  const template: MenuItemConstructorOptions[] = [
    ...appMenu,
    {
      label: "File",
      submenu: [
        {
          label: "Open Deck...",
          accelerator: "CmdOrCtrl+O",
          click: () => sendMenuCommand("open-deck")
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" }
      ]
    },
    {
      label: "Presentation",
      submenu: [
        {
          label: "Previous Slide",
          accelerator: "CmdOrCtrl+Left",
          click: () => presentationStore.navigate("previous")
        },
        {
          label: "Next Slide",
          accelerator: "CmdOrCtrl+Right",
          click: () => presentationStore.navigate("next")
        },
        { type: "separator" },
        {
          label: "Play from Current Slide",
          accelerator: "CmdOrCtrl+Enter",
          click: () => sendMenuCommand("start-slideshow")
        },
        {
          label: "Presenter Mode",
          accelerator: "CmdOrCtrl+Shift+P",
          click: () => sendMenuCommand("start-presenter")
        },
        {
          label: "Stop Presenter Mode",
          click: () => sendMenuCommand("stop-presenter")
        }
      ]
    }
  ];

  return Menu.buildFromTemplate(template);
}

function restoreMainWindowAfterPresenter(): void {
  if (mainWindow && !mainWindowWasFullscreenBeforePresenter) {
    mainWindow.setFullScreen(false);
  }
  mainWindowWasFullscreenBeforePresenter = false;
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: "HtmlPPT Player",
    backgroundColor: "#f6f7f8",
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.on("closed", () => {
    mainWindow = null;
  });

  void loadRenderer(window, "player");
  return window;
}

function getAudienceDisplay() {
  if (!mainWindow) {
    return null;
  }

  const displays = screen.getAllDisplays();
  if (displays.length < 2) {
    return null;
  }

  const presenterDisplay = screen.getDisplayMatching(mainWindow.getBounds());
  return displays.find((display) => display.id !== presenterDisplay.id) ?? null;
}

function createAudienceWindow(): BrowserWindow | null {
  const display = getAudienceDisplay();
  if (!display) {
    return null;
  }

  const window = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    fullscreen: true,
    show: false,
    backgroundColor: "#050505",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.once("ready-to-show", () => {
    window.show();
    window.setFullScreen(true);
    sendState();
  });

  window.on("closed", () => {
    audienceWindow = null;
    if (presentationStore.getState().isPresenterMode) {
      restoreMainWindowAfterPresenter();
      presentationStore.stopPresenterMode();
    }
  });

  void loadRenderer(window, "audience");
  return window;
}

async function readDeckFile(filePath: string) {
  const html = await readFile(filePath, "utf8");
  return { filePath, html };
}

function escapeHtmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function updateNotesInDeckHtml(html: string, slideIndex: number, notesText: string): string {
  const slidePattern = /<section\b[^>]*class=(["'])[^"']*\bslide\b[^"']*\1[^>]*>/gi;
  const slideMatches = Array.from(html.matchAll(slidePattern));
  const slideStart = slideMatches[slideIndex]?.index;

  if (slideStart === undefined) {
    throw new Error(`Slide ${slideIndex + 1} was not found in the deck file.`);
  }

  const nextSlideStart = slideMatches[slideIndex + 1]?.index ?? html.length;
  const slideBlock = html.slice(slideStart, nextSlideStart);
  const escapedNotes = escapeHtmlText(notesText);
  const nextNotes = `<aside class="notes">${escapedNotes}</aside>`;
  const notesPattern = /<aside\b[^>]*class=(["'])[^"']*\bnotes\b[^"']*\1[^>]*>[\s\S]*?<\/aside>/i;

  if (notesPattern.test(slideBlock)) {
    return html.slice(0, slideStart) + slideBlock.replace(notesPattern, nextNotes) + html.slice(nextSlideStart);
  }

  const closingSectionIndex = slideBlock.lastIndexOf("</section>");
  if (closingSectionIndex === -1) {
    throw new Error(`Slide ${slideIndex + 1} has no closing </section> tag.`);
  }

  const updatedSlideBlock =
    slideBlock.slice(0, closingSectionIndex) + `\n  ${nextNotes}\n` + slideBlock.slice(closingSectionIndex);
  return html.slice(0, slideStart) + updatedSlideBlock + html.slice(nextSlideStart);
}

function isWritableDeckPath(sourcePath: string): boolean {
  return sourcePath.includes("/") && !sourcePath.startsWith("http://") && !sourcePath.startsWith("https://");
}

async function saveSlideNotesToDeckFile(filePath: string, slideIndex: number, notesText: string): Promise<void> {
  const html = await readFile(filePath, "utf8");
  await writeFile(filePath, updateNotesInDeckHtml(html, slideIndex, notesText), "utf8");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolveWait) => {
    setTimeout(resolveWait, ms);
  });
}

async function readDeckFileWithRetry(filePath: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await readDeckFile(filePath);
    } catch (error) {
      lastError = error;
      await wait(120);
    }
  }

  throw lastError;
}

function closeDeckWatcher(): void {
  if (deckChangeTimer) {
    clearTimeout(deckChangeTimer);
    deckChangeTimer = undefined;
  }
  deckWatcher?.close();
  deckWatcher = null;
  watchedDeckPath = null;
}

function queueDeckFileChange(filePath: string): void {
  if (deckChangeTimer) {
    clearTimeout(deckChangeTimer);
  }

  deckChangeTimer = setTimeout(async () => {
    try {
      const result = await readDeckFileWithRetry(filePath);
      mainWindow?.webContents.send("deck:changed", result);
    } catch (error) {
      console.warn(`Unable to hot reload deck "${filePath}"`, error);
    }
  }, 180);
}

function watchDeckFile(filePath: string): void {
  const normalizedPath = resolve(filePath);
  if (watchedDeckPath === normalizedPath) {
    return;
  }

  closeDeckWatcher();
  watchedDeckPath = normalizedPath;
  const directory = dirname(normalizedPath);
  const fileName = basename(normalizedPath);

  deckWatcher = watch(directory, (_eventType, changedName) => {
    if (changedName && String(changedName) !== fileName) {
      return;
    }
    queueDeckFileChange(normalizedPath);
  });
}

function registerIpc(): void {
  ipcMain.handle("deck:get-startup-path", () => startupDeckPath);

  ipcMain.handle("deck:open", async (_event, filePath?: string) => {
    if (filePath) {
      const result = await readDeckFile(filePath);
      watchDeckFile(result.filePath);
      return result;
    }

    const dialogOptions: OpenDialogOptions = {
      title: "Open HtmlPPT Deck",
      properties: ["openFile"],
      filters: [
        { name: "HTML presentations", extensions: ["html", "htm", "htmlppt"] },
        { name: "All files", extensions: ["*"] }
      ]
    };

    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const deckFile = await readDeckFile(result.filePaths[0]);
    watchDeckFile(deckFile.filePath);
    return deckFile;
  });

  ipcMain.handle("deck:loaded", (_event, deck: DeckManifest, options?: DeckLoadOptions) => {
    presentationStore.setDeck(deck, options);
    return presentationStore.getState();
  });

  ipcMain.handle("presentation:state", () => presentationStore.getState());

  ipcMain.handle("presentation:navigate", (_event, target: NavigateTarget) => {
    presentationStore.navigate(target);
    return presentationStore.getState();
  });

  ipcMain.handle("slide:notes:update", async (_event, slideIndex: number, notesText: string) => {
    presentationStore.updateSlideNotes(slideIndex, notesText);
    const state = presentationStore.getState();
    const sourcePath = state.deck.sourcePath;

    if (sourcePath && isWritableDeckPath(sourcePath)) {
      try {
        await saveSlideNotesToDeckFile(sourcePath, slideIndex, notesText);
      } catch (error) {
        console.warn(`Unable to save notes for slide ${slideIndex + 1}`, error);
      }
    }

    return presentationStore.getState();
  });

  ipcMain.handle("slideshow:start", () => {
    const hadAudienceWindow = Boolean(audienceWindow);
    if (!audienceWindow) {
      audienceWindow = createAudienceWindow();
    }

    if (audienceWindow && hadAudienceWindow) {
      audienceWindow.show();
      audienceWindow.setFullScreen(true);
      sendState();
    }

    return { audienceWindowActive: Boolean(audienceWindow) };
  });

  ipcMain.handle("slideshow:stop", () => {
    if (!presentationStore.getState().isPresenterMode) {
      const windowToClose = audienceWindow;
      audienceWindow = null;
      windowToClose?.close();
      requestMainSlideshowExit();
    }

    return { audienceWindowActive: Boolean(audienceWindow) };
  });

  ipcMain.handle("presenter:start", () => {
    if (!audienceWindow) {
      audienceWindow = createAudienceWindow();
    }

    if (mainWindow) {
      mainWindowWasFullscreenBeforePresenter = mainWindow.isFullScreen();
      mainWindow.setFullScreen(true);
    }

    presentationStore.startPresenterMode({
      audienceWindowActive: Boolean(audienceWindow),
      rehearsalMode: !audienceWindow
    });
    return presentationStore.getState();
  });

  ipcMain.handle("presenter:stop", () => {
    const windowToClose = audienceWindow;
    audienceWindow = null;
    windowToClose?.close();
    restoreMainWindowAfterPresenter();
    presentationStore.stopPresenterMode();
    return presentationStore.getState();
  });
}

app.on("open-file", (event, filePath) => {
  event.preventDefault();
  startupDeckPath = filePath;
});

app.whenReady().then(() => {
  startupDeckPath = startupDeckPath ?? findDeckPath(process.argv);
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    credits: "Desktop player for HTML presentation decks."
  });
  Menu.setApplicationMenu(buildApplicationMenu());
  registerIpc();
  mainWindow = createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
