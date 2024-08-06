import { Vec, useSafeId } from '@tldraw/editor'

const ROTATING_BOX_SHADOWS = [
	{
		offsetX: 0,
		offsetY: 2,
		blur: 4,
		color: '#00000029',
	},
	{
		offsetX: 0,
		offsetY: 3,
		blur: 6,
		color: '#0000001f',
	},
]

/** @public */
export function getRotatedBoxShadow(rotation: number) {
	const cssStrings = ROTATING_BOX_SHADOWS.map((shadow) => {
		const { offsetX, offsetY, blur, color } = shadow
		const vec = new Vec(offsetX, offsetY)
		const { x, y } = vec.rot(-rotation)
		return `${x}px ${y}px ${blur}px ${color}`
	})
	return cssStrings.join(', ')
}

// gaussian blur standard deviation isn't the same as box-shadow size. This is a rough approximation
// to make them look similar adapted from
// https://stackoverflow.com/questions/36781067/svg-fegaussianblur-correlation-between-stddeviation-and-size
const STD_DEVIATION_FACTOR = 4 / (3 * Math.sqrt(2 * Math.PI))

export function useSvgRotatedBoxShadowSvg(rotation: number) {
	const id = `rotated-box-shadow-${useSafeId()}`

	const filters = ROTATING_BOX_SHADOWS.map((shadow, i) => {
		const { offsetX, offsetY, blur, color } = shadow

		const standardDeviation = blur * STD_DEVIATION_FACTOR

		const vec = new Vec(offsetX, offsetY)
		const offset = vec.rot(-rotation)
		return (
			<feDropShadow
				key={i}
				dx={offset.x}
				dy={offset.y}
				stdDeviation={standardDeviation}
				floodColor={color}
				floodOpacity={1}
			/>
		)
	})

	return {
		defs: (
			<defs>
				<filter id={id}>{filters}</filter>
			</defs>
		),
		filter: `url(#${id})`,
	}
}
