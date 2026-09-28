import {
	atom,
	createShapeId,
	DefaultColorStyle,
	Editor,
	getColorValue,
	getIndices,
	TLDefaultColorStyle,
	TLDefaultSizeStyle,
	TLLineShape,
	toRichText,
	VecModel,
} from 'tldraw'
import { HaltSignal, LogoError, LogoValue } from './interpreter'

export type TurtleSpeed = 'slow' | 'medium' | 'fast' | 'instant'

const MOVES_PER_FRAME: Record<TurtleSpeed, number> = {
	slow: 1,
	medium: 12,
	fast: 200,
	instant: Infinity,
}

// Long strokes are split so a single line shape doesn't carry tens of thousands of points
const MAX_POINTS_PER_SHAPE = 2000

// The text shape's font size at size 's' (1.125 * the theme's 16px), used to scale labels
const LABEL_BASE_FONT_SIZE = 18

export interface Turtle {
	x: number
	y: number
	heading: number
	penDown: boolean
	color: TLDefaultColorStyle
	size: TLDefaultSizeStyle
	visible: boolean
	// The stroke the turtle is drawing right now, in page coordinates. It is shown by the
	// overlay while the program runs and becomes a line shape once the pen lifts or changes.
	path: VecModel[] | null
}

export interface TurtleSnapshot {
	id: number
	page: VecModel
	heading: number
	visible: boolean
	color: TLDefaultColorStyle
	size: TLDefaultSizeStyle
	path: VecModel[] | null
}

function createTurtle(): Turtle {
	return {
		x: 0,
		y: 0,
		heading: 0,
		penDown: true,
		color: 'black',
		size: 's',
		visible: true,
		path: null,
	}
}

// Logo's y axis points up and the page's points down
const toPage = (x: number, y: number): VecModel => ({ x, y: -y })
const radians = (degrees: number) => (degrees * Math.PI) / 180
const normalizeHeading = (degrees: number) => ((degrees % 360) + 360) % 360

export class TurtleWorld {
	readonly snapshot$ = atom<TurtleSnapshot[]>('logo turtles', [])
	speed: TurtleSpeed = 'fast'
	labelHeight = 12
	currentTurtle = 1

	private turtles = new Map<number, Turtle>([[1, createTurtle()]])
	private halted = false
	private movesThisFrame = 0
	private lastYield = 0

	constructor(private editor: Editor) {
		this.flush()
	}

	get turtle() {
		return this.turtles.get(this.currentTurtle)!
	}

	get isHalted() {
		return this.halted
	}

	beginRun() {
		this.halted = false
		this.movesThisFrame = 0
		this.lastYield = performance.now()
		this.editor.markHistoryStoppingPoint('logo run')
	}

	endRun() {
		for (const turtle of this.turtles.values()) this.commitPath(turtle)
		this.flush()
	}

	halt() {
		this.halted = true
	}

	getDrawnShapes() {
		return this.editor.getCurrentPageShapes().filter((shape) => shape.meta.logo)
	}

	async forward(distance: number) {
		const t = this.turtle
		const h = radians(t.heading)
		await this.moveTo(t.x + distance * Math.sin(h), t.y + distance * Math.cos(h))
	}

	async turn(degrees: number) {
		this.turtle.heading = normalizeHeading(this.turtle.heading + degrees)
		await this.step()
	}

	async setHeading(degrees: number) {
		this.turtle.heading = normalizeHeading(degrees)
		await this.step()
	}

	async setPosition(x: number, y: number) {
		await this.moveTo(x, y)
	}

	async home() {
		this.turtle.heading = 0
		await this.moveTo(0, 0)
	}

	async arc(angle: number, radius: number) {
		const t = this.turtle
		if (t.penDown) {
			// The arc is centered on the turtle, so it can't continue the current stroke
			this.commitPath(t)
			const steps = Math.max(2, Math.ceil(Math.abs(angle) / 5))
			const points: VecModel[] = []
			for (let i = 0; i <= steps; i++) {
				const a = radians(t.heading + (angle * i) / steps)
				points.push(toPage(t.x + radius * Math.sin(a), t.y + radius * Math.cos(a)))
			}
			this.createLine(points, t)
		}
		await this.step()
	}

