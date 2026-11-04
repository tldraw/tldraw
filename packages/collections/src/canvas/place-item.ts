import { Vec, type Editor, type VecLike } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionItemId } from '../lib/schema'

/**
 * Where a click places an item. Every field is optional; the defaults place it at the centre of the
 * viewport, on top of any earlier copy.
 * @public
 */
export interface PlaceItemOptions {
	/** `'center'`: the viewport's centre. `'pointer'`: where the pointer last was on the canvas. */
	at?: 'center' | 'pointer'
	/** `'cascade'` steps each repeat at the same spot down and right, so copies don't hide each other. */
	repeat?: 'stack' | 'cascade'
	/** With a single frame selected, place the item in the middle of that frame, inside it. */
	intoFrame?: boolean
}

const CASCADE_STEP = 24

// The last spot each editor placed at, and how many times in a row, for cascading.
const lastPlacement = new WeakMap<Editor, { anchor: Vec; count: number }>()

function placementPoint(
	editor: Editor,
	{ at = 'center', repeat = 'stack', intoFrame = false }: PlaceItemOptions
) {
	const selected = editor.getOnlySelectedShape()
	const frameBounds =
		intoFrame && selected && editor.isShapeOfType(selected, 'frame')
			? editor.getShapePageBounds(selected)
			: undefined
	const anchor = Vec.From(
		frameBounds?.center ??
			(at === 'pointer'
				? editor.inputs.getCurrentPagePoint()
				: editor.getViewportPageBounds().center)
	)
	const last = lastPlacement.get(editor)
	const count = last && Vec.Equals(last.anchor, anchor) ? last.count + 1 : 0
	lastPlacement.set(editor, { anchor, count })
	if (repeat === 'stack') return anchor
	return Vec.Add(anchor, { x: CASCADE_STEP * count, y: CASCADE_STEP * count })
}

/**
 * Places a copy of an item and selects it, the same way pasting does: by default at the centre of
 * the viewport. Rejects with the source's error when the item can't be loaded.
 * @public
 */
export async function placeCollectionItem(
	editor: Editor,
	source: CollectionSource,
	itemId: TLCollectionItemId,
	options: PlaceItemOptions = {}
) {
	const { content } = await source.getItemContent(itemId)
	const point: VecLike = placementPoint(editor, options)
	editor.markHistoryStoppingPoint('place collection item')
	editor.putContentOntoCurrentPage(content, { point, select: true })
}
