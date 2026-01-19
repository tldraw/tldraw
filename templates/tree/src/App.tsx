import { useEffect } from 'react'
import { Atom, Editor, TLShapeId, Tldraw, atom, b64Vecs, createShapeId, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

/* --------------------- Audio --------------------- */

const SCALE_PATTERN = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19]
const MODULATIONS = [5, 1, -2, 7, -5]
const CHORDS = [
	[0, 4, 7, 11, 14],
	[5, 9, 12, 16, 19],
	[7, 11, 14, 17, 21],
	[2, 5, 9, 12, 16],
]
const ARPEGGIO_PATTERNS = [
	[0, 1, 2, 3, 4, 3, 2, 1],
	[0, 2, 1, 3, 2, 4, 3, 2],
	[4, 3, 2, 1, 0, 1, 2, 3],
	[0, 2, 4, 2, 0, 1, 3, 1],
]

let audioContext: AudioContext | null = null
const keyOffset$ = atom('keyOffset', 10)

function getAudioContext(): AudioContext {
	if (!audioContext) {
		audioContext = new AudioContext()
	}
	return audioContext
}

function scaleToFreq(scaleDegree: number): number {
	const semitone = SCALE_PATTERN[scaleDegree % SCALE_PATTERN.length] + keyOffset$.get()
	return 220 * Math.pow(2, semitone / 12)
}

function getBassFreq(): number {
	return 220 * Math.pow(2, (keyOffset$.get() - 24) / 12)
}

function modulateKey() {
	const mod = MODULATIONS[Math.floor(Math.random() * MODULATIONS.length)]
	let offset = keyOffset$.get() + mod
	if (offset > 22) offset -= 12
	if (offset < 4) offset += 12
	keyOffset$.set(offset)
}

function playMarimbaNote(frequency: number, velocity = 0.07, time?: number) {
	const ctx = getAudioContext()
	const now = Math.max(time ?? ctx.currentTime, ctx.currentTime)

	const fundamental = ctx.createOscillator()
	const harmonic = ctx.createOscillator()
	const body = ctx.createOscillator()

	fundamental.type = 'sine'
	fundamental.frequency.value = frequency

	harmonic.type = 'triangle'
	harmonic.frequency.value = frequency * 1.02

	body.type = 'sine'
	body.frequency.value = frequency * 0.5

	const envelope = ctx.createGain()
	envelope.gain.setValueAtTime(0, now)
	envelope.gain.linearRampToValueAtTime(velocity, now + 0.015)
	envelope.gain.exponentialRampToValueAtTime(velocity * 0.5, now + 0.25)
	envelope.gain.exponentialRampToValueAtTime(velocity * 0.15, now + 0.8)
	envelope.gain.exponentialRampToValueAtTime(0.001, now + 1.4)

	const bodyEnvelope = ctx.createGain()
	bodyEnvelope.gain.setValueAtTime(0, now)
	bodyEnvelope.gain.linearRampToValueAtTime(velocity * 0.4, now + 0.01)
	bodyEnvelope.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

	const harmonicGain = ctx.createGain()
	harmonicGain.gain.value = 0.12

	fundamental.connect(envelope)
	harmonic.connect(harmonicGain).connect(envelope)
	body.connect(bodyEnvelope).connect(ctx.destination)
	envelope.connect(ctx.destination)

	fundamental.start(now)
	harmonic.start(now)
	body.start(now)
	fundamental.stop(now + 1.6)
	harmonic.stop(now + 1.6)
	body.stop(now + 0.5)
}

function playBassNote(velocity = 0.06) {
	const ctx = getAudioContext()
	const now = ctx.currentTime

	const osc = ctx.createOscillator()
	osc.type = 'sine'
	osc.frequency.value = getBassFreq()

	const envelope = ctx.createGain()
	envelope.gain.setValueAtTime(0, now)
	envelope.gain.linearRampToValueAtTime(velocity, now + 0.03)
	envelope.gain.exponentialRampToValueAtTime(velocity * 0.5, now + 0.4)
	envelope.gain.exponentialRampToValueAtTime(0.001, now + 1.5)

	osc.connect(envelope)
	envelope.connect(ctx.destination)

	osc.start(now)
	osc.stop(now + 1.8)
}

class ArpeggioPlayer {
	#chordIndex: number
	#patternIndex: number
	#noteInPattern = 0
	#notesOnChord = 0
	#totalNotes = 0
	#pattern: number[]
	#chordOrder: number[]