	setPenDown(isDown: boolean) {
		if (!isDown) this.commitPath(this.turtle)
		this.turtle.penDown = isDown
	}

	setColor(value: LogoValue) {
		const color = toTldrawColor(this.editor, value)
		this.commitPath(this.turtle)
		this.turtle.color = color
		this.flush()
	}

	setPenSize(width: number) {
		this.commitPath(this.turtle)
		this.turtle.size = width <= 1.5 ? 's' : width <= 3 ? 'm' : width <= 5 ? 'l' : 'xl'
	}

	setVisible(visible: boolean) {
		this.turtle.visible = visible
		this.flush()
	}

	setLabelHeight(height: number) {
		this.labelHeight = height
	}

	setTurtle(index: number) {
		if (!this.turtles.has(index)) this.turtles.set(index, createTurtle())
		this.currentTurtle = index
		this.flush()
	}

	label(text: string) {
		const t = this.turtle
		// [1]
		const rotation = radians(t.heading - 90)
		const page = toPage(t.x, t.y)
		const offset = this.labelHeight * 1.2
		this.editor.createShape({
			id: createShapeId(),
			type: 'text',
			x: page.x + Math.sin(rotation) * offset,
			y: page.y - Math.cos(rotation) * offset,
			rotation,
			meta: { logo: true },
			props: {
				richText: toRichText(text),
				color: t.color,
				size: 's',
				font: 'draw',
				autoSize: true,
				scale: Math.max(0.05, this.labelHeight / LABEL_BASE_FONT_SIZE),
			},
		})
	}

	clean() {
		this.editor.deleteShapes(this.getDrawnShapes())
		for (const turtle of this.turtles.values()) turtle.path = null
		this.flush()
	}

	clearScreen() {
		this.clean()
		this.turtles = new Map([[1, createTurtle()]])
		this.currentTurtle = 1
		this.labelHeight = 12
		this.flush()
		this.centerCamera()
	}

	// Home is the page origin, so a clear screen puts it back in the middle of the viewport at 100%
	centerCamera() {
		const { w, h } = this.editor.getViewportScreenBounds()
		this.editor.setCamera({ x: w / 2, y: h / 2, z: 1 })
	}

	async wait(ms: number) {
		this.flush()
		const end = performance.now() + ms
		// Sleep in short slices so the stop button doesn't have to wait out a long `wait`
		while (performance.now() < end) {
			await new Promise((resolve) =>
				this.editor.timers.setTimeout(resolve, Math.min(50, end - performance.now()))
			)
			if (this.halted) throw new HaltSignal()
		}
		this.movesThisFrame = 0
		this.lastYield = performance.now()
	}

	async yieldIfNeeded() {
		if (performance.now() - this.lastYield > 16) await this.nextFrame()
	}

	private async moveTo(x: number, y: number) {
		const t = this.turtle
		if (t.penDown) {
			const to = toPage(x, y)
			if (!t.path) t.path = [toPage(t.x, t.y)]
			t.path.push(to)
			if (t.path.length >= MAX_POINTS_PER_SHAPE) {
				this.commitPath(t)
				t.path = [to]
			}
		}
		t.x = x
		t.y = y
		await this.step()
	}

	private async step() {
		this.movesThisFrame++
		if (this.movesThisFrame >= MOVES_PER_FRAME[this.speed]) await this.nextFrame()
		else await this.yieldIfNeeded()
	}

	private async nextFrame() {
		this.flush()
		await new Promise((resolve) => this.editor.timers.requestAnimationFrame(resolve))
		if (this.halted) throw new HaltSignal()
		this.movesThisFrame = 0
		this.lastYield = performance.now()
	}

	private flush() {
		this.snapshot$.set(
			[...this.turtles].map(([id, t]) => ({
				id,
				page: toPage(t.x, t.y),
				heading: t.heading,
				visible: t.visible,
				color: t.color,
				size: t.size,
				path: t.path,
			}))
		)
	}

	private commitPath(turtle: Turtle) {
		if (turtle.path && turtle.path.length > 1) this.createLine(turtle.path, turtle)
		turtle.path = null
	}

