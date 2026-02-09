import { TLShape, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const RED_OVERRIDES = {
	strokeColor: { light: '#dc0000', dark: '#ff4040' },
	fillColor: { light: '#dc0000', dark: '#ff4040' },
	labelColor: { light: '#dc0000', dark: '#ff4040' },
	patternColor: { light: '#dc0000', dark: '#ff4040' },
	arrowheadFillColor: { light: '#dc0000', dark: '#ff4040' },
	arrowheadPatternColor: { light: '#dc0000', dark: '#ff4040' },
	frameStroke: { light: '#dc0000', dark: '#ff4040' },
	frameFill: { light: '#fff0f0', dark: '#2a0000' },
	frameHeadingStroke: { light: '#dc0000', dark: '#ff4040' },
	frameHeadingFill: { light: '#fff0f0', dark: '#2a0000' },
	frameHeadingText: { light: '#dc0000', dark: '#ff4040' },
	textColor: { light: '#dc0000', dark: '#ff4040' },
}

const LIGHT_RED_OVERRIDES = {
	strokeColor: { light: '#ff2020', dark: '#ff7070' },
	fillColor: { light: '#ff2020', dark: '#ff7070' },
	labelColor: { light: '#ff2020', dark: '#ff7070' },
	patternColor: { light: '#ff2020', dark: '#ff7070' },
	arrowheadFillColor: { light: '#ff2020', dark: '#ff7070' },
	arrowheadPatternColor: { light: '#ff2020', dark: '#ff7070' },
	frameStroke: { light: '#ff2020', dark: '#ff7070' },
	frameFill: { light: '#fff5f5', dark: '#300000' },
	frameHeadingStroke: { light: '#ff2020', dark: '#ff7070' },
	frameHeadingFill: { light: '#fff5f5', dark: '#300000' },
	frameHeadingText: { light: '#ff2020', dark: '#ff7070' },
	textColor: { light: '#ff2020', dark: '#ff7070' },
}

// [2]
function getShapeStyleOverrides(shape: TLShape) {
	const color = (shape.props as { color?: string }).color
	if (color === 'red') return RED_OVERRIDES
	if (color === 'light-red') return LIGHT_RED_OVERRIDES
	return undefined
}

export default function ShapeStyleOverridesExample() {
	return (
		<div className="tldraw__editor">
			{/* [3] */}
			<Tldraw getShapeStyleOverrides={getShapeStyleOverrides} />
		</div>
	)
}

/*
[1]
Define the overrides for the "red" and "light-red" colors. Each override
uses { light, dark } values so the colors adapt to the current theme.
In light mode we use a higher-chroma red; in dark mode we use a brighter
but slightly lower-chroma red for readability.

We include all the color-related style properties so that the override
applies regardless of shape type — the shape will simply ignore any
properties that don't apply to it.

[2]
Check the shape's color prop. Only override shapes that are set to
"red" or "light-red". All other colors pass through unchanged.

[3]
Pass the callback as a prop to Tldraw. Draw some shapes, set them to
red, and compare with other colors to see the difference. Toggle dark
mode to see the themed values adapt.
*/
