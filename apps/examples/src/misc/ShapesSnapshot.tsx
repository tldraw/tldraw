import { react } from '@tldraw/state'
import { compact, isEqual } from 'lodash'
import {
	createContext,
	memo,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
	Box,
	Mat,
	ShapeUtil,
	TLShape,
	TLShapeId,
	uniqueId,
	useEditor,
	useIsDarkMode,
	useQuickReactor,
	useStateTracking,
	useValue,
} from 'tldraw'

// Euclidean algorithm to find the GCD
function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b)
}

// Returns the lowest value that the given number can be multiplied by to reach an integer
export function nearestMultiple(float: number) {
	const decimal = float.toString().split('.')[1]
	if (!decimal) return 1
	const denominator = Math.pow(10, decimal.length)
	const numerator = parseInt(decimal, 10)
	return denominator / gcd(numerator, denominator)
}

function setStyleProperty(el: HTMLElement | null, prop: string, value: string | number) {
	if (!el) return
	el.style.setProperty(prop, String(value))
}
export const areShapesContentEqual = (a: TLShape, b: TLShape) =>
	a.props === b.props && a.meta === b.meta

/*
This component renders shapes on the canvas. There are two stages: positioning
and styling the shape's container using CSS, and then rendering the shape's 
JSX using its shape util's render method. Rendering the "inside" of a shape is
more expensive than positioning it or changing its color, so we use memo
to wrap the inner shape and only re-render it when the shape's props change. 

The shape also receives props for its index and opacity. The index is used to
determine the z-index of the shape, and the opacity is used to set the shape's
opacity based on its own opacity and that of its parent's.
*/
export const Shape = memo(function Shape({
	id,
	shape,
	util,
	index,
	backgroundIndex,
	opacity,
	dprMultiple,
}: {
	id: TLShapeId
	shape: TLShape
	util: ShapeUtil
	index: number
	backgroundIndex: number
	opacity: number
	dprMultiple: number
}) {
	const editor = useEditor()

	const containerRef = useRef<HTMLDivElement>(null)
	const bgContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		return react('load fonts', () => {
			const fonts = editor.fonts.getShapeFontFaces(id)
			editor.fonts.requestFonts(fonts)
		})
	}, [editor, id])

	const memoizedStuffRef = useRef({
		transform: '',
		clipPath: 'none',
		width: 0,
		height: 0,
		x: 0,
		y: 0,
	})

	useQuickReactor(
		'set shape stuff',
		() => {
			const shape = editor.getShape(id)
			if (!shape) return // probably the shape was just deleted

			const prev = memoizedStuffRef.current

			// Clip path
			const clipPath = editor.getShapeClipPath(id) ?? 'none'
			if (clipPath !== prev.clipPath) {
				setStyleProperty(containerRef.current, 'clip-path', clipPath)
				setStyleProperty(bgContainerRef.current, 'clip-path', clipPath)
				prev.clipPath = clipPath
			}

			// Page transform
			const pageTransform = editor.getShapePageTransform(id)
			const transform = Mat.toCssString(pageTransform)
			const bounds = editor.getShapeGeometry(shape).bounds

			// Update if the tranform has changed
			if (transform !== prev.transform) {
				setStyleProperty(containerRef.current, 'transform', transform)
				setStyleProperty(bgContainerRef.current, 'transform', transform)
				prev.transform = transform
			}

			// Width / Height
			// We round the shape width and height up to the nearest multiple of dprMultiple
			// to avoid the browser making miscalculations when applying the transform.
			const widthRemainder = bounds.w % dprMultiple
			const heightRemainder = bounds.h % dprMultiple
			const width = widthRemainder === 0 ? bounds.w : bounds.w + (dprMultiple - widthRemainder)
			const height = heightRemainder === 0 ? bounds.h : bounds.h + (dprMultiple - heightRemainder)

			if (width !== prev.width || height !== prev.height) {
				setStyleProperty(containerRef.current, 'width', Math.max(width, dprMultiple) + 'px')
				setStyleProperty(containerRef.current, 'height', Math.max(height, dprMultiple) + 'px')
				setStyleProperty(bgContainerRef.current, 'width', Math.max(width, dprMultiple) + 'px')
				setStyleProperty(bgContainerRef.current, 'height', Math.max(height, dprMultiple) + 'px')
				prev.width = width
				prev.height = height
			}
		},
		[editor]
	)

	// This stuff changes pretty infrequently, so we can change them together
	useLayoutEffect(() => {
		const container = containerRef.current
		const bgContainer = bgContainerRef.current

		// Opacity
		setStyleProperty(container, 'opacity', opacity)
		setStyleProperty(bgContainer, 'opacity', opacity)

		// Z-Index
		setStyleProperty(container, 'z-index', index)
		setStyleProperty(bgContainer, 'z-index', backgroundIndex)
	}, [opacity, index, backgroundIndex])

	if (!shape) return null

	return (
		<>
			{/* eslint-disable-next-line local/no-at-internal */}
			{util.backgroundComponent && (
				<div ref={bgContainerRef} className="tl-shape tl-shape-background" draggable={false}>
					<InnerShapeBackground shape={shape} util={util} />
				</div>
			)}
			<div ref={containerRef} className="tl-shape" draggable={false}>
				<InnerShape shape={shape} util={util} />
			</div>
		</>
	)
})

