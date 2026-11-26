import {
	Box,
	Result,
	TLEmbedShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	Vec,
	compact,
	createShapeId,
	defineMessages,
	kickoutOccludedShapes,
} from '@tldraw/editor'
import { createBookmarkFromUrl } from '../shapes/bookmark/bookmarks'
import { fitFrameToContent, getFrameableShapeIds } from '../utils/frames/frames'
import { openLink } from '../utils/openLink'
import { EmbedDialog } from './components/EmbedDialog'
import {
	canFlatten,
	canFrameSelection,
	canToggleAutoSize,
	isOnlyEmbeddableBookmarkSelected,
	isOnlyEmbedWithUrlSelected,
} from './context/action-predicates'
import type { TLUiActionItem } from './context/actions'
import type { TLUiEventSource } from './context/events'
import { flattenShapesToImages } from './hooks/useFlatten'
import type { TLUiTranslationKey } from './hooks/useTranslation/TLUiTranslationKey'
import type { TLUiIconType } from './icon-types'
import type { TLUiActionItemsContext } from './uiSlots'

type DefaultActionItem = TLUiActionItem<TLUiTranslationKey, TLUiIconType>

const messages = defineMessages({
	actionConvertToBookmark: {
		id: 'action.convert-to-bookmark',
		defaultMessage: 'Convert to bookmark',
	},
	actionConvertToEmbed: { id: 'action.convert-to-embed', defaultMessage: 'Convert to embed' },
	actionFlattenToImage: { id: 'action.flatten-to-image', defaultMessage: 'Flatten' },
	actionFrameSelection: { id: 'action.frame-selection', defaultMessage: 'Frame selection' },
	actionInsertEmbed: { id: 'action.insert-embed', defaultMessage: 'Insert embed…' },
	actionInsertMedia: { id: 'action.insert-media', defaultMessage: 'Upload media…' },
	actionOpenEmbedLink: { id: 'action.open-embed-link', defaultMessage: 'Open link' },
	actionSelectZoomTool: { id: 'action.select-zoom-tool', defaultMessage: 'Zoom' },
	actionToggleAutoSize: { id: 'action.toggle-auto-size', defaultMessage: 'Toggle auto size' },
	toolImageCrop: { id: 'tool.image-crop', defaultMessage: 'Crop image' },
	toolReplaceMedia: { id: 'tool.replace-media', defaultMessage: 'Replace media…' },
})

/** The embed shape's actions: insert an embed, open its link, and convert a bookmark to an embed. @internal */
export function embedActionItems({
	editor,
	helpers,
	trackEvent,
}: TLUiActionItemsContext): DefaultActionItem[] {
	return [
		{
			id: 'insert-embed',
			label: messages.actionInsertEmbed.id,
			kbd: 'cmd+i,ctrl+i',
			readonlyOk: false,
			commandPalette: { group: 'edit' },
			onSelect(source) {
				trackEvent('insert-embed', { source })
				helpers.addDialog({ component: EmbedDialog })
			},
		},
		{
			id: 'open-embed-link',
			isEnabled: (editor) => {
				const s = editor.getOnlySelectedShape()
				return !!s && editor.isShapeOfType(s, 'embed')
			},
			label: messages.actionOpenEmbedLink.id,
			readonlyOk: true,
			commandPalette: false,
			onSelect(source) {
				trackEvent('open-embed-link', { source })
				const ids = editor.getSelectedShapeIds()
				const warnMsg = 'No embed shapes selected'
				if (ids.length !== 1) {
					console.error(warnMsg)
					return
				}
				const shape = editor.getShape(ids[0])
				if (!shape || !editor.isShapeOfType(shape, 'embed')) {
					console.error(warnMsg)
					return
				}

				openLink(editor, shape.props.url)
			},
		},
		{
			id: 'convert-to-embed',
			isEnabled: (editor) => editor.isIn('select') && isOnlyEmbeddableBookmarkSelected(editor),
			label: messages.actionConvertToEmbed.id,
			readonlyOk: false,
			commandPalette: { group: 'selection' },
			onSelect(source) {
				trackEvent('convert-to-embed', { source })

				editor.run(() => {
					const createList: TLShapePartial[] = []
					const deleteList: TLShapeId[] = []
					for (const shape of editor.getSelectedShapes()) {
						if (!editor.isShapeOfType(shape, 'bookmark')) continue

						const { url } = shape.props

						const embedInfo = helpers.getEmbedDefinition(url)
						if (!embedInfo?.definition) continue

						const { width, height } = embedInfo.definition

						const newPos = new Vec(shape.x, shape.y)
						newPos.rot(-shape.rotation)
						newPos.add(new Vec(shape.props.w / 2 - width / 2, shape.props.h / 2 - height / 2))
						newPos.rot(shape.rotation)

						const shapeToCreate: TLShapePartial<TLEmbedShape> = {
							id: createShapeId(),
							type: 'embed',
							x: newPos.x,
							y: newPos.y,
							rotation: shape.rotation,
							props: {
								url: url,
								w: width,
								h: height,
							},
						}

						createList.push(shapeToCreate)
						deleteList.push(shape.id)
					}

					editor.markHistoryStoppingPoint('convert shapes to embed')
					editor.deleteShapes(deleteList)
					editor.createShapes(createList)
				})
			},
		},
	]
}

