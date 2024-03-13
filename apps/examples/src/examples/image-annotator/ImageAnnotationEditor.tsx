import { useCallback, useEffect, useState } from 'react'
import {
	AssetRecordType,
	Box,
	Editor,
	SVGContainer,
	TLImageShape,
	TLShapeId,
	Tldraw,
	clamp,
	createShapeId,
	exportToBlob,
	getIndexBelow,
	track,
	useBreakpoint,
	useComputed,
	useEditor,
	useValue,
} from 'tldraw'
import { PORTRAIT_BREAKPOINT } from 'tldraw/src/lib/ui/constants'
import { AnnotatorImage } from './types'

// TODO:
// - prevent changing pages (create page, change page, move shapes to new page)
// - prevent locked shape context menu
export function ImageAnnotationEditor({
	image,
	onDone,
}: {
	image: AnnotatorImage
	onDone: (result: Blob) => void
}) {
	const [imageShapeId, setImageShapeId] = useState<TLShapeId | null>(null)
	function onMount(editor: Editor) {
		editor.store.clear()
		editor.store.ensureStoreIsUsable()

		editor.updateInstanceState({ isDebugMode: false })

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

		const imageId = createShapeId()
		editor.createShape<TLImageShape>({
			id: imageId,
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

		editor.history.clear()
		setImageShapeId(imageId)

		// zoom aaaaallll the way out. our camera constraints will make sure we end up nicely centered on the image
		editor.setCamera({ x: 0, y: 0, z: 0.0001 })
	}

	return (
		<Tldraw
			onMount={onMount}
			components={{
				// show
				InFrontOfTheCanvas: useCallback(() => {
					if (!imageShapeId) return null
					return <ImageBoundsOverlay imageShapeId={imageShapeId} />
				}, [imageShapeId]),
				PageMenu: null,
				HelpMenu: useCallback(() => {
					if (!imageShapeId) return null
					return <DoneButton imageShapeId={imageShapeId} onClick={onDone} />
				}, [imageShapeId, onDone]),
			}}
		>
			{imageShapeId && <KeepShapeAtBottomOfCurrentPage shapeId={imageShapeId} />}
			{imageShapeId && <KeepShapeLocked shapeId={imageShapeId} />}
			{imageShapeId && <ConstrainCamera shapeId={imageShapeId} />}
		</Tldraw>
	)
}

/**
 * When we export, we'll only include the bounds of the image itself, so show an overlay on top of
 * the canvas to make it clear what will/won't be included. Check `image-annotator.css` for more on
 * how this works.
 */
const ImageBoundsOverlay = track(function ImageBoundsOverlay({
	imageShapeId,
}: {
	imageShapeId: TLShapeId
}) {
	const editor = useEditor()
	const image = editor.getShape(imageShapeId) as TLImageShape
	if (!image) return null

	const imagePageBounds = editor.getShapePageBounds(imageShapeId)!
	const viewport = editor.getViewportScreenBounds()
	const topLeft = editor.pageToViewport(imagePageBounds)
	const bottomRight = editor.pageToViewport({ x: imagePageBounds.maxX, y: imagePageBounds.maxY })

	const path = [
		// start by tracing around the viewport itself:
		`M ${-10} ${-10}`,
		`L ${viewport.maxX + 10} ${-10}`,
		`L ${viewport.maxX + 10} ${viewport.maxY + 10}`,
		`L ${-10} ${viewport.maxY + 10}`,
		`Z`,

		// then cut out a hole for the image:
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
	onClick: (result: Blob) => void
}) {
	const editor = useEditor()
	return (
		<button
			className="DoneButton"
			onClick={async () => {
				const blob = await exportToBlob({
					editor,
					ids: Array.from(editor.getCurrentPageShapeIds()),
					format: 'png',
					opts: {
						background: true,
						bounds: editor.getShapePageBounds(imageShapeId)!,
						padding: 0,
						scale: 1,
					},
				})

				onClick(blob)
			}}
		>
			Done
		</button>
	)
}

/**
 * We want to keep our locked image at the bottom of the current page - people shouldn't be able to
 * place other shapes beneath it. This component adds side effects for when shapes are created or
 * updated to make sure that this shape is always kept at the bottom.
 */
function KeepShapeAtBottomOfCurrentPage({ shapeId }: { shapeId: TLShapeId }) {
	const editor = useEditor()

	useEffect(() => {
		function makeSureShapeIsAtBottom() {
			let shape = editor.getShape(shapeId)
			if (!shape) return
			const pageId = editor.getCurrentPageId()

			if (shape.parentId !== pageId) {
				editor.moveShapesToPage([shape], pageId)
				shape = editor.getShape(shapeId)!
			}

			const siblings = editor.getSortedChildIdsForParent(pageId)
			const currentBottomShape = editor.getShape(siblings[0])!
			if (currentBottomShape.id === shapeId) return

			editor.updateShape({
				id: shape.id,
				type: shape.type,
				isLocked: shape.isLocked,
				index: getIndexBelow(currentBottomShape.index),
			})
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

		return () => {
			removeOnCreate()
			removeOnChange()
		}
	}, [editor, shapeId])

	return null
}

function KeepShapeLocked({ shapeId }: { shapeId: TLShapeId }) {
	const editor = useEditor()

	useEffect(() => {
		const shape = editor.getShape(shapeId)
		if (!shape) return

		editor.updateShape({
			id: shape.id,
			type: shape.type,
			isLocked: true,
		})

		const removeOnChange = editor.sideEffects.registerBeforeChangeHandler('shape', (prev, next) => {
			if (next.id !== shapeId) return next
			if (next.isLocked) return next
			return { ...prev, isLocked: true }
		})

		return () => {
			removeOnChange()
		}
	}, [editor, shapeId])

	return null
}

/**
 * We don't w
 */
function ConstrainCamera({ shapeId }: { shapeId: TLShapeId }) {
	const breakpoint = useBreakpoint()
	const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM

	const editor = useEditor()
	const viewportBounds = useValue(
		useComputed(
			'viewport bounds',
			() => editor.getViewportScreenBounds(),
			{ isEqual: Box.Equals },
			[editor]
		)
	)
	const targetBounds = useValue(
		useComputed(
			'target bounds',
			() => editor.getShapePageBounds(shapeId)!,
			{ isEqual: Box.Equals },
			[editor, shapeId]
		)
	)

	useEffect(() => {
		const marginTop = 44
		const marginSide = isMobile ? 16 : 164
		const marginBottom = 60

		function constrainCamera(camera: { x: number; y: number; z: number }): {
			x: number
			y: number
			z: number
		} {
			const usableViewport = new Box(
				marginSide,
				marginTop,
				viewportBounds.w - marginSide * 2,
				viewportBounds.h - marginTop - marginBottom
			)

			const minZoom = Math.min(
				usableViewport.w / targetBounds.w,
				usableViewport.h / targetBounds.h,
				1
			)
			const zoom = Math.max(minZoom, camera.z)

			const centerX = targetBounds.x - targetBounds.w / 2 + usableViewport.midX / zoom
			const centerY = targetBounds.y - targetBounds.h / 2 + usableViewport.midY / zoom

			const availableXMovement = Math.max(0, targetBounds.w - usableViewport.w / zoom)
			const availableYMovement = Math.max(0, targetBounds.h - usableViewport.h / zoom)

			return {
				x: clamp(camera.x, centerX - availableXMovement / 2, centerX + availableXMovement / 2),
				y: clamp(camera.y, centerY - availableYMovement / 2, centerY + availableYMovement / 2),
				z: zoom,
			}
		}

		editor.setCamera(constrainCamera(editor.getCamera()))

		const removeOnChange = editor.sideEffects.registerBeforeChangeHandler(
			'camera',
			(_prev, next) => {
				const constrained = constrainCamera(next)
				if (constrained.x === next.x && constrained.y === next.y && constrained.z === next.z)
					return next
				return { ...next, ...constrained }
			}
		)

		return () => {
			removeOnChange()
		}
	}, [editor, targetBounds, viewportBounds, isMobile])

	return null
}
