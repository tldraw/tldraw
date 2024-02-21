import { react, track, useQuickReactor, useValue } from '@tldraw/state'
import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import { dedupe, modulate, objectMapValues } from '@tldraw/utils'
import classNames from 'classnames'
import React from 'react'
import { COARSE_HANDLE_RADIUS, HANDLE_RADIUS } from '../../constants'
import { useCanvasEvents } from '../../hooks/useCanvasEvents'
import { useCoarsePointer } from '../../hooks/useCoarsePointer'
import { useDocumentEvents } from '../../hooks/useDocumentEvents'
import { useEditor } from '../../hooks/useEditor'
import { useEditorComponents } from '../../hooks/useEditorComponents'
import { useFixSafariDoubleTapZoomPencilEvents } from '../../hooks/useFixSafariDoubleTapZoomPencilEvents'
import { useGestureEvents } from '../../hooks/useGestureEvents'
import { useHandleEvents } from '../../hooks/useHandleEvents'
import { useScreenBounds } from '../../hooks/useScreenBounds'
import { Mat } from '../../primitives/Mat'
import { Vec } from '../../primitives/Vec'
import { toDomPrecision } from '../../primitives/utils'
import { debugFlags } from '../../utils/debug-flags'
import { GeometryDebuggingView } from '../GeometryDebuggingView'
import { LiveCollaborators } from '../LiveCollaborators'
import { Shape } from '../Shape'

/** @public */
export type TLCanvasComponentProps = { className?: string }

/** @public */
export function DefaultCanvas({ className }: TLCanvasComponentProps) {
	const editor = useEditor()

	const { Background, SvgDefs } = useEditorComponents()

	const rCanvas = React.useRef<HTMLDivElement>(null)
	const rHtmlLayer = React.useRef<HTMLDivElement>(null)
	const rHtmlLayer2 = React.useRef<HTMLDivElement>(null)

	useScreenBounds(rCanvas)
	useDocumentEvents()
	useCoarsePointer()

	useGestureEvents(rCanvas)
	useFixSafariDoubleTapZoomPencilEvents(rCanvas)

	useQuickReactor(
		'position layers',
		() => {
			const htmlElm = rHtmlLayer.current
			if (!htmlElm) return
			const htmlElm2 = rHtmlLayer2.current
			if (!htmlElm2) return

			const { x, y, z } = editor.getCamera()

			// Because the html container has a width/height of 1px, we
			// need to create a small offset when zoomed to ensure that
			// the html container and svg container are lined up exactly.
			const offset =
				z >= 1 ? modulate(z, [1, 8], [0.125, 0.5], true) : modulate(z, [0.1, 1], [-2, 0.125], true)

			const transform = `scale(${toDomPrecision(z)}) translate(${toDomPrecision(
				x + offset
			)}px,${toDomPrecision(y + offset)}px)`
			htmlElm.style.setProperty('transform', transform)
			htmlElm2.style.setProperty('transform', transform)
		},
		[editor]
	)

	const events = useCanvasEvents()

	const shapeSvgDefs = useValue(
		'shapeSvgDefs',
		() => {
			const shapeSvgDefsByKey = new Map<string, React.JSX.Element>()
			for (const util of objectMapValues(editor.shapeUtils)) {
				if (!util) return
				const defs = util.getCanvasSvgDefs()
				for (const { key, component: Component } of defs) {
					if (shapeSvgDefsByKey.has(key)) continue
					shapeSvgDefsByKey.set(key, <Component key={key} />)
				}
			}
			return [...shapeSvgDefsByKey.values()]
		},
		[editor]
	)

	const hideShapes = useValue('debug_shapes', () => debugFlags.hideShapes.get(), [debugFlags])
	const debugSvg = useValue('debug_svg', () => debugFlags.debugSvg.get(), [debugFlags])
	const debugGeometry = useValue('debug_geometry', () => debugFlags.debugGeometry.get(), [
		debugFlags,
	])

	return (
		<div
			ref={rCanvas}
			draggable={false}
			className={classNames('tl-canvas', className)}
			data-testid="canvas"
			{...events}
		>
			<svg className="tl-svg-context">
				<defs>
					{shapeSvgDefs}
					{Cursor && <Cursor />}
					<CollaboratorHint />
					<ArrowheadDot />
					<ArrowheadCross />
					{SvgDefs && <SvgDefs />}
				</defs>
			</svg>
			{Background && <Background />}
			<GridWrapper />

			<div ref={rHtmlLayer} className="tl-html-layer tl-shapes" draggable={false}>
				<OnTheCanvasWrapper />
				<SelectionBackgroundWrapper />
				{hideShapes ? null : debugSvg ? <ShapesWithSVGs /> : <ShapesToDisplay />}
			</div>
			<div className="tl-overlays">
				<div ref={rHtmlLayer2} className="tl-html-layer">
					{debugGeometry ? <GeometryDebuggingView /> : null}
					<HandlesWrapper />
					<BrushWrapper />
					<ScribbleWrapper />
					<ZoomBrushWrapper />
					<SelectedIdIndicators />
					<HoveredShapeIndicator />
					<HintedShapeIndicator />
					<SnapIndicatorWrapper />
					<SelectionForegroundWrapper />
					<LiveCollaborators />
				</div>
				<InFrontOfTheCanvasWrapper />
			</div>
		</div>
	)
}

