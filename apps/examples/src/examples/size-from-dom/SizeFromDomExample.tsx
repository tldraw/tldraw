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

const SHAPE_WIDTH_PX = 150

type DynamicSizeShape = TLBaseShape<'dynamic-size', { contents: string[] }>

const ShapeSizes = new EditorAtom('shape sizes', (editor) => {
	const map = new AtomMap<TLShapeId, { width: number; height: number }>('shape sizes')

	editor.sideEffects.registerAfterDeleteHandler('shape', (shape) => {
		map.delete(shape.id)
	})

	return map
})

function useDynamicShapeSize(shape: DynamicSizeShape) {
	const ref = useRef<HTMLDivElement>(null)
	const editor = useEditor()

	const updateShapeSize = useCallback(() => {
		if (!ref.current) return

		const width = ref.current.offsetWidth
		const height = ref.current.offsetHeight

		ShapeSizes.update(editor, (map) => {
			const existing = map.get(shape.id)
			if (existing && existing.width === width && existing.height === height) return map
			return map.set(shape.id, { width, height })
		})
	}, [editor, shape.id])

	useLayoutEffect(() => {
		updateShapeSize()
	})

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

export class DynamicSizeShapeUtil extends ShapeUtil<DynamicSizeShape> {
	static override type = 'dynamic-size' as const
	static override props: RecordProps<DynamicSizeShape> = {
		contents: T.arrayOf(T.string),
	}

	getDefaultProps(): DynamicSizeShape['props'] {
		return {
			contents,
		}
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}
	override isAspectRatioLocked() {
		return true
	}

	getGeometry(shape: DynamicSizeShape) {
		const size = ShapeSizes.get(this.editor).get(shape.id)
		return new Rectangle2d({
			width: SHAPE_WIDTH_PX,
			height: size?.height ?? 50,
			isFilled: true,
		})
	}

	component(shape: DynamicSizeShape) {
		const ref = useDynamicShapeSize(shape)

		const [contentsToShow, setContentsToShow] = useState<string>('')

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

		return (
			<div ref={ref} style={{ width: SHAPE_WIDTH_PX }}>
				{contentsToShow}
			</div>
		)
	}

	indicator(shape: DynamicSizeShape) {
		const { width, height } = this.editor.getShapeGeometry(shape).bounds

		return <rect width={width} height={height} />
	}
}

const shapeUtils = [DynamicSizeShapeUtil]

export default function BasicExample() {
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
