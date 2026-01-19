import { useEffect, useRef } from 'react'
import { Editor, TLShapeId, Tldraw, b64Vecs, createShapeId, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// ============ AUDIO SYSTEM ============

// Bb major scale with 9ths and 11ths, stored as semitones from A3
// Bb3=10, C4=12(9th), D4=14(3rd), Eb4=15(11th), F4=17(5th), G4=19(6th), A4=21(7th), Bb4=22
// Emphasizing the extended chord tones (9th and 11th) for rich jazz harmony
const SCALE_SEMITONES = [10, 12, 14, 15, 17, 19, 21, 22, 24, 26, 27, 29] // Bb3 to Eb5

// Convert semitones from A3 (220Hz) to frequency
function semitoneToFreq(semitone: number): number {
	return 220 * Math.pow(2, semitone / 12)
}

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
	if (!audioContext) {
		audioContext = new AudioContext()
	}
	return audioContext
}

function playMarimbaNote(frequency: number, velocity = 0.08, time?: number) {
	const ctx = getAudioContext()
	// Ensure time is never negative or in the past
	const now = Math.max(time ?? ctx.currentTime, ctx.currentTime)

	const fundamental = ctx.createOscillator()
	const harmonic1 = ctx.createOscillator()

	fundamental.type = 'sine'
	fundamental.frequency.value = frequency

	harmonic1.type = 'sine'
	harmonic1.frequency.value = frequency * 2.0

	const envelope = ctx.createGain()
	envelope.gain.setValueAtTime(0, now)
	envelope.gain.linearRampToValueAtTime(velocity, now + 0.012)
	envelope.gain.exponentialRampToValueAtTime(velocity * 0.3, now + 0.2)
	envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.7)

	const gain1 = ctx.createGain()
	gain1.gain.value = 0.1

	fundamental.connect(envelope)
	harmonic1.connect(gain1).connect(envelope)
	envelope.connect(ctx.destination)

	fundamental.start(now)
	harmonic1.start(now)
	fundamental.stop(now + 0.9)
	harmonic1.stop(now + 0.9)
}

// Melodic phrases - each is an array of [scaleDegree, velocity]
const MELODIC_PHRASES: Array<Array<[number, number]>> = [
	// Gentle ascending
	[
		[0, 0.07],
		[2, 0.06],
		[3, 0.06],
		[4, 0.07],
		[5, 0.06],
	],
	// Descending with grace
	[
		[6, 0.07],
		[5, 0.06],
		[4, 0.05],
		[3, 0.06],
		[2, 0.06],
	],
	// Call and response
	[
		[0, 0.07],
		[4, 0.06],
		[3, 0.06],
		[2, 0.05],
		[0, 0.07],
	],
	// Ethereal (raised 7th)
	[
		[4, 0.06],
		[5, 0.05],
		[6, 0.07],
		[5, 0.05],
		[4, 0.06],
	],
	// Wandering
	[
		[2, 0.06],
		[4, 0.06],
		[3, 0.05],
		[5, 0.07],
		[4, 0.06],
		[2, 0.06],
	],
	// Resolving
	[
		[5, 0.06],
		[4, 0.06],
		[3, 0.06],
		[2, 0.06],
		[0, 0.07],
	],
	// Hopeful climb
	[
		[0, 0.06],
		[2, 0.06],
		[4, 0.07],
		[5, 0.06],
		[7, 0.07],
	],
	// Gentle sway
	[
		[3, 0.06],
		[4, 0.05],
		[3, 0.06],
		[2, 0.06],
		[3, 0.06],
	],
	// Playful
	[
		[0, 0.06],
		[3, 0.06],
		[2, 0.05],
		[4, 0.07],
		[3, 0.06],
	],
	// Reflective
	[
		[4, 0.06],
		[2, 0.05],
		[3, 0.06],
		[0, 0.07],
		[2, 0.06],
	],
]

interface NoteEvent {
	scaleDegree: number
	velocity: number
}

