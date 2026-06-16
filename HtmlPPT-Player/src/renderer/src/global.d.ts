/// <reference types="vite/client" />

import type { HtmlPptApi } from "../../shared/types";

declare global {
  interface Window {
    htmlppt: HtmlPptApi;
  }
}

export {};
