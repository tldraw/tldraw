import { useEffect, useRef } from 'react'
import { Editor, TLShapeId, Tldraw, b64Vecs, createShapeId, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// ============ AUDIO SYSTEM ============

// Scale pattern (relative semitones from root) - major with extensions
// 0=root, 2=9th, 4=3rd, 5=11th, 7=5th, 9=6th, 11=7th, 12=octave
const SCALE_PATTERN = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19]

// Key modulation - semitone offset from A3 (220Hz)
// Starting in Bb (10 semitones up from A)
let currentKeyOffset = 10

// Jazz modulations: up a 4th (+5), up a half step (+1), down a whole step (-2)
const MODULATIONS = [5, 1, -2, 7, -5]

// Convert scale degree to frequency with current key
function scaleToFreq(scaleDegree: number): number {
	const semitone = SCALE_PATTERN[scaleDegree % SCALE_PATTERN.length] + currentKeyOffset
	return 220 * Math.pow(2, semitone / 12)
}

// Get bass note frequency (2 octaves below root of current key)
function getBassFreq(): number {
	return 220 * Math.pow(2, (currentKeyOffset - 24) / 12)
}

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
	if (!audioContext) {
		audioContext = new AudioContext()
	}
	return audioContext
}

function playMarimbaNote(frequency: number, velocity = 0.07, time?: number) {
	const ctx = getAudioContext()
	const now = Math.max(time ?? ctx.currentTime, ctx.currentTime)

	// Woody tone: fundamental + warm harmonics + subtle body resonance
	const fundamental = ctx.createOscillator()
	const harmonic1 = ctx.createOscillator()
	const body = ctx.createOscillator() // Low "wood body" resonance

	fundamental.type = 'sine'
	fundamental.frequency.value = frequency

	// Slightly detuned harmonic for warmth
	harmonic1.type = 'triangle'
	harmonic1.frequency.value = frequency * 0.5

	// Body resonance - sub-octave for woody depth
	body.type = 'sine'
	body.frequency.value = frequency * 0.5

	// Main envelope: soft attack, medium sustain (wood decays naturally)
	const envelope = ctx.createGain()
	envelope.gain.setValueAtTime(0, now)
	envelope.gain.linearRampToValueAtTime(velocity, now + 0.015)
	envelope.gain.exponentialRampToValueAtTime(velocity * 0.5, now + 0.25)
	envelope.gain.exponentialRampToValueAtTime(velocity * 0.15, now + 0.8)
	envelope.gain.exponentialRampToValueAtTime(0.001, now + 1.4)

	// Body envelope: slower attack, quick decay (the "thunk")
	const bodyEnv = ctx.createGain()
	bodyEnv.gain.setValueAtTime(0, now)
	bodyEnv.gain.linearRampToValueAtTime(velocity * 0.4, now + 0.01)
	bodyEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

	const gain1 = ctx.createGain()
	gain1.gain.value = 0.12

	fundamental.connect(envelope)
	harmonic1.connect(gain1).connect(envelope)
	body.connect(bodyEnv).connect(ctx.destination)
	envelope.connect(ctx.destination)

	fundamental.start(now)
	harmonic1.start(now)
	body.start(now)
	fundamental.stop(now + 1.6)
	harmonic1.stop(now + 1.6)
	body.stop(now + 0.5)
}

// Bass note - lower, longer sustain, warmer
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

// Modulate to a new key
function modulateKey() {
	const mod = MODULATIONS[Math.floor(Math.random() * MODULATIONS.length)]
	currentKeyOffset += mod
	// Keep in reasonable range (wrap around)
	if (currentKeyOffset > 22) currentKeyOffset -= 12
	if (currentKeyOffset < 4) currentKeyOffset += 12
}

// Chord voicings (scale degrees) - lush, open voicings
const CHORDS = [
	[0, 4, 7, 11, 14], // I maj9 (root, 3rd, 5th, 7th, 9th)
	[5, 9, 12, 16, 19], // IV maj9
	[7, 11, 14, 17, 21], // V maj9
	[2, 5, 9, 12, 16], // ii7
]

