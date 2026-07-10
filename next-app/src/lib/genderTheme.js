// Shared gender-aware avatar/name-card theming.
// Female users get a pink identity; everyone else keeps the default emerald theme.
export function avatarClasses(gender) {
  return gender === 'F'
    ? 'bg-pink-500/10 text-pink-400 border-pink-500/20'
    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
}