/** The bookmark shape's actions: convert an embed to a bookmark. @internal */
export function bookmarkActionItems({
	editor,
	trackEvent,
}: TLUiActionItemsContext): DefaultActionItem[] {
	return [
		{
			id: 'convert-to-bookmark',
			isEnabled: (editor) => editor.isIn('select') && isOnlyEmbedWithUrlSelected(editor),
			label: messages.actionConvertToBookmark.id,
			readonlyOk: false,
			commandPalette: { group: 'selection' },
			async onSelect(source) {
				trackEvent('convert-to-bookmark', { source })
				const shapes = editor.getSelectedShapes()

				const markId = editor.markHistoryStoppingPoint('convert shapes to bookmark')

				const creationPromises: Promise<Result<any, any>>[] = []

				for (const shape of shapes) {
					if (!shape || !editor.isShapeOfType(shape, 'embed') || !shape.props.url) continue

					const center = editor.getShapePageBounds(shape)?.center

					if (!center) continue
					editor.deleteShapes([shape.id])

					creationPromises.push(
						createBookmarkFromUrl(editor, { url: shape.props.url, center }).then((res) => {
							if (!res.ok) {
								throw new Error(res.error)
							}
							return res
						})
					)
				}

				await Promise.all(creationPromises).catch((error) => {
					editor.bailToMark(markId)
					console.error(error)
				})
			},
		},
	]
}

/** The text shape's actions: turn auto size back on. @internal */
export function textActionItems({
	editor,
	trackEvent,
}: TLUiActionItemsContext): DefaultActionItem[] {
	return [
		{
			id: 'toggle-auto-size',
			isEnabled: (editor) => editor.isIn('select') && canToggleAutoSize(editor),
			label: messages.actionToggleAutoSize.id,
			readonlyOk: false,
			commandPalette: { group: 'selection' },
			onSelect(source) {
				trackEvent('toggle-auto-size', { source })
				editor.markHistoryStoppingPoint('toggling auto size')
				editor.run(() => {
					const shapes = editor
						.getSelectedShapes()
						.filter(
							(shape): shape is TLTextShape =>
								editor.isShapeOfType(shape, 'text') && shape.props.autoSize === false
						)
					editor.updateShapes(
						shapes.map((shape) => {
							return { id: shape.id, type: shape.type, props: { w: 8, autoSize: true } }
						})
					)
					kickoutOccludedShapes(
						editor,
						shapes.map((shape) => shape.id)
					)
				})
			},
		},
	]
}