	constructor() {
		this.#chordIndex = Math.floor(Math.random() * CHORDS.length)
		this.#patternIndex = Math.floor(Math.random() * ARPEGGIO_PATTERNS.length)
		this.#pattern = ARPEGGIO_PATTERNS[this.#patternIndex]
		this.#chordOrder = shuffleArray([0, 1, 2, 3])
	}

	next(): number {
		const chord = CHORDS[this.#chordOrder[this.#chordIndex]]
		const chordToneIndex = this.#pattern[this.#noteInPattern]
		const scaleDegree = chord[chordToneIndex]

		this.#noteInPattern = (this.#noteInPattern + 1) % this.#pattern.length
		this.#notesOnChord++
		this.#totalNotes++

		if (this.#totalNotes > 0 && this.#totalNotes % 24 === 0) {
			modulateKey()
		}

		if (this.#notesOnChord >= 16) {
			this.#notesOnChord = 0
			this.#chordIndex = (this.#chordIndex + 1) % CHORDS.length

			if (Math.random() < 0.5) {
				this.#patternIndex = Math.floor(Math.random() * ARPEGGIO_PATTERNS.length)
				this.#pattern = ARPEGGIO_PATTERNS[this.#patternIndex]
			}
		}

		return scaleDegree
	}
}

function shuffleArray<T>(array: T[]): T[] {
	const result = [...array]
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[result[i], result[j]] = [result[j], result[i]]
	}
	return result
}

/* --------------------- Tree --------------------- */

const BRANCH_LENGTH = 220
const BRANCH_SHRINK = 0.78
const MAX_DEPTH = 9
const NOTE_INTERVAL = 40

interface Branch {
	x1: number
	y1: number
	x2: number
	y2: number
	angle: number
	depth: number
}

function generateTree(startX: number, startY: number): Branch[] {
	const branches: Branch[] = []

	function grow(x: number, y: number, angle: number, length: number, depth: number) {
		if (depth > MAX_DEPTH || length < 3) return

		const wobbleX = (Math.random() - 0.5) * 4
		const wobbleY = (Math.random() - 0.5) * 4
		const x2 = x + Math.cos(angle) * length + wobbleX
		const y2 = y + Math.sin(angle) * length + wobbleY

		branches.push({ x1: x, y1: y, x2, y2, angle, depth })

		const angleVariance1 = (Math.random() - 0.5) * 1.2
		const angleVariance2 = (Math.random() - 0.5) * 1.2
		const lengthVariance1 = 0.5 + Math.random() * 0.7
		const lengthVariance2 = 0.5 + Math.random() * 0.7
		const baseAngle1 = Math.PI / 6 + (Math.random() * Math.PI) / 12
		const baseAngle2 = Math.PI / 6 + (Math.random() * Math.PI) / 12

		if (Math.random() > 0.15) {
			grow(
				x2,
				y2,
				angle - baseAngle1 + angleVariance1,
				length * BRANCH_SHRINK * lengthVariance1,
				depth + 1
			)
		}
		if (Math.random() > 0.15) {
			grow(
				x2,
				y2,
				angle + baseAngle2 + angleVariance2,
				length * BRANCH_SHRINK * lengthVariance2,
				depth + 1
			)
		}
		if (Math.random() > 0.85) {
			const angleVariance3 = (Math.random() - 0.5) * 0.8
			grow(x2, y2, angle + angleVariance3, length * BRANCH_SHRINK * 0.8, depth + 1)
		}
	}

	grow(startX, startY, -Math.PI / 2, BRANCH_LENGTH, 0)
	return branches
}

function branchToFreehandPoints(branch: Branch): { x: number; y: number; z: number }[] {
	const points: { x: number; y: number; z: number }[] = []
	const segments = 12

	for (let i = 0; i <= segments; i++) {
		const t = i / segments
		const wobbleAmount = (3 - branch.depth * 0.3) * (1 + Math.random() * 0.5)
		const wobble = Math.sin(t * Math.PI * (2 + Math.random())) * wobbleAmount
		const perpX = -Math.sin(branch.angle) * wobble
		const perpY = Math.cos(branch.angle) * wobble

		points.push({
			x: branch.x1 + (branch.x2 - branch.x1) * t + perpX + (Math.random() - 0.5) * 2,
			y: branch.y1 + (branch.y2 - branch.y1) * t + perpY + (Math.random() - 0.5) * 2,
			z: 0.5,
		})
	}

	return points
}

function getColorForDepth(depth: number) {
	if (depth < 3) return 'grey' as const
	if (depth < 5) return 'green' as const
	return 'light-green' as const
}

