import { atom } from 'tldraw'

/** True while the file page shows history; hides this user's presence from collaborators. */
export const historyModeAtom = atom('historyMode', false)

export function parseHistoryRoute(pathname: string): { inHistory: boolean; ts: string | null } {
	const match = pathname.match(/^\/f\/[^/]+\/history(?:\/([^/]+))?\/?$/)
	if (!match) return { inHistory: false, ts: null }
	return { inHistory: true, ts: match[1] ? decodeURIComponent(match[1]) : null }
}
