import { useMemo, useState } from 'react'
import {
	AssetRecordType,
	Editor,
	SVGContainer,
	TLComponents,
	TLShapeId,
	Tldraw,
	createShapeId,
	track,
	useEditor,
} from 'tldraw'
import { AnnotatorImage } from './types'

export function ImageAnnotationEditor({
	image,
	onDone,
}: {
	image: AnnotatorImage
	onDone(result: Blob): void
}) {
	// [1]
	const [imageShapeId] = useState(() => createShapeId())

	const components = useMemo<TLComponents>(
		() => ({
			PageMenu: null,
			InFrontOfTheCanvas: () => <ImageBoundsOverlay imageShapeId={imageShapeId} />,
			SharePanel: () => <DoneButton imageShapeId={imageShapeId} onClick={onDone} />,
		}),
		[imageShapeId, onDone]
	)

	function onMount(editor: Editor) {
		const assetId = AssetRecordType.createId()
		editor.createAssets([
			{
				id: assetId,
				typeName: 'asset',
				type: 'image',
				meta: {},
				props: {
					w: image.width,
					h: image.height,
					mimeType: image.type,
					src: image.src,
					name: 'image',
					isAnimated: false,
				},
			},
		])
		editor.createShape({
			id: imageShapeId,
			type: 'image',
			x: 0,
			y: 0,
			isLocked: true,
			props: {
				w: image.width,
				h: image.height,
				assetId,
			},
		})

		// [2]
		function makeSureShapeIsAtBottom() {
			const shape = editor.getShape(imageShapeId)
			if (!shape) return

			const pageId = editor.getCurrentPageId()
			if (shape.parentId !== pageId) {
				editor.moveShapesToPage([shape], pageId)
			}

			const siblings = editor.getSortedChildIdsForParent(pageId)
			if (siblings[0] !== imageShapeId) {
				editor.sendToBack([shape])
			}
		}

		makeSureShapeIsAtBottom()

		const removeOnCreate = editor.sideEffects.registerAfterCreateHandler(
			'shape',
			makeSureShapeIsAtBottom
		)
		const removeOnChange = editor.sideEffects.registerAfterChangeHandler(
			'shape',
			makeSureShapeIsAtBottom
		)

		// [3]
		const removeKeepLocked = editor.sideEffects.registerBeforeChangeHandler(
			'shape',
			(prev, next) => {
				if (next.id !== imageShapeId) return next
				if (next.isLocked) return next
				return { ...prev, isLocked: true }
			}
		)

		// [4]
		editor.setCameraOptions({
			constraints: {
				initialZoom: 'default',
				baseZoom: 'fit-min-100',
				bounds: { w: image.width, h: image.height, x: 0, y: 0 },
				padding: { x: 32, y: 64 },
				origin: { x: 0.5, y: 0.5 },
				behavior: 'contain',
			},
		})
		editor.setCamera(editor.getCamera(), { reset: true })

		// The image setup shouldn't be undoable
		editor.clearHistory()

		return () => {
			removeOnCreate()
			removeOnChange()
			removeKeepLocked()
		}
	}

	return <Tldraw onMount={onMount} components={components} />
}

// [5]
const ImageBoundsOverlay = track(function ImageBoundsOverlay({
	imageShapeId,
}: {
	imageShapeId: TLShapeId
}) {
	const editor = useEditor()
	const imagePageBounds = editor.getShapePageBounds(imageShapeId)
	if (!imagePageBounds) return null

	const viewport = editor.getViewportScreenBounds()
	const topLeft = editor.pageToViewport(imagePageBounds)
	const bottomRight = editor.pageToViewport({ x: imagePageBounds.maxX, y: imagePageBounds.maxY })

	const path = [
		// trace around the viewport
		`M ${-10} ${-10}`,
		`L ${viewport.maxX + 10} ${-10}`,
		`L ${viewport.maxX + 10} ${viewport.maxY + 10}`,
		`L ${-10} ${viewport.maxY + 10}`,
		`Z`,
		// then cut out a hole for the image
		`M ${topLeft.x} ${topLeft.y}`,
		`L ${bottomRight.x} ${topLeft.y}`,
		`L ${bottomRight.x} ${bottomRight.y}`,
		`L ${topLeft.x} ${bottomRight.y}`,
		`Z`,
	].join(' ')

	return (
		<SVGContainer className="ImageOverlayScreen">
			<path d={path} fillRule="evenodd" />
		</SVGContainer>
	)
})

function DoneButton({
	imageShapeId,
	onClick,
}: {
	imageShapeId: TLShapeId
	onClick(result: Blob): void
}) {
	const editor = useEditor()
	return (
		<button
			className="DoneButton"
			onClick={async () => {
				// [6]
				const { blob } = await editor.toImage([...editor.getCurrentPageShapeIds()], {
					format: 'png',
					background: true,
					bounds: editor.getShapePageBounds(imageShapeId)!,
					padding: 0,
					scale: 1,
				})

				onClick(blob)
			}}
		>
			Done
		</button>
	)
}

/*
[1]
The image shape's id is decided up front so the overlay and done button can be given it
before the editor exists. The parent remounts this component (via `key`) when a new image is
chosen, so the id is stable for the life of one annotation session.

[2]
Annotations must draw on top of the image, so after any shape is created or changed we make
sure the image is still the first child of the page (and still on the page at all).

[3]
A before-change side effect rejects any update that would unlock the image, so it can't be
moved, deleted, or edited.

[4]
Camera constraints keep the image in view: `contain` stops you panning away from it and
`fit-min-100` stops you zooming out past the point where it fills the viewport. Try a very
long, thin image to see the behavior.

[5]
Only the image bounds are exported, so an even-odd SVG path in screen space dims everything
outside the image. `track` re-renders it as the camera moves.

[6]
`editor.toImage` with `bounds` set to the image's page bounds crops the export to exactly the
image, including any annotations that overlap it.
*/
