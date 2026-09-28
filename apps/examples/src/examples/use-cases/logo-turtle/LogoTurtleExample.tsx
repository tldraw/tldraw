import { useEffect, useMemo, useRef, useState } from 'react'
import {
	Box,
	defaultOverlayUtils,
	Editor,
	EditorProvider,
	TLAnyOverlayUtilConstructor,
	Tldraw,
	useColorMode,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { HaltSignal, LogoError, LogoInterpreter } from './interpreter'
import './logo-turtle.css'
import { PROGRAMS } from './programs'
import { getTurtleWorld, TurtleSpeed } from './turtle-world'
import { TurtleOverlayUtil } from './TurtleOverlayUtil'

// There's a guide at the bottom of this file!

// [1]
const overlayUtils: TLAnyOverlayUtilConstructor[] = [...defaultOverlayUtils, TurtleOverlayUtil]

interface OutputLine {
	id: number
	text: string
	isError?: boolean
}

function LogoPanel() {
	const editor = useEditor()
	const colorMode = useColorMode()
	const [source, setSource] = useState(PROGRAMS[0].source)
	const [speed, setSpeed] = useState<TurtleSpeed>('fast')
	const [isRunning, setIsRunning] = useState(false)
	const [output, setOutput] = useState<OutputLine[]>([])
	const outputRef = useRef<HTMLDivElement>(null)

	const world = getTurtleWorld(editor)

	// [2]
	const interpreter = useMemo(() => {
		let nextId = 0
		return new LogoInterpreter(world, (text) =>
			setOutput((lines) => [...lines.slice(-199), { id: nextId++, text }])
		)
	}, [world])

	useEffect(() => {
		world.speed = speed
	}, [world, speed])

	useEffect(() => {
		outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight })
	}, [output])

	async function run(program: string) {
		if (isRunning) return
		setOutput([])
		setIsRunning(true)
		world.beginRun()
		try {
			await interpreter.run(program)
		} catch (e) {
			const text =
				e instanceof HaltSignal
					? 'Stopped'
					: e instanceof LogoError
						? e.message + (e.procedure ? ` in ${e.procedure}` : '')
						: String(e)
			setOutput((lines) => [...lines, { id: -1, text, isError: true }])
		} finally {
			world.endRun()
			setIsRunning(false)
			zoomToDrawingIfOffscreen(editor)
		}
	}

	return (
		<div className={`logo-panel tl-theme__${colorMode}`}>
			<div className="logo-panel__header">
				<h3>Logo</h3>
				<select
					aria-label="Example program"
					value=""
					disabled={isRunning}
					onChange={(e) => {
						const program = PROGRAMS.find((p) => p.name === e.target.value)
						if (!program) return
						setSource(program.source)
						run(program.source)
					}}
				>
					<option value="" disabled>
						Examples…
					</option>
					{PROGRAMS.map((p) => (
						<option key={p.name} value={p.name}>
							{p.name}
						</option>
					))}
				</select>
			</div>
			<textarea
				className="logo-panel__source"
				spellCheck={false}
				value={source}
				onChange={(e) => setSource(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
						e.preventDefault()
						run(source)
					}
				}}
			/>
			<div className="logo-panel__controls">
				{isRunning ? (
					<button onClick={() => world.halt()}>Stop</button>
				) : (
					<button className="logo-panel__run" onClick={() => run(source)}>
						Run
					</button>
				)}
				<button disabled={isRunning} onClick={() => world.clearScreen()}>
					Clear
				</button>
				<select
					aria-label="Turtle speed"
					value={speed}
					onChange={(e) => setSpeed(e.target.value as TurtleSpeed)}
				>
					<option value="slow">Slow</option>
					<option value="medium">Medium</option>
					<option value="fast">Fast</option>
					<option value="instant">Instant</option>
				</select>
			</div>
			<div className="logo-panel__output" ref={outputRef}>
				{output.map((line) => (
					<div key={line.id} className={line.isError ? 'logo-panel__error' : undefined}>
						{line.text}
					</div>
				))}
			</div>
		</div>
	)
}

function zoomToDrawingIfOffscreen(editor: Editor) {
	const bounds = Box.Common(
		getTurtleWorld(editor)
			.getDrawnShapes()
			.map((shape) => editor.getShapePageBounds(shape))
			.filter((b): b is Box => !!b)
	)
	if (bounds.width === 0 && bounds.height === 0) return
	if (editor.getViewportPageBounds().contains(bounds)) return
	editor.zoomToBounds(bounds, { inset: 48, targetZoom: 1, animation: { duration: 300 } })
}

export default function LogoTurtleExample() {
	const [editor, setEditor] = useState<Editor | null>(null)

	return (
		<div className="logo-turtle">
			{editor && (
				<EditorProvider editor={editor}>
					<LogoPanel />
				</EditorProvider>
			)}
			<div className="logo-turtle__canvas">
				<Tldraw
					overlayUtils={overlayUtils}
					onMount={(editor) => {
						// [3]
						getTurtleWorld(editor).centerCamera()
						setEditor(editor)
					}}
				/>
			</div>
		</div>
	)
}

/*
[1]
The turtles, and the stroke each one is in the middle of drawing, are drawn by an overlay util
rather than as shapes. That keeps the store (and undo history) free of the many tiny updates an
animated turtle makes. See `TurtleOverlayUtil.ts`.

[2]
The interpreter lives as long as the editor, so procedures and global variables you define in
one run are still there in the next, just like the jslogo console. The turtle state lives in a
`TurtleWorld` (see `turtle-world.ts`), which commits each finished pen stroke as a regular
tldraw line shape and each `label` as a text shape. Those are ordinary shapes: select them,
restyle them, or undo a whole run with one undo.

[3]
Logo puts the turtle's home at the center of the screen. Home is the page origin here, so start
with the camera centered on it.
*/