function GridWrapper() {
	const editor = useEditor()
	const gridSize = useValue('gridSize', () => editor.getDocumentSettings().gridSize, [editor])
	const { x, y, z } = useValue('camera', () => editor.getCamera(), [editor])
	const isGridMode = useValue('isGridMode', () => editor.getInstanceState().isGridMode, [editor])
	const { Grid } = useEditorComponents()

	if (!(Grid && isGridMode)) return null

	return <Grid x={x} y={y} z={z} size={gridSize} />
}

function ScribbleWrapper() {
	const editor = useEditor()
	const scribbles = useValue('scribbles', () => editor.getInstanceState().scribbles, [editor])
	const zoomLevel = useValue('zoomLevel', () => editor.getZoomLevel(), [editor])
	const { Scribble } = useEditorComponents()

	if (!(Scribble && scribbles.length)) return null

	return (
		<>
			{scribbles.map((scribble) => (
				<Scribble
					key={scribble.id}
					className="tl-user-scribble"
					scribble={scribble}
					zoom={zoomLevel}
				/>
			))}
		</>
	)
}

function BrushWrapper() {
	const editor = useEditor()
	const brush = useValue('brush', () => editor.getInstanceState().brush, [editor])
	const { Brush } = useEditorComponents()

	if (!(Brush && brush)) return null

	return <Brush className="tl-user-brush" brush={brush} />
}

function ZoomBrushWrapper() {
	const editor = useEditor()
	const zoomBrush = useValue('zoomBrush', () => editor.getInstanceState().zoomBrush, [editor])
	const { ZoomBrush } = useEditorComponents()

	if (!(ZoomBrush && zoomBrush)) return null

	return <ZoomBrush className="tl-user-brush tl-zoom-brush" brush={zoomBrush} />
}

function SnapIndicatorWrapper() {
	const editor = useEditor()
	const lines = useValue('snapLines', () => editor.snaps.getIndicators(), [editor])
	const zoomLevel = useValue('zoomLevel', () => editor.getZoomLevel(), [editor])
	const { SnapIndicator } = useEditorComponents()

	if (!(SnapIndicator && lines.length > 0)) return null

	return (
		<>
			{lines.map((line) => (
				<SnapIndicator key={line.id} className="tl-user-snapline" line={line} zoom={zoomLevel} />
			))}
		</>
	)
}

