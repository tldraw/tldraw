import { useEffect, useRef, useState } from 'react'
import {
	BaseBoxShapeTool,
	BaseBoxShapeUtil,
	HTMLContainer,
	T,
	TLResizeInfo,
	TLShape,
	resizeBox,
	useEditor,
	useValue,
} from 'tldraw'
import { ClockEvent, MidiEngine } from '../engine/MidiEngine'
import { SequenceIcon } from '../icons'
import {
	CHAIN_TYPE,
	CLOCK_EVENT_OPTIONS,
	DEFAULT_SEQUENCE_HEIGHT,
	DEFAULT_SEQUENCE_WIDTH,
	DEFAULT_STEPPER,
	DEFAULT_STEPS,
	FOOTER_HEIGHT,
	HEADER_HEIGHT,
	isBlackKey,
	euclid,
	isInScale,
	LABEL_WIDTH,
	NEXT_ACTION_OPTIONS,
	NextActionId,
	PITCH_COUNT,
	PITCH_LOW,
	pitchName,
	pitchToRow,
	ROOT_OPTIONS,
	rowToPitch,
	SCALE_OPTIONS,
	ScaleId,
	SEQUENCE_TYPE,
	snapToScale,
	STEP_RESOLUTION_OPTIONS,
	TRIG_MODE_OPTIONS,
	TrigModeId,
} from './shared'

export interface NoteCellProps {
	step: number
	pitch: number
	velocity: number
	length: number
	probability?: number
	ratchet?: number
}

// A simple shared clipboard for copying a note pattern between sequences.
let copiedPattern: NoteCellProps[] | null = null

interface SequenceProps {
	w: number
	h: number
	name: string
	channel: number
	steps: number
	stepper: number
	trigMode: TrigModeId
	enabled: boolean
	solo: boolean
	notes: NoteCellProps[]
	// Chain advance: which sequence to go to, and after how many loops.
	chainNext: NextActionId
	chainAfter: number
	// Clock source: the shape id of the emitter ('' = master clock) + its event.
	clockSourceId: string
	clockEvent: ClockEvent
	// Scale lock: notes snap to this key + scale ('chromatic' = no snapping).
	scaleRoot: number
	scaleType: ScaleId
}

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[SEQUENCE_TYPE]: SequenceProps
	}
}

export type SequenceShape = TLShape<typeof SEQUENCE_TYPE>

const noteValidator = T.object({
	step: T.number,
	pitch: T.number,
	velocity: T.number,
	length: T.number,
	probability: T.number.optional(),
	ratchet: T.number.optional(),
})

export class SequenceShapeUtil extends BaseBoxShapeUtil<SequenceShape> {
	static override type = SEQUENCE_TYPE
	static override props = {
		w: T.positiveNumber,
		h: T.positiveNumber,
		name: T.string,
		channel: T.number,
		steps: T.positiveNumber,
		stepper: T.positiveNumber,
		trigMode: T.literalEnum('one', 'step', 'nextNote', 'restart'),
		enabled: T.boolean,
		solo: T.boolean,
		notes: T.arrayOf(noteValidator),
		chainNext: T.literalEnum('next', 'previous', 'first', 'last'),
		chainAfter: T.positiveNumber,
		clockSourceId: T.string,
		clockEvent: T.literalEnum('tick', 'noteOn', 'noteOff'),
		scaleRoot: T.number,
		scaleType: T.literalEnum(
			'chromatic',
			'major',
			'minor',
			'dorian',
			'mixolydian',
			'pentatonicMajor',
			'pentatonicMinor',
			'harmonicMinor'
		),
	}

	override getDefaultProps(): SequenceProps {
		return {
			w: DEFAULT_SEQUENCE_WIDTH,
			h: DEFAULT_SEQUENCE_HEIGHT,
			name: 'Sequence',
			channel: 0,
			steps: DEFAULT_STEPS,
			stepper: DEFAULT_STEPPER,
			trigMode: 'one',
			enabled: true,
			solo: false,
			notes: [],
			chainNext: 'next',
			chainAfter: 2,
			clockSourceId: '',
			clockEvent: 'tick',
			scaleRoot: 0,
			scaleType: 'chromatic',
		}
	}

