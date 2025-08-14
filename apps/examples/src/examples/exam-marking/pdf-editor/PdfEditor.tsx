import { useMemo } from 'react'
import {
	Box,
	SVGContainer,
	StateNode,
	TLClickEventInfo,
	TLComponents,
	TLImageShape,
	TLShapePartial,
	Tldraw,
	getIndicesBetween,
	react,
	sortByIndex,
	track,
	useEditor,
} from 'tldraw'
import { MarkingTool } from '../add-mark-tool'
import { EXAM_MARK_HEIGHT, EXAM_MARK_WIDTH, ExamMarkUtil, IExamMarkShape } from '../add-mark-util'
import { ExamScoreLabel } from '../ExamScoreLabel'
import { components, uiOverrides } from '../ui-overrides'
import { ExportPdfButton } from './ExportPdfButton'
import { Pdf } from './PdfPicker'

const customShapeUtils = [ExamMarkUtil]
const customTools = [MarkingTool]

export function PdfEditor({ pdf }: { pdf: Pdf }) {
	const pdfEditorComponents = useMemo<TLComponents>(
		() => ({
			PageMenu: null,
			InFrontOfTheCanvas: () => <PageOverlayScreen pdf={pdf} />,
			SharePanel: () => (
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 8,
						justifyContent: 'normal',
						padding: '0px 6px',
					}}
				>
					<ExamScoreLabel />
					<ExportPdfButton pdf={pdf} />
				</div>
			),
			...components,
		}),
		[pdf]
	)

	return (
		<Tldraw
			onMount={(editor) => {
				// See the custom-double-click-behavior example for more details on this
				type IdleStateNode = StateNode & {
					handleDoubleClickOnCanvas(info: TLClickEventInfo): void
				}

				const selectIdleState = editor.getStateDescendant<IdleStateNode>('select.idle')
				if (!selectIdleState) throw Error('SelectTool Idle state not found')

				function customDoubleClickOnCanvasHandler(_info: TLClickEventInfo) {
					editor.createShape<IExamMarkShape>({
						type: 'exam-mark',
						x: editor.inputs.currentPagePoint.x - EXAM_MARK_WIDTH / 2,
						y: editor.inputs.currentPagePoint.y - EXAM_MARK_HEIGHT / 2,
					})
				}

				selectIdleState.handleDoubleClickOnCanvas =
					customDoubleClickOnCanvasHandler.bind(selectIdleState)

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
							isLocked: true,
							props: {
								assetId: page.assetId,
								w: page.bounds.w,
								h: page.bounds.h,
							},
						})
					)
				)

				const shapeIds = pdf.pages.map((page) => page.shapeId)
				const shapeIdSet = new Set(shapeIds)

				// Don't let the user unlock the pages
				editor.sideEffects.registerBeforeChangeHandler('shape', (prev, next) => {
					if (!shapeIdSet.has(next.id)) return next
					if (next.isLocked) return next
					return { ...prev, isLocked: true }
				})

				// Make sure the shapes are below any of the other shapes
				function makeSureShapesAreAtBottom() {
					const shapes = shapeIds.map((id) => editor.getShape(id)!).sort(sortByIndex)
					const pageId = editor.getCurrentPageId()

					const siblings = editor.getSortedChildIdsForParent(pageId)
					const currentBottomShapes = siblings
						.slice(0, shapes.length)
						.map((id) => editor.getShape(id)!)

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
				editor.sideEffects.registerAfterCreateHandler('shape', makeSureShapesAreAtBottom)
				editor.sideEffects.registerAfterChangeHandler('shape', makeSureShapesAreAtBottom)

				// Constrain the camera to the bounds of the pages
				const targetBounds = pdf.pages.reduce(
					(acc, page) => acc.union(page.bounds),
					pdf.pages[0].bounds.clone()
				)

				function updateCameraBounds(isMobile: boolean) {
					editor.setCameraOptions({
						constraints: {
							bounds: targetBounds,
							padding: { x: isMobile ? 16 : 164, y: 64 },
							origin: { x: 0.5, y: 0 },
							initialZoom: 'fit-x-100',
							baseZoom: 'default',
							behavior: 'contain',
						},
					})
					editor.setCamera(editor.getCamera(), { reset: true })
				}

				let isMobile = editor.getViewportScreenBounds().width < 840

				react('update camera', () => {
					const isMobileNow = editor.getViewportScreenBounds().width < 840
					if (isMobileNow === isMobile) return
					isMobile = isMobileNow
					updateCameraBounds(isMobile)
				})

				updateCameraBounds(isMobile)
			}}
			components={pdfEditorComponents}
			tools={customTools}
			initialState="mark" // set the initial tool to the exam marking tool
			shapeUtils={customShapeUtils}
			overrides={uiOverrides}
		/>
	)
}

const PageOverlayScreen = track(function PageOverlayScreen({ pdf }: { pdf: Pdf }) {
	const editor = useEditor()

	const viewportPageBounds = editor.getViewportPageBounds()
	const viewportScreenBounds = editor.getViewportScreenBounds()

	const relevantPageBounds = pdf.pages
		.map((page) => {
			if (!viewportPageBounds.collides(page.bounds)) return null
			const topLeft = editor.pageToViewport(page.bounds)
			const bottomRight = editor.pageToViewport({ x: page.bounds.maxX, y: page.bounds.maxY })
			return new Box(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
		})
		.filter((bounds): bounds is Box => bounds !== null)

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