function HandlesWrapper() {
	const editor = useEditor()
	const { Handles } = useEditorComponents()

	const zoomLevel = useValue('zoomLevel', () => editor.getZoomLevel(), [editor])

	const isCoarse = useValue('coarse pointer', () => editor.getInstanceState().isCoarsePointer, [
		editor,
	])

	const isReadonly = useValue('isChangingStyle', () => editor.getInstanceState().isReadonly, [
		editor,
	])

	const isChangingStyle = useValue(
		'isChangingStyle',
		() => editor.getInstanceState().isChangingStyle,
		[editor]
	)

	const onlySelectedShape = useValue('onlySelectedShape', () => editor.getOnlySelectedShape(), [
		editor,
	])

	const transform = useValue(
		'transform',
		() => {
			if (!onlySelectedShape) return null

			return editor.getShapePageTransform(onlySelectedShape)
		},
		[editor, onlySelectedShape]
	)

	const handles = useValue(
		'handles',
		() => {
			if (!onlySelectedShape) return null

			const handles = editor.getShapeHandles(onlySelectedShape)
			if (!handles) return null

			const minDistBetweenVirtualHandlesAndRegularHandles =
				((isCoarse ? COARSE_HANDLE_RADIUS : HANDLE_RADIUS) / zoomLevel) * 2

			return (
				handles
					.filter(
						(handle) =>
							// if the handle isn't a virtual handle, we'll display it
							handle.type !== 'virtual' ||
							// but for virtual handles, we'll only display them if they're far enough away from vertex handles
							!handles.some(
								(h) =>
									// skip the handle we're checking against
									h !== handle &&
									// only check against vertex handles
									h.type === 'vertex' &&
									// and check that their distance isn't below the minimum distance
									Vec.Dist(handle, h) < minDistBetweenVirtualHandlesAndRegularHandles
							)
					)
					// We want vertex handles in front of all other handles
					.sort((a) => (a.type === 'vertex' ? 1 : -1))
			)
		},
		[editor, onlySelectedShape, zoomLevel, isCoarse]
	)

	if (!Handles || !onlySelectedShape || isChangingStyle || isReadonly || !handles || !transform) {
		return null
	}

	return (
		<Handles>
			<g transform={Mat.toCssString(transform)}>
				{handles.map((handle) => {
					return (
						<HandleWrapper
							key={handle.id}
							shapeId={onlySelectedShape.id}
							handle={handle}
							zoom={zoomLevel}
							isCoarse={isCoarse}
						/>
					)
				})}
			</g>
		</Handles>
	)
}

function HandleWrapper({
	shapeId,
	handle,
	zoom,
	isCoarse,
}: {
	shapeId: TLShapeId
	handle: TLHandle
	zoom: number
	isCoarse: boolean
}) {
	const events = useHandleEvents(shapeId, handle.id)
	const { Handle } = useEditorComponents()

	if (!Handle) return null

	return (
		<g aria-label="handle" transform={`translate(${handle.x}, ${handle.y})`} {...events}>
			<Handle shapeId={shapeId} handle={handle} zoom={zoom} isCoarse={isCoarse} />
		</g>
	)
}

function ShapesWithSVGs() {
	const editor = useEditor()

	const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])

	return (
		<>
			{renderingShapes.map((result) => (
				<React.Fragment key={result.id + '_fragment'}>
					<Shape {...result} />
					<DebugSvgCopy id={result.id} />
				</React.Fragment>
			))}
		</>
	)
}

function ShapesToDisplay() {
	const editor = useEditor()

	const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])

	return (
		<>
			{renderingShapes.map((result) => (
				<Shape key={result.id + '_shape'} {...result} />
			))}
		</>
	)
}

function SelectedIdIndicators() {
	const editor = useEditor()
	const selectedShapeIds = useValue('selectedShapeIds', () => editor.getSelectedShapeIds(), [
		editor,
	])
	const shouldDisplay = useValue(
		'should display selected ids',
		() => {
			// todo: move to tldraw selected ids wrapper
			return (
				editor.isInAny(
					'select.idle',
					'select.brushing',
					'select.scribble_brushing',
					'select.editing_shape',
					'select.pointing_shape',
					'select.pointing_selection',
					'select.pointing_handle'
				) && !editor.getInstanceState().isChangingStyle
			)
		},
		[editor]
	)

	const { ShapeIndicator } = useEditorComponents()

	if (!ShapeIndicator) return null
	if (!shouldDisplay) return null

	return (
		<>
			{selectedShapeIds.map((id) => (
				<ShapeIndicator
					key={id + '_indicator'}
					className="tl-user-indicator__selected"
					shapeId={id}
				/>
			))}
		</>
	)
}

const HoveredShapeIndicator = function HoveredShapeIndicator() {
	const editor = useEditor()
	const { HoveredShapeIndicator } = useEditorComponents()
	const isCoarsePointer = useValue(
		'coarse pointer',
		() => editor.getInstanceState().isCoarsePointer,
		[editor]
	)
	const isHoveringCanvas = useValue(
		'hovering canvas',
		() => editor.getInstanceState().isHoveringCanvas,
		[editor]
	)
	const hoveredShapeId = useValue('hovered id', () => editor.getCurrentPageState().hoveredShapeId, [
		editor,
	])

	if (isCoarsePointer || !isHoveringCanvas || !hoveredShapeId || !HoveredShapeIndicator) return null

	return <HoveredShapeIndicator shapeId={hoveredShapeId} />
}