	override canResize() {
		return true
	}

	override onResize(shape: SequenceShape, info: TLResizeInfo<SequenceShape>) {
		// Keep cells legible: don't let the grid get smaller than usable.
		return resizeBox(shape, info, {
			minWidth: LABEL_WIDTH + 160,
			minHeight: HEADER_HEIGHT + FOOTER_HEIGHT + 80,
		})
	}

	override component(shape: SequenceShape) {
		return <SequenceComponent shape={shape} />
	}

	override getIndicatorPath(shape: SequenceShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

function SequenceComponent({ shape }: { shape: SequenceShape }) {
	const editor = useEditor()
	const engine = MidiEngine.get(editor)
	const { w, h, steps, stepper, channel, notes, enabled, solo, name, trigMode } = shape.props
	const { chainNext, chainAfter, clockSourceId, clockEvent, scaleRoot, scaleType } = shape.props

	const snap = (pitch: number) => snapToScale(pitch, scaleRoot, scaleType)

	const totalTicks = steps * stepper
	const gridWidth = w - LABEL_WIDTH
	const gridHeight = h - HEADER_HEIGHT - FOOTER_HEIGHT
	const cellW = gridWidth / steps
	const cellH = gridHeight / PITCH_COUNT

	// Possible note-event emitters: any chain or any other sequence.
	const emitters = useValue(
		'emitters',
		() =>
			editor
				.getCurrentPageShapes()
				.filter((s) => (s.type === CHAIN_TYPE || s.type === SEQUENCE_TYPE) && s.id !== shape.id)
				.map((s) => ({
					id: s.id,
					name: (s.props as { name: string }).name,
					kind: s.type === CHAIN_TYPE ? 'chain' : 'sequence',
				})),
		[editor, shape.id]
	)

	// Reactive playhead from the engine, in ticks.
	const playhead = useValue('playhead', () => engine.getSequencePlayhead(shape.id), [
		engine,
		shape.id,
	])
	const isPlaying = useValue('playing', () => engine.transport.get().playing, [engine])
	const playheadX = totalTicks > 0 ? (playhead / totalTicks) * gridWidth : 0
	const activeStep = stepper > 0 ? Math.floor(playhead / stepper) % steps : -1

	const update = (props: Partial<SequenceProps>) => {
		editor.updateShape({ id: shape.id, type: SEQUENCE_TYPE, props })
	}

	// Changing key/scale re-snaps every existing note so the pattern stays in key.
	const changeScale = (next: Partial<Pick<SequenceProps, 'scaleRoot' | 'scaleType'>>) => {
		const root = next.scaleRoot ?? scaleRoot
		const type = next.scaleType ?? scaleType
		update({
			...next,
			notes: notes.map((n) => ({ ...n, pitch: snapToScale(n.pitch, root, type) })),
		})
	}

	// --- generators ----------------------------------------------------------
	const [pulses, setPulses] = useState(4)
	const [everyN, setEveryN] = useState(4)

	// A root pitch near the middle of the grid to generate single-pitch lines on.
	const linePitch = () => {
		const mid = PITCH_LOW + Math.floor(PITCH_COUNT / 2)
		return snap(mid)
	}
	const noteAt = (step: number, pitch: number): NoteCellProps => ({
		step,
		pitch,
		velocity: 100,
		length: stepper,
	})

	const fillEuclid = () => {
		const pitch = linePitch()
		const pattern = euclid(pulses, steps)
		update({ notes: pattern.flatMap((on, i) => (on ? [noteAt(i, pitch)] : [])) })
	}
	const fillEvery = () => {
		const pitch = linePitch()
		const n = Math.max(1, everyN)
		const out: NoteCellProps[] = []
		for (let i = 0; i < steps; i += n) out.push(noteAt(i, pitch))
		update({ notes: out })
	}
	const fillRandom = () => {
		const out: NoteCellProps[] = []
		for (let i = 0; i < steps; i++) {
			if (Math.random() < 0.35) {
				const row = Math.floor(Math.random() * PITCH_COUNT)
				out.push(noteAt(i, snap(rowToPitch(row))))
			}
		}
		update({ notes: out })
	}

	// Scroll over a note to set its ratchet count; shift+scroll for probability.
	// A non-passive native listener lets us stop tldraw from zooming.
	const svgRef = useRef<SVGSVGElement | null>(null)
	useEffect(() => {
		const el = svgRef.current
		if (!el) return
		const onWheel = (e: WheelEvent) => {
			const rect = el.getBoundingClientRect()
			const zoom = editor.getZoomLevel()
			const localX = (e.clientX - rect.left) / zoom
			const localY = (e.clientY - rect.top) / zoom
			const row = Math.floor(localY / cellH)
			let index = -1
			for (let i = notes.length - 1; i >= 0; i--) {
				const n = notes[i]
				if (pitchToRow(n.pitch) !== row) continue
				const x0 = n.step * cellW
				const x1 = (n.step + n.length / stepper) * cellW
				if (localX >= x0 - 2 && localX <= x1 + 5) {
					index = i
					break
				}
			}
			if (index < 0) return
			e.preventDefault()
			e.stopPropagation()
			const dir = e.deltaY < 0 ? 1 : -1
			const list = notes.map((n) => ({ ...n }))
			const n = list[index]
			if (e.shiftKey) {
				const p = Math.round(((n.probability ?? 1) + dir * 0.1) * 10) / 10
				n.probability = Math.max(0.1, Math.min(1, p))
			} else {
				n.ratchet = Math.max(1, Math.min(8, (n.ratchet ?? 1) + dir))
			}
			editor.updateShape({ id: shape.id, type: SEQUENCE_TYPE, props: { notes: list } })
		}
		el.addEventListener('wheel', onWheel, { passive: false })
		return () => el.removeEventListener('wheel', onWheel)
	}, [editor, shape.id, cellW, cellH, stepper, notes])

	// While dragging we render from a local draft so the whole gesture commits
	// as a single shape update.
	const [draftNotes, setDraftNotes] = useState<NoteCellProps[] | null>(null)
	const drag = useRef<{
		mode: 'move' | 'resize'
		index: number
		downStep: number
		downRow: number
		orig: NoteCellProps
		moved: boolean
		created: boolean
	} | null>(null)

	const renderNotes = draftNotes ?? notes
	const stepsOf = (n: NoteCellProps) => n.length / stepper

	const coords = (e: React.PointerEvent) => {
		const rect = e.currentTarget.getBoundingClientRect()
		const zoom = editor.getZoomLevel()
		const localX = (e.clientX - rect.left) / zoom
		const localY = (e.clientY - rect.top) / zoom
		return { stepFloat: localX / cellW, row: Math.floor(localY / cellH), localX }
	}

	// Find a note under the pointer, and whether the pointer is near its right
	// edge (for resizing).
	const hitTest = (localX: number, row: number) => {
		for (let i = renderNotes.length - 1; i >= 0; i--) {
			const n = renderNotes[i]
			if (pitchToRow(n.pitch) !== row) continue
			const x0 = n.step * cellW
			const x1 = (n.step + stepsOf(n)) * cellW
			if (localX >= x0 - 2 && localX <= x1 + 5) {
				return { index: i, onEdge: Math.abs(localX - x1) <= 6 }
			}
		}
		return null
	}

	const onGridPointerDown = (e: React.PointerEvent) => {
		e.stopPropagation()
		editor.markEventAsHandled(e)
		const { stepFloat, row, localX } = coords(e)
		if (stepFloat < 0 || stepFloat >= steps || row < 0 || row >= PITCH_COUNT) return
		e.currentTarget.setPointerCapture(e.pointerId)

		const hit = hitTest(localX, row)
		let working = notes.map((n) => ({ ...n }))
		if (hit) {
			drag.current = {
				mode: hit.onEdge ? 'resize' : 'move',
				index: hit.index,
				downStep: stepFloat,
				downRow: row,
				orig: { ...working[hit.index] },
				moved: false,
				created: false,
			}
		} else {
			const note = {
				step: Math.max(0, Math.min(steps - 1, Math.floor(stepFloat))),
				pitch: snap(rowToPitch(row)),
				velocity: 100,
				length: stepper,
			}
			working = [...working, note]
			drag.current = {
				mode: 'resize',
				index: working.length - 1,
				downStep: stepFloat,
				downRow: row,
				orig: { ...note },
				moved: false,
				created: true,
			}
		}
		setDraftNotes(working)
	}

	const onGridPointerMove = (e: React.PointerEvent) => {
		const d = drag.current
		if (!d) return
		e.stopPropagation()
		const { stepFloat, row } = coords(e)
		const working = (draftNotes ?? notes).map((n) => ({ ...n }))
		const n = working[d.index]
		if (!n) return
		if (Math.abs(stepFloat - d.downStep) > 0.1 || row !== d.downRow) d.moved = true

		if (d.mode === 'move') {
			const deltaSteps = Math.round(stepFloat - d.downStep)
			const newStep = Math.max(0, Math.min(steps - 1, d.orig.step + deltaSteps))
			const newRow = Math.max(
				0,
				Math.min(PITCH_COUNT - 1, pitchToRow(d.orig.pitch) + (row - d.downRow))
			)
			n.step = newStep
			n.pitch = snap(rowToPitch(newRow))
		} else {
			const lenSteps = Math.max(1, Math.min(steps - n.step, Math.round(stepFloat - n.step)))
			n.length = lenSteps * stepper
		}
		setDraftNotes(working)
	}

	const onGridPointerUp = (e: React.PointerEvent) => {
		const d = drag.current
		if (!d) return
		e.stopPropagation()
		try {
			e.currentTarget.releasePointerCapture(e.pointerId)
		} catch {
			// capture may already be released
		}
		let final = (draftNotes ?? notes).map((n) => ({ ...n }))
		// A click (no drag) on an existing note deletes it.
		if (d.mode === 'move' && !d.moved && !d.created) {
			final = final.filter((_, i) => i !== d.index)
		}
		drag.current = null
		setDraftNotes(null)
		update({ notes: final })
	}

	const stop = (e: React.SyntheticEvent) => e.stopPropagation()

	// The name is a drag handle by default (so the header moves the shape) and
	// becomes an input on double-click.
	const [editingName, setEditingName] = useState(false)

	return (
		<HTMLContainer className="midi-seq" style={{ width: w, height: h }}>
			<div className="midi-seq__header midi-seq__drag-handle" style={{ height: HEADER_HEIGHT }}>
				<button
					className={`midi-seq__power ${enabled ? 'is-on' : ''}`}
					title={enabled ? 'Mute' : 'Unmute'}
					onPointerDown={stop}
					onClick={(e) => {
						stop(e)
						update({ enabled: !enabled })
					}}
				>
					{enabled ? '●' : '○'}
				</button>
				<button
					className={`midi-seq__solo ${solo ? 'is-on' : ''}`}
					title="Solo"
					onPointerDown={stop}
					onClick={(e) => {
						stop(e)
						update({ solo: !solo })
					}}
				>
					S
				</button>
				<span className="midi-seq__icon">
					<SequenceIcon size={12} />
				</span>
				{editingName ? (
					<input
						className="midi-seq__name"
						value={name}
						autoFocus
						onPointerDown={stop}
						onChange={(e) => update({ name: e.target.value })}
						onBlur={() => setEditingName(false)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false)
						}}
					/>
				) : (
					<span
						className="midi-seq__name midi-seq__name--display"
						title="Drag to move · double-click to rename"
						onDoubleClick={(e) => {
							stop(e)
							setEditingName(true)
						}}
					>
						{name || 'Sequence'}
					</span>
				)}
				<label className="midi-seq__field" onPointerDown={stop}>
					ch
					<select
						value={channel}
						onPointerDown={stop}
						onChange={(e) => update({ channel: Number(e.target.value) })}
					>
						{Array.from({ length: 16 }, (_, i) => (
							<option key={i} value={i}>
								{i + 1}
							</option>
						))}
					</select>
				</label>
				<button
					className="midi-seq__clear"
					onPointerDown={stop}
					onClick={() => update({ notes: [] })}
				>
					clear
				</button>
			</div>

			<div className="midi-seq__body" style={{ left: 0, top: HEADER_HEIGHT }}>
				<div className="midi-seq__labels" style={{ width: LABEL_WIDTH, height: gridHeight }}>
					{Array.from({ length: PITCH_COUNT }, (_, row) => {
						const pitch = rowToPitch(row)
						return pitch % 12 === 0 ? (
							<div
								key={row}
								className="midi-seq__label"
								style={{ top: row * cellH, height: cellH }}
							>
								{pitchName(pitch)}
							</div>
						) : null
					})}
				</div>

				<svg
					ref={svgRef}
					className="midi-seq__grid"
					width={gridWidth}
					height={gridHeight}
					style={{ left: LABEL_WIDTH }}
					onPointerDown={onGridPointerDown}
					onPointerMove={onGridPointerMove}
					onPointerUp={onGridPointerUp}
				>
					{Array.from({ length: PITCH_COUNT }, (_, row) => {
						const pitch = rowToPitch(row)
						let cls: string
						if (scaleType === 'chromatic') {
							cls = isBlackKey(pitch) ? 'row row--black' : 'row row--white'
						} else if (pitch % 12 === ((scaleRoot % 12) + 12) % 12) {
							cls = 'row row--root'
						} else if (isInScale(pitch, scaleRoot, scaleType)) {
							cls = 'row row--in'
						} else {
							cls = 'row row--out'
						}
						return (
							<rect
								key={`row-${row}`}
								x={0}
								y={row * cellH}
								width={gridWidth}
								height={cellH}
								className={cls}
							/>
						)
					})}
					{Array.from({ length: steps + 1 }, (_, step) => (
						<line
							key={`col-${step}`}
							x1={step * cellW}
							y1={0}
							x2={step * cellW}
							y2={gridHeight}
							className={step % 4 === 0 ? 'divider divider--beat' : 'divider'}
						/>
					))}
					{isPlaying && activeStep >= 0 && (
						<rect
							x={activeStep * cellW}
							y={0}
							width={cellW}
							height={gridHeight}
							className="active-step"
						/>
					)}
					{renderNotes.map((note, i) => {
						const y = pitchToRow(note.pitch) * cellH
						const noteW = Math.max(3, stepsOf(note) * cellW)
						const x = note.step * cellW
						const prob = note.probability ?? 1
						const ratchet = note.ratchet ?? 1
						return (
							<g key={`note-${i}`} className="note-g">
								<rect
									x={x + 1}
									y={y + 1}
									width={noteW - 2}
									height={cellH - 2}
									rx={2}
									className="note"
									fillOpacity={0.4 + 0.6 * prob}
								/>
								{ratchet > 1 &&
									Array.from({ length: ratchet - 1 }, (_, k) => {
										const lx = x + ((k + 1) * noteW) / ratchet
										return (
											<line
												key={k}
												className="note-ratchet"
												x1={lx}
												y1={y + 1}
												x2={lx}
												y2={y + cellH - 1}
											/>
										)
									})}
								<rect
									x={x + noteW - 4}
									y={y + 1}
									width={3}
									height={cellH - 2}
									className="note-handle"
								/>
							</g>
						)
					})}
					{isPlaying && (
						<line className="playhead" x1={playheadX} y1={0} x2={playheadX} y2={gridHeight} />
					)}
				</svg>
			</div>

			<div className="midi-seq__footer" style={{ height: FOOTER_HEIGHT }}>
				<label className="midi-seq__foot-field" onPointerDown={stop}>
					steps
					<input
						type="number"
						min={1}
						max={64}
						value={steps}
						onPointerDown={stop}
						onChange={(e) =>
							update({ steps: Math.max(1, Math.min(64, Number(e.target.value) || 1)) })
						}
					/>
				</label>
				<label className="midi-seq__foot-field" onPointerDown={stop}>
					of
					<select
						value={stepper}
						onPointerDown={stop}
						onChange={(e) => update({ stepper: Number(e.target.value) })}
					>
						{STEP_RESOLUTION_OPTIONS.map((opt) => (
							<option key={opt.ticks} value={opt.ticks}>
								{opt.label}
							</option>
						))}
					</select>
				</label>
				<label className="midi-seq__foot-field" onPointerDown={stop}>
					key
					<select
						value={scaleRoot}
						onPointerDown={stop}
						onChange={(e) => changeScale({ scaleRoot: Number(e.target.value) })}
					>
						{ROOT_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
					<select
						value={scaleType}
						onPointerDown={stop}
						onChange={(e) => changeScale({ scaleType: e.target.value as ScaleId })}
					>
						{SCALE_OPTIONS.map((opt) => (
							<option key={opt.id} value={opt.id}>
								{opt.label}
							</option>
						))}
					</select>
				</label>
				<span className="midi-seq__foot-field midi-seq__gen" onPointerDown={stop}>
					<button onClick={fillEuclid} title="Fill an even (Euclidean) rhythm">
						euclid
					</button>
					<input
						type="number"
						min={0}
						max={steps}
						value={pulses}
						onPointerDown={stop}
						onChange={(e) => setPulses(Math.max(0, Math.min(steps, Number(e.target.value) || 0)))}
					/>
					<button onClick={fillRandom} title="Fill random notes (in scale)">
						random
					</button>
					<button onClick={fillEvery} title="A note every N steps">
						every
					</button>
					<input
						type="number"
						min={1}
						max={steps}
						value={everyN}
						onPointerDown={stop}
						onChange={(e) => setEveryN(Math.max(1, Math.min(steps, Number(e.target.value) || 1)))}
					/>
					<button
						onClick={() => {
							copiedPattern = notes.map((n) => ({ ...n }))
						}}
						title="Copy this pattern"
					>
						copy
					</button>
					<button
						onClick={() => copiedPattern && update({ notes: copiedPattern.map((n) => ({ ...n })) })}
						title="Paste the copied pattern"
					>
						paste
					</button>
				</span>
				<label className="midi-seq__foot-field" onPointerDown={stop}>
					clock
					<select
						value={clockEvent}
						onPointerDown={stop}
						onChange={(e) => {
							const event = e.target.value as ClockEvent
							if (event === 'tick') {
								update({ clockEvent: 'tick', clockSourceId: '' })
							} else {
								// Make sure a source is chosen when switching to a note event.
								const valid = emitters.some((em) => em.id === clockSourceId)
								update({
									clockEvent: event,
									clockSourceId: valid ? clockSourceId : (emitters[0]?.id ?? ''),
								})
							}
						}}
					>
						{CLOCK_EVENT_OPTIONS.map((opt) => (
							<option key={opt.id} value={opt.id}>
								{opt.label}
							</option>
						))}
					</select>
				</label>
				{clockEvent !== 'tick' && (
					<label className="midi-seq__foot-field" onPointerDown={stop}>
						from
						<select
							value={clockSourceId}
							onPointerDown={stop}
							onChange={(e) => update({ clockSourceId: e.target.value })}
						>
							{emitters.length === 0 && <option value="">(none)</option>}
							{emitters.map((em) => (
								<option key={em.id} value={em.id}>
									{em.kind === 'chain' ? '⛓ ' : '♪ '}
									{em.name}
								</option>
							))}
						</select>
					</label>
				)}
				<label className="midi-seq__foot-field" onPointerDown={stop}>
					trig
					<select
						value={trigMode}
						onPointerDown={stop}
						onChange={(e) => update({ trigMode: e.target.value as TrigModeId })}
					>
						{TRIG_MODE_OPTIONS.map((opt) => (
							<option key={opt.id} value={opt.id}>
								{opt.label}
							</option>
						))}
					</select>
				</label>
				<label className="midi-seq__foot-field" onPointerDown={stop}>
					after
					<input
						type="number"
						min={1}
						max={64}
						value={chainAfter}
						onPointerDown={stop}
						onChange={(e) => update({ chainAfter: Math.max(1, Number(e.target.value) || 1) })}
					/>
					loops →
					<select
						value={chainNext}
						onPointerDown={stop}
						onChange={(e) => update({ chainNext: e.target.value as NextActionId })}
					>
						{NEXT_ACTION_OPTIONS.map((opt) => (
							<option key={opt.id} value={opt.id}>
								{opt.label}
							</option>
						))}
					</select>
				</label>
			</div>
		</HTMLContainer>
	)
}

export class SequenceShapeTool extends BaseBoxShapeTool {
	static override id = SEQUENCE_TYPE
	override shapeType = SEQUENCE_TYPE as typeof SEQUENCE_TYPE
}
