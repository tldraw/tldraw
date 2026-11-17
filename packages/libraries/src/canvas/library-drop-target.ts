import type { TLLibraryId, VecLike } from 'tldraw'

export interface ClientRect {
	left: number
	top: number
	right: number
	bottom: number
}

export interface LibraryDropSection {
	libraryId: TLLibraryId
	rect: ClientRect
	accepts: boolean
}

const contains = ({ left, top, right, bottom }: ClientRect, { x, y }: VecLike) =>
	x >= left && x <= right && y >= top && y <= bottom

/**
 * The library whose section is under `point`, if that library takes new items. `listRect` is the
 * scrolling list the sections sit in: a section scrolled out of it is hidden, though its rect
 * still covers the point.
 */
export function getLibraryDropTarget(
	point: VecLike,
	listRect: ClientRect,
	sections: LibraryDropSection[]
): TLLibraryId | undefined {
	if (!contains(listRect, point)) return undefined
	const section = sections.find(({ rect }) => contains(rect, point))
	return section && section.accepts ? section.libraryId : undefined
}
