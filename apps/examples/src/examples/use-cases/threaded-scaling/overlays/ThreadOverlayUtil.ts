import { DEFAULT_THEME, OverlayUtil, TLOverlay } from 'tldraw'
import { frame$, getWorld, isMatched, Node } from '../game-state'

interface TLThreadOverlay extends TLOverlay {
	props: { frame: number }
}

// Draws the whole puzzle on one canvas layer: threads as stitched lines between
// shared-pool nodes, each node as a filled circle with a dashed target ghost,
// and a soft glow once a node sits on its target. A single overlay whose `frame`
// prop is bumped each tick, so the reactive render re-runs every frame.
export class ThreadOverlayUtil extends OverlayUtil<TLThreadOverlay> {
	static override type = 'ts-thread'
	override options = { zIndex: 200 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLThreadOverlay[] {
		return [{ id: 'ts-thread:board', type: 'ts-thread', props: { frame: frame$.get() } }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const zoom = this.editor.getZoomLevel()
		const px = (n: number) => n / zoom // keep stroke/size constant on screen
		const theme =
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		const world = getWorld()
		const byId = new Map(world.nodes.map((n) => [n.id, n]))

		const accent = theme.blue.solid
		const solved = theme.green.solid

		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'

		// Threads — a stitched (dashed) line, the path size travels along. A thread
		// lights up in the accent colour while either of its nodes is actively
		// resizing, so you can watch the wave move through the graph.
		ctx.lineCap = 'round'
		ctx.setLineDash([px(7), px(7)])
		ctx.lineDashOffset = px(-world.t * 0.6)
		for (const thread of world.threads) {
			const a = byId.get(thread.a)
			const b = byId.get(thread.b)
			if (!a || !b) continue
			// How much size is in transit on either end right now.
			const flow = Math.min(1, (Math.abs(a.r - a.goal) + Math.abs(b.r - b.goal)) / 24)
			ctx.strokeStyle = flow > 0.02 ? accent : theme.text
			ctx.globalAlpha = 0.28 + 0.6 * flow
			ctx.lineWidth = px(2 + 4 * flow)
			ctx.beginPath()
			ctx.moveTo(a.x, a.y)
			ctx.lineTo(b.x, b.y)
			ctx.stroke()
		}
		ctx.setLineDash([])
		ctx.globalAlpha = 1

		// Target ghosts — a dashed ring at each node's goal radius, so you always
		// see where every node needs to land.
		ctx.setLineDash([px(4), px(5)])
		ctx.lineWidth = px(1.5)
		for (const n of world.nodes) {
			const done = isMatched(n)
			ctx.globalAlpha = done ? 0.25 : 0.55
			ctx.strokeStyle = done ? solved : theme.text
			ctx.beginPath()
			ctx.arc(n.x, n.y, n.target, 0, Math.PI * 2)
			ctx.stroke()
		}
		ctx.setLineDash([])
		ctx.globalAlpha = 1

		// Nodes — filled circles. Matched nodes pick up the solved color and a
		// soft halo; the grabbed node gets a brighter ring.
		for (const n of world.nodes) {
			const done = isMatched(n)
			const color = done ? solved : accent
			const grabbed = world.grabbedId === n.id

			if (done) {
				ctx.globalAlpha = 0.18
				ctx.fillStyle = solved
				ctx.beginPath()
				ctx.arc(n.x, n.y, n.r + px(10), 0, Math.PI * 2)
				ctx.fill()
			}

			ctx.globalAlpha = 0.85
			ctx.fillStyle = color
			ctx.beginPath()
			ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
			ctx.fill()

			ctx.globalAlpha = 1
			ctx.lineWidth = px(grabbed ? 3.5 : 2)
			ctx.strokeStyle = theme.background
			ctx.stroke()

			drawGrip(ctx, n, px, theme.background)
		}
		ctx.globalAlpha = 1
	}
}

// A few short notches around the rim to hint the circle is draggable to resize.
function drawGrip(
	ctx: CanvasRenderingContext2D,
	n: Node,
	px: (v: number) => number,
	color: string
): void {
	ctx.globalAlpha = 0.5
	ctx.strokeStyle = color
	ctx.lineWidth = px(2)
	const len = px(6)
	for (let i = 0; i < 4; i++) {
		const ang = (i / 4) * Math.PI * 2 + Math.PI / 4
		const ix = n.x + Math.cos(ang) * (n.r - len)
		const iy = n.y + Math.sin(ang) * (n.r - len)
		const ox = n.x + Math.cos(ang) * (n.r - px(1))
		const oy = n.y + Math.sin(ang) * (n.r - px(1))
		ctx.beginPath()
		ctx.moveTo(ix, iy)
		ctx.lineTo(ox, oy)
		ctx.stroke()
	}
	ctx.globalAlpha = 1
}
