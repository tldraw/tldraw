/* eslint-disable react-hooks/rules-of-hooks */
import {
	SVGContainer,
	TLLineShape,
	TLShapeView,
	definePlugin,
	shapeViewSlot,
	useColorMode,
} from '@tldraw/editor'
import { getDisplayValues } from '../shared/getDisplayValues'
import { getPathForLineShape, type LineShapeUtil } from './LineShapeUtil'

/** @public */
export const lineShapeView: TLShapeView<TLLineShape, LineShapeUtil> = {
	type: 'line',
	component(shape, util) {
		const colorMode = useColorMode()
		const dv = getDisplayValues(util, shape, colorMode)
		return (
			<SVGContainer style={{ minWidth: 50, minHeight: 50 }}>
				<LineShapeSvg shape={shape} strokeColor={dv.strokeColor} strokeWidth={dv.strokeWidth} />
			</SVGContainer>
		)
	},

	toSvg(shape, ctx, util) {
		const dv = getDisplayValues(util, shape, ctx.colorMode)
		return (
			<LineShapeSvg
				shouldScale
				shape={shape}
				strokeColor={dv.strokeColor}
				strokeWidth={dv.strokeWidth}
			/>
		)
	},
}

/**
 * Draws line shapes with {@link lineShapeView}. Importing `tldraw` adds it to
 * `createDefaultPlugins()`, see {@link defaultShapeViewPlugins}.
 *
 * @public
 */
export const lineShapeViewPlugin = definePlugin({
	id: 'lineShapeView',
	setup: (ctx) => void ctx.contribute(shapeViewSlot, lineShapeView),
})

function LineShapeSvg({
	shape,
	shouldScale = false,
	forceSolid = false,
	strokeColor,
	strokeWidth: baseStrokeWidth,
}: {
	shape: TLLineShape
	shouldScale?: boolean
	forceSolid?: boolean
	strokeColor: string
	strokeWidth: number
}) {
	const path = getPathForLineShape(shape)
	const { dash } = shape.props

	const scaleFactor = 1 / shape.props.scale

	const scale = shouldScale ? scaleFactor : 1

	const strokeWidth = baseStrokeWidth * shape.props.scale

	return path.toSvg({
		style: dash,
		strokeWidth,
		forceSolid,
		randomSeed: shape.id,
		props: {
			transform: `scale(${scale})`,
			stroke: strokeColor,
			fill: 'none',
		},
	})
}
