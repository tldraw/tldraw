import { Editor, openWindow, T } from '@tldraw/editor'

/**
 * How {@link openLink} treats a link. See {@link getLinkOpenPolicy}.
 *
 * @public
 */
export type TLLinkOpenPolicy = 'open' | 'confirm' | 'block'

// This list only decides whether we ask before opening, so it can change in any release. Don't move
// it into `T.linkUrl`: every client and the sync server validate stored urls with that, so changing
// what it accepts breaks shared boards between versions.
const trustedLinkProtocols = new Set([
	'http:',
	'https:',
	'mailto:',
	'claude:',
	'codex:',
	'cursor:',
	'discord:',
	'figma:',
	'jetbrains:',
	'linear:',
	'notion:',
	'obsidian:',
	'slack:',
	'spotify:',
	'vscode:',
	'windsurf:',
	'zed:',
])

/**
 * Decide how a link from a shape or rich text should be opened.
 *
 * - `open`: a web link, mailto link, relative link, or a link into a well-known app.
 * - `confirm`: any other link that `T.linkUrl` accepts, such as an app we don't know. Ask the
 *   user before opening it.
 * - `block`: anything `T.linkUrl` rejects. Stored records are validated, but a link can also
 *   come from rendered rich text or a custom shape, so check again here.
 *
 * @public
 */
export function getLinkOpenPolicy(url: string): TLLinkOpenPolicy {
	if (!url || !T.linkUrl.isValid(url)) return 'block'
	if (url.startsWith('/') || url.startsWith('./')) return 'open'
	return trustedLinkProtocols.has(new URL(url).protocol) ? 'open' : 'confirm'
}

/**
 * Open a user-provided link in a new window, following {@link getLinkOpenPolicy}. Links that need
 * confirming emit a `confirm-open-link` event, which the default UI answers with a dialog. With no
 * listener for that event, those links are not opened.
 *
 * @public
 */
export function openLink(editor: Editor, url: string) {
	switch (getLinkOpenPolicy(url)) {
		case 'open':
			openWindow(url, '_blank')
			return
		case 'confirm':
			if (editor.listenerCount('confirm-open-link') > 0) {
				editor.emit('confirm-open-link', { url })
			} else {
				console.warn(`Not opening ${url}: nothing is listening for confirm-open-link`)
			}
			return
		case 'block':
			return
	}
}
