import {
	Circle2d,
	Editor,
	Geometry2d,
	OverlayUtil,
	Rectangle2d,
	react,
	TLCursorType,
	TLOverlay,
} from 'tldraw'
import {
	activeInteraction$,
	ASPECT,
	clearEtch,
	deviceSize$,
	devicePos$,
	leftAngle$,
	MAX_DEVICE_W,
	MIN_DEVICE_W,
	path$,
	rightAngle$,
	stylus$,
} from './etch-state'

// Device-local pixel layout derived from current size. The render method
// translates to the device's page-space origin and applies a 1/zoom scale so
// these values resolve to fixed screen pixels regardless of editor zoom.
function layoutFor(W: number, H: number) {
	const padX = W * 0.06
	const screenY = H * 0.1
	const screenW = W - padX * 2
	const screenH = H * 0.55
	const knobR = Math.min(W, H) * 0.075
	const knobCY = H * 0.82
	const knobOffsetX = W * 0.2
	const handleSize = 22
	return {
		screenX: padX,
		screenY,
		screenW,
		screenH,
		knobR,
		knobCY,
		knobLeftCX: knobOffsetX,
		knobRightCX: W - knobOffsetX,
		handleSize,
		handleX: W - handleSize - 8,
		handleY: H - handleSize - 8,
	}
}

const SHAKE_REVERSAL_THRESHOLD = 3
const SHAKE_WINDOW_MS = 450
const SHAKE_MIN_DELTA_PAGE = 4
const STYLUS_NORM_PER_RADIAN = 0.085
// Stylus travel per second of held keyboard input, in normalized screen units.
// At 0.5 the stylus crosses the screen in two seconds.
const KEYBOARD_SPEED_NORM_PER_SEC = 0.5

const HORIZ_KEYS_LEFT = ['KeyA', 'ArrowLeft']
const HORIZ_KEYS_RIGHT = ['KeyD', 'ArrowRight']
const VERT_KEYS_UP = ['KeyW', 'ArrowUp']
const VERT_KEYS_DOWN = ['KeyS', 'ArrowDown']

type EtchKind = 'frame' | 'knob' | 'resize' | 'body'

interface TLEtchOverlay extends TLOverlay {
	props: {
		kind: EtchKind
		knob?: 'left' | 'right'
		cx: number
		cy: number
		w: number
		h: number
		r: number
	}
}

function wrapAngle(a: number) {
	let x = a
	while (x > Math.PI) x -= 2 * Math.PI
	while (x < -Math.PI) x += 2 * Math.PI
	return x
}

export class EtchASketchOverlayUtil extends OverlayUtil<TLEtchOverlay> {
	static override type = 'etch-a-sketch'
	override options = { zIndex: 800 }

	// Knob drag state.
	private _prevGrip: number | null = null

	// Body drag state.
	private _bodyPointerOrigin: { x: number; y: number } | null = null
	private _bodyDeviceOrigin: { x: number; y: number } | null = null
	private _shakeLastDirSign = 0
	private _shakeReversals: number[] = []
	private _shakeLastX: number | null = null

	constructor(editor: Editor) {
		super(editor)

		// Continuous keyboard motion: WASD and arrows combine additively so the
		// player can press W+D for a diagonal. The tick event already fires at
		// frame cadence and ships an elapsedMs delta, which is what we want for
		// frame-rate-independent travel.
		editor.on('tick', this._onTick)

		react('etch interaction', () => {
			const mode = activeInteraction$.get()
			if (!mode) return

			if (!editor.inputs.getIsPointing()) {
				this._endInteraction()
				return
			}

			const p = editor.inputs.getCurrentPagePoint()
			if (mode === 'knob-left' || mode === 'knob-right') {
				this._tickKnob(mode === 'knob-left' ? 'left' : 'right', p)
			} else if (mode === 'body') {
				this._tickBody(p)
			} else if (mode === 'resize') {
				this._tickResize(p)
			}
		})
	}

