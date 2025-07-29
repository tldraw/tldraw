import { forwardRef } from 'react'
import {
	atom,
	DefaultShapeWrapper,
	Editor,
	TLComponents,
	Tldraw,
	TLShapeId,
	TLShapeWrapperProps,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const specialShapeId = atom<TLShapeId | null>('special shape id', null)

// [2]
const CustomShapeWrapper = forwardRef(function CustomShapeWrapper(
	{ children, shape, isBackground }: TLShapeWrapperProps,
	ref: React.Ref<HTMLDivElement>
) {
	// [a]
	const isSpecial = useValue('is special', () => specialShapeId.get() === shape.id, [shape.id])

	// [b]
	return (
		<DefaultShapeWrapper
			ref={ref}
			shape={shape}
			isBackground={isBackground}
			className={isSpecial ? 'custom-special-shape' : undefined}
		>
			{children}
		</DefaultShapeWrapper>
	)
})

// [3]
const components: TLComponents = {
	ShapeWrapper: CustomShapeWrapper,
}

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<style>{`
				.custom-special-shape {
					filter: drop-shadow(0 0 3px rgba(255, 0, 0));
				}
			`}</style>
			<Tldraw
				components={components}
				onMount={(editor) => {
					createSomeRandomShapes(editor)

					const timer = setInterval(() => {
						const allShapes = editor.getCurrentPageShapesSorted()
						const randomShape = allShapes[Math.floor(Math.random() * allShapes.length)]
						specialShapeId.set(randomShape.id)
					}, 1000)

					return () => {
						clearInterval(timer)
					}
				}}
			/>
		</div>
	)
}

function createSomeRandomShapes(editor: Editor) {
	const bounds = editor.getViewportPageBounds()
	for (let i = 0; i < 10; i++) {
		editor.createShape({
			type: 'geo',
			x: bounds.x + Math.random() * bounds.width,
			y: bounds.y + Math.random() * bounds.height,
		})
	}
}

/*
Introduction:

You can customize how shapes are wrapped in tldraw by creating a custom shape wrapper component and
passing it to the Tldraw component. In this example, we'll create a custom shape wrapper that adds a
red drop shadow to a randomly selected shape every second.

[1] We create an atom to store the ID of the currently "special" shape. Atoms are part of tldraw's
reactive state system and allow us to create reactive values that can be observed and updated. This
atom will hold the ID of the shape that should have the special styling applied to it.

[2] This is our custom shape wrapper component. Shape wrappers are React components that wrap around
every shape in the editor, allowing you to add custom styling, behavior, or data attributes to
shapes. We use forwardRef to properly forward the ref that tldraw passes to us.

    [a]
    We use the useValue hook to create a reactive value that checks if the current shape is the "special" shape.
    This will automatically update whenever the specialShapeId atom changes. We also check if the shape is filled
    by looking at its props.

    [b]
    We re-use the DefaultShapeWrapper component, but add a custom class to the shape when it's the "special" shape.

[3] We create a components object that tells tldraw to use our custom shape wrapper. The
TLComponents type allows us to override various parts of the tldraw UI, including the ShapeWrapper
component.

[4] In the main component, we add CSS that applies a red drop shadow to any element with the
'custom-special-shape' class. We also set up a timer that randomly selects a shape every second and
makes it the "special" shape by updating the specialShapeId atom.

The shape wrapper approach is useful when you want to:
- Add custom styling to all shapes or specific shapes
- Add data attributes for CSS targeting
- Implement custom behavior that affects how shapes are rendered
- Create visual effects that apply to the shape container rather than the shape content

This is different from custom shapes (like in the CustomShapeExample) because it doesn't change what
the shape is, only how it's wrapped and styled in the editor.
*/