/** The frame shape's actions: put the selection in a new frame. @internal */
export function frameActionItems({
	editor,
	trackEvent,
}: TLUiActionItemsContext): DefaultActionItem[] {
	function frameSelectedShapes(source: TLUiEventSource) {
		// Unlike group, a single shape can be framed, so there is no two-shape minimum.
		const ids = getFrameableShapeIds(editor, editor.getSelectedShapeIds())
		if (ids.length === 0) return

		const shapes = compact(ids.map((id) => editor.getShape(id)))
		const pageBounds = editor.getShapesPageBounds(ids)
		if (!pageBounds) return
		// Frame props reject zero dimensions, which a lone horizontal arrow or a dot has. The
		// frame is fitted to its content with padding below, so a placeholder size is fine here.
		const { w, h } = Box.ZeroFix(pageBounds)

		trackEvent('frame-selection', { source })
		editor.markHistoryStoppingPoint('frame-selection')

		const parentId = editor.findCommonAncestor(shapes) ?? editor.getCurrentPageId()

		const frameId = createShapeId()
		const padding = 25 / editor.getZoomLevel()

		editor.run(() => {
			editor.createShapes([
				{
					id: frameId,
					type: 'frame',
					parentId,
					x: pageBounds.x,
					y: pageBounds.y,
					props: { w, h },
				},
			])
			editor.reparentShapes(ids, frameId)
			fitFrameToContent(editor, frameId, { padding })
			editor.select(frameId)
		})
	}

	return [
		{
			id: 'frame-selection',
			isEnabled: (editor) => editor.isIn('select') && canFrameSelection(editor),
			label: messages.actionFrameSelection.id,
			readonlyOk: false,
			commandPalette: { group: 'selection' },
			onSelect: frameSelectedShapes,
		},
	]
}

/** The geo shape's actions: select the geo tool with the shape it last drew. @internal */
export function geoActionItems({
	editor,
	trackEvent,
}: TLUiActionItemsContext): DefaultActionItem[] {
	return [
		{
			id: 'select-geo-tool',
			kbd: 'g',
			readonlyOk: false,
			commandPalette: false,
			onSelect: async (source) => {
				// will select whatever the most recent geo tool was
				trackEvent('select-tool', { source, id: `geo-previous` })
				editor.setCurrentTool('geo')
			},
		},
	]
}

/** The zoom tool's actions: hold Z to zoom. @internal */
export function zoomActionItems({
	editor,
	trackEvent,
}: TLUiActionItemsContext): DefaultActionItem[] {
	return [
		{
			id: 'select-zoom-tool',
			label: messages.actionSelectZoomTool.id,
			readonlyOk: true,
			kbd: 'z, !z',
			commandPalette: false,
			onSelect(source) {
				// Noop if user is actually cmd/ctrl+z'ing
				if (editor.inputs.getAccelKey()) return

				// Noop unless in the current tool's idle state
				const path = editor.getPath()
				if (!path.endsWith('.idle')) return

				// Noop if already in zoom tool
				if (editor.root.getCurrent()?.id === 'zoom') return

				trackEvent('zoom-tool', { source })
				// The editor ignores keys while a button holds focus, so zoom would never see the
				// Z key up that exits it. editor.focus() won't help: the button is already inside
				// the container, so the editor reads as focused.
				editor.getContainer().focus()
				editor.setCurrentTool('zoom', { onInteractionEnd: path })
			},
		},
	]
}

/** The upload action, which inserts images and videos. @internal */
export function mediaActionItems({
	helpers,
	trackEvent,
}: TLUiActionItemsContext): DefaultActionItem[] {
	return [
		{
			id: 'insert-media',
			label: messages.actionInsertMedia.id,
			kbd: 'cmd+u,ctrl+u',
			readonlyOk: false,
			commandPalette: { group: 'edit' },
			onSelect(source) {
				trackEvent('insert-media', { source })
				helpers.insertMedia()
			},
		},
	]
}

