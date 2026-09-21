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
import './custom-shape-wrapper.css'

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

export default function CustomShapeWrapperExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					createSomeRandomShapes(editor)

					// [4]
					const timer = editor.timers.setInterval(() => {
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

Every shape on the canvas is rendered inside a wrapper element that positions it. You can replace
that wrapper with the `ShapeWrapper` component override to add class names, data attributes, or
styling to shapes without changing the shapes themselves. In this example, a red drop shadow moves
to a different random shape every second.

[1]
An atom holds the id of the currently "special" shape. Atoms are tldraw's reactive state
primitive: anything that reads the atom inside a reactive context re-runs when it changes.

[2]
The custom wrapper. It receives the same props as the default wrapper (`shape`, `isBackground`,
`children`) plus a ref that tldraw uses to position the element, so it must forward the ref.

	[a]
	`useValue` reads the atom reactively, so only the wrapper for the shape whose status changed
	re-renders when `specialShapeId` is set.

	[b]
	Rather than reimplementing positioning, we render `DefaultShapeWrapper` and pass an extra
	`className` when this shape is the special one. The class is styled in custom-shape-wrapper.css.

[3]
Pass the wrapper through `components.ShapeWrapper`. Define the object outside the component so it
isn't recreated on every render.

[4]
The interval that picks a new special shape is created with `editor.timers`, so it's cleared
automatically when the editor is disposed; the returned cleanup also runs when the component
unmounts.
*/
