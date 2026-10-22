// The words inside blocks in read mode follow the chapter's language: an
// English chapter says "Check answer", not "Antwort prüfen". The app around it
// (navigation, editor) stays German.
import { createContext, useContext } from 'react';

export const BLOCK_TEXT = {
  de: {
    definition: 'Definition',
    callout: { info: 'Info', tip: 'Tipp', important: 'Merke', warning: 'Achtung' },
    showMore: 'Mehr anzeigen',
    question: 'Frage',
    answer: 'Antwort',
    tapToFlip: 'Antippen zum Umdrehen',
    backToQuestion: 'Zur Frage',
    showAnswer: 'Karteikarte: Antwort zeigen',
    showQuestion: 'Karteikarte: Frage zeigen',
    quiz: 'Quizfrage',
    multi: 'mehrere Antworten richtig',
    check: 'Antwort prüfen',
    right: 'Richtig!',
    wrong: 'Leider nicht ganz.',
    again: 'Nochmal',
    zoom: 'Bild vergrößern',
    close: 'Schließen',
    download: 'herunterladen',
  },
  en: {
    definition: 'Definition',
    callout: { info: 'Info', tip: 'Tip', important: 'Key point', warning: 'Caution' },
    showMore: 'Show more',
    question: 'Question',
    answer: 'Answer',
    tapToFlip: 'Tap to flip',
    backToQuestion: 'Back to question',
    showAnswer: 'Flashcard: show answer',
    showQuestion: 'Flashcard: show question',
    quiz: 'Quiz',
    multi: 'more than one answer is correct',
    check: 'Check answer',
    right: 'Correct!',
    wrong: 'Not quite.',
    again: 'Try again',
    zoom: 'Enlarge image',
    close: 'Close',
    download: 'download',
  },
};

export const BlockLangContext = createContext('de');
export const useBlockText = () => BLOCK_TEXT[useContext(BlockLangContext)] || BLOCK_TEXT.de;
