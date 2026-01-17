import { useCallback, useEffect, useRef, useState } from 'react'
import {
	Editor,
	HTMLContainer,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseShape,
	TLShapeId,
	Tldraw,
	getDefaultColorTheme,
	useEditor,
	useValue,
} from 'tldraw'
import { DrawingOrchestrator, NoteEvent } from './drawing'

// Bright birdsong scale - C major pentatonic, high and chirpy
const SCALE = [
	{ note: 'C5', freq: 523.25, color: 'light-green' },
	{ note: 'D5', freq: 587.33, color: 'green' },
	{ note: 'E5', freq: 659.25, color: 'light-blue' },
	{ note: 'G5', freq: 783.99, color: 'blue' },
	{ note: 'A5', freq: 880.0, color: 'yellow' },
	{ note: 'C6', freq: 1046.5, color: 'orange' },
	{ note: 'D6', freq: 1174.66, color: 'light-red' },
	{ note: 'E6', freq: 1318.51, color: 'red' },
] as const

const MAX_INSTRUMENTS = 3

// Global conductor - manages turn-based playback
type InstrumentState = {
	id: TLShapeId
	interval: number
	nextPlayTime: number
	noteIndex: number
	patternIndex: number
	pattern: readonly number[]
}

let globalEditor: Editor | null = null
let isGlobalPlaying = false
let animationFrameId: number | null = null
let instruments: Map<TLShapeId, InstrumentState> = new Map()
let playStateCallbacks = new Set<(playing: boolean) => void>()

// Drawing orchestrator - manages the generative drawing system
let drawingOrchestrator: DrawingOrchestrator | null = null

// Track variant for each instrument ID (needed for drawing system)
let instrumentVariants: Map<TLShapeId, number> = new Map()

function registerInstrument(
	id: TLShapeId,
	variant: number,
	noteIndex: number,
	position: { x: number; y: number }
) {
	const v = VARIANTS[variant] || VARIANTS[0]
	instruments.set(id, {
		id,
		interval: v.interval,
		nextPlayTime: 0,
		noteIndex,
		patternIndex: 0,
		pattern: v.pattern,
	})

	// Track the variant for this instrument
	instrumentVariants.set(id, variant)

	// Register with drawing orchestrator
	if (drawingOrchestrator) {
		drawingOrchestrator.registerGoon(id, position, variant)
	}
}

function unregisterInstrument(id: TLShapeId) {
	instruments.delete(id)
	instrumentVariants.delete(id)

	// Unregister from drawing orchestrator
	if (drawingOrchestrator) {
		drawingOrchestrator.unregisterGoon(id)
	}
}

function updateInstrumentNote(id: TLShapeId, noteIndex: number) {
	const inst = instruments.get(id)
	if (inst) {
		inst.noteIndex = noteIndex
	}
}

function startGlobalPlayback(editor: Editor) {
	if (isGlobalPlaying) return
	isGlobalPlaying = true
	globalEditor = editor

	// Initialize or create the drawing orchestrator
	if (!drawingOrchestrator) {
		drawingOrchestrator = new DrawingOrchestrator({ editor })

		// Register all current instruments with the orchestrator
		instruments.forEach((inst) => {
			const shape = editor.getShape(inst.id)
			if (shape) {
				const variant = instrumentVariants.get(inst.id) ?? 0
				drawingOrchestrator!.registerGoon(inst.id, { x: shape.x, y: shape.y }, variant)
			}
		})
	}

	// Start the drawing system
	drawingOrchestrator.start()

	// Initialize all instruments with staggered start times for polyrhythm
	// Add 250ms delay before first note so quick clicks don't trigger playback
	const now = performance.now()
	let offset = 250
	instruments.forEach((inst) => {
		inst.nextPlayTime = now + offset
		offset += 50 // Stagger starts slightly
	})

	playStateCallbacks.forEach((cb) => cb(true))
	runPlaybackLoop()
}

function stopGlobalPlayback() {
	isGlobalPlaying = false
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId)
		animationFrameId = null
	}

	// Stop the drawing system
	if (drawingOrchestrator) {
		drawingOrchestrator.stop()
	}

	playStateCallbacks.forEach((cb) => cb(false))
}

