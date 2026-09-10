import { HTMLContainer, RecordProps, Rectangle2d, ShapeUtil, T, TLShape, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		'validated-shape': {
			w: number
			h: number
			percentage: number
			rating: number
		}
	}
}

type ValidatedShape = TLShape<'validated-shape'>

// [2]
const validatedShapeProps: RecordProps<ValidatedShape> = {
	w: T.positiveNumber,
	h: T.positiveNumber,
	// [3]
	percentage: T.number
		.check('min-value', (value) => {
			if (value < 0) throw new Error('Percentage cannot be negative')
		})
		.check('max-value', (value) => {
			if (value > 100) throw new Error('Percentage cannot exceed 100')
		}),
	// [4]
	rating: T.integer.refine((value) => {
		return Math.max(1, Math.min(5, value))
	}),
}

class ValidatedShapeUtil extends ShapeUtil<ValidatedShape> {
	static override type = 'validated-shape' as const
	static override props = validatedShapeProps

	getDefaultProps(): ValidatedShape['props'] {
		return { w: 300, h: 150, percentage: 50, rating: 3 }
	}

	getGeometry(shape: ValidatedShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	component(shape: ValidatedShape) {
		return (
			<HTMLContainer id={shape.id} style={{ padding: 16, pointerEvents: 'all' }}>
				<div>Percentage: {shape.props.percentage}%</div>
				<div>Rating: {shape.props.rating}/5</div>
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: ValidatedShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

// [5]
const customShapeUtils = [ValidatedShapeUtil]

export default function CustomValidatorsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					// [6]
					editor.createShape({ type: 'validated-shape', x: 100, y: 100 })

					// [7]
					try {
						editor.createShape({
							type: 'validated-shape',
							x: 100,
							y: 300,
							props: { percentage: 150 },
						})
					} catch (error: any) {
						console.error('Validation failed:', error.message)
					}

					// [8]
					editor.createShape({
						type: 'validated-shape',
						x: 450,
						y: 100,
						props: { rating: 10 },
					})
				}}
			/>
		</div>
	)
}

/*
[1]
Extend TLGlobalShapePropsMap to register your custom shape's props with the type system.

[2]
Define validators for each prop. `T.positiveNumber` already rejects negative sizes; the other
two add constraints of their own.

[3]
`.check()` adds a validation step without changing the value: the function throws for invalid
input and returns nothing. Checks chain, and the name (e.g. 'max-value') is included in the
error message so you can tell which one failed.

[4]
`.refine()` returns a new value, so it can transform as well as validate. Here it clamps the
rating to 1-5 instead of throwing. The store keeps the refined value, not the one you passed in.

[5]
Create the shape utils array outside the component to prevent recreation on each render.

[6]
Create a valid shape on mount to show the default values.

[7]
Creating a shape with `percentage: 150` fails the 'max-value' check. Validation runs when the
record is written to the store, so `createShape` throws. Open the browser console to see the
error message.

[8]
Creating a shape with `rating: 10` succeeds because `.refine()` clamps it: the shape on the
canvas shows a rating of 5.
*/
