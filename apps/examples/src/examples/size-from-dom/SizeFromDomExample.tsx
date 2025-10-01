/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
	AtomMap,
	EditorAtom,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseShape,
	Tldraw,
	TLShapeId,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { contents } from './contents'

// There's a guide at the bottom of this file!

const SHAPE_WIDTH_PX = 150

// [1]
type DynamicSizeShape = TLBaseShape<'dynamic-size', { contents: string[] }>

// [2]
const ShapeSizes = new EditorAtom('shape sizes', (editor) => {
	const map = new AtomMap<TLShapeId, { width: number; height: number }>('shape sizes')

	// [a] Clean up sizes when shapes are deleted
	editor.sideEffects.registerAfterDeleteHandler('shape', (shape) => {
		map.delete(shape.id)
	})

	return map
})

// [3]
function useDynamicShapeSize(shape: DynamicSizeShape) {
	const ref = useRef<HTMLDivElement>(null)
	const editor = useEditor()

	const updateShapeSize = useCallback(() => {
		if (!ref.current) return

		// [a] Get actual DOM dimensions
		const width = ref.current.offsetWidth
		const height = ref.current.offsetHeight

		// [b] Update the shape size in our global atom
		ShapeSizes.update(editor, (map) => {
			const existing = map.get(shape.id)
			if (existing && existing.width === width && existing.height === height) return map
			return map.set(shape.id, { width, height })
		})
	}, [editor, shape.id])

	// [c] Update size immediately on render
	useLayoutEffect(() => {
		updateShapeSize()
	})

	// [d] Watch for DOM size changes using ResizeObserver
	useLayoutEffect(() => {
		if (!ref.current) return
		const observer = new ResizeObserver(updateShapeSize)
		observer.observe(ref.current)
		return () => {
			observer.disconnect()
		}
	}, [updateShapeSize])

	return ref
}

// [4]
export class DynamicSizeShapeUtil extends ShapeUtil<DynamicSizeShape> {
	// [a]
	static override type = 'dynamic-size' as const
	static override props: RecordProps<DynamicSizeShape> = {
		contents: T.arrayOf(T.string),
	}

	// [b]
	getDefaultProps(): DynamicSizeShape['props'] {
		return {
			contents,
		}
	}

	// [c]
	override canCull() {
		return false
	}

	// [d]
	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}
	override isAspectRatioLocked() {
		return true
	}

	// [e]
	getGeometry(shape: DynamicSizeShape) {
		const size = ShapeSizes.get(this.editor).get(shape.id)
		return new Rectangle2d({
			width: SHAPE_WIDTH_PX,
			height: size?.height ?? 50,
			isFilled: true,
		})
	}

	// [f]
	component(shape: DynamicSizeShape) {
		const ref = useDynamicShapeSize(shape)

		const [contentsToShow, setContentsToShow] = useState<string>('')

		// [i] Animate text content to demonstrate dynamic sizing
		useEffect(() => {
			const animationDuration = 6000
			const tick = (time: number) => {
				const progress = (time % animationDuration) / animationDuration
				const amountToShow = progress < 0.5 ? progress * 2 : 1 - (progress - 0.5) * 2

				setContentsToShow(
					shape.props.contents
						.slice(0, Math.floor(amountToShow * shape.props.contents.length))
						.join(' ')
				)

				frame = requestAnimationFrame(tick)
			}

			let frame = requestAnimationFrame(tick)

			return () => {
				cancelAnimationFrame(frame)
			}
		}, [shape.props.contents])

		// [ii] Return DOM element that will be measured
		return (
			<div ref={ref} style={{ width: SHAPE_WIDTH_PX }}>
				{contentsToShow}
			</div>
		)
	}

	// [g]
	indicator(shape: DynamicSizeShape) {
		const { width, height } = this.editor.getShapeGeometry(shape).bounds

		return <rect width={width} height={height} />
	}
}

// [5]
const shapeUtils = [DynamicSizeShapeUtil]

export default function SizeFromDomExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					editor.selectAll()
					editor.deleteShapes(editor.getSelectedShapeIds())

					editor.createShape<DynamicSizeShape>({
						type: 'dynamic-size',
						x: 100,
						y: 100,
					})

					editor.selectAll().zoomToSelection()
				}}
			/>
		</div>
	)
}

/*
Introduction:

This example demonstrates how to create a shape whose size is determined by its DOM content rather than
shape props. It showcases two potentially reusable utilities: ShapeSizes and useDynamicShapeSize, which
can be adapted for other shapes that need DOM-driven sizing.

[1]
Define the shape type. This shape only stores content data - its size is determined dynamically by
measuring the DOM element that renders the content.

[2] 
ShapeSizes is a global EditorAtom that stores size information for shapes by their ID. This is the key
piece that makes DOM-driven sizing work:
	
	[a] We register a cleanup handler to remove size data when shapes are deleted, preventing memory leaks.

[3]
useDynamicShapeSize is a reusable hook that measures DOM elements and updates the shape size data:

	[a] We measure the actual DOM dimensions using offsetWidth/offsetHeight
	
	[b] We store these dimensions in our global ShapeSizes atom. The atom will trigger re-renders of
	    components that depend on this data when the size changes.
	
	[c] We measure immediately on every render to ensure we have current size data
	
	[d] We use ResizeObserver to watch for size changes and update accordingly. This is what makes
	    the shape truly dynamic - it will update whenever the DOM content changes size.

[4]
The shape util defines how our dynamic-size shape behaves:

	[a] Standard shape type and props definition. Note we only store content, not size.
	
	[b] Default props with some sample content

	[c] Prevent the shape from being culled when it's outside the viewport, which would break our measurements
	
	[d] Shape behavior: not editable, not resizable (since size comes from DOM), aspect ratio locked
	
	[e] getGeometry uses the size from our ShapeSizes atom. This is where the DOM-measured size gets
	    used by the editor for hit-testing, selection bounds, etc.
	
	[f] The component renders the content and uses our hook to measure it:
	
		[i] We animate the text content to demonstrate the dynamic sizing in action
		
		[ii] The ref from useDynamicShapeSize is attached to the DOM element we want to measure
	
	[g] Standard indicator for selection outline

[5]
Standard setup - pass our custom shape util to Tldraw and create an instance on mount.

Reusability:

The ShapeSizes atom and useDynamicShapeSize hook are designed to be reusable. To use them with other
shapes, you just need to:
1. Call useDynamicShapeSize(shape) in your component and attach the returned ref
2. Use ShapeSizes.get(editor).get(shapeId) in your getGeometry method
3. Ensure your shape doesn't have conflicting size props (or handle the conflict appropriately)

*/