function runPlaybackLoop() {
	if (!isGlobalPlaying || !globalEditor) return

	const now = performance.now()

	// Find the instrument that should play next (earliest nextPlayTime that has passed)
	let nextInstrument: InstrumentState | null = null
	let earliestTime = Infinity

	instruments.forEach((inst) => {
		if (inst.nextPlayTime <= now && inst.nextPlayTime < earliestTime) {
			earliestTime = inst.nextPlayTime
			nextInstrument = inst
		}
	})

	// Play the next instrument's note
	if (nextInstrument) {
		const inst = nextInstrument as InstrumentState
		const noteIndex = inst.pattern[inst.patternIndex]
		const scaleNote = SCALE[noteIndex]
		playNote(scaleNote.freq)

		// Get the shape position for the drawing system
		const shape = globalEditor.getShape(inst.id)
		const variant = instrumentVariants.get(inst.id) ?? 0
		const variantInfo = VARIANTS[variant] || VARIANTS[0]

		// Trigger the drawing system
		if (drawingOrchestrator && shape) {
			const noteEvent: NoteEvent = {
				variant,
				frequency: scaleNote.freq,
				color: scaleNote.color,
				patternIndex: inst.patternIndex,
				interval: inst.interval,
				goonPosition: { x: shape.x, y: shape.y },
				goonId: inst.id,
			}
			drawingOrchestrator.onNote(noteEvent)

			// Update goon position in case it moved
			drawingOrchestrator.updateGoonPosition(inst.id, {
				x: shape.x + variantInfo.width / 2,
				y: shape.y + variantInfo.height / 2,
			})
		}

		// Advance to next position in pattern
		inst.patternIndex = (inst.patternIndex + 1) % inst.pattern.length
		inst.noteIndex = inst.pattern[inst.patternIndex]
		inst.nextPlayTime = now + inst.interval

		// Update the shape's visual
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		globalEditor.updateShape({
			id: inst.id,
			type: 'instrument',
			props: { noteIndex: inst.noteIndex },
		} as any)
	}

	animationFrameId = requestAnimationFrame(runPlaybackLoop)
}

// Define the instrument shape type
type InstrumentShape = TLBaseShape<'instrument', { noteIndex: number; variant: number }>

// Each variant is a unique little character!
// Scale: 0=C5, 1=D5, 2=E5, 3=G5, 4=A5, 5=C6, 6=D6, 7=E6
// Together they chirp like birds with gaps and varying rhythms
const VARIANTS = [
	{
		name: 'Chonk',
		width: 110,
		height: 85,
		borderRadius: 16,
		// Slow, contemplative chirps with long pauses
		pattern: [0, 2, 4],
		interval: 800,
	},
	{
		name: 'Stretch',
		width: 55,
		height: 130,
		borderRadius: 10,
		// Quick little trills, but with breathing room
		pattern: [5, 7, 5, 3],
		interval: 350,
	},
	{
		name: 'Gus',
		width: 90,
		height: 95,
		borderRadius: 8,
		// Mid-range warbles, conversational
		pattern: [2, 4, 3, 5, 4],
		interval: 550,
	},
] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class InstrumentShapeUtil extends ShapeUtil<any> {
	static override type = 'instrument' as const
	static override props = {
		noteIndex: T.number,
		variant: T.number,
	}

	getDefaultProps(): InstrumentShape['props'] {
		return { noteIndex: 0, variant: 0 }
	}

	canSelect() {
		return false
	}

	getGeometry(shape: InstrumentShape) {
		const v = VARIANTS[shape.props.variant] || VARIANTS[0]
		return new Rectangle2d({ width: v.width, height: v.height, isFilled: true })
	}

	component(shape: InstrumentShape) {
		return <InstrumentComponent shape={shape} />
	}

	indicator(shape: InstrumentShape) {
		const v = VARIANTS[shape.props.variant] || VARIANTS[0]
		return <rect width={v.width} height={v.height} rx={v.borderRadius} />
	}
}

// Shared audio context
let audioContext: AudioContext | null = null

