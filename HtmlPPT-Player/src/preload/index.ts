import { contextBridge, ipcRenderer, webUtils } from "electron";
import type {
  DeckLoadOptions,
  DeckManifest,
  HtmlPptApi,
  MenuCommand,
  NavigateTarget,
  OpenDeckResult,
  PresentationState
} from "../shared/types";

const api: HtmlPptApi = {
  openDeck: (filePath?: string) => ipcRenderer.invoke("deck:open", filePath),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  getStartupDeckPath: () => ipcRenderer.invoke("deck:get-startup-path"),
  deckLoaded: (deck: DeckManifest, options?: DeckLoadOptions) => ipcRenderer.invoke("deck:loaded", deck, options),
  navigate: (target: NavigateTarget) => ipcRenderer.invoke("presentation:navigate", target),
  updateSlideNotes: (slideIndex: number, notesText: string) => ipcRenderer.invoke("slide:notes:update", slideIndex, notesText),
  startSlideshowMode: () => ipcRenderer.invoke("slideshow:start"),
  stopSlideshowMode: () => ipcRenderer.invoke("slideshow:stop"),
  startPresenterMode: () => ipcRenderer.invoke("presenter:start"),
  stopPresenterMode: () => ipcRenderer.invoke("presenter:stop"),
  getState: () => ipcRenderer.invoke("presentation:state"),
  subscribeState: (listener: (state: PresentationState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: PresentationState) => {
      listener(state);
    };

    ipcRenderer.on("presentation:state", handler);
    return () => {
      ipcRenderer.removeListener("presentation:state", handler);
    };
  },
  subscribeDeckFileChange: (listener: (result: OpenDeckResult) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: OpenDeckResult) => {
      listener(result);
    };

    ipcRenderer.on("deck:changed", handler);
    return () => {
      ipcRenderer.removeListener("deck:changed", handler);
    };
  },
  subscribeMenuCommand: (listener: (command: MenuCommand) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, command: MenuCommand) => {
      listener(command);
    };

    ipcRenderer.on("menu:command", handler);
    return () => {
      ipcRenderer.removeListener("menu:command", handler);
    };
  },
  subscribeSlideshowExit: (listener: () => void) => {
    const handler = () => {
      listener();
    };

    ipcRenderer.on("slideshow:exit-local", handler);
    return () => {
      ipcRenderer.removeListener("slideshow:exit-local", handler);
    };
  }
};

contextBridge.exposeInMainWorld("htmlppt", api);