	private _endInteraction() {
		activeInteraction$.set(null)
		this._prevGrip = null
		this._bodyPointerOrigin = null
		this._bodyDeviceOrigin = null
		this._shakeLastDirSign = 0
		this._shakeReversals = []
		this._shakeLastX = null
	}

	private _onTick = (elapsedMs: number) => {
		const keys = this.editor.inputs.keys
		let dx = 0
		let dy = 0
		if (HORIZ_KEYS_LEFT.some((k) => keys.has(k))) dx -= 1
		if (HORIZ_KEYS_RIGHT.some((k) => keys.has(k))) dx += 1
		if (VERT_KEYS_UP.some((k) => keys.has(k))) dy -= 1
		if (VERT_KEYS_DOWN.some((k) => keys.has(k))) dy += 1
		if (dx === 0 && dy === 0) return

		// Clamp huge deltas on tab-resume so the stylus doesn't teleport.
		const dt = Math.min(60, elapsedMs)
		// Normalize the input vector so diagonals travel at the same speed as
		// cardinal motion.
		const len = Math.hypot(dx, dy)
		const step = (KEYBOARD_SPEED_NORM_PER_SEC * dt) / 1000
		const dnx = (dx / len) * step
		const dny = (dy / len) * step

		const s = stylus$.get()
		const nx = Math.max(0, Math.min(1, s.x + dnx))
		const ny = Math.max(0, Math.min(1, s.y + dny))
		if (nx === s.x && ny === s.y) return

		const ns = { x: nx, y: ny }
		stylus$.set(ns)
		path$.update((p) => [...p, ns])
		// Spin the knobs to match: each knob owns one axis, and the angular
		// delta is the stylus delta divided by the same ratio used for knob
		// drags so the visual feedback is symmetric across input modes.
		if (nx !== s.x) leftAngle$.update((a) => a + (nx - s.x) / STYLUS_NORM_PER_RADIAN)
		if (ny !== s.y) rightAngle$.update((a) => a + (ny - s.y) / STYLUS_NORM_PER_RADIAN)
	}

	private _tickKnob(knob: 'left' | 'right', p: { x: number; y: number }) {
		const L = this._deviceLayout()
		const center = knob === 'left' ? L.leftKnobCenter : L.rightKnobCenter
		const grip = Math.atan2(p.y - center.y, p.x - center.x)
		if (this._prevGrip === null) {
			this._prevGrip = grip
			return
		}
		const dGrip = wrapAngle(grip - this._prevGrip)
		this._prevGrip = grip
		if (dGrip === 0) return

		if (knob === 'left') leftAngle$.update((a) => a + dGrip)
		else rightAngle$.update((a) => a + dGrip)

		const dNorm = dGrip * STYLUS_NORM_PER_RADIAN
		const s = stylus$.get()
		const nx = knob === 'left' ? Math.max(0, Math.min(1, s.x + dNorm)) : s.x
		const ny = knob === 'right' ? Math.max(0, Math.min(1, s.y + dNorm)) : s.y
		if (nx === s.x && ny === s.y) return
		const ns = { x: nx, y: ny }
		stylus$.set(ns)
		path$.update((points) => [...points, ns])
	}

	private _tickBody(p: { x: number; y: number }) {
		if (!this._bodyPointerOrigin || !this._bodyDeviceOrigin) return

		devicePos$.set({
			x: this._bodyDeviceOrigin.x + (p.x - this._bodyPointerOrigin.x),
			y: this._bodyDeviceOrigin.y + (p.y - this._bodyPointerOrigin.y),
		})

		// Shake detection: every X-direction sign flip whose magnitude exceeds a
		// jitter floor counts as a reversal. Hitting the threshold within the
		// sliding window erases the drawing — the same way a kid clears a real
		// etch-a-sketch by shaking it side-to-side.
		if (this._shakeLastX !== null) {
			const dx = p.x - this._shakeLastX
			if (Math.abs(dx) >= SHAKE_MIN_DELTA_PAGE) {
				const sign = Math.sign(dx)
				if (this._shakeLastDirSign !== 0 && sign !== this._shakeLastDirSign) {
					const now = performance.now()
					this._shakeReversals.push(now)
					this._shakeReversals = this._shakeReversals.filter(
						(t) => now - t < SHAKE_WINDOW_MS
					)
					if (this._shakeReversals.length >= SHAKE_REVERSAL_THRESHOLD) {
						clearEtch()
						this._shakeReversals = []
					}
				}
				this._shakeLastDirSign = sign
				this._shakeLastX = p.x
			}
		} else {
			this._shakeLastX = p.x
		}
	}

