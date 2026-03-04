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
	percentage: T.nonZeroFiniteNumber.check('max-value', (value) => {
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

	indicator(shape: ValidatedShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
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
						props: { rating: 10 }, // Will be clamped to 5
					})
				}}
			/>
		</div>
	)
}

/*
This example demonstrates custom validators using .check() and .refine() methods.

[1]
Extend TLGlobalShapePropsMap to register your custom shape's props with the type system.

[2]
Define validators for each prop. Each validator adds constraints beyond basic type checking.

[3]
Use .check() to add validation constraints. Each check validates without
transforming the value. The name (e.g. 'max-value') appears in error messages for debugging.

[4]
Use .refine() to transform values. Unlike .check(), refine() returns a (possibly modified)
value rather than just validating. Here it clamps the rating to 1-5 instead of throwing.

[5]
Create the shape utils array outside the component to prevent recreation on each render.

[6]
Create a valid shape on mount to show the default values.

[7]
Demonstrate .check() validation by attempting to create a shape with an invalid percentage.
Open your browser console to see the validation error.

[8]
Demonstrate .refine() transformation - this shape is created successfully with rating=10,
but the stored value is clamped to 5.
*/