function playNote(frequency: number) {
	if (!audioContext) {
		audioContext = new AudioContext()
	}
	const ctx = audioContext

	// Pure sine wave for clean birdsong tone
	const osc = ctx.createOscillator()
	const gain = ctx.createGain()
	osc.type = 'sine'
	osc.frequency.setValueAtTime(frequency, ctx.currentTime)

	// High-pass filter to keep it bright and airy
	const filter = ctx.createBiquadFilter()
	filter.type = 'highpass'
	filter.frequency.setValueAtTime(400, ctx.currentTime)

	// Connect: oscillator -> gain -> filter -> output
	osc.connect(gain)
	gain.connect(filter)
	filter.connect(ctx.destination)

	// Quick chirpy envelope - fast attack, short decay
	gain.gain.setValueAtTime(0, ctx.currentTime)
	gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01)
	gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)

	osc.start(ctx.currentTime)
	osc.stop(ctx.currentTime + 0.12)
}

function InstrumentComponent({ shape }: { shape: InstrumentShape }) {
	const editor = useEditor()
	const [isPressed, setIsPressed] = useState(false)
	const [_isPlaying, setIsPlaying] = useState(false)
	const pointerDownTimeRef = useRef<number>(0)
	const playedRef = useRef<boolean>(false)

	const isDarkMode = useValue('dark mode', () => editor.user.getIsDarkMode(), [editor])
	const theme = getDefaultColorTheme({ isDarkMode })

	const currentNote = SCALE[shape.props.noteIndex]
	const colorHex = theme[currentNote.color].solid
	const v = VARIANTS[shape.props.variant] ?? VARIANTS[0]

	// Register/unregister this instrument with the global conductor
	useEffect(() => {
		registerInstrument(shape.id, shape.props.variant, shape.props.noteIndex, {
			x: shape.x + v.width / 2,
			y: shape.y + v.height / 2,
		})
		return () => unregisterInstrument(shape.id)
	}, [shape.id, shape.props.variant, shape.x, shape.y, v.width, v.height])

	// Sync note index changes
	useEffect(() => {
		updateInstrumentNote(shape.id, shape.props.noteIndex)
	}, [shape.id, shape.props.noteIndex])

	// Listen for global play state
	useEffect(() => {
		const callback = (playing: boolean) => {
			setIsPlaying(playing)
		}
		playStateCallbacks.add(callback)
		return () => {
			playStateCallbacks.delete(callback)
		}
	}, [])

	const spawnNewInstrument = useCallback(() => {
		// Check if we've hit the max
		const existingInstruments = editor
			.getCurrentPageShapes()
			.filter((s) => (s.type as string) === 'instrument') as unknown as InstrumentShape[]

		if (existingInstruments.length >= MAX_INSTRUMENTS) {
			return // Don't spawn more
		}

		// Figure out which variants are already used
		const usedVariants = new Set(existingInstruments.map((i) => i.props.variant))
		let newVariant = 0
		for (let i = 0; i < VARIANTS.length; i++) {
			if (!usedVariants.has(i)) {
				newVariant = i
				break
			}
		}

		const newV = VARIANTS[newVariant]
		// Start at the first note of this variant's pattern
		const newNoteIndex = newV.pattern[0]

		const padding = 25

		// Try positions in a scattered pattern - randomize the angle order for organic feel
		const baseAngles = [30, 90, 150, 210, 270, 330, 0, 60, 120, 180, 240, 300]
		const angleOffset = Math.random() * 360
		const angles = baseAngles.map((a) => ((a + angleOffset) % 360) * (Math.PI / 180))
		const distances = [110, 140, 170, 200]

		let newX = shape.x + 100
		let newY = shape.y

		outer: for (const dist of distances) {
			for (const angle of angles) {
				// Add some jitter to make it feel more organic
				const jitterX = (Math.random() - 0.5) * 20
				const jitterY = (Math.random() - 0.5) * 20
				const tryX = shape.x + Math.cos(angle) * dist + jitterX
				const tryY = shape.y + Math.sin(angle) * dist + jitterY

				let overlaps = false
				for (const inst of existingInstruments) {
					const instV = VARIANTS[inst.props.variant] || VARIANTS[0]
					if (
						tryX < inst.x + instV.width + padding &&
						tryX + newV.width > inst.x - padding &&
						tryY < inst.y + instV.height + padding &&
						tryY + newV.height > inst.y - padding
					) {
						overlaps = true
						break
					}
				}

				if (!overlaps) {
					newX = tryX
					newY = tryY
					break outer
				}
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		editor.createShape({
			type: 'instrument',
			x: newX,
			y: newY,
			props: { noteIndex: newNoteIndex, variant: newVariant },
		} as any)

		// Play the new instrument's note
		playNote(SCALE[newNoteIndex].freq)
	}, [editor, shape.x, shape.y])

	const handlePointerDown = useCallback(() => {
		setIsPressed(true)
		pointerDownTimeRef.current = Date.now()
		playedRef.current = false
		startGlobalPlayback(editor)
	}, [editor])

	const handlePointerUp = useCallback(() => {
		setIsPressed(false)
		const elapsed = Date.now() - pointerDownTimeRef.current
		stopGlobalPlayback()

		// If it was a quick click (not a hold), spawn a new instrument
		if (elapsed < 200 && !playedRef.current) {
			spawnNewInstrument()
		}
	}, [spawnNewInstrument])

	const handlePointerLeave = useCallback(() => {
		if (isPressed) {
			setIsPressed(false)
			stopGlobalPlayback()
		}
	}, [isPressed])

	const variant = shape.props.variant

	// Render the character based on variant
	const renderCharacter = () => {
		const baseStyle = {
			width: v.width,
			height: v.height,
			backgroundColor: theme.background,
			border: `1px solid ${theme.grey.semi}`,
			borderRadius: v.borderRadius,
			boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
			position: 'relative' as const,
			display: 'flex',
			flexDirection: 'column' as const,
			alignItems: 'center',
			justifyContent: 'center',
		}

		const buttonBase = {
			backgroundColor: theme.background,
			border: `1px solid ${theme.grey.semi}`,
			cursor: 'pointer',
			outline: 'none',
			transition: 'transform 0.05s ease, box-shadow 0.05s ease',
		}

		// Chonk - wide and confident, half-closed content eyes
		if (variant === 0) {
			return (
				<div style={baseStyle}>
					{/* Sleepy confident eyes */}
					<div style={{ display: 'flex', gap: 30, marginBottom: 6 }}>
						<div
							style={{
								width: 14,
								height: isPressed ? 2 : 5,
								backgroundColor: theme.black.solid,
								borderRadius: 3,
								transition: 'height 0.1s',
							}}
						/>
						<div
							style={{
								width: 14,
								height: isPressed ? 2 : 5,
								backgroundColor: theme.black.solid,
								borderRadius: 3,
								transition: 'height 0.1s',
							}}
						/>
					</div>
					{/* Wide LED mouth/grin */}
					<div
						style={{
							width: 24,
							height: 8,
							borderRadius: 4,
							backgroundColor: colorHex,
							boxShadow: `0 0 10px 2px ${colorHex}66`,
							marginBottom: 10,
						}}
					/>
					{/* Big wide button */}
					<button
						className="instrument-button"
						style={{
							...buttonBase,
							borderRadius: 6,
							padding: '8px 35px',
							transform: isPressed ? 'translateY(3px)' : 'translateY(0)',
							boxShadow: isPressed
								? 'inset 0 2px 4px rgba(0,0,0,0.1)'
								: `0 5px 0 ${theme.grey.semi}, 0 7px 10px rgba(0,0,0,0.1)`,
						}}
						onPointerDown={handlePointerDown}
						onPointerUp={handlePointerUp}
						onPointerLeave={handlePointerLeave}
					/>
				</div>
			)
		}

		// Stretch - tall nervous one, wide surprised eyes
		if (variant === 1) {
			return (
				<div style={{ ...baseStyle, justifyContent: 'flex-start', paddingTop: 15 }}>
					{/* Surprised wide eyes - fixed height container, eyes scale inside */}
					<div style={{ display: 'flex', gap: 10, marginBottom: 8, height: 12 }}>
						<div
							style={{
								width: 10,
								height: 12,
								backgroundColor: theme.black.solid,
								borderRadius: '50%',
								transform: isPressed ? 'scaleY(0.3)' : 'scaleY(1)',
								transition: 'transform 0.1s',
							}}
						/>
						<div
							style={{
								width: 10,
								height: 12,
								backgroundColor: theme.black.solid,
								borderRadius: '50%',
								transform: isPressed ? 'scaleY(0.3)' : 'scaleY(1)',
								transition: 'transform 0.1s',
							}}
						/>
					</div>
					{/* Little 'o' mouth LED */}
					<div
						style={{
							width: 8,
							height: 8,
							borderRadius: '50%',
							backgroundColor: colorHex,
							boxShadow: `0 0 8px 2px ${colorHex}66`,
							marginBottom: 15,
						}}
					/>
					{/* Tall narrow button */}
					<button
						className="instrument-button"
						style={{
							...buttonBase,
							borderRadius: 6,
							padding: '25px 12px',
							transform: isPressed ? 'translateY(2px) scaleY(0.95)' : 'translateY(0)',
							boxShadow: isPressed
								? 'inset 0 2px 4px rgba(0,0,0,0.1)'
								: `0 4px 0 ${theme.grey.semi}, 0 6px 8px rgba(0,0,0,0.1)`,
						}}
						onPointerDown={handlePointerDown}
						onPointerUp={handlePointerUp}
						onPointerLeave={handlePointerLeave}
					/>
					{/* Little feet */}
					<div
						style={{
							position: 'absolute',
							bottom: -6,
							display: 'flex',
							gap: 20,
						}}
					>
						<div
							style={{
								width: 10,
								height: 6,
								backgroundColor: theme.grey.semi,
								borderRadius: '0 0 5px 5px',
							}}
						/>
						<div
							style={{
								width: 10,
								height: 6,
								backgroundColor: theme.grey.semi,
								borderRadius: '0 0 5px 5px',
							}}
						/>
					</div>
				</div>
			)
		}

		// Gus - the square tough guy with determined little eyes
		if (variant === 2) {
			return (
				<div style={baseStyle}>
					{/* Little antenna */}
					<div
						style={{
							position: 'absolute',
							top: -12,
							width: 3,
							height: 12,
							backgroundColor: theme.grey.semi,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							top: -16,
							width: 8,
							height: 8,
							borderRadius: '50%',
							backgroundColor: colorHex,
							boxShadow: `0 0 6px 2px ${colorHex}66`,
						}}
					/>
					{/* Determined squinty eyes */}
					<div style={{ display: 'flex', gap: 20, marginBottom: 20, marginTop: 10 }}>
						<div
							style={{
								width: 12,
								height: isPressed ? 2 : 4,
								backgroundColor: theme.black.solid,
								borderRadius: 2,
								transform: 'rotate(-5deg)',
								transition: 'height 0.1s',
							}}
						/>
						<div
							style={{
								width: 12,
								height: isPressed ? 2 : 4,
								backgroundColor: theme.black.solid,
								borderRadius: 2,
								transform: 'rotate(5deg)',
								transition: 'height 0.1s',
							}}
						/>
					</div>
					{/* Square-ish button */}
					<button
						className="instrument-button"
						style={{
							...buttonBase,
							borderRadius: 4,
							padding: '14px 20px',
							transform: isPressed ? 'translateY(3px)' : 'translateY(0)',
							boxShadow: isPressed
								? 'inset 0 2px 4px rgba(0,0,0,0.15)'
								: `0 5px 0 ${theme.grey.semi}, 0 7px 10px rgba(0,0,0,0.1)`,
						}}
						onPointerDown={handlePointerDown}
						onPointerUp={handlePointerUp}
						onPointerLeave={handlePointerLeave}
					/>
				</div>
			)
		}

		return null
	}

	return (
		<HTMLContainer>
			<div onPointerDown={editor.markEventAsHandled}>{renderCharacter()}</div>
		</HTMLContainer>
	)
}

const shapeUtils = [InstrumentShapeUtil]

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					editor.createShape({
						type: 'instrument',
						x: 700,
						y: 325,
						props: { noteIndex: 0, variant: 0 },
					} as any)
				}}
			/>
		</div>
	)
}

export default App
