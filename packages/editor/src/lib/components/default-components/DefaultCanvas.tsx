import { react } from '@tldraw/state'
import { useQuickReactor, useValue } from '@tldraw/state-react'
import { TLShapeId } from '@tldraw/tlschema'
import { modulate, objectMapValues } from '@tldraw/utils'
import classNames from 'classnames'
import { Fragment, JSX, useEffect, useRef, useState } from 'react'
import { tlenv } from '../../globals/environment'
import { useEditorComponents } from '../../hooks/EditorComponentsContext'
import { useCanvasEvents } from '../../hooks/useCanvasEvents'
import { useCoarsePointer } from '../../hooks/useCoarsePointer'
import { useContainer } from '../../hooks/useContainer'
import { useDocumentEvents } from '../../hooks/useDocumentEvents'
import { useEditor } from '../../hooks/useEditor'
import { useFixSafariDoubleTapZoomPencilEvents } from '../../hooks/useFixSafariDoubleTapZoomPencilEvents'
import { useGestureEvents } from '../../hooks/useGestureEvents'
import { useScreenBounds } from '../../hooks/useScreenBounds'
import { ShapeCullingProvider, useShapeCulling } from '../../hooks/useShapeCulling'
import { Box } from '../../primitives/Box'
import { toDomPrecision } from '../../primitives/utils'
import { debugFlags } from '../../utils/debug-flags'
import { setStyleProperty } from '../../utils/dom'
import { MenuClickCapture } from '../MenuClickCapture'
import { Shape } from '../Shape'
import { CanvasOverlays } from './CanvasOverlays'

/** @public */
export interface TLCanvasComponentProps {
	className?: string
}

/** @public @react */
export function DefaultCanvas({ className }: TLCanvasComponentProps) {
	const editor = useEditor()

	const { SelectionBackground, Background, SvgDefs } = useEditorComponents()

	const rCanvas = useRef<HTMLDivElement>(null)
	const rHtmlLayer = useRef<HTMLDivElement>(null)
	const container = useContainer()

	useScreenBounds(rCanvas)
	useDocumentEvents()
	useCoarsePointer()

	useGestureEvents(rCanvas)
	useFixSafariDoubleTapZoomPencilEvents(rCanvas)

	useQuickReactor(
		'update canvas state data attributes',
		() => {
			const canvas = rCanvas.current
			if (!canvas) return

			canvas.setAttribute(
				'data-iseditinganything',
				editor.getEditingShapeId() === null ? 'false' : 'true'
			)
			canvas.setAttribute(
				'data-isselectinganything',
				editor.getSelectedShapeIds().length === 0 ? 'false' : 'true'
			)
		},
		[editor]
	)

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

	const isGridMode = useValue('isGridMode', () => editor.getInstanceState().isGridMode, [editor])
	const { Grid } = useEditorComponents()

	return (
		<>
			<div
				ref={rCanvas}
				draggable={false}
				className={classNames('tl-canvas', className)}
				data-testid="canvas"
				{...events}
			>
				<svg className="tl-svg-context" aria-hidden="true">
					<defs>
						{shapeSvgDefs}
						{SvgDefs && <SvgDefs />}
					</defs>
				</svg>
				{Background && (
					<div className="tl-background__wrapper">
						<Background />
					</div>
				)}
				{isGridMode && Grid && <GridWrapper />}
				<div ref={rHtmlLayer} className="tl-html-layer tl-shapes" draggable={false}>
					<OnTheCanvasWrapper />
					{SelectionBackground && <SelectionBackgroundWrapper />}
					{hideShapes ? null : <ShapesLayer canvasRef={rCanvas} />}
				</div>
				<CanvasOverlays />
				<MovingCameraHitTestBlocker />
			</div>
			<InFrontOfTheCanvasWrapper />
			<MenuClickCapture />
		</>
	)
}

function InFrontOfTheCanvasWrapper() {
	const editor = useEditor()
	const { InFrontOfTheCanvas } = useEditorComponents()
	if (!InFrontOfTheCanvas) return null
	return (
		<div
			className="tl-canvas__in-front"
			onPointerDown={editor.markEventAsHandled}
			onPointerUp={editor.markEventAsHandled}
			onTouchStart={editor.markEventAsHandled}
			onTouchEnd={editor.markEventAsHandled}
		>
			<InFrontOfTheCanvas />
		</div>
	)
}

function GridWrapper() {
	const editor = useEditor()
	const gridSize = useValue('gridSize', () => editor.getDocumentSettings().gridSize, [editor])
	const { x, y, z } = useValue('camera', () => editor.getCamera(), [editor])
	const { Grid } = useEditorComponents()

	if (!Grid) return null

	return <Grid x={x} y={y} z={z} size={gridSize} />
}

function ShapesLayer({ canvasRef }: { canvasRef: { readonly current: HTMLDivElement | null } }) {
	const editor = useEditor()
	const debugSvg = useValue('debug svg', () => debugFlags.debugSvg.get(), [debugFlags])
	const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])

	return (
		<ShapeCullingProvider>
			{renderingShapes.map((result) =>
				debugSvg ? (
					<Fragment key={result.id + '_fragment'}>
						<Shape {...result} />
						<DebugSvgCopy id={result.id} mode="iframe" />
					</Fragment>
				) : (
					<Shape key={result.id + '_shape'} {...result} />
				)
			)}
			<CullingController />
			{tlenv.isSafari && <ReflowIfNeeded canvasRef={canvasRef} />}
		</ShapeCullingProvider>
	)
}
function ReflowIfNeeded({ canvasRef }: { canvasRef: { readonly current: HTMLDivElement | null } }) {
	const editor = useEditor()
	const culledShapesRef = useRef<Set<TLShapeId>>(new Set())
	useQuickReactor(
		'reflow for culled shapes',
		() => {
			const culledShapes = editor.getCulledShapes()
			if (culledShapesRef.current === culledShapes) return

			culledShapesRef.current = culledShapes
			const canvas = canvasRef.current
			if (!canvas) return
			// This causes a reflow
			// https://gist.github.com/paulirish/5d52fb081b3570c81e3a
			const _height = canvas.offsetHeight
		},
		[editor, canvasRef]
	)
	return null
}

/**
 * Centralized culling controller that updates shape container visibility.
 * This single reactor replaces per-shape subscriptions for O(1) instead of O(N) subscriptions.
 */
function CullingController() {
	const editor = useEditor()
	const { updateCulling } = useShapeCulling()

	useQuickReactor(
		'update shape culling',
		() => {
			const culledShapes = editor.getCulledShapes()
			updateCulling(culledShapes)
		},
		[editor, updateCulling]
	)

	return null
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

			const shape = editor.getShape(id)
			const isSingleFrame = !!shape && editor.isShapeFrameLike(shape)
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