const HintedShapeIndicator = track(function HintedShapeIndicator() {
	const editor = useEditor()
	const { ShapeIndicator } = useEditorComponents()

	const ids = dedupe(editor.getHintingShapeIds())

	if (!ids.length) return null
	if (!ShapeIndicator) return null

	return (
		<>
			{ids.map((id) => (
				<ShapeIndicator className="tl-user-indicator__hint" shapeId={id} key={id + '_hinting'} />
			))}
		</>
	)
})

function Cursor() {
	return (
		<g id="cursor">
			<g fill="rgba(0,0,0,.2)" transform="translate(-11,-11)">
				<path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
				<path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
			</g>
			<g fill="white" transform="translate(-12,-12)">
				<path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
				<path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
			</g>
			<g fill="currentColor" transform="translate(-12,-12)">
				<path d="m19.751 24.4155-1.844.774-3.1-7.374 1.841-.775z" />
				<path d="m13 10.814v11.188l2.969-2.866.428-.139h4.768z" />
			</g>
		</g>
	)
}

function CollaboratorHint() {
	return <path id="cursor_hint" fill="currentColor" d="M -2,-5 2,0 -2,5 Z" />
}

function ArrowheadDot() {
	return (
		<marker id="arrowhead-dot" className="tl-arrow-hint" refX="3.0" refY="3.0" orient="0">
			<circle cx="3" cy="3" r="2" strokeDasharray="100%" />
		</marker>
	)
}

function ArrowheadCross() {
	return (
		<marker id="arrowhead-cross" className="tl-arrow-hint" refX="3.0" refY="3.0" orient="auto">
			<line x1="1.5" y1="1.5" x2="4.5" y2="4.5" strokeDasharray="100%" />
			<line x1="1.5" y1="4.5" x2="4.5" y2="1.5" strokeDasharray="100%" />
		</marker>
	)
}

const DebugSvgCopy = track(function DupSvg({ id }: { id: TLShapeId }) {
	const editor = useEditor()
	const shape = editor.getShape(id)

	const [html, setHtml] = React.useState('')

	const isInRoot = shape?.parentId === editor.getCurrentPageId()

	React.useEffect(() => {
		if (!isInRoot) return

		let latest = null
		const unsubscribe = react('shape to svg', async () => {
			const renderId = Math.random()
			latest = renderId
			const bb = editor.getShapePageBounds(id)
			const el = await editor.getSvg([id], {
				padding: 0,
				background: editor.getInstanceState().exportBackground,
			})
			if (el && bb && latest === renderId) {
				el.style.setProperty('overflow', 'visible')
				el.setAttribute('preserveAspectRatio', 'xMidYMin slice')
				el.style.setProperty('transform', `translate(${bb.x}px, ${bb.y + bb.h + 12}px)`)
				el.style.setProperty('border', '1px solid black')
				setHtml(el?.outerHTML)
			}
		})

		return () => {
			latest = null
			unsubscribe()
		}
	}, [editor, id, isInRoot])

	if (!isInRoot) return null

	return (
		<div style={{ paddingTop: 12, position: 'absolute' }}>
			<div style={{ display: 'flex' }} dangerouslySetInnerHTML={{ __html: html }} />
		</div>
	)
})

function SelectionForegroundWrapper() {
	const editor = useEditor()
	const selectionRotation = useValue('selection rotation', () => editor.getSelectionRotation(), [
		editor,
	])
	const selectionBounds = useValue(
		'selection bounds',
		() => editor.getSelectionRotatedPageBounds(),
		[editor]
	)
	const { SelectionForeground } = useEditorComponents()
	if (!selectionBounds || !SelectionForeground) return null
	return <SelectionForeground bounds={selectionBounds} rotation={selectionRotation} />
}

function SelectionBackgroundWrapper() {
	const editor = useEditor()
	const selectionRotation = useValue('selection rotation', () => editor.getSelectionRotation(), [
		editor,
	])
	const selectionBounds = useValue(
		'selection bounds',
		() => editor.getSelectionRotatedPageBounds(),
		[editor]
	)
	const { SelectionBackground } = useEditorComponents()
	if (!selectionBounds || !SelectionBackground) return null
	return <SelectionBackground bounds={selectionBounds} rotation={selectionRotation} />
}

function OnTheCanvasWrapper() {
	const { OnTheCanvas } = useEditorComponents()
	if (!OnTheCanvas) return null
	return <OnTheCanvas />
}

function InFrontOfTheCanvasWrapper() {
	const { InFrontOfTheCanvas } = useEditorComponents()
	if (!InFrontOfTheCanvas) return null
	return <InFrontOfTheCanvas />
}
