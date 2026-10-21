import { T } from '@tldraw/editor'

const emailRegex = /^[^\s@/:]+@[^\s@/:]+\.[^\s@/:]+$/

/**
 * Turn what a user typed into a link field into the url to store, or null if it isn't a link.
 * Shared by the shape link dialog and the rich text link editor so both accept the same input.
 *
 * - Anything `T.linkUrl` accepts is kept as typed, so `mailto:` and app links (`vscode://…`)
 *   are never rewritten.
 * - An email address becomes a `mailto:` link.
 * - A bare host (`example.com`, `localhost:3000`) gets `https://`. A word with no dot, like
 *   `hello`, is not treated as a host, or every typo would become a dead `https://hello` link.
 * - The empty string means "no link".
 */
export function normalizeLinkUrl(input: string): string | null {
	// Pasting a url into a field that already holds `https://` doubles the protocol.
	const url = input.trim().replace(/^https?:\/\/(https?:\/\/)/i, '$1')

	if (T.linkUrl.isValid(url)) return url
	if (emailRegex.test(url)) return `mailto:${url}`

	const withProtocol = `https://${url}`
	if (!T.linkUrl.isValid(withProtocol)) return null
	const { hostname, username } = new URL(withProtocol)
	if (username) return null
	if (hostname === 'localhost' || hostname.startsWith('[') || /[^.]\.[^.]+$/.test(hostname)) {
		return withProtocol
	}
	return null
}
