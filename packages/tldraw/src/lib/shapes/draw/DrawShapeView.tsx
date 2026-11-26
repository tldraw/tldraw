import {
	SVGContainer,
	TLDrawShape,
	TLShapeView,
	definePlugin,
	last,
	rng,
	shapeViewSlot,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { getFillDefForCanvas, getFillDefForExport } from '../shared/defaultStyleDefs'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { getSvgPathFromStrokePoints } from '../shared/freehand/svg'
import { svgInk } from '../shared/freehand/svgInk'
import { getDisplayValues } from '../shared/getDisplayValues'
import { PatternFill } from '../shared/PatternFill'
import type { DrawShapeUtil } from './DrawShapeUtil'
import {
	getDot,
	getDrawShapeStrokeDashArray,
	getFreehandOptions,
	getPointsFromDrawSegments,
} from './getPath'

/** @public */
export const drawShapeView: TLShapeView<TLDrawShape, DrawShapeUtil> = {
	type: 'draw',
	component(shape, util) {
		const dv = getDisplayValues(util, shape)
		return (
			<SVGContainer>
				<DrawShapeSvg
					shape={shape}
					strokeColor={dv.strokeColor}
					strokeWidth={dv.strokeWidth}
					fillColor={dv.fillColor}
					patternFillFallbackColor={dv.patternFillFallbackColor}
				/>
			</SVGContainer>
		)
	},

	toSvg(shape, ctx, util) {
		ctx.addExportDef(getFillDefForExport(shape.props.fill))
		const dv = getDisplayValues(util, shape, ctx.colorMode)
		const scaleFactor = 1 / shape.props.scale
		return (
			<g transform={`scale(${scaleFactor})`}>
				<DrawShapeSvg
					shape={shape}
					zoomOverride={1}
					strokeColor={dv.strokeColor}
					strokeWidth={dv.strokeWidth}
					fillColor={dv.fillColor}
					patternFillFallbackColor={dv.patternFillFallbackColor}
				/>
			</g>
		)
	},

	getCanvasSvgDefs() {
		return [getFillDefForCanvas()]
	},
}

/**
 * Draws draw shapes with {@link drawShapeView}. Importing `tldraw` adds it to
 * `createDefaultPlugins()`, see {@link defaultShapeViewPlugins}.
 *
 * @public
 */
export const drawShapeViewPlugin = definePlugin({
	id: 'drawShapeView',
	setup: (ctx) => void ctx.contribute(shapeViewSlot, drawShapeView),
})

function DrawShapeSvg({
	shape,
	zoomOverride,
	strokeColor,
	strokeWidth: baseStrokeWidth,
	fillColor,
	patternFillFallbackColor,
}: {
	shape: TLDrawShape
	zoomOverride?: number
	strokeColor: string
	strokeWidth: number
	fillColor: string
	patternFillFallbackColor: string
}) {
	const editor = useEditor()

	const allPointsFromSegments = getPointsFromDrawSegments(
		shape.props.segments,
		shape.props.scaleX,
		shape.props.scaleY
	)

	const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'

	let sw = (baseStrokeWidth + 1) * shape.props.scale
	const forceSolid = useValue(
		'force solid',
		() => {
			const zoomLevel = zoomOverride ?? editor.getEfficientZoomLevel()
			return zoomLevel < 0.5 && zoomLevel < 1.5 / sw
		},
		[editor, sw, zoomOverride]
	)

	const dotAdjustment = useValue(
		'dot adjustment',
		() => {
			const zoomLevel = zoomOverride ?? editor.getEfficientZoomLevel()
			// If we're zoomed way out (10%), then we need to make the dotted line go to 9 instead 0.1
			// Chrome doesn't render anything otherwise.
			return zoomLevel < 0.2 ? 9 : 0.1
		},
		[editor, zoomOverride]
	)

	if (
		!forceSolid &&
		!shape.props.isPen &&
		shape.props.dash === 'draw' &&
		allPointsFromSegments.length === 1
	) {
		sw += rng(shape.id)() * (sw / 6)
	}

	const options = getFreehandOptions(shape.props, sw, showAsComplete, forceSolid)

	if (!forceSolid && shape.props.dash === 'draw') {
		return (
			<>
				{shape.props.isClosed &&
					shape.props.fill !== 'none' &&
					allPointsFromSegments.length > 1 &&
					(shape.props.fill === 'pattern' ? (
						<PatternFill
							d={getSvgPathFromStrokePoints(
								getStrokePoints(allPointsFromSegments, options),
								shape.props.isClosed
							)}
							fillColor={fillColor}
							patternFillFallbackColor={patternFillFallbackColor}
							scale={shape.props.scale}
						/>
					) : (
						<path
							fill={fillColor}
							d={getSvgPathFromStrokePoints(
								getStrokePoints(allPointsFromSegments, options),
								shape.props.isClosed
							)}
						/>
					))}
				<path d={svgInk(allPointsFromSegments, options)} strokeLinecap="round" fill={strokeColor} />
			</>
		)
	}

	const strokePoints = getStrokePoints(allPointsFromSegments, options)
	const isDot = strokePoints.length < 2
	const fill = isDot || shape.props.isClosed ? shape.props.fill : 'none'

	const solidStrokePath = isDot
		? getDot(allPointsFromSegments[0] ?? { x: 0, y: 0 }, 0)
		: getSvgPathFromStrokePoints(strokePoints, shape.props.isClosed && fill !== 'none')

	return (
		<>
			{isDot || !shape.props.isClosed || fill === 'none' ? null : fill === 'pattern' ? (
				<PatternFill
					d={solidStrokePath}
					fillColor={fillColor}
					patternFillFallbackColor={patternFillFallbackColor}
					scale={shape.props.scale}
				/>
			) : (
				<path fill={fillColor} d={solidStrokePath} />
			)}
			{shape.props.dash !== 'none' && (
				<path
					d={solidStrokePath}
					strokeLinecap="round"
					fill={isDot ? strokeColor : 'none'}
					stroke={strokeColor}
					strokeWidth={sw}
					strokeDasharray={isDot ? 'none' : getDrawShapeStrokeDashArray(shape, sw, dotAdjustment)}
					strokeDashoffset="0"
				/>
			)}
		</>
	)
}
