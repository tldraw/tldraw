import { useEffect, useRef } from 'react'
import { TLEditorComponents, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// Pre-built Path2D objects using the cursor SVG paths from DefaultCanvas.tsx
const SHADOW_1 = new Path2D('m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z')
const SHADOW_2 = new Path2D('m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z')
const WHITE_1 = new Path2D('m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z')
const WHITE_2 = new Path2D('m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z')
const BLACK_1 = new Path2D('m19.751 24.4155-1.844.774-3.1-7.374 1.841-.775z')
const BLACK_2 = new Path2D('m13 10.814v11.188l2.969-2.866.428-.139h4.768z')

const MAX_TRAIL_LENGTH = 12
// How many ms before we start removing points from the tail
const CONSUME_DELAY_MS = 80

function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
	ctx.save()
	ctx.translate(x - 14, y - 10)
	ctx.globalAlpha = alpha

	// Shadow is offset +1,+1 from the main cursor
	ctx.save()
	ctx.translate(1, 1)
	ctx.fillStyle = 'rgba(0,0,0,.2)'
	ctx.fill(SHADOW_1)
	ctx.fill(SHADOW_2)
	ctx.restore()

	ctx.fillStyle = 'white'
	ctx.fill(WHITE_1)
	ctx.fill(WHITE_2)

	ctx.fillStyle = 'black'
	ctx.fill(BLACK_1)
	ctx.fill(BLACK_2)

	ctx.restore()
}

function CursorTrail() {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const pointsRef = useRef<{ x: number; y: number }[]>([])
	const consumeTimerRef = useRef(0)
	const frameTimerRef = useRef(0)

	useEffect(() => {
		const container = editor.getContainer()
		const canvas = canvasRef.current
		if (!canvas) return

		const handlePointerMove = (e: PointerEvent) => {
			const rect = container.getBoundingClientRect()
			const x = e.clientX - rect.left
			const y = e.clientY - rect.top

			pointsRef.current.push({ x, y })

			// Reset the consume timer whenever we add a new point
			consumeTimerRef.current = 0

			// Hard cap
			if (pointsRef.current.length > MAX_TRAIL_LENGTH) {
				pointsRef.current = pointsRef.current.slice(-MAX_TRAIL_LENGTH)
			}
		}

		const FRAME_MS = 1000 / 30

		function onTick() {
			frameTimerRef.current += 16
			if (frameTimerRef.current < FRAME_MS) return
			frameTimerRef.current = 0

			const ctx = canvas!.getContext('2d')
			if (!ctx) return

			// Resize canvas to match container
			const rect = container.getBoundingClientRect()
			if (canvas!.width !== rect.width || canvas!.height !== rect.height) {
				canvas!.width = rect.width
				canvas!.height = rect.height
			}

			const points = pointsRef.current

			// Self-consume from the tail after a short delay, like scribble
			consumeTimerRef.current += 16
			if (consumeTimerRef.current > CONSUME_DELAY_MS && points.length > 0) {
				points.shift()
			}

			// Draw
			ctx.clearRect(0, 0, canvas!.width, canvas!.height)

			for (let i = 0; i < points.length; i++) {
				drawCursor(ctx, points[i].x, points[i].y, 1)
			}
		}

		container.addEventListener('pointermove', handlePointerMove)
		editor.on('tick', onTick)

		return () => {
			container.removeEventListener('pointermove', handlePointerMove)
			editor.off('tick', onTick)
		}
	}, [editor])

	return (
		<canvas
			ref={canvasRef}
			style={{
				position: 'absolute',
				inset: 0,
				pointerEvents: 'none',
			}}
		/>
	)
}

const components: TLEditorComponents = {
	InFrontOfTheCanvas: CursorTrail,
}

export default function CursorTrailExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="cursor-trail" components={components} />
		</div>
	)
}
