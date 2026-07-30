import { Editor, TLPage, TLPageId } from 'tldraw'

const DIVIDER_NAME_REGEX = /^-{3,}$/

/**
 * Whether a page name follows the divider naming convention: three or more
 * hyphens and nothing else (ignoring surrounding whitespace).
 */
export function isDividerName(name: string): boolean {
	return DIVIDER_NAME_REGEX.test(name.trim())
}

/**
 * Whether a page should be displayed as a divider in the pages list.
 *
 * A page is a divider only while it has a divider name AND is empty. Renaming
 * a page that has content to `---` is treated as a normal rename; a divider
 * can never gain content because it is not selectable, so divider status is
 * effectively permanent through the UI (undoing the rename is the only way
 * back).
 *
 * The current page is never treated as a divider. This keeps the user from
 * being stranded on an unselectable row when the editor's automatic page
 * fallback (e.g. a collaborator deleting the current page) lands on one; the
 * page reverts to a divider as soon as the user switches away.
 *
 * Reads reactive editor state — call inside a reactive context (`useValue`)
 * to track name, shape-count, and current-page changes.
 */
export function isPageDivider(editor: Editor, page: TLPage): boolean {
	return (
		isDividerName(page.name) &&
		page.id !== editor.getCurrentPageId() &&
		editor.getPageShapeIds(page.id).size === 0
	)
}

/**
 * The nearest page to `fromPageId` (by list order, preferring earlier pages)
 * that is not a divider, or undefined if every other page is a divider.
 *
 * Expects `fromPageId` to be the current page (both callers step off it):
 * unlike `isPageDivider`, the current-page exemption is intentionally
 * ignored here, since the page being stepped off is still current.
 */
export function getNearestNonDividerPageId(
	editor: Editor,
	fromPageId: TLPageId
): TLPageId | undefined {
	const pages = editor.getPages()
	const fromIndex = pages.findIndex((page) => page.id === fromPageId)
	if (fromIndex === -1) return undefined

	// A divider check that ignores the current-page exemption: when stepping
	// off a freshly-converted divider the converted page is still current, and
	// the page we land on must be a real page regardless of which is current.
	const isRealPage = (page: TLPage) =>
		page.id !== fromPageId &&
		!(isDividerName(page.name) && editor.getPageShapeIds(page.id).size === 0)

	for (let distance = 1; distance < pages.length; distance++) {
		const before = pages[fromIndex - distance]
		if (before && isRealPage(before)) return before.id
		const after = pages[fromIndex + distance]
		if (after && isRealPage(after)) return after.id
	}
	return undefined
}
