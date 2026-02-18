import {
	createShapeId,
	EASINGS,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './shape-animation.css'

// [1]
function AnimationControls() {
	const editor = useEditor()

	// [2]
	const animatePosition = () => {
		const shape = editor.getOnlySelectedShape()
		if (!shape) return

		editor.animateShape(
			{ ...shape, x: shape.x + 200, y: shape.y + 100 },
			{ animation: { duration: 800, easing: EASINGS.easeInOutCubic } }
		)
	}

	// [3]
	const animateRotation = () => {
		const shape = editor.getOnlySelectedShape()
		if (!shape) return

		editor.animateShape(
			{ ...shape, rotation: shape.rotation + Math.PI * 2 },
			{ animation: { duration: 1000, easing: EASINGS.easeInOutCubic } }
		)
	}

	// [4]
	const animateFade = () => {
		const shape = editor.getOnlySelectedShape()
		if (!shape) return

		editor.animateShape(
			{ ...shape, opacity: shape.opacity > 0.5 ? 0.2 : 1 },
			{ animation: { duration: 600, easing: EASINGS.easeInOutQuad } }
		)
	}

	// [5]
	const animateAll = () => {
		const shape = editor.getOnlySelectedShape()
		if (!shape) return

		editor.animateShape(
			{
				...shape,
				x: shape.x + 150,
				y: shape.y - 100,
				rotation: shape.rotation + Math.PI,
				opacity: 0.3,
			},
			{ animation: { duration: 1200, easing: EASINGS.easeInOutCubic } }
		)
	}

	// [6]
	const animateMultiple = () => {
		const shapeIds = editor.getCurrentPageShapeIds()
		const updates = Array.from(shapeIds).map((id) => {
			const shape = editor.getShape(id)
			if (!shape) return null

			return {
				...shape,
				x: shape.x + (Math.random() - 0.5) * 200,
				y: shape.y + (Math.random() - 0.5) * 200,
				rotation: shape.rotation + (Math.random() - 0.5) * Math.PI,
			}
		})

		editor.animateShapes(updates, { animation: { duration: 1000, easing: EASINGS.easeOutCubic } })
	}

	const hasOneSelected = useValue(
		'has one selected',
		() => editor.getSelectedShapeIds().length !== 1,
		[editor]
	)

	return (
		<div className="tlui-menu animation-controls">
			<TldrawUiButton type="normal" disabled={hasOneSelected} onClick={animatePosition}>
				Animate position
			</TldrawUiButton>
			<TldrawUiButton type="normal" disabled={hasOneSelected} onClick={animateRotation}>
				Animate rotation
			</TldrawUiButton>
			<TldrawUiButton type="normal" disabled={hasOneSelected} onClick={animateFade}>
				Fade in/out
			</TldrawUiButton>
			<TldrawUiButton type="normal" disabled={hasOneSelected} onClick={animateAll}>
				Animate all
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={animateMultiple}>
				Animate multiple shapes
			</TldrawUiButton>
		</div>
	)
}

const components: TLComponents = {
	TopPanel: AnimationControls,
}

export default function AnimationShapesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					// Create some initial shapes for the demo
					const id = createShapeId()
					editor.createShapes([
						{
							id,
							type: 'geo',
							x: 200,
							y: 200,
							props: {
								w: 100,
								h: 100,
								color: 'blue',
							},
						},
						{
							id: createShapeId(),
							type: 'geo',
							x: 400,
							y: 300,
							props: {
								w: 80,
								h: 80,
								color: 'red',
								geo: 'ellipse',
							},
						},
						{
							id: createShapeId(),
							type: 'geo',
							x: 600,
							y: 200,
							props: {
								w: 120,
								h: 90,
								color: 'green',
								geo: 'triangle',
							},
						},
					])

					// Select the first shape
					editor.select(id)
				}}
			/>
		</div>
	)
}

/*
[1]
Create a component with buttons to trigger different animations. Use the `useEditor` hook to
access the editor instance.

[2]
`animateShape()` animates a single shape to new property values. Pass a partial shape with the
target values and animation options. The `easing` property accepts functions from the `EASINGS`
object. In this example, we move the shape to a new position with cubic easing.

[3]
Animate rotation by specifying a target rotation value in radians. Here we rotate the shape
360 degrees (2π radians) with smooth easing.

[4]
Opacity can be animated between 0 and 1. This creates a fade effect. We toggle between
low and high opacity values using quadratic easing.

[5]
Multiple properties can be animated simultaneously. This example combines position, rotation,
and opacity changes in a single animation.

[6]
`animateShapes()` animates multiple shapes at once. Build an array of shape partials and
pass them all together. All shapes will animate with the same duration and easing function.

*/