/** The image shape's actions: crop, replace, and flatten shapes to an image. @internal */
export function imageActionItems({
	editor,
	helpers,
	trackEvent,
}: TLUiActionItemsContext): DefaultActionItem[] {
	return [
		{
			id: 'crop-image',
			label: messages.toolImageCrop.id,
			isAvailable: (editor) => {
				if (!editor.isIn('select')) return false
				const shape = editor.getOnlySelectedShape()
				return !!shape && shape.type === 'image' && !shape.isLocked
			},
			readonlyOk: false,
			commandPalette: false,
			onSelect(source) {
				trackEvent('crop-image', { source })
				editor.setCurrentTool('select.crop.idle')
			},
		},
		{
			id: 'image-replace',
			label: messages.toolReplaceMedia.id,
			icon: 'arrow-cycle',
			readonlyOk: false,
			commandPalette: false,
			onSelect: async (source) => {
				trackEvent('image-replace', { source })
				helpers.replaceImage()
			},
		},
		{
			id: 'flatten-to-image',
			isEnabled: canFlatten,
			label: messages.actionFlattenToImage.id,
			kbd: 'shift+f',
			readonlyOk: false,
			commandPalette: { group: 'selection' },
			onSelect: async (source) => {
				const ids = editor.getSelectedShapeIds()
				if (ids.length === 0) return

				editor.markHistoryStoppingPoint('flattening to image')
				trackEvent('flatten-to-image', { source })

				const newShapeIds = await flattenShapesToImages(
					editor,
					ids,
					editor.options.flattenImageBoundsExpand
				)

				if (newShapeIds?.length) {
					editor.setSelectedShapes(newShapeIds)
				}
			},
		},
	]
}

/** The video shape's actions: replace a video. @internal */
export function videoActionItems({
	helpers,
	trackEvent,
}: TLUiActionItemsContext): DefaultActionItem[] {
	return [
		{
			id: 'video-replace',
			label: messages.toolReplaceMedia.id,
			icon: 'arrow-cycle',
			readonlyOk: false,
			commandPalette: false,
			onSelect: async (source) => {
				trackEvent('video-replace', { source })
				helpers.replaceVideo()
			},
		},
	]
}

/**
 * The actions above, for an editor that gets its shapes and tools from options instead of the
 * tldraw plugins. Each item is used only when the editor has the shape or tool that it needs.
 *
 * @internal
 */
export const legacyActionItems: readonly {
	items(ctx: TLUiActionItemsContext): DefaultActionItem[]
	isAvailable(ctx: TLUiActionItemsContext): boolean
}[] = [
	{ items: embedActionItems, isAvailable: ({ editor }) => editor.hasShapeUtil('embed') },
	{ items: bookmarkActionItems, isAvailable: ({ editor }) => editor.hasShapeUtil('bookmark') },
	{ items: textActionItems, isAvailable: ({ editor }) => editor.hasShapeUtil('text') },
	{ items: frameActionItems, isAvailable: ({ editor }) => editor.hasShapeUtil('frame') },
	{ items: geoActionItems, isAvailable: ({ editor }) => hasTool(editor, 'geo') },
	{ items: zoomActionItems, isAvailable: ({ editor }) => hasTool(editor, 'zoom') },
	{
		items: mediaActionItems,
		isAvailable: ({ editor }) => editor.hasShapeUtil('image') || editor.hasShapeUtil('video'),
	},
	{ items: imageActionItems, isAvailable: ({ editor }) => editor.hasShapeUtil('image') },
	{ items: videoActionItems, isAvailable: ({ editor }) => editor.hasShapeUtil('video') },
]

function hasTool(editor: TLUiActionItemsContext['editor'], id: string) {
	return editor.root.children?.[id] !== undefined
}
