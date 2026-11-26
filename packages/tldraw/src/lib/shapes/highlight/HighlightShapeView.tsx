/* eslint-disable react-hooks/rules-of-hooks */
import {
	Editor,
	SVGContainer,
	TLHighlightShape,
	TLShapeView,
	VecLike,
	definePlugin,
	last,
	rng,
	shapeViewSlot,
	useColorMode,
	useValue,
} from '@tldraw/editor'
import { getHighlightFreehandSettings, getPointsFromDrawSegments } from '../draw/getPath'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { getSvgPathFromStrokePoints } from '../shared/freehand/svg'
import { getDisplayValues } from '../shared/getDisplayValues'
import type { HighlightShapeUtil } from './HighlightShapeUtil'

/** @public */
export const highlightShapeView: TLShapeView<TLHighlightShape, HighlightShapeUtil> = {
	type: 'highlight',
	component(shape, util) {
		const dv = getDisplayValues(util, shape)
		const sw = dv.strokeWidth * shape.props.scale
		const forceSolid = useHighlightForceSolid(util.editor, sw)

		return (
			<SVGContainer>
				<HighlightRenderer
					shape={shape}
					forceSolid={forceSolid}
					strokeWidth={sw}
					opacity={dv.overlayOpacity}
					strokeColor={dv.strokeColor}
				/>
			</SVGContainer>
		)
	},

	backgroundComponent(shape, util) {
		const colorMode = useColorMode()
		const dv = getDisplayValues(util, shape, colorMode)
		const sw = dv.strokeWidth * shape.props.scale
		const forceSolid = useHighlightForceSolid(util.editor, sw)
		return (
			<SVGContainer>
				<HighlightRenderer
					shape={shape}
					forceSolid={forceSolid}
					strokeWidth={sw}
					opacity={dv.underlayOpacity}
					strokeColor={dv.strokeColor}
				/>
			</SVGContainer>
		)
	},

	toSvg(shape, ctx, util) {
		const dv = getDisplayValues(util, shape, ctx.colorMode)
		const strokeWidth = dv.strokeWidth * shape.props.scale
		const forceSolid = strokeWidth < 1.5
		const scaleFactor = 1 / shape.props.scale
		return (
			<g transform={`scale(${scaleFactor})`}>
				<HighlightRenderer
					forceSolid={forceSolid}
					strokeWidth={strokeWidth}
					shape={shape}
					opacity={dv.overlayOpacity}
					strokeColor={dv.strokeColor}
				/>
			</g>
		)
	},

	toBackgroundSvg(shape, ctx, util) {
		const dv = getDisplayValues(util, shape, ctx.colorMode)
		const strokeWidth = dv.strokeWidth * shape.props.scale
		const forceSolid = strokeWidth < 1.5
		const scaleFactor = 1 / shape.props.scale
		return (
			<g transform={`scale(${scaleFactor})`}>
				<HighlightRenderer
					forceSolid={forceSolid}
					strokeWidth={strokeWidth}
					shape={shape}
					opacity={dv.underlayOpacity}
					strokeColor={dv.strokeColor}
				/>
			</g>
		)
	},
}

/**
 * Draws highlight shapes with {@link highlightShapeView}. Importing `tldraw` adds it to
 * `createDefaultPlugins()`, see {@link defaultShapeViewPlugins}.
 *
 * @public
 */
export const highlightShapeViewPlugin = definePlugin({
	id: 'highlightShapeView',
	setup: (ctx) => void ctx.contribute(shapeViewSlot, highlightShapeView),
})

function getShapeDot(point: VecLike) {
	const r = 0.1
	return `M ${point.x} ${point.y} m -${r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${
		r * 2
	},0`
}

function HighlightRenderer({
	strokeWidth,
	forceSolid,
	shape,
	opacity,
	strokeColor,
}: {
	strokeWidth: number
	forceSolid: boolean
	shape: TLHighlightShape
	opacity: number
	strokeColor: string
}) {
	const allPointsFromSegments = getPointsFromDrawSegments(
		shape.props.segments,
		shape.props.scaleX,
		shape.props.scaleY
	)

	let sw = strokeWidth
	if (!forceSolid && !shape.props.isPen && allPointsFromSegments.length === 1) {
		sw += rng(shape.id)() * (sw / 6)
	}

	const options = getHighlightFreehandSettings({
		strokeWidth: sw,
		showAsComplete: shape.props.isComplete || last(shape.props.segments)?.type === 'straight',
	})

	const strokePoints = getStrokePoints(allPointsFromSegments, options)

	const solidStrokePath =
		strokePoints.length > 1
			? getSvgPathFromStrokePoints(strokePoints, false)
			: getShapeDot(allPointsFromSegments[0] ?? { x: 0, y: 0 })

	return (
		<path
			d={solidStrokePath}
			strokeLinecap="round"
			fill="none"
			pointerEvents="all"
			stroke={strokeColor}
			strokeWidth={sw}
			opacity={opacity}
		/>
	)
}

function useHighlightForceSolid(editor: Editor, scaledStrokeWidth: number) {
	return useValue(
		'forceSolid',
		() => {
			const zoomLevel = editor.getEfficientZoomLevel()
			return scaledStrokeWidth / zoomLevel < 1.5
		},
		[editor, scaledStrokeWidth]
	)
}
