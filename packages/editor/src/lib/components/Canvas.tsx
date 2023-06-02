import { Matrix2d, toDomPrecision } from '@tldraw/primitives'
import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import { dedupe, modulate } from '@tldraw/utils'
import * as React from 'react'
import { react } from 'signia'
import { track, useValue } from 'signia-react'
import { useCanvasEvents } from '../hooks/useCanvasEvents'
import { useCoarsePointer } from '../hooks/useCoarsePointer'
import { useDocumentEvents } from '../hooks/useDocumentEvents'
import { useApp } from '../hooks/useEditor'
import { useEditorComponents } from '../hooks/useEditorComponents'
import { useFixSafariDoubleTapZoomPencilEvents } from '../hooks/useFixSafariDoubleTapZoomPencilEvents'
import { useGestureEvents } from '../hooks/useGestureEvents'
import { useHandleEvents } from '../hooks/useHandleEvents'
import { usePattern } from '../hooks/usePattern'
import { useQuickReactor } from '../hooks/useQuickReactor'
import { useScreenBounds } from '../hooks/useScreenBounds'
import { debugFlags } from '../utils/debug-flags'
import { LiveCollaborators } from './LiveCollaborators'
import { SelectionBg } from './SelectionBg'
import { SelectionFg } from './SelectionFg'
import { Shape } from './Shape'
import { ShapeIndicator } from './ShapeIndicator'

/** @public */
export const Canvas = track(function Canvas({
	onDropOverride,
}: {
	onDropOverride?: (
		defaultOnDrop: (e: React.DragEvent<Element>) => Promise<void>
	) => (e: React.DragEvent<Element>) => Promise<void>
}) {
	const app = useApp()

	const { Background, SvgDefs } = useEditorComponents()

	const rCanvas = React.useRef<HTMLDivElement>(null)
	const rHtmlLayer = React.useRef<HTMLDivElement>(null)

	useScreenBounds()
	useDocumentEvents()
	useCoarsePointer()

	useGestureEvents(rCanvas)
	useFixSafariDoubleTapZoomPencilEvents(rCanvas)

	useQuickReactor(
		'position layers',
		() => {
			const htmlElm = rHtmlLayer.current
			if (!htmlElm) return

			const { x, y, z } = app.camera

			// Because the html container has a width/height of 1px, we
			// need to create a small offset when zoomed to ensure that
			// the html container and svg container are lined up exactly.
			const offset =
				z >= 1 ? modulate(z, [1, 8], [0.125, 0.5], true) : modulate(z, [0.1, 1], [-2, 0.125], true)

			htmlElm.style.setProperty(
				'transform',
				`scale(${toDomPrecision(z)}) translate(${toDomPrecision(x + offset)}px,${toDomPrecision(
					y + offset
				)}px)`
			)
		},
		[app]
	)

	const { context: patternContext, isReady: patternIsReady } = usePattern()

	const events = useCanvasEvents()
	if (onDropOverride) {
		events.onDrop = onDropOverride(events.onDrop)
	}

	React.useEffect(() => {
		if (patternIsReady && app.isSafari) {
			const htmlElm = rHtmlLayer.current

			if (htmlElm) {
				// Wait for `patternContext` to be picked up
				requestAnimationFrame(() => {
					htmlElm.style.display = 'none'

					// Wait for 'display = "none"' to take effect
					requestAnimationFrame(() => {
						htmlElm.style.display = ''
					})
				})
			}
		}
	}, [app, patternIsReady])

	React.useEffect(() => {
		rCanvas.current?.focus()
	}, [])

	return (
		<div ref={rCanvas} draggable={false} className="tl-canvas" data-testid="canvas" {...events}>
			{Background && <Background />}
			<GridWrapper />
			<UiLogger />
			<div ref={rHtmlLayer} className="tl-html-layer" draggable={false}>
				<svg className="tl-svg-context">
					<defs>
						{patternContext}
						{Cursor && <Cursor />}
						<CollaboratorHint />
						<ArrowheadDot />
						<ArrowheadCross />
						{SvgDefs && <SvgDefs />}
					</defs>
				</svg>
				<SelectionBg />
				<div className="tl-shapes">
					<ShapesToDisplay />
				</div>
				<div className="tl-overlays">
					<HandlesWrapper />
					<BrushWrapper />
					<ScribbleWrapper />
					<ZoomBrushWrapper />
					<SelectedIdIndicators />
					<HoveredShapeIndicator />
					<HintedShapeIndicator />
					<SnapLinesWrapper />
					<SelectionFg />
					<LiveCollaborators />
				</div>
			</div>
		</div>
	)
})

const GridWrapper = track(function GridWrapper() {
	const app = useApp()
	const { Grid } = useEditorComponents()

	// get grid from context

	const { x, y, z } = app.camera
	const isGridMode = app.isGridMode

	if (!(Grid && isGridMode)) return null

	return <Grid x={x} y={y} z={z} size={app.gridSize} />
})

const ScribbleWrapper = track(function ScribbleWrapper() {
	const app = useApp()
	const scribble = app.scribble
	const zoom = app.zoomLevel

	const { Scribble } = useEditorComponents()

	if (!(Scribble && scribble)) return null

	return <Scribble className="tl-user-scribble" scribble={scribble} zoom={zoom} />
})

const BrushWrapper = track(function BrushWrapper() {
	const app = useApp()
	const { brush } = app
	const { Brush } = useEditorComponents()

	if (!(Brush && brush && app.isIn('select.brushing'))) return null

	return <Brush className="tl-user-brush" brush={brush} />
})