async function drawTree(
	editor: Editor,
	isGrowing$: Atom<boolean>,
	centerX: number,
	centerY: number
) {
	const branches = generateTree(centerX, centerY)
	branches.sort((a, b) => a.depth - b.depth)

	getAudioContext()
	keyOffset$.set(10)
	const arpeggio = new ArpeggioPlayer()

	for (let i = 0; i < branches.length; i++) {
		const branch = branches[i]
		const points = branchToFreehandPoints(branch)
		const minX = Math.min(...points.map((p) => p.x))
		const minY = Math.min(...points.map((p) => p.y))
		const normalizedPoints = points.map((p) => ({
			x: p.x - minX,
			y: p.y - minY,
			z: p.z,
		}))

		editor.createShape({
			id: createShapeId(),
			type: 'draw',
			x: minX,
			y: minY,
			props: {
				segments: [{ type: 'free', points: b64Vecs.encodePoints(normalizedPoints) }],
				color: getColorForDepth(branch.depth),
				size: 'm',
				isClosed: false,
				isComplete: true,
			},
		})

		if (i % 3 === 0) {
			const scaleDegree = arpeggio.next()
			playMarimbaNote(scaleToFreq(scaleDegree))
		}

		if (i > 0 && i % 24 === 0) {
			playBassNote()
		}

		await new Promise((r) => setTimeout(r, NOTE_INTERVAL + Math.random() * 10))
	}

	isGrowing$.set(false)
}

/* --------------------- Button --------------------- */

const OUTER_RADIUS = 40
const INNER_RADIUS = 25

interface ButtonState {
	outerId: TLShapeId
	innerId: TLShapeId
	centerX: number
	centerY: number
}

function createButtonCircles(editor: Editor): ButtonState {
	const viewportBounds = editor.getViewportScreenBounds()
	const center = editor.screenToPage({
		x: viewportBounds.x + viewportBounds.w / 2,
		y: viewportBounds.y + viewportBounds.h - 130,
	})

	const outerId = createShapeId()
	const innerId = createShapeId()

	editor.createShape({
		id: outerId,
		type: 'geo',
		x: center.x - OUTER_RADIUS,
		y: center.y - OUTER_RADIUS,
		isLocked: true,
		props: {
			geo: 'ellipse',
			w: OUTER_RADIUS * 2,
			h: OUTER_RADIUS * 2,
			color: 'grey',
			fill: 'none',
			size: 'm',
		},
	})

	editor.createShape({
		id: innerId,
		type: 'geo',
		x: center.x - INNER_RADIUS,
		y: center.y - INNER_RADIUS,
		props: {
			geo: 'ellipse',
			w: INNER_RADIUS * 2,
			h: INNER_RADIUS * 2,
			color: 'grey',
			fill: 'solid',
			size: 'm',
		},
	})

	return { outerId, innerId, centerX: center.x, centerY: center.y }
}

/* --------------------- Component --------------------- */

function TreeButton() {
	const editor = useEditor()

	useEffect(() => {
		const isGrowing$ = atom('isGrowing', false)
		const button$ = atom<ButtonState | null>('button', null)

		editor.setCamera({ ...editor.getCamera(), z: 0.75 })
		button$.set(createButtonCircles(editor))

		const cleanup = editor.sideEffects.registerBeforeChangeHandler(
			'instance_page_state',
			(_, next) => {
				const innerId = button$.get()?.innerId
				if (innerId && next.selectedShapeIds.includes(innerId)) {
					return { ...next, selectedShapeIds: next.selectedShapeIds.filter((id) => id !== innerId) }
				}
				return next
			}
		)

		function handleEvent(info: { name: string }) {
			if (info.name !== 'pointer_up') return
			if (isGrowing$.get()) return

			const buttonState = button$.get()
			if (!buttonState) return

			const { innerId, centerX, centerY } = buttonState
			const pagePoint = editor.inputs.getCurrentPagePoint()
			const shapesAtPoint = editor.getShapesAtPoint(pagePoint)

			if (shapesAtPoint.some((s) => s.id === innerId)) {
				isGrowing$.set(true)
				drawTree(editor, isGrowing$, centerX, centerY - OUTER_RADIUS)
			}
		}

		editor.on('event', handleEvent)

		return () => {
			cleanup()
			editor.off('event', handleEvent)
		}
	}, [editor])

	return null
}

export default function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw>
				<TreeButton />
			</Tldraw>
		</div>
	)
}