// Arpeggio patterns (indices into chord array) - like Great Fairy Fountain
const ARPEGGIO_PATTERNS = [
	[0, 1, 2, 3, 4, 3, 2, 1], // Sweep up and down
	[0, 2, 1, 3, 2, 4, 3, 2], // Interlaced ascent
	[4, 3, 2, 1, 0, 1, 2, 3], // Sweep down and up
	[0, 2, 4, 2, 0, 1, 3, 1], // Skip pattern
]

class ArpeggioPlayer {
	private chordIndex: number
	private patternIndex: number
	private noteInPattern = 0
	private notesOnChord = 0
	private totalNotes = 0
	private pattern: number[]
	private chordOrder: number[]

	constructor() {
		// Randomize starting point
		this.chordIndex = Math.floor(Math.random() * CHORDS.length)
		this.patternIndex = Math.floor(Math.random() * ARPEGGIO_PATTERNS.length)
		this.pattern = ARPEGGIO_PATTERNS[this.patternIndex]

		// Shuffle chord order for variety
		this.chordOrder = [0, 1, 2, 3]
		for (let i = this.chordOrder.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
			;[this.chordOrder[i], this.chordOrder[j]] = [this.chordOrder[j], this.chordOrder[i]]
		}
	}

	// Get next note in the arpeggio sequence
	next(): number {
		const chord = CHORDS[this.chordOrder[this.chordIndex]]
		const chordToneIndex = this.pattern[this.noteInPattern]
		const scaleDegree = chord[chordToneIndex]

		// Advance through pattern
		this.noteInPattern = (this.noteInPattern + 1) % this.pattern.length
		this.notesOnChord++
		this.totalNotes++

		// Modulate key every ~48 notes (3 chord changes)
		if (this.totalNotes > 0 && this.totalNotes % 24 === 0) {
			modulateKey()
		}

		// Change chord every 16 notes
		if (this.notesOnChord >= 16) {
			this.notesOnChord = 0
			this.chordIndex = (this.chordIndex + 1) % CHORDS.length

			// Change arpeggio pattern on chord change (50% chance)
			if (Math.random() < 0.5) {
				this.patternIndex = Math.floor(Math.random() * ARPEGGIO_PATTERNS.length)
				this.pattern = ARPEGGIO_PATTERNS[this.patternIndex]
			}
		}

		return scaleDegree
	}
}

// Play a harp-like note
function playNote(scaleDegree: number, velocity = 0.07) {
	const freq = scaleToFreq(scaleDegree)
	playMarimbaNote(freq, velocity)
}

// ============ TREE SYSTEM ============

const BRANCH_LENGTH = 220
const BRANCH_SHRINK = 0.78
const MAX_DEPTH = 9

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
		if (depth > MAX_DEPTH) return
		if (length < 3) return

		// More randomness in the endpoint
		const wobbleX = (Math.random() - 0.5) * 4
		const wobbleY = (Math.random() - 0.5) * 4
		const x2 = x + Math.cos(angle) * length + wobbleX
		const y2 = y + Math.sin(angle) * length + wobbleY

		branches.push({ x1: x, y1: y, x2, y2, angle, depth })

		// Much more variance - less uniform
		const angleVariance1 = (Math.random() - 0.5) * 1.2
		const angleVariance2 = (Math.random() - 0.5) * 1.2
		const lengthVariance1 = 0.5 + Math.random() * 0.7
		const lengthVariance2 = 0.5 + Math.random() * 0.7

		// Random base angle for each branch
		const baseAngle1 = Math.PI / 6 + (Math.random() * Math.PI) / 12
		const baseAngle2 = Math.PI / 6 + (Math.random() * Math.PI) / 12

		// Sometimes skip a branch for asymmetry
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
		// Occasionally add a third branch
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
		// More organic wobble
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

