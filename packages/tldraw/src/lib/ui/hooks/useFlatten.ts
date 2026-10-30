import {
	Box,
	BoxModel,
	Editor,
	IndexKey,
	TLContent,
	TLImageAsset,
	TLImageShape,
	TLShape,
	TLShapeId,
	Vec,
	VecLike,
	compact,
	createShapeId,
	fetch,
	isEqual,
	isShapeId,
	transact,
	useEditor,
} from '@tldraw/editor'
import { useCallback } from 'react'
import { getDefaultCrop } from '../../shapes/shared/crop'

export async function flattenShapesToImages(
	editor: Editor,
	shapeIds: TLShapeId[],
	flattenImageBoundsExpand?: number
) {
	const shapes = compact(
		shapeIds.map((id) => {
			const shape = editor.getShape(id)
			if (!shape) return
			// skip shapes that don't have a toSvg method
			if (editor.getShapeUtil(shape.type).toSvg === undefined) return
			return shape
		})
	)

	if (shapes.length === 0) return

	// Don't flatten if it's just one image
	if (shapes.length === 1 && editor.isShapeOfType(shapes[0], 'image')) return

	const groups: { shapes: TLShape[]; bounds: Box; asset?: TLImageAsset }[] = []

	if (flattenImageBoundsExpand !== undefined) {
		const expandedBounds = shapes.map((shape) => {
			return {
				shape,
				bounds: editor.getShapeMaskedPageBounds(shape)!.clone().expandBy(flattenImageBoundsExpand),
			}
		})

		// Cluster shapes by connected components: any two shapes whose expanded
		// bounds intersect end up in the same group. Using union-find here
		// instead of a greedy first-fit pass means the result is independent of
		// the order shapes appear in `shapeIds`, and a shape that bridges two
		// otherwise-disjoint clusters merges them in one pass.
		const parents = expandedBounds.map((_, i) => i)
		const find = (i: number): number => {
			let root = i
			while (parents[root] !== root) root = parents[root]
			while (parents[i] !== root) {
				const next = parents[i]
				parents[i] = root
				i = next
			}
			return root
		}
		const union = (i: number, j: number) => {
			const ri = find(i)
			const rj = find(j)
			if (ri !== rj) parents[ri] = rj
		}

		// Broad-phase sweep: sort by minX and, for each box, only compare against
		// later boxes until one starts past the current box's maxX. Boxes that
		// don't overlap on the x-axis can't intersect, so this skips the bulk of
		// the pairwise checks for spread-out selections while still finding every
		// intersecting pair (Box.includes is symmetric, so each pair is tested once).
		const order = expandedBounds
			.map((_, i) => i)
			.sort((a, b) => {
				return expandedBounds[a].bounds.minX - expandedBounds[b].bounds.minX
			})

		for (let a = 0; a < order.length; a++) {
			const i = order[a]
			const boundsI = expandedBounds[i].bounds
			for (let b = a + 1; b < order.length; b++) {
				const j = order[b]
				// sorted by minX, so once a box starts past i's maxX no later box can overlap i
				if (expandedBounds[j].bounds.minX > boundsI.maxX) break
				if (find(i) === find(j)) continue
				if (boundsI.includes(expandedBounds[j].bounds)) {
					union(i, j)
				}
			}
		}

		const groupsByRoot = new Map<number, { shapes: TLShape[]; bounds: Box }>()
		for (let i = 0; i < expandedBounds.length; i++) {
			const root = find(i)
			const item = expandedBounds[i]
			const existing = groupsByRoot.get(root)
			if (existing) {
				existing.shapes.push(item.shape)
				existing.bounds.expand(item.bounds)
			} else {
				groupsByRoot.set(root, {
					shapes: [item.shape],
					bounds: item.bounds.clone(),
				})
			}
		}

		groups.push(...groupsByRoot.values())
	} else {
		const bounds = Box.Common(shapes.map((shape) => editor.getShapeMaskedPageBounds(shape)!))
		groups.push({
			shapes,
			bounds,
		})
	}

	const padding = editor.options.flattenImageBoundsPadding

	for (const group of groups) {
		if (flattenImageBoundsExpand !== undefined) {
			// shrink the bounds again, removing the expanded area
			group.bounds.expandBy(-flattenImageBoundsExpand)
		}

		// get an image for the shapes
		const svgResult = await editor.getSvgString(group.shapes, {
			padding,
			background: false,
		})
		if (!svgResult?.svg) continue

		const content = editor.getContentFromCurrentPage(group.shapes)
		if (!content) continue

		const svg = embedFlattenSource(svgResult.svg, {
			type: FLATTEN_SOURCE_TYPE,
			version: 1,
			bounds: Box.ExpandBy(group.bounds, padding).toJson(),
			content,
		})

		// get an image asset for the image
		const asset = (await editor.getAssetForExternalContent({
			type: 'file',
			file: new File([svg], 'asset.svg', { type: 'image/svg+xml' }),
		})) as TLImageAsset
		if (!asset) continue

		// tag the asset so unflatten can find it
		group.asset = { ...asset, meta: { ...asset.meta, [FLATTENED_ASSET_META_KEY]: true } }
	}

	const createdShapeIds: TLShapeId[] = []

	transact(() => {
		for (const group of groups) {
			const { asset, bounds, shapes } = group
			if (!asset) continue

			const commonAncestorId = editor.findCommonAncestor(shapes) ?? editor.getCurrentPageId()

			let index: IndexKey = 'a1' as IndexKey
			for (const shape of shapes) {
				if (shape.parentId === commonAncestorId && shape.index > index) {
					index = shape.index
				}
			}

			let x: number
			let y: number
			let rotation: number

			if (isShapeId(commonAncestorId)) {
				const commonAncestor = editor.getShape(commonAncestorId)
				if (!commonAncestor) continue
				// put the point in the parent's space
				const point = editor.getPointInShapeSpace(commonAncestor, {
					x: bounds.x,
					y: bounds.y,
				})
				// get the parent's rotation
				rotation = editor.getShapePageTransform(commonAncestorId).rotation()
				// rotate the point against the parent's rotation
				point.sub(new Vec(padding, padding).rot(-rotation))
				x = point.x
				y = point.y
			} else {
				// if the common ancestor is the page, then just adjust for the padding
				x = bounds.x - padding
				y = bounds.y - padding
				rotation = 0
			}

			// delete the shapes
			editor.deleteShapes(shapes)

			// create the asset
			editor.createAssets([asset])

			const shapeId = createShapeId()

			// create an image shape in the same place as the shapes
			editor.createShape({
				id: shapeId,
				type: 'image',
				index,
				parentId: commonAncestorId,
				x,
				y,
				rotation: -rotation,
				props: {
					assetId: asset.id,
					w: bounds.w + padding * 2,
					h: bounds.h + padding * 2,
				},
			})

			createdShapeIds.push(shapeId)
		}
	})

	return createdShapeIds
}

