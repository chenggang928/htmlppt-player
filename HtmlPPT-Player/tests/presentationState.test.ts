import { describe, expect, it, vi } from "vitest";
import { createEmptyDeck } from "../src/shared/deckFixtures";
import { PresentationStore } from "../src/shared/presentationState";

describe("PresentationStore", () => {
  it("clamps navigation to slide bounds", () => {
    const store = new PresentationStore(createEmptyDeck(3));

    store.navigate("previous");
    expect(store.getState().currentIndex).toBe(0);

    store.navigate("next");
    store.navigate("next");
    store.navigate("next");
    expect(store.getState().currentIndex).toBe(2);

    store.navigate(1);
    expect(store.getState().currentIndex).toBe(1);

    store.navigate(99);
    expect(store.getState().currentIndex).toBe(2);
  });

  it("broadcasts state updates to subscribers", () => {
    const store = new PresentationStore(createEmptyDeck(2));
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    store.navigate("next");
    unsubscribe();
    store.navigate("previous");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({ currentIndex: 1 });
  });

  it("updates speaker notes for a slide", () => {
    const store = new PresentationStore(createEmptyDeck(2));

    store.updateSlideNotes(1, "First cue\nSecond cue");

    expect(store.getState().deck.slides[1]).toMatchObject({
      notesHtml: "First cue\nSecond cue",
      notesText: "First cue\nSecond cue"
    });
  });

  it("starts and stops presenter timing", () => {
    vi.useFakeTimers();
    const store = new PresentationStore(createEmptyDeck(1));

    store.startPresenterMode({ audienceWindowActive: true, rehearsalMode: false });
    vi.advanceTimersByTime(125_000);
    expect(store.getState()).toMatchObject({
      isPresenterMode: true,
      audienceWindowActive: true,
      rehearsalMode: false,
      elapsedSeconds: 125
    });

    store.stopPresenterMode();
    vi.advanceTimersByTime(10_000);
    expect(store.getState()).toMatchObject({
      isPresenterMode: false,
      audienceWindowActive: false,
      rehearsalMode: false,
      elapsedSeconds: 0
    });

    vi.useRealTimers();
  });

  it("preserves current index when replacing a deck during hot reload", () => {
    const store = new PresentationStore(createEmptyDeck(4));

    store.navigate(2);
    store.setDeck(createEmptyDeck(2), { preserveIndex: true });

    expect(store.getState().currentIndex).toBe(1);
  });

  it("preserves presenter session and timer when hot reloading", () => {
    vi.useFakeTimers();
    const store = new PresentationStore(createEmptyDeck(3));

    store.navigate(1);
    store.startPresenterMode({ audienceWindowActive: true, rehearsalMode: false });
    vi.advanceTimersByTime(4_000);
    store.setDeck(createEmptyDeck(3), { preserveIndex: true, preserveSession: true });
    vi.advanceTimersByTime(2_000);

    expect(store.getState()).toMatchObject({
      currentIndex: 1,
      isPresenterMode: true,
      audienceWindowActive: true,
      rehearsalMode: false,
      elapsedSeconds: 6
    });

    vi.useRealTimers();
  });
});
