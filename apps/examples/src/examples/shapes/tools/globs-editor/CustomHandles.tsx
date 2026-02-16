import {
	DefaultHandle,
	Mat,
	TLHandle,
	TLShapeId,
	toDomPrecision,
	useEditor,
	useValue,
} from 'tldraw'
import { ControlLine, getGlobInfo, getNeighborGlobs, GlobShape } from './GlobShapeUtil'

export function CustomHandles({ children }: { children: React.ReactNode }) {
	const editor = useEditor()

	const shouldDisplayHandles = useValue(
		'shouldDisplayHandles',
		() => {
			if (
				editor.isInAny(
					'select.idle',
					'select.pointing_handle',
					'select.pointing_shape',
					'select.dragging_handle'
				)
			) {
				return true
			}
			if (editor.isInAny('select.editing_shape')) {
				const onlySelectedShape = editor.getOnlySelectedShape()
				return onlySelectedShape && editor.isShapeOfType(onlySelectedShape, 'note')
			}
			return false
		},
		[editor]
	)

	const shouldDisplayGlobHandles = useValue(
		'shouldDisplayGlobHandles',
		() => {
			const selectedGlobs = editor
				.getSelectedShapeIds()
				.filter((shape) => editor.isShapeOfType<GlobShape>(shape, 'glob'))
				.map((shape) => editor.getShape<GlobShape>(shape))
			return selectedGlobs && selectedGlobs.length > 0
		},
		[editor]
	)

	if (!shouldDisplayHandles) return null

	const selectedGlobs = editor
		.getSelectedShapeIds()
		.filter((shape) => editor.isShapeOfType<GlobShape>(shape, 'glob'))
		.map((shape) => editor.getShape<GlobShape>(shape))

	const neighborGlobs: Set<GlobShape> = new Set()
	for (const selectedGlob of selectedGlobs) {
		if (!selectedGlob) continue
		getNeighborGlobs(editor, selectedGlob).forEach((neighbor) => neighborGlobs.add(neighbor))
	}

	return (
		<svg className="tl-user-handles tl-overlays__item" aria-hidden="true">
			{children}
			{shouldDisplayGlobHandles && (
				<>
					{Array.from(neighborGlobs).map((glob) => {
						if (!glob) return null
						return <GlobHandlesWithControlLines key={glob.id} glob={glob} />
					})}
				</>
			)}
		</svg>
	)
}

function GlobHandlesWithControlLines({ glob }: { glob: GlobShape }) {
	const editor = useEditor()
	const handles = editor.getShapeHandles(glob)
	const transform = editor.getShapePageTransform(glob.id)
	const zoomLevel = editor.getZoomLevel()
	const isCoarse = editor.getInstanceState().isCoarsePointer

	const globPoints = getGlobInfo(editor, glob)

	if (!handles || !transform || !globPoints) return null

	const dxA = toDomPrecision(glob.props.edges.edgeA.d.x)
	const dyA = toDomPrecision(glob.props.edges.edgeA.d.y)
	const dxB = toDomPrecision(glob.props.edges.edgeB.d.x)
	const dyB = toDomPrecision(glob.props.edges.edgeB.d.y)

	const txAA = toDomPrecision(globPoints.edgeA.tangentA.x)
	const tyAA = toDomPrecision(globPoints.edgeA.tangentA.y)
	const txAB = toDomPrecision(globPoints.edgeA.tangentB.x)
	const tyAB = toDomPrecision(globPoints.edgeA.tangentB.y)

	const txBA = toDomPrecision(globPoints.edgeB.tangentA.x)
	const tyBA = toDomPrecision(globPoints.edgeB.tangentA.y)
	const txBB = toDomPrecision(globPoints.edgeB.tangentB.x)
	const tyBB = toDomPrecision(globPoints.edgeB.tangentB.y)

	return (
		<g transform={Mat.toCssString(transform)}>
			<ControlLine x1={dxA} y1={dyA} x2={txAA} y2={tyAA} />
			<ControlLine x1={dxA} y1={dyA} x2={txAB} y2={tyAB} />
			<ControlLine x1={dxB} y1={dyB} x2={txBA} y2={tyBA} />
			<ControlLine x1={dxB} y1={dyB} x2={txBB} y2={tyBB} />

			{handles.map((handle) => (
				<HandleWrapper
					key={handle.id}
					shapeId={glob.id}
					handle={handle}
					zoom={zoomLevel}
					isCoarse={isCoarse}
				/>
			))}
		</g>
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
	return (
		<g transform={`translate(${handle.x}, ${handle.y})`}>
			<DefaultHandle shapeId={shapeId} handle={handle} zoom={zoom} isCoarse={isCoarse} />
		</g>
	)
}
