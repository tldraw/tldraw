import { CommandPaletteSearchResult, Editor, TLUiToolsContextType } from 'tldraw'

export const MAX_BOARD_RESULTS = 50
// Characters kept before the match when a label's start is trimmed.
export const MATCH_LEAD = 16

// The current page's hits come first; the rest are named by their page.
export function getBoardSearchResults(
	editor: Editor,
	query: string,
	tools: TLUiToolsContextType
): CommandPaletteSearchResult[] {
	const needle = query.replace(/\s+/g, ' ').toLowerCase()
	const currentPageId = editor.getCurrentPageId()
	const pages = editor.getPages()
	const ordered = [
		...pages.filter((page) => page.id === currentPageId),
		...pages.filter((page) => page.id !== currentPageId),
	]
	const results: CommandPaletteSearchResult[] = []
	for (const page of ordered) {
		for (const id of editor.getPageShapeIds(page.id)) {
			const shape = editor.getShape(id)
			if (!shape) continue
			const text = editor.getShapeUtil(shape).getText(shape)?.replace(/\s+/g, ' ').trim()
			const index = text?.toLowerCase().indexOf(needle) ?? -1
			if (!text || index === -1) continue
			results.push({
				id: shape.id,
				// Rows clip their end, so trim the start to keep a late match in view.
				label: index > MATCH_LEAD ? `…${text.slice(index - MATCH_LEAD)}` : text,
				detail: page.id === currentPageId ? undefined : page.name,
				icon: tools[shape.type === 'geo' ? shape.props.geo : shape.type]?.icon,
				onSelect() {
					// Results stay frozen while the palette is open, so the shape may be gone or moved.
					const pageId = editor.getAncestorPageId(shape.id)
					const bounds = editor.getShapePageBounds(shape.id)
					if (!pageId || !bounds) return
					if (editor.getCurrentPageId() !== pageId) editor.setCurrentPage(pageId)
					// Like zoom to selection, without selecting it.
					editor.zoomToBounds(bounds, {
						targetZoom: 1,
						animation: { duration: editor.options.animationMediumMs },
					})
				},
			})
			if (results.length === MAX_BOARD_RESULTS) return results
		}
	}
	return results
}
