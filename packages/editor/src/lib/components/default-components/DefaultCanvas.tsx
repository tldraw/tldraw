import { react } from '@tldraw/state'
import { useQuickReactor, useValue } from '@tldraw/state-react'
import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import { dedupe, modulate, objectMapValues } from '@tldraw/utils'
import classNames from 'classnames'
import { Fragment, JSX, useEffect, useRef, useState } from 'react'
import { tlenv } from '../../globals/environment'
import { useCanvasEvents } from '../../hooks/useCanvasEvents'
import { useCoarsePointer } from '../../hooks/useCoarsePointer'
import { useContainer } from '../../hooks/useContainer'
import { useDocumentEvents } from '../../hooks/useDocumentEvents'
import { useEditor } from '../../hooks/useEditor'
import { useEditorComponents } from '../../hooks/useEditorComponents'
import { useFixSafariDoubleTapZoomPencilEvents } from '../../hooks/useFixSafariDoubleTapZoomPencilEvents'
import { useGestureEvents } from '../../hooks/useGestureEvents'
import { useHandleEvents } from '../../hooks/useHandleEvents'
import { useSharedSafeId } from '../../hooks/useSafeId'
import { useScreenBounds } from '../../hooks/useScreenBounds'
import { Box } from '../../primitives/Box'
import { Mat } from '../../primitives/Mat'
import { Vec } from '../../primitives/Vec'
import { toDomPrecision } from '../../primitives/utils'
import { debugFlags } from '../../utils/debug-flags'
import { setStyleProperty } from '../../utils/dom'
import { GeometryDebuggingView } from '../GeometryDebuggingView'
import { LiveCollaborators } from '../LiveCollaborators'
import { MenuClickCapture } from '../MenuClickCapture'
import { Shape } from '../Shape'

/** @public */
export interface TLCanvasComponentProps {
	className?: string
}