	private _tickResize(p: { x: number; y: number }) {
		const pos = devicePos$.get()
		if (!pos) return
		const zoom = this.editor.getZoomLevel()
		// Page-space corner-to-pointer offset, converted into screen pixels.
		const wScreenFromX = Math.max(0, p.x - pos.x) * zoom
		const wScreenFromY = Math.max(0, p.y - pos.y) * zoom * ASPECT
		const w = Math.max(MIN_DEVICE_W, Math.min(MAX_DEVICE_W, Math.max(wScreenFromX, wScreenFromY)))
		deviceSize$.set({ w, h: w / ASPECT })
	}

	private _deviceLayout() {
		const size = deviceSize$.get()
		const pos = devicePos$.get()
		const zoom = this.editor.getZoomLevel()
		const w = size.w / zoom
		const h = size.h / zoom
		let dx: number
		let dy: number
		if (pos) {
			dx = pos.x
			dy = pos.y
		} else {
			const vp = this.editor.getViewportPageBounds()
			dx = vp.midX - w / 2
			dy = vp.minY + 40 / zoom
		}
		const local = layoutFor(size.w, size.h)
		return {
			dx,
			dy,
			w,
			h,
			zoom,
			local,
			leftKnobCenter: {
				x: dx + local.knobLeftCX / zoom,
				y: dy + local.knobCY / zoom,
			},
			rightKnobCenter: {
				x: dx + local.knobRightCX / zoom,
				y: dy + local.knobCY / zoom,
			},
			handleCx: dx + (local.handleX + local.handleSize / 2) / zoom,
			handleCy: dy + (local.handleY + local.handleSize / 2) / zoom,
			handleSizePage: local.handleSize / zoom,
			knobRPage: local.knobR / zoom,
		}
	}

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLEtchOverlay[] {
		const L = this._deviceLayout()
		// Hit-test order within a util is array order; smaller hit regions go
		// first so the body's full-device rect doesn't swallow knob/handle clicks.
		const left: TLEtchOverlay = {
			id: 'etch:knob-left',
			type: 'etch-a-sketch',
			props: {
				kind: 'knob',
				knob: 'left',
				cx: L.leftKnobCenter.x,
				cy: L.leftKnobCenter.y,
				w: 0,
				h: 0,
				r: L.knobRPage,
			},
		}
		const right: TLEtchOverlay = {
			id: 'etch:knob-right',
			type: 'etch-a-sketch',
			props: {
				kind: 'knob',
				knob: 'right',
				cx: L.rightKnobCenter.x,
				cy: L.rightKnobCenter.y,
				w: 0,
				h: 0,
				r: L.knobRPage,
			},
		}
		const handle: TLEtchOverlay = {
			id: 'etch:resize',
			type: 'etch-a-sketch',
			props: {
				kind: 'resize',
				cx: L.handleCx,
				cy: L.handleCy,
				w: L.handleSizePage,
				h: L.handleSizePage,
				r: 0,
			},
		}
		const body: TLEtchOverlay = {
			id: 'etch:body',
			type: 'etch-a-sketch',
			props: {
				kind: 'body',
				cx: L.dx + L.w / 2,
				cy: L.dy + L.h / 2,
				w: L.w,
				h: L.h,
				r: 0,
			},
		}
		// Frame overlay carries no geometry — it exists only so render() has an
		// instance to hang the full-device draw off of.
		const frame: TLEtchOverlay = {
			id: 'etch:frame',
			type: 'etch-a-sketch',
			props: {
				kind: 'frame',
				cx: L.dx + L.w / 2,
				cy: L.dy + L.h / 2,
				w: L.w,
				h: L.h,
				r: 0,
			},
		}
		return [left, right, handle, body, frame]
	}