/** Marks assets made by flatten, so menus can show "Unflatten" without fetching the SVG. */
const FLATTENED_ASSET_META_KEY = 'flattened'

const FLATTEN_SOURCE_TYPE = 'tldraw-flatten-source'
const FLATTEN_SOURCE_ELEMENT_ID = 'tldraw-flatten-source'

/**
 * Stored in a `<metadata>` element of the flattened SVG. This is a persisted format: SVGs written
 * now must stay readable, so change it only with a new `version`.
 */
interface TLFlattenSource {
	type: typeof FLATTEN_SOURCE_TYPE
	version: 1
	/** Page bounds of the image when it was created. Flatten always creates it unrotated. */
	bounds: BoxModel
	/** Same format as the clipboard; its schema lets older content migrate when it is put back. */
	content: TLContent
}

function embedFlattenSource(svg: string, source: TLFlattenSource) {
	const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
	const metadata = doc.createElementNS('http://www.w3.org/2000/svg', 'metadata')
	metadata.setAttribute('id', FLATTEN_SOURCE_ELEMENT_ID)
	// A text node, not CDATA: the serializer escapes it, and CDATA can't hold "]]>"
	metadata.textContent = JSON.stringify(source)
	doc.documentElement.prepend(metadata)
	return new XMLSerializer().serializeToString(doc)
}