/** @public @react */
export function DefaultCanvas({ className }: TLCanvasComponentProps) {
	const editor = useEditor()

	const { SelectionBackground, Background, SvgDefs, ShapeIndicators } = useEditorComponents()

	const rCanvas = useRef<HTMLDivElement>(null)
	const rHtmlLayer = useRef<HTMLDivElement>(null)
	const rHtmlLayer2 = useRef<HTMLDivElement>(null)
	const container = useContainer()

	useScreenBounds(rCanvas)
	useDocumentEvents()
	useCoarsePointer()

	useGestureEvents(rCanvas)
	useFixSafariDoubleTapZoomPencilEvents(rCanvas)

	const rMemoizedStuff = useRef({ lodDisableTextOutline: false, allowTextOutline: true })

	useQuickReactor(
		'position layers',
		function positionLayersWhenCameraMoves() {
			const { x, y, z } = editor.getCamera()

			// This should only run once on first load
			if (rMemoizedStuff.current.allowTextOutline && tlenv.isSafari) {
				container.style.setProperty('--tl-text-outline', 'none')
				rMemoizedStuff.current.allowTextOutline = false
			}

			// And this should only run if we're not in Safari;
			// If we're below the lod distance for text shadows, turn them off
			if (
				rMemoizedStuff.current.allowTextOutline &&
				z < editor.options.textShadowLod !== rMemoizedStuff.current.lodDisableTextOutline
			) {
				const lodDisableTextOutline = z < editor.options.textShadowLod
				container.style.setProperty(
					'--tl-text-outline',
					lodDisableTextOutline ? 'none' : `var(--tl-text-outline-reference)`
				)
				rMemoizedStuff.current.lodDisableTextOutline = lodDisableTextOutline
			}

			// Because the html container has a width/height of 1px, we
			// need to create a small offset when zoomed to ensure that
			// the html container and svg container are lined up exactly.
			const offset =
				z >= 1 ? modulate(z, [1, 8], [0.125, 0.5], true) : modulate(z, [0.1, 1], [-2, 0.125], true)

			const transform = `scale(${toDomPrecision(z)}) translate(${toDomPrecision(
				x + offset
			)}px,${toDomPrecision(y + offset)}px)`
			setStyleProperty(rHtmlLayer.current, 'transform', transform)
			setStyleProperty(rHtmlLayer2.current, 'transform', transform)
		},
		[editor, container]
	)

	const events = useCanvasEvents()

	const shapeSvgDefs = useValue(
		'shapeSvgDefs',
		() => {
			const shapeSvgDefsByKey = new Map<string, JSX.Element>()
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
	const isEditingAnything = useValue(
		'isEditingAnything',
		() => editor.getEditingShapeId() !== null,
		[editor]
	)
	const isSelectingAnything = useValue(
		'isSelectingAnything',
		() => !!editor.getSelectedShapeIds().length,
		[editor]
	)

	return (
		<>
			<div
				ref={rCanvas}
				draggable={false}
				data-iseditinganything={isEditingAnything}
				data-isselectinganything={isSelectingAnything}
				className={classNames('tl-canvas', className)}
				data-testid="canvas"
				{...events}
			>
				<svg className="tl-svg-context" aria-hidden="true">
					<defs>
						{shapeSvgDefs}
						<CursorDef />
						<CollaboratorHintDef />
						{SvgDefs && <SvgDefs />}
					</defs>
				</svg>
				{Background && (
					<div className="tl-background__wrapper">
						<Background />
					</div>
				)}
				<GridWrapper />
				<div ref={rHtmlLayer} className="tl-html-layer tl-shapes" draggable={false}>
					<OnTheCanvasWrapper />
					{SelectionBackground && <SelectionBackgroundWrapper />}
					{hideShapes ? null : debugSvg ? <ShapesWithSVGs /> : <ShapesToDisplay />}
				</div>
				<div className="tl-overlays">
					<div ref={rHtmlLayer2} className="tl-html-layer">
						{debugGeometry ? <GeometryDebuggingView /> : null}
						<BrushWrapper />
						<ScribbleWrapper />
						<ZoomBrushWrapper />
						{ShapeIndicators && <ShapeIndicators />}
						<HintedShapeIndicator />
						<SnapIndicatorWrapper />
						<SelectionForegroundWrapper />
						<HandlesWrapper />
						<OverlaysWrapper />
						<LiveCollaborators />
					</div>
				</div>
				<div
					className="tl-canvas__in-front"
					onPointerDown={editor.markEventAsHandled}
					onPointerUp={editor.markEventAsHandled}
					onTouchStart={editor.markEventAsHandled}
					onTouchEnd={editor.markEventAsHandled}
				>
					<InFrontOfTheCanvasWrapper />
				</div>
				<MovingCameraHitTestBlocker />
			</div>
			<MenuClickCapture />
		</>
	)
}

function InFrontOfTheCanvasWrapper() {
	const { InFrontOfTheCanvas } = useEditorComponents()
	if (!InFrontOfTheCanvas) return null
	return <InFrontOfTheCanvas />
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

	return scribbles.map((scribble) => (
		<Scribble key={scribble.id} className="tl-user-scribble" scribble={scribble} zoom={zoomLevel} />
	))
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

	return lines.map((line) => (
		<SnapIndicator key={line.id} className="tl-user-snapline" line={line} zoom={zoomLevel} />
	))
}

function HandlesWrapper() {
	const editor = useEditor()

	// We don't want this to update every time the shape changes
	const shapeIdWithHandles = useValue(
		'handles shapeIdWithHandles',
		() => {
			const { isReadonly, isChangingStyle } = editor.getInstanceState()
			if (isReadonly || isChangingStyle) return false

			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape) return false

			// slightly redundant but saves us from updating the handles every time the shape changes
			const handles = editor.getShapeHandles(onlySelectedShape)
			if (!handles) return false

			return onlySelectedShape.id
		},
		[editor]
	)

	if (!shapeIdWithHandles) return null

	return <HandlesWrapperInner shapeId={shapeIdWithHandles} />
}

function HandlesWrapperInner({ shapeId }: { shapeId: TLShapeId }) {
	const editor = useEditor()
	const { Handles } = useEditorComponents()

	const zoomLevel = useValue('zoomLevel', () => editor.getZoomLevel(), [editor])

	const isCoarse = useValue('coarse pointer', () => editor.getInstanceState().isCoarsePointer, [
		editor,
	])

	const transform = useValue('handles transform', () => editor.getShapePageTransform(shapeId), [
		editor,
		shapeId,
	])

	const handles = useValue(
		'handles',
		() => {
			const handles = editor.getShapeHandles(shapeId)
			if (!handles) return null

			const minDistBetweenVirtualHandlesAndRegularHandles =
				((isCoarse ? editor.options.coarseHandleRadius : editor.options.handleRadius) / zoomLevel) *
				2

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
		[editor, zoomLevel, isCoarse, shapeId]
	)

	const isHidden = useValue('isHidden', () => editor.isShapeHidden(shapeId), [editor, shapeId])

	if (!Handles || !handles || !transform || isHidden) {
		return null
	}

	return (
		<Handles>
			<g transform={Mat.toCssString(transform)}>
				{handles.map((handle) => {
					return (
						<HandleWrapper
							key={handle.id}
							shapeId={shapeId}
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
		<g
			role="button"
			// TODO(mime): handle.label needs to be required in the future.
			aria-label={handle.label || 'handle'}
			transform={`translate(${handle.x}, ${handle.y})`}
			{...events}
		>
			<Handle shapeId={shapeId} handle={handle} zoom={zoom} isCoarse={isCoarse} />
		</g>
	)
}

function OverlaysWrapper() {
	const { Overlays } = useEditorComponents()
	if (!Overlays) return null
	return (
		<div className="tl-custom-overlays tl-overlays__item">
			<Overlays />
		</div>
	)
}

function ShapesWithSVGs() {
	const editor = useEditor()

	const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])

	return renderingShapes.map((result) => (
		<Fragment key={result.id + '_fragment'}>
			<Shape {...result} />
			<DebugSvgCopy id={result.id} mode="iframe" />
		</Fragment>
	))
}
function ReflowIfNeeded() {
	const editor = useEditor()
	const culledShapesRef = useRef<Set<TLShapeId>>(new Set())
	useQuickReactor(
		'reflow for culled shapes',
		() => {
			const culledShapes = editor.getCulledShapes()
			if (
				culledShapesRef.current.size === culledShapes.size &&
				[...culledShapes].every((id) => culledShapesRef.current.has(id))
			)
				return

			culledShapesRef.current = culledShapes
			const canvas = document.getElementsByClassName('tl-canvas')
			if (canvas.length === 0) return
			// This causes a reflow
			// https://gist.github.com/paulirish/5d52fb081b3570c81e3a
			const _height = (canvas[0] as HTMLDivElement).offsetHeight
		},
		[editor]
	)
	return null
}

function ShapesToDisplay() {
	const editor = useEditor()

	const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])

	return (
		<>
			{renderingShapes.map((result) => (
				<Shape key={result.id + '_shape'} {...result} />
			))}
			{tlenv.isSafari && <ReflowIfNeeded />}
		</>
	)
}

function HintedShapeIndicator() {
	const editor = useEditor()
	const { ShapeIndicator } = useEditorComponents()

	const ids = useValue('hinting shape ids', () => dedupe(editor.getHintingShapeIds()), [editor])

	if (!ids.length) return null
	if (!ShapeIndicator) return null

	return ids.map((id) => (
		<ShapeIndicator className="tl-user-indicator__hint" shapeId={id} key={id + '_hinting'} />
	))
}

function CursorDef() {
	return (
		<g id={useSharedSafeId('cursor')}>
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

function CollaboratorHintDef() {
	const cursorHintId = useSharedSafeId('cursor_hint')
	return <path id={cursorHintId} fill="currentColor" d="M -2,-5 2,0 -2,5 Z" />
}

function DebugSvgCopy({ id, mode }: { id: TLShapeId; mode: 'img' | 'iframe' }) {
	const editor = useEditor()

	const [image, setImage] = useState<{ src: string; bounds: Box } | null>(null)

	const isInRoot = useValue(
		'is in root',
		() => {
			const shape = editor.getShape(id)
			return shape?.parentId === editor.getCurrentPageId()
		},
		[editor, id]
	)

	useEffect(() => {
		if (!isInRoot) return

		let latest = null
		const unsubscribe = react('shape to svg', async () => {
			const renderId = Math.random()
			latest = renderId

			const isSingleFrame = editor.isShapeOfType(id, 'frame')
			const padding = isSingleFrame ? 0 : 10
			let bounds = editor.getShapePageBounds(id)
			if (!bounds) return
			bounds = bounds.clone().expandBy(padding)

			const result = await editor.getSvgString([id], { padding })

			if (latest !== renderId || !result) return

			const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(result.svg)}`
			setImage({ src: svgDataUrl, bounds })
		})

		return () => {
			latest = null
			unsubscribe()
		}
	}, [editor, id, isInRoot])

	if (!isInRoot || !image) return null

	if (mode === 'iframe') {
		return (
			<iframe
				src={image.src}
				width={image.bounds.width}
				height={image.bounds.height}
				referrerPolicy="no-referrer"
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					border: 'none',
					transform: `translate(${image.bounds.x}px, ${image.bounds.maxY + 12}px)`,
					outline: '1px solid black',
					maxWidth: 'none',
				}}
			/>
		)
	}
	return (
		<img
			src={image.src}
			width={image.bounds.width}
			height={image.bounds.height}
			referrerPolicy="no-referrer"
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				transform: `translate(${image.bounds.x}px, ${image.bounds.maxY + 12}px)`,
				outline: '1px solid black',
				maxWidth: 'none',
			}}
		/>
	)
}

function SelectionForegroundWrapper() {
	const editor = useEditor()
	const selectionRotation = useValue(
		'selection rotation',
		function getSelectionRotation() {
			return editor.getSelectionRotation()
		},
		[editor]
	)
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

function MovingCameraHitTestBlocker() {
	const editor = useEditor()
	const cameraState = useValue('camera state', () => editor.getCameraState(), [editor])

	return (
		<div
			className={classNames('tl-hit-test-blocker', {
				'tl-hit-test-blocker__hidden': cameraState === 'idle',
			})}
		/>
	)
}
