import { useCallback, useEffect, useMemo } from 'react'
import {
	Box,
	DEFAULT_CAMERA_OPTIONS,
	PORTRAIT_BREAKPOINT,
	SVGContainer,
	TLImageShape,
	TLShapeId,
	TLShapePartial,
	Tldraw,
	compact,
	getIndicesBetween,
	sortByIndex,
	track,
	useBreakpoint,
	useEditor,
} from 'tldraw'
import { ExportPdfButton } from './ExportPdfButton'
import { Pdf } from './PdfPicker'

// TODO:
// - prevent changing pages (create page, change page, move shapes to new page)
// - prevent locked shape context menu
// - inertial scrolling for constrained camera
// - render pages on-demand instead of all at once.
export function PdfEditor({ pdf }: { pdf: Pdf }) {
	const pdfShapeIds = useMemo(() => pdf.pages.map((page) => page.shapeId), [pdf.pages])
	return (
		<Tldraw
			onMount={(editor) => {
				editor.updateInstanceState({ isDebugMode: false })
				editor.setCamera({ x: 1000, y: 1000, z: 1 })

				editor.createAssets(
					pdf.pages.map((page) => ({
						id: page.assetId,
						typeName: 'asset',
						type: 'image',
						meta: {},
						props: {
							w: page.bounds.w,
							h: page.bounds.h,
							mimeType: 'image/png',
							src: page.src,
							name: 'page',
							isAnimated: false,
						},
					}))
				)

				editor.createShapes(
					pdf.pages.map(
						(page): TLShapePartial<TLImageShape> => ({
							id: page.shapeId,
							type: 'image',
							x: page.bounds.x,
							y: page.bounds.y,
							props: {
								assetId: page.assetId,
								w: page.bounds.w,
								h: page.bounds.h,
							},
						})
					)
				)
			}}
			components={{
				PageMenu: null,
				InFrontOfTheCanvas: useCallback(() => {
					return <PageOverlayScreen pdf={pdf} />
				}, [pdf]),
				SharePanel: useCallback(() => {
					return <ExportPdfButton pdf={pdf} />
				}, [pdf]),
			}}
		>
			<ConstrainCamera pdf={pdf} />
			<KeepShapesLocked shapeIds={pdfShapeIds} />
			<KeepShapesAtBottomOfCurrentPage shapeIds={pdfShapeIds} />
		</Tldraw>
	)
}

const PageOverlayScreen = track(function PageOverlayScreen({ pdf }: { pdf: Pdf }) {
	const editor = useEditor()

	const viewportPageBounds = editor.getViewportPageBounds()
	const viewportScreenBounds = editor.getViewportScreenBounds()

	const relevantPageBounds = compact(
		pdf.pages.map((page) => {
			if (!viewportPageBounds.collides(page.bounds)) return null
			const topLeft = editor.pageToViewport(page.bounds)
			const bottomRight = editor.pageToViewport({ x: page.bounds.maxX, y: page.bounds.maxY })
			return new Box(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
		})
	)

	function pathForPageBounds(bounds: Box) {
		return `M ${bounds.x} ${bounds.y} L ${bounds.maxX} ${bounds.y} L ${bounds.maxX} ${bounds.maxY} L ${bounds.x} ${bounds.maxY} Z`
	}

	const viewportPath = `M 0 0 L ${viewportScreenBounds.w} 0 L ${viewportScreenBounds.w} ${viewportScreenBounds.h} L 0 ${viewportScreenBounds.h} Z`

	return (
		<>
			<SVGContainer className="PageOverlayScreen-screen">
				<path
					d={`${viewportPath} ${relevantPageBounds.map(pathForPageBounds).join(' ')}`}
					fillRule="evenodd"
				/>
			</SVGContainer>
			{relevantPageBounds.map((bounds, i) => (
				<div
					key={i}
					className="PageOverlayScreen-outline"
					style={{
						width: bounds.w,
						height: bounds.h,
						transform: `translate(${bounds.x}px, ${bounds.y}px)`,
					}}
				/>
			))}
		</>
	)
})

function ConstrainCamera({ pdf }: { pdf: Pdf }) {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM

	useEffect(() => {
		const targetBounds = pdf.pages.reduce(
			(acc, page) => acc.union(page.bounds),
			pdf.pages[0].bounds.clone()
		)

		editor.setCameraOptions(
			{
				...DEFAULT_CAMERA_OPTIONS,
				constraints: {
					bounds: targetBounds,
					padding: { x: isMobile ? 16 : 164, y: 64 },
					origin: { x: 0.5, y: 0 },
					initialZoom: 'fit-x',
					baseZoom: 'default',
					behavior: 'contain',
				},
			},
			{ reset: true }
		)
	}, [editor, isMobile, pdf.pages])

	return null
}

function KeepShapesLocked({ shapeIds }: { shapeIds: TLShapeId[] }) {
	const editor = useEditor()

	useEffect(() => {
		const shapeIdSet = new Set(shapeIds)

		for (const shapeId of shapeIdSet) {
			const shape = editor.getShape(shapeId)!
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				isLocked: true,
			})
		}

		const removeOnChange = editor.sideEffects.registerBeforeChangeHandler('shape', (prev, next) => {
			if (!shapeIdSet.has(next.id)) return next
			if (next.isLocked) return next
			return { ...prev, isLocked: true }
		})

		return () => {
			removeOnChange()
		}
	}, [editor, shapeIds])

	return null
}

function KeepShapesAtBottomOfCurrentPage({ shapeIds }: { shapeIds: TLShapeId[] }) {
	const editor = useEditor()

	useEffect(() => {
		const shapeIdSet = new Set(shapeIds)

		function makeSureShapesAreAtBottom() {
			const shapes = shapeIds.map((id) => editor.getShape(id)!).sort(sortByIndex)
			const pageId = editor.getCurrentPageId()

			const siblings = editor.getSortedChildIdsForParent(pageId)
			const currentBottomShapes = siblings.slice(0, shapes.length).map((id) => editor.getShape(id)!)

			if (currentBottomShapes.every((shape, i) => shape.id === shapes[i].id)) return

			const otherSiblings = siblings.filter((id) => !shapeIdSet.has(id))
			const bottomSibling = otherSiblings[0]
			const lowestIndex = editor.getShape(bottomSibling)!.index

			const indexes = getIndicesBetween(undefined, lowestIndex, shapes.length)
			editor.updateShapes(
				shapes.map((shape, i) => ({
					id: shape.id,
					type: shape.type,
					isLocked: shape.isLocked,
					index: indexes[i],
				}))
			)
		}

		makeSureShapesAreAtBottom()

		const removeOnCreate = editor.sideEffects.registerAfterCreateHandler(
			'shape',
			makeSureShapesAreAtBottom
		)
		const removeOnChange = editor.sideEffects.registerAfterChangeHandler(
			'shape',
			makeSureShapesAreAtBottom
		)

		return () => {
			removeOnCreate()
			removeOnChange()
		}
	}, [editor, shapeIds])

	return null
}
