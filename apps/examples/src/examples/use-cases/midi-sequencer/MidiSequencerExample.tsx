import { ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TLUiComponents,
	TLUiOverrides,
	Tldraw,
	createShapeId,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { MidiEngine } from './engine/MidiEngine'
import { ChainIcon, SequenceIcon } from './icons'
import { ChainShapeTool, ChainShapeUtil } from './shapes/ChainShapeUtil'
import { SequenceShapeTool, SequenceShapeUtil } from './shapes/SequenceShapeUtil'
import { CHAIN_TYPE, SEQUENCE_TYPE } from './shapes/shared'
import { registerEngineSync } from './syncEngine'
import { TransportPanel } from './TransportPanel'
import './midi-sequencer.css'

// [1]
const shapeUtils = [SequenceShapeUtil, ChainShapeUtil]
const tools = [SequenceShapeTool, ChainShapeTool]

// [2]
const overrides: TLUiOverrides = {
	tools(editor, schema) {
		schema[SEQUENCE_TYPE] = {
			id: SEQUENCE_TYPE,
			label: 'Sequence',
			icon: 'tool-note',
			kbd: 'q',
			onSelect: () => editor.setCurrentTool(SEQUENCE_TYPE),
		}
		schema[CHAIN_TYPE] = {
			id: CHAIN_TYPE,
			label: 'Chain',
			icon: 'tool-frame',
			kbd: 'w',
			onSelect: () => editor.setCurrentTool(CHAIN_TYPE),
		}
		return schema
	},
}

const DRAG_THRESHOLD = 8

// A toolbar button you can either click (to select the tool and draw) or drag
// onto the canvas to drop a shape where you release. Native HTML5 drag gets
// swallowed inside the editor, so — like tldraw's drag-and-drop-tray example —
// we drive this with pointer capture instead.
function ToolButton({
	type,
	label,
	children,
}: {
	type: typeof SEQUENCE_TYPE | typeof CHAIN_TYPE
	label: string
	children: ReactNode
}) {
	const editor = useEditor()
	const selected = useValue('current tool', () => editor.getCurrentToolId() === type, [
		editor,
		type,
	])
	const start = useRef<{ x: number; y: number } | null>(null)
	const dragging = useRef(false)
	const [preview, setPreview] = useState<{ x: number; y: number } | null>(null)

	const onPointerDown = (e: React.PointerEvent) => {
		e.preventDefault()
		e.stopPropagation()
		try {
			;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
		} catch {
			// ignore environments without pointer capture
		}
		start.current = { x: e.clientX, y: e.clientY }
		dragging.current = false
	}

	const onPointerMove = (e: React.PointerEvent) => {
		const s = start.current
		if (!s) return
		if (!dragging.current && Math.hypot(e.clientX - s.x, e.clientY - s.y) > DRAG_THRESHOLD) {
			dragging.current = true
		}
		if (dragging.current) setPreview({ x: e.clientX, y: e.clientY })
	}

	const onPointerUp = (e: React.PointerEvent) => {
		;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
		if (dragging.current) {
			const point = editor.screenToPage({ x: e.clientX, y: e.clientY })
			const { w, h } = editor.getShapeUtil(type).getDefaultProps() as { w: number; h: number }
			const id = createShapeId()
			editor.markHistoryStoppingPoint('create from toolbar')
			editor.createShape({ id, type, x: point.x - w / 2, y: point.y - h / 2 })
			editor.select(id)
			editor.setCurrentTool('select')
		} else {
			// A plain click selects the tool so you can draw.
			editor.setCurrentTool(type)
		}
		start.current = null
		dragging.current = false
		setPreview(null)
	}

	return (
		<>
			<div
				className={`midi-tool-button ${selected ? 'is-selected' : ''}`}
				role="button"
				tabIndex={0}
				title={`${label} — drag onto the canvas, or click then draw`}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
			>
				{children}
			</div>
			{preview &&
				createPortal(
					<div className="midi-tool-drag-preview" style={{ left: preview.x, top: preview.y }}>
						{children}
					</div>,
					document.body
				)}
		</>
	)
}

// [3]
const components: TLUiComponents & TLComponents = {
	TopPanel: TransportPanel,
	Toolbar: (props) => (
		<DefaultToolbar {...props}>
			<ToolButton type={SEQUENCE_TYPE} label="Sequence">
				<SequenceIcon />
			</ToolButton>
			<ToolButton type={CHAIN_TYPE} label="Chain">
				<ChainIcon />
			</ToolButton>
			<DefaultToolbarContent />
		</DefaultToolbar>
	),
}

export default function MidiSequencerExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="midi-sequencer-2"
				shapeUtils={shapeUtils}
				tools={tools}
				overrides={overrides}
				components={components}
				onMount={(editor) => {
					const cleanup = registerEngineSync(editor)
					editor.disposables.add(cleanup)
					// Request Web MIDI up front so outputs (e.g. the IAC Driver) populate.
					MidiEngine.get(editor).enableMidi()

					// Space toggles the transport. Captured before tldraw's space-pan,
					// but ignored while typing in a field.
					const onKeyDown = (e: KeyboardEvent) => {
						if (e.code !== 'Space' || e.repeat) return
						const t = e.target as HTMLElement | null
						const tag = t?.tagName
						if (t?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
							return
						}
						e.preventDefault()
						e.stopPropagation()
						MidiEngine.get(editor).togglePlay()
					}
					window.addEventListener('keydown', onKeyDown, { capture: true })
					editor.disposables.add(() =>
						window.removeEventListener('keydown', onKeyDown, { capture: true })
					)
				}}
			/>
		</div>
	)
}

/*
[1] Two custom shapes: a Sequence (a step pattern with a playhead, its own MIDI
channel, clock source and chain-advance rules) and a Chain (a lane that plays the
sequences inside it). The master clock lives in the engine (./engine), a
TypeScript port of kaneel/midiseq; tempo is stored in the document's meta.

[2] Register the tools in the UI schema so they appear in the toolbar.

[3] TopPanel hosts global transport (play/stop, BPM) + MIDI output selection and
song save/open. Each sequence picks its own clock source (the master tick, or
another chain/sequence's note events) from selectors in its footer.

[4] The toolbar items support pointer-drag-to-create (ToolButton): drag one onto
the canvas to drop that shape where you release, or click it and draw as usual.
*/
