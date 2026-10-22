// The icons and colours a subject can have. The server stores only the name;
// an unknown name falls back to the first entry.
import {
  BookOpen, Users, Globe, Briefcase, Scale, Calculator, ChartColumn, Landmark, Building2, Coins,
  Handshake, Target, Puzzle, Brain, Lightbulb, GraduationCap, Megaphone, Factory, Network, TrendingUp,
} from 'lucide-react';

export const SUBJECT_ICONS = {
  book: BookOpen, users: Users, globe: Globe, briefcase: Briefcase, scale: Scale, calculator: Calculator,
  chart: ChartColumn, landmark: Landmark, building: Building2, coins: Coins, handshake: Handshake,
  target: Target, puzzle: Puzzle, brain: Brain, lightbulb: Lightbulb, graduation: GraduationCap,
  megaphone: Megaphone, factory: Factory, network: Network, trend: TrendingUp,
};

// Names of colour tokens in base.css (--c-<name>, --c-<name>-rgb).
export const SUBJECT_COLORS = ['teal', 'blue', 'violet', 'pink', 'orange', 'amber', 'green', 'red'];

export const subjectIcon = (key) => SUBJECT_ICONS[key] || BookOpen;
export const subjectColor = (key) => (SUBJECT_COLORS.includes(key) ? key : 'teal');

/** CSS variables that tint an element in the subject's colour. */
export const subjectStyle = (s) => {
  const c = subjectColor(s?.color);
  return { '--tint': `var(--c-${c})`, '--tint-rgb': `var(--c-${c}-rgb)` };
};
