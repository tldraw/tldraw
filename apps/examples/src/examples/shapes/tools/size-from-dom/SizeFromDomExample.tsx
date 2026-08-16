/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
	AtomMap,
	EditorAtom,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	Tldraw,
	TLShape,
	TLShapeId,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { contents } from './contents'

const DYNAMIC_SIZE_TYPE = 'dynamic-size'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[DYNAMIC_SIZE_TYPE]: { contents: string[] }
	}
}

// There's a guide at the bottom of this file!

const SHAPE_WIDTH_PX = 150

// [2]
type DynamicSizeShape = TLShape<typeof DYNAMIC_SIZE_TYPE>

// [3]
const ShapeSizes = new EditorAtom('shape sizes', (editor) => {
	const map = new AtomMap<TLShapeId, { width: number; height: number }>('shape sizes')

	// [a] Clean up sizes when shapes are deleted
	editor.sideEffects.registerAfterDeleteHandler('shape', (shape) => {
		map.delete(shape.id)
	})

	return map
})

// [4]
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

// [5]
export class DynamicSizeShapeUtil extends ShapeUtil<DynamicSizeShape> {
	// [a]
	static override type = DYNAMIC_SIZE_TYPE
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
	override canCull(shape: DynamicSizeShape) {
		return false
	}

	// [d]
	override canResize(shape: DynamicSizeShape) {
		return false
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
	getIndicatorPath(shape: DynamicSizeShape) {
		const { width, height } = this.editor.getShapeGeometry(shape).bounds
		const path = new Path2D()
		path.rect(0, 0, width, height)
		return path
	}
}

// [6]
const shapeUtils = [DynamicSizeShapeUtil]

export default function SizeFromDomExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					editor.selectAll()
					editor.deleteShapes(editor.getSelectedShapeIds())

					editor.createShape({
						type: DYNAMIC_SIZE_TYPE,
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
Two pieces do the work and can be reused for other shapes: the ShapeSizes atom and the
useDynamicShapeSize hook.

[1]
Extend TLGlobalShapePropsMap to add our shape's props to the global type system.

[2]
The shape only stores content. Its size is measured from the DOM element that renders it.

[3]
ShapeSizes is an EditorAtom holding an AtomMap from shape id to measured size. Using an
EditorAtom (rather than a module-level atom) scopes the sizes to one editor instance, and
AtomMap makes each shape's entry its own signal, so getGeometry for one shape doesn't
recompute when a different shape's size changes.

	[a] Delete a shape's entry when the shape is deleted, so the map doesn't grow forever.

[4]
useDynamicShapeSize measures a DOM element and writes its size to ShapeSizes:

	[a] offsetWidth/offsetHeight report layout size and ignore CSS transforms, so they're already
	    in shape space regardless of the camera zoom.

	[b] Writing to the atom invalidates getGeometry (see [e]) so selection bounds, hit testing,
	    and the indicator all follow the new size. We bail if nothing changed to avoid a redundant
	    store update.

	[c] Measure on every render, so the first paint already has a real size rather than the fallback.

	[d] ResizeObserver catches changes that don't go through React, such as fonts loading.

[5]
The shape util:

	[a] Standard type and props. Note there is no w or h prop.

	[b] Default props with some sample content.

	[c] Never cull the shape. Culled shapes are hidden with display: none, so its element would
	    measure 0×0 and the stored size would go stale until it scrolled back into view.

	[d] Resizing is disabled because the size is not something the user controls.

	[e] getGeometry reads from ShapeSizes. Because the read happens inside a computed, the geometry
	    updates reactively when the measured size changes. Before the first measurement we fall back
	    to a fixed height.

	[f] The component renders the content and attaches the ref from useDynamicShapeSize:

		[i] The text is animated so you can watch the selection bounds track the DOM.

		[ii] The measured element is given the shape width explicitly; only the height is dynamic.

	[g] The indicator uses the shape's geometry bounds, so it matches the measured size.

[6]
Standard setup: pass the shape util to Tldraw and create one shape on mount.

To reuse this in your own shape:
1. Call useDynamicShapeSize(shape) in your component and attach the returned ref.
2. Read ShapeSizes.get(this.editor).get(shape.id) in getGeometry.
3. Don't also store w/h props for the same dimension, or decide which one wins.
*/
