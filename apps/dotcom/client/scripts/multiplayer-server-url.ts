/**
 * Shared with `vite.config.ts` and Node build scripts. Kept separate from `vite.config.ts`
 * so `tsx` can import it without loading Vite plugins (unplugin assumes full ESM
 * `import.meta.dirname`, which is missing when unplugin is pulled in via tsx's require path).
 */
export function getMultiplayerServerURL() {
	return process.env.MULTIPLAYER_SERVER?.replace(/^ws/, 'http')
}