export const InnerShape = memo(
	function InnerShape<T extends TLShape>({ shape, util }: { shape: T; util: ShapeUtil<T> }) {
		return useStateTracking(
			'InnerShape:' + shape.type,
			() =>
				// always fetch the latest shape from the store even if the props/meta have not changed, to avoid
				// calling the render method with stale data.
				util.component(util.editor.store.unsafeGetWithoutCapture(shape.id) as T),
			[util, shape.id]
		)
	},
	(prev, next) => areShapesContentEqual(prev.shape, next.shape) && prev.util === next.util
)

export const InnerShapeBackground = memo(
	function InnerShapeBackground<T extends TLShape>({
		shape,
		util,
	}: {
		shape: T
		util: ShapeUtil<T>
	}) {
		return useStateTracking(
			'InnerShape:' + shape.type,
			() =>
				// always fetch the latest shape from the store even if the props/meta have not changed, to avoid
				// calling the render method with stale data.
				// eslint-disable-next-line local/no-at-internal
				util.backgroundComponent?.(util.editor.store.unsafeGetWithoutCapture(shape.id) as T),
			[util, shape.id]
		)
	},
	(prev, next) =>
		prev.shape.props === next.shape.props &&
		prev.shape.meta === next.shape.meta &&
		prev.util === next.util
)

function MiniShapes({
	ids,
	svgRef,
}: {
	ids: TLShapeId[]
	svgRef?: React.RefCallback<SVGSVGElement>
}) {
	const editor = useEditor()
	const isDark = useIsDarkMode()
	const renderingShapes = useValue(
		'rendering shapes',
		() => {
			const idsAncChildIds = editor.getShapeAndDescendantIds(
				ids.filter((id) => editor.getShape(id))
			)
			return editor.getRenderingShapes().filter((s) => idsAncChildIds.has(s.id))
		},
		[editor, ids]
	)

	const { transform, width, height } = useValue(
		'stuff',
		() => {
			const sharedBounds = Box.Common(
				compact(ids.map((id) => editor.getShapePageBounds(id)))
			).zeroFix()

			// return transform that converts the shared bounds to 0,0,width,height
			const transform = Mat.toCssString(Mat.Translate(-sharedBounds.x, -sharedBounds.y))
			const width = sharedBounds.w
			const height = sharedBounds.h
			return { transform, width, height }
		},
		[editor, ids]
	)

	const dprMultiple = useValue(
		'dpr multiple',
		() =>
			// dprMultiple is the smallest number we can multiply dpr by to get an integer
			// it's usually 1, 2, or 4 (for e.g. dpr of 2, 2.5 and 2.25 respectively)
			nearestMultiple(Math.floor(editor.getInstanceState().devicePixelRatio * 100) / 100),
		[editor]
	)
	if (!Number.isFinite(width) || !Number.isFinite(height)) return null

	return (
		<svg
			ref={svgRef}
			viewBox={`0 0 ${width} ${height}`}
			style={{ width: '100%', height: '100%', objectFit: 'contain', overflow: 'visible' }}
		>
			<foreignObject width={width} height={height} style={{ overflow: 'visible' }}>
				<div
					className={isDark ? 'tl-theme__dark tl-container' : 'tl-theme__light tl-container'}
					style={{ width, height, background: 'var(--color-background)', overflow: 'visible' }}
				>
					<div style={{ transform, position: 'absolute' }}>
						{renderingShapes.map((shape) => (
							<Shape
								key={shape.id}
								id={shape.id}
								shape={shape.shape}
								util={shape.util}
								index={shape.index}
								backgroundIndex={shape.backgroundIndex}
								opacity={shape.opacity}
								dprMultiple={dprMultiple}
							/>
						))}
					</div>
				</div>
			</foreignObject>
		</svg>
	)
}