// Base timing in ms per beat
const NOTE_INTERVAL = 35

async function drawTree(editor: Editor, buttonX: number, buttonY: number) {
	const branches = generateTree(buttonX, buttonY)

	// Sort by depth so trunk draws first
	branches.sort((a, b) => a.depth - b.depth)

	// Initialize audio
	getAudioContext()
	currentKeyOffset = 10
	const arpeggio = new ArpeggioPlayer()

	for (let i = 0; i < branches.length; i++) {
		const branch = branches[i]

		// Draw the branch
		const points = branchToFreehandPoints(branch)
		const minX = Math.min(...points.map((p) => p.x))
		const minY = Math.min(...points.map((p) => p.y))
		const normalizedPoints = points.map((p) => ({
			x: p.x - minX,
			y: p.y - minY,
			z: p.z,
		}))

		const size = 'm'
		const color = branch.depth < 3 ? 'grey' : branch.depth < 5 ? 'green' : 'light-green'

		editor.createShape({
			id: createShapeId(),
			type: 'draw',
			x: minX,
			y: minY,
			props: {
				segments: [{ type: 'free', points: b64Vecs.encodePoints(normalizedPoints) }],
				color,
				size,
				isClosed: false,
				isComplete: true,
			},
		})

		// Play note every 3rd branch (sparser, more space)
		if (i % 3 === 0) {
			const scaleDegree = arpeggio.next()
			playNote(scaleDegree)
		}

		// Bass note every 24 branches
		if (i > 0 && i % 24 === 0) {
			playBassNote()
		}

		// Wait
		await new Promise((r) => setTimeout(r, NOTE_INTERVAL + Math.random() * 10))
	}
}

const OUTER_RADIUS = 40
const INNER_RADIUS = 25

function createButtonCircles(editor: Editor): {
	outerId: TLShapeId
	innerId: TLShapeId
	centerX: number
	centerY: number
} {
	const viewportBounds = editor.getViewportScreenBounds()
	const center = editor.screenToPage({
		x: viewportBounds.x + viewportBounds.w / 2,
		y: viewportBounds.y + viewportBounds.h - 130,
	})

	const outerId = createShapeId()
	const innerId = createShapeId()

	// Outer circle - unfilled, locked (no pointer events)
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

	// Inner circle - filled, clickable
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

function TreeButton() {
	const editor = useEditor()
	const buttonRef = useRef<{
		outerId: TLShapeId
		innerId: TLShapeId
		centerX: number
		centerY: number
	} | null>(null)
	const growingRef = useRef(false)

	useEffect(() => {
		// Set initial zoom to 75%
		editor.setCamera({ ...editor.getCamera(), z: 0.75 })

		// Create button circles on mount
		buttonRef.current = createButtonCircles(editor)

		// Prevent selection of inner button (outer is already locked)
		const cleanup = editor.sideEffects.registerBeforeChangeHandler(
			'instance_page_state',
			(_, next) => {
				const innerId = buttonRef.current?.innerId
				if (innerId && next.selectedShapeIds.includes(innerId)) {
					return { ...next, selectedShapeIds: next.selectedShapeIds.filter((id) => id !== innerId) }
				}
				return next
			}
		)

		const handleEvent = (info: { name: string }) => {
			if (info.name !== 'pointer_up') return
			if (growingRef.current) return
			if (!buttonRef.current) return

			const { innerId, centerX, centerY } = buttonRef.current

			// Check if we clicked on the inner button
			const pagePoint = editor.inputs.currentPagePoint
			const shapesAtPoint = editor.getShapesAtPoint(pagePoint)
			const clickedButton = shapesAtPoint.some((s) => s.id === innerId)

			if (clickedButton) {
				growingRef.current = true
				drawTree(editor, centerX, centerY - OUTER_RADIUS).then(() => {
					growingRef.current = false
				})
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

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw>
				<TreeButton />
			</Tldraw>
		</div>
	)
}

export default App
