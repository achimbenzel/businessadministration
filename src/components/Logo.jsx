// The app's mark: a graduation cap on an accent tile (same drawing as the PWA icons).
import { GraduationCap } from 'lucide-react';

export default function Logo({ size = 36 }) {
  return (
    <span className="logo-tile" style={{ width: size, height: size }} aria-hidden="true">
      <GraduationCap size={Math.round(size * 0.58)} strokeWidth={2.1} />
    </span>
  );
}