interface SnapshotArgs {
	ids: TLShapeId[]
}

export interface Snapshot {
	id: string
	text: string
	width: number
	height: number
	mode: 'light' | 'dark'
}

interface ShapesSnapshotContextType {
	createSnapshot(args: SnapshotArgs): Promise<Snapshot>
	renderLiveView(args: SnapshotArgs, ref: React.RefObject<HTMLDivElement>, id: string): void

	liveViewConfig: Record<string, { args: SnapshotArgs; ref: React.RefObject<HTMLDivElement> }>
	snapshotConfig: SnapshotArgs | null
	snapshotRef: React.RefCallback<SVGSVGElement>
}

const ShapesSnapshotContext = createContext<ShapesSnapshotContextType | null>(null)

export function ProvideShapesSnapshot({ children }: { children: React.ReactNode }) {
	const [liveViewConfig, setLiveViewConfig] = useState<ShapesSnapshotContextType['liveViewConfig']>(
		{}
	)
	const [snapshotConfig, setSnapshotConfig] = useState<SnapshotArgs | null>(null)
	const snapshotRefCallback = useRef<(svg: SVGSVGElement) => void>(() => {})

	const snapshotRef = useCallback((svg: SVGSVGElement) => {
		snapshotRefCallback.current(svg)
	}, [])

	const createSnapshot = useCallback<ShapesSnapshotContextType['createSnapshot']>(
		async (args: SnapshotArgs) => {
			const svg = await new Promise<SVGSVGElement>((resolve) => {
				snapshotRefCallback.current = resolve
				setSnapshotConfig(args)
			})
			await new Promise((res) => requestAnimationFrame(res))
			setSnapshotConfig(null)
			return {
				node: svg.cloneNode(true)! as SVGSVGElement,
				id: uniqueId(),
				text: new XMLSerializer().serializeToString(svg),
				width: svg.clientWidth,
				height: svg.clientHeight,
				mode: svg.classList.contains('tl-theme__dark') ? 'dark' : 'light',
			}
		},
		[]
	)

	const renderLiveView = useCallback<ShapesSnapshotContextType['renderLiveView']>(
		(args: SnapshotArgs, ref: React.RefObject<HTMLDivElement>, id: string) => {
			setLiveViewConfig((liveViewConfig) => {
				const next = { ...liveViewConfig, [id]: { args, ref } }
				if (!isEqual(liveViewConfig, next)) {
					return next
				}
				return liveViewConfig
			})
		},
		[]
	)

	return (
		<ShapesSnapshotContext.Provider
			value={{
				createSnapshot,
				renderLiveView,
				liveViewConfig,
				snapshotConfig,
				snapshotRef,
			}}
		>
			{children}
		</ShapesSnapshotContext.Provider>
	)
}

function LiveView({ id }: { id: string }) {
	const { liveViewConfig } = useContext(ShapesSnapshotContext)!
	const config = liveViewConfig[id]

	return createPortal(<MiniShapes ids={config.args.ids} />, config.ref.current!.parentElement!)
}

function Snapshotter() {
	const { snapshotConfig, snapshotRef } = useContext(ShapesSnapshotContext)!

	if (!snapshotConfig) return null

	return (
		<div style={{ visibility: 'hidden' }}>
			<MiniShapes ids={snapshotConfig.ids} svgRef={snapshotRef} />
		</div>
	)
}

export function ShapeSnapshotInner() {
	const liveViews = useContext(ShapesSnapshotContext)!.liveViewConfig
	return (
		<>
			<Snapshotter />
			{Object.keys(liveViews).map((id) => (
				<LiveView key={id} id={id} />
			))}
		</>
	)
}

export function ShapeSnapshot({ snapshot }: { snapshot: Snapshot }) {
	const ref = useRef<SVGSVGElement>(null)
	useLayoutEffect(() => {
		if (!ref.current) return
		ref.current!.replaceWith(
			new DOMParser().parseFromString(snapshot.text, 'text/html').body.firstChild!
		)
	}, [snapshot.text])
	return <svg ref={ref} />
}

export function LiveShapesThumbnail({ ids }: { ids: TLShapeId[] }) {
	const context = useContext(ShapesSnapshotContext)!
	const ref = useRef<HTMLDivElement>(null)
	useLayoutEffect(() => {
		context.renderLiveView({ ids }, ref, 'live-shapes-thumbnail')
	})
	// dummy div, we actually render the shapes into its parent
	return <div ref={ref} role="presentation" style={{ display: 'none' }} />
}

export function useTakeSnapshot() {
	return useContext(ShapesSnapshotContext)!.createSnapshot
}