export const ZoomBrushWrapper = track(function Zoom() {
	const app = useApp()
	const { zoomBrush } = app
	const { ZoomBrush } = useEditorComponents()

	if (!(ZoomBrush && zoomBrush && app.isIn('zoom'))) return null

	return <ZoomBrush className="tl-user-brush" brush={zoomBrush} />
})

export const SnapLinesWrapper = track(function SnapLines() {
	const app = useApp()
	const {
		snaps: { lines },
		zoomLevel,
	} = app
	const { SnapLine } = useEditorComponents()

	if (!(SnapLine && lines.length > 0)) return null

	return (
		<>
			{lines.map((line) => (
				<SnapLine key={line.id} className="tl-user-snapline" line={line} zoom={zoomLevel} />
			))}
		</>
	)
})

const MIN_HANDLE_DISTANCE = 48

const HandlesWrapper = track(function HandlesWrapper() {
	const app = useApp()

	const zoom = app.zoomLevel
	const isChangingStyle = app.isChangingStyle

	const onlySelectedShape = app.onlySelectedShape

	const shouldDisplayHandles =
		app.isInAny('select.idle', 'select.pointing_handle') && !isChangingStyle && !app.isReadOnly

	if (!(onlySelectedShape && shouldDisplayHandles)) return null

	const util = app.getShapeUtil(onlySelectedShape)
	const handles = util.handles?.(onlySelectedShape)

	if (!handles) return null

	const transform = app.getPageTransform(onlySelectedShape)

	if (!transform) return null

	// Don't display a temporary handle if the distance between it and its neighbors is too small.
	const handlesToDisplay: TLHandle[] = []

	for (let i = 0, handle = handles[i]; i < handles.length; i++, handle = handles[i]) {
		if (handle.type !== 'vertex') {
			const prev = handles[i - 1]
			const next = handles[i + 1]
			if (prev && next) {
				if (Math.hypot(prev.y - next.y, prev.x - next.x) < MIN_HANDLE_DISTANCE / zoom) {
					continue
				}
			}
		}

		handlesToDisplay.push(handle)
	}

	handlesToDisplay.sort((a) => (a.type === 'vertex' ? 1 : -1))

	return (
		<svg className="tl-user-handles tl-overlays__item">
			<g transform={Matrix2d.toCssString(transform)}>
				{handlesToDisplay.map((handle) => {
					return <HandleWrapper key={handle.id} shapeId={onlySelectedShape.id} handle={handle} />
				})}
			</g>
		</svg>
	)
})

const HandleWrapper = ({ shapeId, handle }: { shapeId: TLShapeId; handle: TLHandle }) => {
	const events = useHandleEvents(shapeId, handle.id)
	const { Handle } = useEditorComponents()

	if (!Handle) return null

	return (
		<g aria-label="handle" transform={`translate(${handle.x}, ${handle.y})`} {...events}>
			<Handle shapeId={shapeId} handle={handle} />
		</g>
	)
}

const ShapesToDisplay = track(function ShapesToDisplay() {
	const app = useApp()

	const { renderingShapes } = app

	const debugSvg = debugFlags.debugSvg.value
	if (debugSvg) {
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

	return (
		<>
			{renderingShapes.map((result) => (
				<Shape key={result.id + '_shape'} {...result} />
			))}
		</>
	)
})

const SelectedIdIndicators = track(function SelectedIdIndicators() {
	const app = useApp()

	const shouldDisplay =
		app.isInAny(
			'select.idle',
			'select.brushing',
			'select.scribble_brushing',
			'select.pointing_shape',
			'select.pointing_selection',
			'select.pointing_handle'
		) && !app.isChangingStyle

	if (!shouldDisplay) return null

	return (
		<>
			{app.selectedIds.map((id) => (
				<ShapeIndicator key={id + '_indicator'} className="tl-user-indicator__selected" id={id} />
			))}
		</>
	)
})

const HoveredShapeIndicator = function HoveredShapeIndicator() {
	const app = useApp()

	const displayingHoveredId = useValue(
		'hovered id and should display',
		() => (app.isInAny('select.idle', 'select.editing_shape') ? app.pageState.hoveredId : null),
		[app]
	)

	if (!displayingHoveredId) return null

	return <ShapeIndicator className="tl-user-indicator__hovered" id={displayingHoveredId} />
}

const HintedShapeIndicator = track(function HintedShapeIndicator() {
	const app = useApp()

	const ids = dedupe(app.hintingIds)

	if (!ids.length) return null

	return (
		<>
			{ids.map((id) => (
				<ShapeIndicator className="tl-user-indicator__hint" id={id} key={id + '_hinting'} />
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
	const app = useApp()
	const shape = app.getShapeById(id)

	const [html, setHtml] = React.useState('')

	const isInRoot = shape?.parentId === app.currentPageId

	React.useEffect(() => {
		if (!isInRoot) return

		let latest = null
		const unsubscribe = react('shape to svg', async () => {
			const renderId = Math.random()
			latest = renderId
			const bb = app.getPageBoundsById(id)
			const el = await app.getSvg([id], { padding: 0 })
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
	}, [app, id, isInRoot])

	if (!isInRoot) return null

	return (
		<div style={{ paddingTop: 12, position: 'absolute' }}>
			<div style={{ display: 'flex' }} dangerouslySetInnerHTML={{ __html: html }} />
		</div>
	)
})

const UiLogger = track(() => {
	const logMessages = debugFlags.logMessages.value

	return (
		<div className="debug__ui-logger">
			{logMessages.map((message, messageIndex) => {
				const text = typeof message === 'string' ? message : JSON.stringify(message)

				return (
					<div className="debug__ui-logger__line" key={messageIndex}>
						{text}
					</div>
				)
			})}
		</div>
	)
})
