/**
 * Minimal keyboard-shortcut matcher for the commenting options (e.g. `toggleVisibilityKbd`).
 * Format: modifiers joined by `+` then a key, e.g. `'shift+c'`, `'mod+shift+c'`. Modifiers:
 * `shift`, `alt`, `ctrl`, `meta`, and `mod` (meta on Apple, ctrl elsewhere). The final token is the
 * key: a single letter matches the physical key (`event.code === 'KeyC'`, layout-independent, like
 * the original Shift+C handler); anything else matches `event.key` case-insensitively.
 */
export function matchesKbd(kbd: string, event: KeyboardEvent): boolean {
	const parts = kbd
		.toLowerCase()
		.split('+')
		.map((p) => p.trim())
		.filter(Boolean)
	if (parts.length === 0) return false
	const key = parts[parts.length - 1]
	const mods = new Set(parts.slice(0, -1))

	const isApple =
		typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform)
	const wantMeta = mods.has('meta') || (mods.has('mod') && isApple)
	const wantCtrl = mods.has('ctrl') || (mods.has('mod') && !isApple)
	if (!!event.shiftKey !== mods.has('shift')) return false
	if (!!event.altKey !== mods.has('alt')) return false
	if (!!event.metaKey !== wantMeta) return false
	if (!!event.ctrlKey !== wantCtrl) return false

	if (key.length === 1 && key >= 'a' && key <= 'z') {
		return event.code === `Key${key.toUpperCase()}`
	}
	return event.key.toLowerCase() === key
}
