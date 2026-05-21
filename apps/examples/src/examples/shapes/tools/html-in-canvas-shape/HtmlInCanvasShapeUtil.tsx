import { useEffect, useRef } from 'react'
import {
	BaseBoxShapeUtil,
	HTMLContainer,
	isDrawElementImageSupported,
	RecordProps,
	T,
	TLShape,
	useEditor,
} from 'tldraw'

const HTML_IN_CANVAS_SHAPE_TYPE = 'html-in-canvas-shape'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[HTML_IN_CANVAS_SHAPE_TYPE]: {
			w: number
			h: number
			counter: number
		}
	}
}

export type IHtmlInCanvasShape = TLShape<typeof HTML_IN_CANVAS_SHAPE_TYPE>

export const HTML_IN_CANVAS_SHAPE = HTML_IN_CANVAS_SHAPE_TYPE

export class HtmlInCanvasShapeUtil extends BaseBoxShapeUtil<IHtmlInCanvasShape> {
	static override type = HTML_IN_CANVAS_SHAPE_TYPE
	static override props: RecordProps<IHtmlInCanvasShape> = {
		w: T.number,
		h: T.number,
		counter: T.number,
	}

	getDefaultProps(): IHtmlInCanvasShape['props'] {
		return { w: 320, h: 220, counter: 0 }
	}

	override canEdit() {
		return true
	}

	component(shape: IHtmlInCanvasShape) {
		return <HtmlInCanvasShapeComponent shape={shape} />
	}

	getIndicatorPath(shape: IHtmlInCanvasShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

function HtmlInCanvasShapeComponent({ shape }: { shape: IHtmlInCanvasShape }) {
	const editor = useEditor()
	const supported = isDrawElementImageSupported()
	const isEditing = editor.getEditingShapeId() === shape.id

	return (
		<HTMLContainer
			id={shape.id}
			style={{
				pointerEvents: isEditing ? 'all' : 'none',
				width: shape.props.w,
				height: shape.props.h,
			}}
			onPointerDown={isEditing ? editor.markEventAsHandled : undefined}
		>
			{supported ? (
				<CanvasHost shape={shape} />
			) : (
				<FallbackHost>
					<DemoContent shape={shape} />
				</FallbackHost>
			)}
		</HTMLContainer>
	)
}

function CanvasHost({ shape }: { shape: IHtmlInCanvasShape }) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)
	const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

	// Paint listener — set up once. Scale by bitmap/CSS ratio so the rendered
	// content always fills the bitmap at whatever resolution it currently has.
	useEffect(() => {
		const canvas = canvasRef.current
		const content = contentRef.current
		if (!canvas || !content) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const draw = () => {
			try {
				const cssW = parseFloat(canvas.style.width) || canvas.width
				const cssH = parseFloat(canvas.style.height) || canvas.height
				ctx.reset?.()
				ctx.scale(canvas.width / cssW, canvas.height / cssH)
				;(ctx as any).drawElementImage(content, 0, 0)
			} catch (err) {
				if (!(err instanceof DOMException && err.name === 'InvalidStateError')) {
					throw err
				}
			}
		}

		canvas.addEventListener('paint', draw)
		;(canvas as any).requestPaint?.()
		return () => canvas.removeEventListener('paint', draw)
	}, [])

	// Bitmap dimensions: set exact on first mount so the initial paint is sharp,
	// then debounce subsequent updates. During an active resize the bitmap stays
	// at its last stable dimensions and CSS scales the canvas visually; ~100ms
	// after the resize ends the bitmap snaps to the exact target for crispness.
	// This avoids both the per-frame bitmap clear (flicker) and the aspect-ratio
	// stretching that a grow-with-hysteresis approach causes when the user
	// drags a side handle.
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		const targetW = Math.max(1, Math.ceil(shape.props.w * dpr))
		const targetH = Math.max(1, Math.ceil(shape.props.h * dpr))

		const isCanvasDefault = canvas.width === 300 && canvas.height === 150
		if (isCanvasDefault) {
			canvas.width = targetW
			canvas.height = targetH
			;(canvas as any).requestPaint?.()
			return
		}

		const id = setTimeout(() => {
			if (canvas.width !== targetW || canvas.height !== targetH) {
				canvas.width = targetW
				canvas.height = targetH
				;(canvas as any).requestPaint?.()
			}
		}, 100)
		return () => clearTimeout(id)
	}, [shape.props.w, shape.props.h, dpr])

	// Counter change — content stays the same size, but ask for a redraw.
	useEffect(() => {
		;(canvasRef.current as any)?.requestPaint?.()
	}, [shape.props.counter])

	return (
		<canvas
			ref={canvasRef}
			style={{ width: shape.props.w, height: shape.props.h, display: 'block' }}
			{...{ layoutsubtree: '' }}
		>
			<div
				ref={contentRef}
				style={{
					width: shape.props.w,
					height: shape.props.h,
					position: 'relative',
					overflow: 'hidden',
				}}
			>
				<DemoContent shape={shape} />
			</div>
		</canvas>
	)
}

function FallbackHost({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				position: 'relative',
				outline: '2px dashed rgba(255,255,255,0.5)',
				outlineOffset: -6,
			}}
		>
			{children}
		</div>
	)
}

function DemoContent({ shape }: { shape: IHtmlInCanvasShape }) {
	const editor = useEditor()
	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				background: 'linear-gradient(135deg, #ff7eb9 0%, #7afcff 50%, #feff9c 100%)',
				color: '#1b1b2f',
				fontFamily: 'system-ui, sans-serif',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: 16,
				boxSizing: 'border-box',
				borderRadius: 12,
				overflow: 'hidden',
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
				<span
					style={{
						fontSize: 32,
						display: 'inline-block',
						animation: 'tl-html-in-canvas-spin 4s linear infinite',
					}}
				>
					🎨
				</span>
				<strong style={{ fontSize: 18 }}>HTML in canvas</strong>
			</div>

			<div style={{ fontSize: 14, lineHeight: 1.4 }}>
				This card is live, styled HTML rasterized via{' '}
				<code style={{ background: 'rgba(0,0,0,0.08)', padding: '0 4px', borderRadius: 4 }}>
					ctx.drawElementImage()
				</code>
				. The button below stays interactive thanks to <code>layoutsubtree</code>.
			</div>

			<button
				type="button"
				onPointerDown={(e) => e.stopPropagation()}
				onClick={() =>
					editor.updateShape<IHtmlInCanvasShape>({
						id: shape.id,
						type: shape.type,
						props: { counter: shape.props.counter + 1 },
					})
				}
				style={{
					alignSelf: 'flex-start',
					padding: '8px 14px',
					borderRadius: 8,
					border: 'none',
					background: '#1b1b2f',
					color: 'white',
					cursor: 'pointer',
					fontSize: 14,
				}}
			>
				clicked {shape.props.counter} {shape.props.counter === 1 ? 'time' : 'times'}
			</button>

			<style>{`
				@keyframes tl-html-in-canvas-spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}
			`}</style>
		</div>
	)
}