// Generate a melody sequence with enough notes for the branches
function generateMelody(noteCount: number): NoteEvent[] {
	const notes: NoteEvent[] = []
	const usedPhrases: number[] = []

	while (notes.length < noteCount) {
		// Pick a phrase we haven't used recently
		let phraseIndex: number
		do {
			phraseIndex = Math.floor(Math.random() * MELODIC_PHRASES.length)
		} while (usedPhrases.includes(phraseIndex) && usedPhrases.length < MELODIC_PHRASES.length - 3)

		usedPhrases.push(phraseIndex)
		if (usedPhrases.length > 4) usedPhrases.shift()

		const phrase = MELODIC_PHRASES[phraseIndex]
		for (const [scaleDegree, velocity] of phrase) {
			notes.push({ scaleDegree, velocity })
			if (notes.length >= noteCount) break
		}
	}

	return notes
}

// Play a single note immediately
function playNote(note: NoteEvent) {
	const freq = semitoneToFreq(SCALE_SEMITONES[note.scaleDegree])
	const humanize = (Math.random() - 0.5) * 0.01
	playMarimbaNote(freq, note.velocity, getAudioContext().currentTime + humanize)
}

// ============ TREE SYSTEM ============

const BRANCH_LENGTH = 220
const BRANCH_SHRINK = 0.78
const MAX_DEPTH = 8

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

// Base timing in ms between notes per thread
const NOTE_INTERVAL = 45

// Shared melody state for concurrent threads
class MelodyQueue {
	private notes: NoteEvent[]
	private index = 0

	constructor(noteCount: number) {
		this.notes = generateMelody(noteCount)
	}

	next(): NoteEvent | null {
		if (this.index >= this.notes.length) return null
		return this.notes[this.index++]
	}
}

function drawBranch(editor: Editor, branch: Branch) {
	const points = branchToFreehandPoints(branch)

	const minX = Math.min(...points.map((p) => p.x))
	const minY = Math.min(...points.map((p) => p.y))

	const normalizedPoints = points.map((p) => ({
		x: p.x - minX,
		y: p.y - minY,
		z: p.z,
	}))

	const shapeId = createShapeId()
	const size = 'm'
	const color = branch.depth < 3 ? 'grey' : branch.depth < 5 ? 'green' : 'light-green'

	editor.createShape({
		id: shapeId,
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
}

// Run a single thread of branch drawing
async function runThread(
	editor: Editor,
	branches: Branch[],
	melody: MelodyQueue,
	initialDelay: number,
	intervalVariance: number
) {
	// Initial offset
	await new Promise((r) => setTimeout(r, initialDelay))

	for (const branch of branches) {
		drawBranch(editor, branch)

		// Maybe play a note (threads share the melody, so notes bounce between them)
		const note = melody.next()
		if (note) {
			playNote(note)
		}

		// Wait with some variance
		const interval = NOTE_INTERVAL + (Math.random() - 0.5) * intervalVariance
		await new Promise((r) => setTimeout(r, interval))
	}
}

async function drawTree(editor: Editor, buttonX: number, buttonY: number) {
	const branches = generateTree(buttonX, buttonY)

	// Sort by depth so trunk draws first
	branches.sort((a, b) => a.depth - b.depth)

	// Split branches into threads based on angle (left vs center vs right)
	const leftBranches: Branch[] = []
	const centerBranches: Branch[] = []
	const rightBranches: Branch[] = []

	for (const branch of branches) {
		// Normalize angle to determine which "side" of tree
		const normalizedAngle = branch.angle + Math.PI / 2 // 0 = straight up
		if (normalizedAngle < -0.3) {
			leftBranches.push(branch)
		} else if (normalizedAngle > 0.3) {
			rightBranches.push(branch)
		} else {
			centerBranches.push(branch)
		}
	}

	// Initialize audio
	getAudioContext()

	// Create shared melody queue
	const melody = new MelodyQueue(branches.length)

	// Run threads concurrently with different offsets and timing
	await Promise.all([
		runThread(editor, centerBranches, melody, 0, 40),
		runThread(editor, leftBranches, melody, 60, 50),
		runThread(editor, rightBranches, melody, 120, 50),
	])
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
		y: viewportBounds.y + viewportBounds.h / 2 + 150,
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