async function readFlattenSource(editor: Editor, image: TLImageShape) {
	const url = await editor.resolveAssetUrl(image.props.assetId, { shouldResolveToOriginal: true })
	if (!url) return null
	const response = await fetch(url)
	if (!response.ok) return null
	const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml')
	const text = doc.querySelector(`metadata#${FLATTEN_SOURCE_ELEMENT_ID}`)?.textContent
	if (!text) return null
	// Any SVG on the canvas can carry this element, so check the parts we read before the put.
	// The store validates the records themselves.
	const source = JSON.parse(text) as TLFlattenSource
	if (source?.type !== FLATTEN_SOURCE_TYPE || source.version !== 1) return null
	const { bounds, content } = source
	if (!(bounds?.w > 0 && bounds.h > 0 && Number.isFinite(bounds.x) && Number.isFinite(bounds.y))) {
		return null
	}
	if (!Array.isArray(content?.shapes) || !Array.isArray(content.rootShapeIds) || !content.schema) {
		return null
	}
	return source
}

/** @internal */
export function isFlattenedImage(editor: Editor, shape: TLShape): shape is TLImageShape {
	if (!editor.isShapeOfType(shape, 'image') || !shape.props.assetId) return false
	return editor.getAsset(shape.props.assetId)?.meta[FLATTENED_ASSET_META_KEY] === true
}

/**
 * Unflatten only follows moves, rotation and uniform scale. A crop, flip or stretch has no
 * equivalent on the source shapes, so those images stay flattened.
 */
function canRestoreFlattenSource(image: TLImageShape, source: TLFlattenSource) {
	const { crop, flipX, flipY, w, h } = image.props
	if (flipX || flipY) return false
	const defaultCrop = getDefaultCrop()
	if (
		crop &&
		(crop.isCircle ||
			!isEqual(crop.topLeft, defaultCrop.topLeft) ||
			!isEqual(crop.bottomRight, defaultCrop.bottomRight))
	) {
		return false
	}
	const scaleX = w / source.bounds.w
	const scaleY = h / source.bounds.h
	return Math.abs(scaleX - scaleY) <= 0.01 * Math.max(scaleX, scaleY)
}

// Resizing a frame doesn't scale its children, so scale every shape. Snapshot every page
// transform first; once a parent moves, its children's transforms are wrong.
function scaleShapeTrees(editor: Editor, rootIds: TLShapeId[], scale: number, origin: VecLike) {
	// breadth-first, so parents come before their children
	const ordered = [...rootIds]
	for (let i = 0; i < ordered.length; i++) {
		ordered.push(...editor.getSortedChildIdsForParent(ordered[i]))
	}
	const snapshots = ordered.map((id) => ({
		shape: editor.getShape(id)!,
		bounds: editor.getShapeGeometry(id).bounds,
		pageTransform: editor.getShapePageTransform(id),
	}))
	for (const { shape, bounds, pageTransform } of snapshots) {
		editor.resizeShape(
			shape.id,
			{ x: scale, y: scale },
			{
				initialShape: shape,
				initialBounds: bounds,
				initialPageTransform: pageTransform,
				mode: 'scale_shape',
				scaleOrigin: origin,
			}
		)
	}
}

/** @internal */
export type TLUnflattenResult =
	| { type: 'success'; shapeIds: TLShapeId[] }
	| { type: 'error'; reason: 'transformed' | 'unreadable' | 'max-shapes' }

