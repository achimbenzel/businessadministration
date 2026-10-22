// The app's mark: the same drawing as the home-screen icon (scripts/icons.mjs).
export default function Logo({ size = 36 }) {
  return <img className="logo-tile" src="/icons/icon.svg" width={size} height={size} alt="" aria-hidden="true" />;
}
