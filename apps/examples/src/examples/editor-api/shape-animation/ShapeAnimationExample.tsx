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

// There's a guide at the bottom of this file!

function AnimationControls() {
	const editor = useEditor()

	// [1]
	const animatePosition = () => {
		const shape = editor.getOnlySelectedShape()
		if (!shape) return

		editor.animateShape(
			{ ...shape, x: shape.x + 200, y: shape.y + 100 },
			{ animation: { duration: 800, easing: EASINGS.easeInOutCubic } }
		)
	}

	const animateRotation = () => {
		const shape = editor.getOnlySelectedShape()
		if (!shape) return

		editor.animateShape(
			{ ...shape, rotation: shape.rotation + Math.PI * 2 },
			{ animation: { duration: 1000, easing: EASINGS.easeInOutCubic } }
		)
	}

	const animateFade = () => {
		const shape = editor.getOnlySelectedShape()
		if (!shape) return

		editor.animateShape(
			{ ...shape, opacity: shape.opacity > 0.5 ? 0.2 : 1 },
			{ animation: { duration: 600, easing: EASINGS.easeInOutQuad } }
		)
	}

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

	// [2]
	const animateMultiple = () => {
		const updates = editor.getCurrentPageShapes().map((shape) => ({
			...shape,
			x: shape.x + (Math.random() - 0.5) * 200,
			y: shape.y + (Math.random() - 0.5) * 200,
			rotation: shape.rotation + (Math.random() - 0.5) * Math.PI,
		}))

		editor.animateShapes(updates, { animation: { duration: 1000, easing: EASINGS.easeOutCubic } })
	}

	const hasOneSelected = useValue(
		'has one selected',
		() => editor.getSelectedShapeIds().length === 1,
		[editor]
	)

	return (
		<div className="tlui-menu animation-controls">
			<TldrawUiButton type="normal" disabled={!hasOneSelected} onClick={animatePosition}>
				Animate position
			</TldrawUiButton>
			<TldrawUiButton type="normal" disabled={!hasOneSelected} onClick={animateRotation}>
				Animate rotation
			</TldrawUiButton>
			<TldrawUiButton type="normal" disabled={!hasOneSelected} onClick={animateFade}>
				Fade in/out
			</TldrawUiButton>
			<TldrawUiButton type="normal" disabled={!hasOneSelected} onClick={animateAll}>
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

export default function ShapeAnimationExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
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
					editor.select(id)
				}}
			/>
		</div>
	)
}

/*
[1]
`animateShape()` takes a shape partial (here the whole shape spread with new values) plus animation
options, and interpolates `x`, `y`, `rotation`, and `opacity` from the shape's current values to the
targets over `duration`. `easing` accepts any function from `EASINGS`, or your own `(t) => number`.
Props are interpolated too when the shape util implements `getInterpolatedProps`.

[2]
`animateShapes()` does the same for many partials at once, sharing one duration and easing. Starting a
new animation on a shape that's already animating cancels the earlier one for that shape.
*/