	override getGeometry(o: TLEtchOverlay): Geometry2d | null {
		if (o.props.kind === 'knob') {
			const { cx, cy, r } = o.props
			return new Circle2d({ x: cx - r, y: cy - r, radius: r, isFilled: true })
		}
		if (o.props.kind === 'resize' || o.props.kind === 'body') {
			const { cx, cy, w, h } = o.props
			return new Rectangle2d({
				x: cx - w / 2,
				y: cy - h / 2,
				width: w,
				height: h,
				isFilled: true,
			})
		}
		return null
	}

	override getCursor(o: TLEtchOverlay): TLCursorType | undefined {
		if (o.props.kind === 'knob') return 'grab'
		if (o.props.kind === 'resize') return 'nwse-resize'
		if (o.props.kind === 'body') return 'move'
		return undefined
	}

	override onPointerDown(o: TLEtchOverlay): boolean {
		const p = this.editor.inputs.getCurrentPagePoint()
		const L = this._deviceLayout()
		// Pin the device to its currently-rendered page position the moment the
		// user first interacts. Without this, body drags would compute deltas
		// against a viewport-anchored fallback that can shift mid-drag.
		if (!devicePos$.get()) devicePos$.set({ x: L.dx, y: L.dy })

		if (o.props.kind === 'knob' && o.props.knob) {
			activeInteraction$.set(o.props.knob === 'left' ? 'knob-left' : 'knob-right')
			this._prevGrip = null
			return true
		}
		if (o.props.kind === 'resize') {
			activeInteraction$.set('resize')
			return true
		}
		if (o.props.kind === 'body') {
			activeInteraction$.set('body')
			this._bodyPointerOrigin = { x: p.x, y: p.y }
			this._bodyDeviceOrigin = { x: L.dx, y: L.dy }
			this._shakeLastDirSign = 0
			this._shakeReversals = []
			this._shakeLastX = p.x
			return true
		}
		return false
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLEtchOverlay[]): void {
		if (!overlays.some((o) => o.props.kind === 'frame')) return
		const L = this._deviceLayout()
		const size = deviceSize$.get()
		const local = L.local

		ctx.save()
		ctx.translate(L.dx, L.dy)
		ctx.scale(1 / L.zoom, 1 / L.zoom)

		const W = size.w
		const H = size.h
		const radius = Math.min(W, H) * 0.07

		// Frame.
		ctx.fillStyle = '#C0392B'
		this._roundRect(ctx, 0, 0, W, H, radius)
		ctx.fill()
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
		ctx.lineWidth = 2
		this._roundRect(ctx, 6, 6, W - 12, H - 12, Math.max(0, radius - 4))
		ctx.stroke()

		// Title.
		const titleSize = Math.max(12, Math.min(24, H * 0.045))
		ctx.fillStyle = '#fff'
		ctx.font = `700 ${titleSize}px sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText('Shake-a-Sketch', W / 2, local.screenY * 0.55)

		// Screen.
		ctx.fillStyle = '#9aa0a6'
		ctx.fillRect(local.screenX, local.screenY, local.screenW, local.screenH)
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
		ctx.lineWidth = 2
		ctx.strokeRect(local.screenX, local.screenY, local.screenW, local.screenH)

		// Stylus trail, clipped to the screen.
		ctx.save()
		ctx.beginPath()
		ctx.rect(local.screenX, local.screenY, local.screenW, local.screenH)
		ctx.clip()
		const points = path$.get()
		if (points.length > 1) {
			ctx.strokeStyle = '#1a1a1a'
			ctx.lineWidth = 2.5
			ctx.lineCap = 'round'
			ctx.lineJoin = 'round'
			ctx.beginPath()
			ctx.moveTo(
				local.screenX + points[0].x * local.screenW,
				local.screenY + points[0].y * local.screenH
			)
			for (let i = 1; i < points.length; i++) {
				ctx.lineTo(
					local.screenX + points[i].x * local.screenW,
					local.screenY + points[i].y * local.screenH
				)
			}
			ctx.stroke()
		}
		const s = stylus$.get()
		ctx.fillStyle = '#1a1a1a'
		ctx.beginPath()
		ctx.arc(
			local.screenX + s.x * local.screenW,
			local.screenY + s.y * local.screenH,
			3.5,
			0,
			Math.PI * 2
		)
		ctx.fill()
		ctx.restore()

		// Knobs.
		this._renderKnob(ctx, local.knobLeftCX, local.knobCY, local.knobR, leftAngle$.get())
		this._renderKnob(ctx, local.knobRightCX, local.knobCY, local.knobR, rightAngle$.get())

		const labelSize = Math.max(9, Math.min(13, H * 0.024))
		ctx.fillStyle = '#fff'
		ctx.font = `600 ${labelSize}px sans-serif`
		ctx.fillText('left ↔', local.knobLeftCX, local.knobCY + local.knobR + labelSize)
		ctx.fillText('right ↕', local.knobRightCX, local.knobCY + local.knobR + labelSize)

		const hintSize = Math.max(9, Math.min(12, H * 0.022))
		ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
		ctx.font = `500 ${hintSize}px sans-serif`
		ctx.fillText('wasd or arrows to draw • drag to move • shake to erase', W / 2, H - 18)

		// Resize handle — diagonal grip lines in the bottom-right corner.
		ctx.save()
		ctx.translate(local.handleX, local.handleY)
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
		ctx.lineWidth = 1.5
		ctx.lineCap = 'round'
		for (let i = 0; i < 3; i++) {
			const o = (i + 1) * 5
			ctx.beginPath()
			ctx.moveTo(local.handleSize, local.handleSize - o)
			ctx.lineTo(local.handleSize - o, local.handleSize)
			ctx.stroke()
		}
		ctx.restore()

		ctx.restore()
	}

	private _renderKnob(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		r: number,
		angle: number
	) {
		ctx.beginPath()
		ctx.arc(cx, cy, r, 0, Math.PI * 2)
		const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.15, cx, cy, r)
		grad.addColorStop(0, '#ffffff')
		grad.addColorStop(1, '#cfd2d6')
		ctx.fillStyle = grad
		ctx.fill()
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
		ctx.lineWidth = 1.5
		ctx.stroke()

		// Knurl marks rotate with the knob so visual feedback matches input.
		ctx.save()
		ctx.translate(cx, cy)
		ctx.rotate(angle)
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
		ctx.lineWidth = 1
		const knurls = 24
		for (let i = 0; i < knurls; i++) {
			const t = (i / knurls) * Math.PI * 2
			ctx.beginPath()
			ctx.moveTo(Math.cos(t) * (r - 4), Math.sin(t) * (r - 4))
			ctx.lineTo(Math.cos(t) * (r - 1), Math.sin(t) * (r - 1))
			ctx.stroke()
		}

		// Indicator notch.
		ctx.strokeStyle = '#2a2a2a'
		ctx.lineWidth = 3
		ctx.lineCap = 'round'
		ctx.beginPath()
		ctx.moveTo(r * 0.2, 0)
		ctx.lineTo(r - 8, 0)
		ctx.stroke()
		ctx.restore()
	}

	private _roundRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		r: number
	) {
		ctx.beginPath()
		ctx.moveTo(x + r, y)
		ctx.lineTo(x + w - r, y)
		ctx.quadraticCurveTo(x + w, y, x + w, y + r)
		ctx.lineTo(x + w, y + h - r)
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
		ctx.lineTo(x + r, y + h)
		ctx.quadraticCurveTo(x, y + h, x, y + h - r)
		ctx.lineTo(x, y + r)
		ctx.quadraticCurveTo(x, y, x + r, y)
		ctx.closePath()
	}
}
