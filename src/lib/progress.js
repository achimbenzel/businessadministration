// Learning progress — per device (localStorage), because all viewers share one
// "User" account: chapters marked as learned, the last chapter opened and the
// flashcards someone knows.
import { useCallback } from 'react';
import { usePref, setPref } from './prefs.js';

const EMPTY = {};

export function useLearned() {
  const [learned, setLearned] = usePref('learned', EMPTY);
  const isLearned = useCallback((id) => Boolean(learned[id]), [learned]);
  const toggle = useCallback((id) => setLearned((cur) => {
    const next = { ...cur };
    if (next[id]) delete next[id]; else next[id] = Date.now();
    return next;
  }), [setLearned]);
  const countIn = useCallback((ids = []) => ids.filter((id) => learned[id]).length, [learned]);
  return { learned, isLearned, toggle, countIn };
}

/** Remember the chapter that was open last ("Weiterlernen" on the start page). */
export function rememberChapter(chapter, subject) {
  if (!chapter) return;
  setPref('lastChapter', {
    id: chapter.id, title: chapter.title, at: Date.now(),
    subject: subject ? { id: subject.id, title: subject.title, short: subject.short, icon: subject.icon, color: subject.color } : null,
  });
}

export function useLastChapter() {
  return usePref('lastChapter', null);
}

/** Flashcards marked as known: { [cardId]: timestamp }. */
export function useKnownCards() {
  return usePref('knownCards', EMPTY);
}