	private createLine(points: VecModel[], turtle: Turtle) {
		const [origin] = points
		const indices = getIndices(points.length - 1)
		const linePoints: TLLineShape['props']['points'] = {}
		points.forEach((p, i) => {
			const index = indices[i]
			linePoints[index] = { id: index, index, x: p.x - origin.x, y: p.y - origin.y }
		})
		this.editor.createShape<TLLineShape>({
			id: createShapeId(),
			type: 'line',
			x: origin.x,
			y: origin.y,
			meta: { logo: true },
			props: {
				color: turtle.color,
				size: turtle.size,
				dash: 'solid',
				spline: 'line',
				points: linePoints,
			},
		})
	}
}

const worlds = new WeakMap<Editor, TurtleWorld>()

export function getTurtleWorld(editor: Editor) {
	let world = worlds.get(editor)
	if (!world) {
		world = new TurtleWorld(editor)
		worlds.set(editor, world)
	}
	return world
}

// [2]
const LOGO_PALETTE: TLDefaultColorStyle[] = [
	'black',
	'blue',
	'light-green',
	'light-blue',
	'red',
	'light-violet',
	'yellow',
	'white',
	'orange',
	'yellow',
	'green',
	'light-blue',
	'light-red',
	'violet',
	'orange',
	'grey',
]

const COLOR_ALIASES: Record<string, TLDefaultColorStyle> = {
	gray: 'grey',
	purple: 'violet',
	magenta: 'light-violet',
	pink: 'light-red',
	cyan: 'light-blue',
	aqua: 'light-blue',
	lime: 'light-green',
	brown: 'orange',
	gold: 'yellow',
}

function toTldrawColor(editor: Editor, value: LogoValue): TLDefaultColorStyle {
	if (typeof value === 'number' || /^\d+$/.test(String(value))) {
		return LOGO_PALETTE[Math.abs(Math.floor(Number(value))) % LOGO_PALETTE.length]
	}
	if (Array.isArray(value)) {
		const rgb = value.map(Number)
		if (rgb.length !== 3 || rgb.some(isNaN)) throw badColor(value)
		// Logo writes RGB as percentages, but accept 0-255 too
		const scale = rgb.some((c) => c > 100) ? 1 : 2.55
		return nearestColor(editor, rgb.map((c) => c * scale) as [number, number, number])
	}

	const name = value.toLowerCase()
	if ((DefaultColorStyle.values as readonly string[]).includes(name)) {
		return name as TLDefaultColorStyle
	}
	if (COLOR_ALIASES[name]) return COLOR_ALIASES[name]
	const rgb = cssColorToRgb(name)
	if (!rgb) throw badColor(value)
	return nearestColor(editor, rgb)
}

function badColor(value: LogoValue) {
	return new LogoError(`setcolor doesn't like ${JSON.stringify(value)} as input`)
}

let colorContext: CanvasRenderingContext2D | null = null

function cssColorToRgb(color: string): [number, number, number] | null {
	colorContext ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
	if (!colorContext) return null
	const sentinel = '#010203'
	colorContext.fillStyle = sentinel
	colorContext.fillStyle = color
	if (colorContext.fillStyle === sentinel && color !== sentinel) return null
	colorContext.clearRect(0, 0, 1, 1)
	colorContext.fillRect(0, 0, 1, 1)
	const [r, g, b] = colorContext.getImageData(0, 0, 1, 1).data
	return [r, g, b]
}

function nearestColor(editor: Editor, rgb: [number, number, number]): TLDefaultColorStyle {
	const colors = editor.getCurrentTheme().colors.light
	let best: TLDefaultColorStyle = 'black'
	let bestDistance = Infinity
	for (const name of DefaultColorStyle.values) {
		const candidate = cssColorToRgb(getColorValue(colors, name, 'solid'))
		if (!candidate) continue
		const distance = candidate.reduce((sum, c, i) => sum + (c - rgb[i]) ** 2, 0)
		if (distance < bestDistance) {
			bestDistance = distance
			best = name
		}
	}
	return best
}

/*
[1]
Logo draws labels along the turtle's heading, starting at the turtle. A text shape rotates
around its top-left corner, so shift that corner "above" the turtle by roughly one line.

[2]
tldraw shapes use a fixed palette rather than arbitrary colors, so Logo's 16 numbered colors,
color names, and RGB lists all map to the closest tldraw color.
*/