/**
 * Replace flattened images with the shapes they were flattened from. Images that can't be
 * restored stay in place, and the result names the first reason.
 *
 * @internal
 */
export async function unflattenImages(
	editor: Editor,
	shapeIds: TLShapeId[]
): Promise<TLUnflattenResult> {
	const images = compact(shapeIds.map((id) => editor.getShape(id))).filter((shape) =>
		isFlattenedImage(editor, shape)
	)

	let error: Extract<TLUnflattenResult, { type: 'error' }>['reason'] | null = null
	const restorable: { image: TLImageShape; source: TLFlattenSource }[] = []
	for (const image of images) {
		const source = await readFlattenSource(editor, image).catch(() => null)
		if (!source) {
			error ??= 'unreadable'
		} else if (!canRestoreFlattenSource(image, source)) {
			error ??= 'transformed'
		} else {
			restorable.push({ image, source })
		}
	}

	const shapeCount = restorable.reduce((sum, { source }) => sum + source.content.shapes.length, 0)
	// Counts the images too, because each put runs before its image is deleted
	if (editor.getCurrentPageShapeIds().size + shapeCount > editor.options.maxShapesPerPage) {
		const pageId = editor.getCurrentPageId()
		editor.emit('max-shapes', {
			name: editor.getPage(pageId)!.name,
			pageId,
			count: editor.options.maxShapesPerPage,
		})
		return { type: 'error', reason: 'max-shapes' }
	}

	const restoredShapeIds: TLShapeId[] = []
	const selectionAtStart = editor.getSelectedShapeIds()

	editor.run(() => {
		for (const { source, image: imageAtStart } of restorable) {
			// The image may have been deleted or changed by a collaborator while we fetched
			const image = editor.getShape<TLImageShape>(imageAtStart.id)
			if (!image || !canRestoreFlattenSource(image, source)) {
				error ??= 'transformed'
				continue
			}

			editor.selectNone()
			try {
				editor.putContentOntoCurrentPage(source.content, { preservePosition: true, select: true })
			} catch {
				// content from a newer schema can't be migrated down
				error ??= 'unreadable'
				continue
			}
			// in stacking order: put selects the roots in the order it indexed them
			const ids = editor.getSelectedShapeIds()
			if (ids.length === 0) {
				error ??= 'unreadable'
				continue
			}

			// The shapes are back where they were flattened from; move them onto the image
			const sourceOrigin = { x: source.bounds.x, y: source.bounds.y }
			const imageTransform = editor.getShapePageTransform(image)
			const scale = image.props.w / source.bounds.w
			if (scale !== 1) scaleShapeTrees(editor, ids, scale, sourceOrigin)
			const rotation = imageTransform.rotation()
			if (rotation !== 0) {
				editor.rotateShapesBy(ids, rotation, { center: sourceOrigin })
			}
			editor.nudgeShapes(ids, Vec.Sub(imageTransform.point(), sourceOrigin))
			editor.reparentShapes(ids, image.parentId, image.index)
			// Put may have moved some roots into a frame that covers the original area, and
			// reparenting orders them by those mixed indices, so restore the stacking order
			const indices = ids.map((id) => editor.getShape(id)!.index).sort()
			editor.updateShapes(
				ids.map((id, i) => ({ id, type: editor.getShape(id)!.type, index: indices[i] }))
			)
			editor.deleteShapes([image.id])

			restoredShapeIds.push(...ids)
		}
		editor.setSelectedShapes([
			...selectionAtStart.filter((id) => editor.getShape(id)),
			...restoredShapeIds,
		])
	})

	if (error) return { type: 'error', reason: error }
	return { type: 'success', shapeIds: restoredShapeIds }
}

export function useFlatten() {
	const editor = useEditor()
	return useCallback(
		(ids: TLShapeId[]) => {
			return flattenShapesToImages(editor, ids)
		},
		[editor]
	)
}
