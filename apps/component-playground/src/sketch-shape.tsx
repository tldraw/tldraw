import { ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { HTMLContainer, Rectangle2d, ShapeUtil, T, TLShape } from 'tldraw'
import { sketchesById } from './registry'
import { renderSketch } from './render-sketch'
import './sketch-shape.css'

// Register the custom shape's props so `'sketch'` is a known shape type (this is what
// makes createShape/updateShape/`shape.type === 'sketch'` typecheck).
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		sketch: { w: number; h: number; sketchId: string; args: Record<string, unknown> }
	}
}

const LABEL_H = 30
const PREVIEW_PAD = 12

/**
 * Renders a preview, scaled down only if it exceeds the available area, so oversized
 * specimens fit their cell while everything that already fits stays at 1:1.
 */
function ScaledPreview({
	maxW,
	maxH,
	children,
}: {
	maxW: number
	maxH: number
	children: ReactNode
}) {
	const ref = useRef<HTMLDivElement | null>(null)
	const [scale, setScale] = useState(1)

	useLayoutEffect(() => {
		const el = ref.current
		if (!el) return
		const measure = () => {
			const s = Math.min(1, maxW / el.scrollWidth, maxH / el.scrollHeight)
			setScale(Number.isFinite(s) && s > 0 ? s : 1)
		}
		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(el)
		return () => observer.disconnect()
	}, [maxW, maxH])

	return (
		<div className="sketch-shape__preview">
			<div
				ref={ref}
				style={{ width: 'max-content', transform: `scale(${scale})`, transformOrigin: 'center' }}
			>
				{children}
			</div>
		</div>
	)
}

/** A canvas shape that renders one sketch instance by id, with its own editable args. */
export type SketchShape = TLShape<'sketch'>

export class SketchShapeUtil extends ShapeUtil<SketchShape> {
	static override type = 'sketch' as const
	static override props = {
		w: T.number,
		h: T.number,
		sketchId: T.string,
		args: T.dict(T.string, T.unknown),
	}

	getDefaultProps(): SketchShape['props'] {
		return { w: 260, h: 160, sketchId: '', args: {} }
	}

	getGeometry(shape: SketchShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	override canResize() {
		return false
	}

	component(shape: SketchShape) {
		const loaded = sketchesById.get(shape.props.sketchId)
		return (
			<HTMLContainer
				className="sketch-shape"
				style={{ width: shape.props.w, height: shape.props.h }}
			>
				<ScaledPreview
					maxW={shape.props.w - PREVIEW_PAD * 2}
					maxH={shape.props.h - LABEL_H - PREVIEW_PAD * 2}
				>
					{loaded ? (
						renderSketch(loaded, shape.props.args)
					) : (
						<span>unknown: {shape.props.sketchId}</span>
					)}
				</ScaledPreview>
				{loaded && <div className="sketch-shape__label">{loaded.name}</div>}
			</HTMLContainer>
		)
	}

	override getIndicatorPath(shape: SketchShape): Path2D {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}
