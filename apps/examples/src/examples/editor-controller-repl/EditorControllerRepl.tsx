import { EditorController } from '@tldraw/editor-controller'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// --- Example scripts ---

const EXAMPLE_SCRIPTS: { name: string; code: string }[] = [
	{
		name: 'Introduction',
		code: `// Welcome to the tldraw Scripter!
//
// You have access to:
//   editor (e)      — the Editor instance
//   controller (c)  — an EditorController for imperative control
//   print(...)      — log output to the console below
//
// Hit ⌘+Enter (or the ▶ button) to run.

print("Shapes on page:", editor.getCurrentPageShapes().length)
print("Current tool:", editor.getCurrentToolId())
print("Camera:", JSON.stringify(editor.getCamera()))
`,
	},
	{
		name: 'Create shapes',
		code: `// Create a grid of rectangles

const cols = 5
const rows = 3
const size = 80
const gap = 16
const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'violet', 'light-red', 'light-green', 'light-blue']

const shapes = []
for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    shapes.push({
      type: 'geo',
      x: 100 + col * (size + gap),
      y: 100 + row * (size + gap),
      props: {
        w: size,
        h: size,
        color: colors[(row * cols + col) % colors.length],
        geo: 'rectangle',
      },
    })
  }
}

editor.createShapes(shapes)
editor.selectAll()
editor.zoomToSelection({ animation: { duration: 300 } })
print(\`Created \${shapes.length} shapes\`)
`,
	},
	{
		name: 'Move selection',
		code: `// Select all and translate using the controller

editor.selectAll()
const count = editor.getSelectedShapeIds().length

if (count === 0) {
  print("No shapes on the page — create some first!")
} else {
  controller.translateSelection(50, 30)
  print(\`Moved \${count} shapes by (50, 30)\`)
}
`,
	},
	{
		name: 'Randomize colors',
		code: `// Randomize the color of every shape on the page

const colors = [
  'black','grey','light-violet','violet','blue','light-blue',
  'yellow','orange','green','light-green','light-red','red',
]

const shapes = editor.getCurrentPageShapes()
if (shapes.length === 0) {
  print("No shapes — create some first!")
} else {
  for (const shape of shapes) {
    if ('color' in (shape.props ?? {})) {
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        props: {
          color: colors[Math.floor(Math.random() * colors.length)],
        },
      })
    }
  }
  print(\`Randomized colors on \${shapes.length} shapes\`)
}
`,
	},
	{
		name: 'Spiral',
		code: `// Draw a spiral of dots

const cx = 400, cy = 400
const count = 120
const shapes = []

for (let i = 0; i < count; i++) {
  const angle = i * 0.2
  const radius = i * 3
  const size = 6 + i * 0.3
  shapes.push({
    type: 'geo',
    x: cx + Math.cos(angle) * radius - size / 2,
    y: cy + Math.sin(angle) * radius - size / 2,
    props: {
      w: size,
      h: size,
      geo: 'ellipse',
      color: i % 2 === 0 ? 'blue' : 'light-blue',
      fill: 'solid',
    },
  })
}

editor.createShapes(shapes)
editor.selectAll()
editor.zoomToSelection({ animation: { duration: 300 } })
print(\`Created spiral with \${count} dots\`)
`,
	},
	{
		name: 'Delete all',
		code: `// Delete everything on the current page

const shapes = editor.getCurrentPageShapes()
if (shapes.length === 0) {
  print("Page is already empty")
} else {
  editor.deleteShapes(shapes.map(s => s.id))
  print(\`Deleted \${shapes.length} shapes\`)
}
`,
	},
]

const SCRIPTS_STORAGE_KEY = 'editor-controller-scripts'
const SELECTED_SCRIPT_KEY = 'editor-controller-selected'
const PANEL_WIDTH_KEY = 'editor-controller-panel-width'
const SCRIPT_LIST_HEIGHT_KEY = 'editor-controller-script-list-height'
const DEFAULT_PANEL_WIDTH = 420
const MIN_PANEL_WIDTH = 280
const MAX_PANEL_WIDTH = 800
const DEFAULT_SCRIPT_LIST_HEIGHT = 200
const MIN_SCRIPT_LIST_HEIGHT = 40
const MAX_SCRIPT_LIST_HEIGHT = 400

interface ScriptFile {
	name: string
	code: string
	isExample?: boolean
}

function loadScripts(): ScriptFile[] {
	try {
		const saved = JSON.parse(localStorage.getItem(SCRIPTS_STORAGE_KEY) || 'null')
		if (Array.isArray(saved) && saved.length > 0) return saved
	} catch {
		// ignore
	}
	return EXAMPLE_SCRIPTS.map((s) => ({ ...s, isExample: true }))
}

function saveScripts(scripts: ScriptFile[]) {
	try {
		localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(scripts))
	} catch {
		// ignore
	}
}

export default function EditorControllerRepl() {
	return (
		<div style={{ display: 'flex', width: '100%', height: '100%' }}>
			<Tldraw persistenceKey="editor-controller-repl">
				<ScriptPanel />
			</Tldraw>
		</div>
	)
}

// --- Colors ---
const bg = '#1e1e2e'
const bgSurface = '#181825'
const bgMantle = '#11111b'
const border = '#313244'
const textPrimary = '#cdd6f4'
const textSecondary = '#a6adc8'
const textMuted = '#6c7086'
const accent = '#89b4fa'
const accentHover = '#b4d0fb'
const errorColor = '#f38ba8'
const green = '#a6e3a1'
const mono = 'ui-monospace, "SF Mono", Menlo, Monaco, "Cascadia Code", monospace'

function ScriptPanel() {
	const editor = useEditor()
	const controllerRef = useRef<EditorController | null>(null)
	const [scripts, setScripts] = useState<ScriptFile[]>(loadScripts)
	const [selectedIndex, setSelectedIndex] = useState<number>(() => {
		try {
			const idx = parseInt(localStorage.getItem(SELECTED_SCRIPT_KEY) || '0')
			return isNaN(idx) ? 0 : idx
		} catch {
			return 0
		}
	})
	const [logs, setLogs] = useState<{ text: string; isError: boolean }[]>([])
	const [isRunning, setIsRunning] = useState(false)
	const [panelWidth, setPanelWidth] = useState<number>(() => {
		try {
			const saved = parseInt(localStorage.getItem(PANEL_WIDTH_KEY) || '')
			return isNaN(saved)
				? DEFAULT_PANEL_WIDTH
				: Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, saved))
		} catch {
			return DEFAULT_PANEL_WIDTH
		}
	})
	const [scriptListHeight, setScriptListHeight] = useState<number>(() => {
		try {
			const saved = parseInt(localStorage.getItem(SCRIPT_LIST_HEIGHT_KEY) || '')
			return isNaN(saved)
				? DEFAULT_SCRIPT_LIST_HEIGHT
				: Math.max(MIN_SCRIPT_LIST_HEIGHT, Math.min(MAX_SCRIPT_LIST_HEIGHT, saved))
		} catch {
			return DEFAULT_SCRIPT_LIST_HEIGHT
		}
	})
	const logRef = useRef<HTMLDivElement>(null)
	const scriptListRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const isDraggingRef = useRef(false)

	if (!controllerRef.current) {
		controllerRef.current = new EditorController(editor)
	}

	const selected = scripts[selectedIndex] || scripts[0]

	useEffect(() => {
		saveScripts(scripts)
	}, [scripts])

	useEffect(() => {
		try {
			localStorage.setItem(SELECTED_SCRIPT_KEY, String(selectedIndex))
		} catch {
			// ignore
		}
	}, [selectedIndex])

	useEffect(() => {
		if (logRef.current) {
			logRef.current.scrollTop = logRef.current.scrollHeight
		}
	}, [logs])

	const updateCode = useCallback(
		(code: string) => {
			setScripts((prev) => prev.map((s, i) => (i === selectedIndex ? { ...s, code } : s)))
		},
		[selectedIndex]
	)

	const run = useCallback(() => {
		if (!selected) return
		setIsRunning(true)
		setLogs([])

		const controller = controllerRef.current!
		const printLogs: { text: string; isError: boolean }[] = []
		const print = (...args: unknown[]) => {
			printLogs.push({
				text: args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 2))).join(' '),
				isError: false,
			})
		}

		try {
			const fn = new Function('editor', 'e', 'controller', 'c', 'print', selected.code)
			const result = fn(editor, editor, controller, controller, print)

			if (result !== undefined) {
				let display: string
				if (result === controller) {
					display = '[EditorController]'
				} else if (result instanceof Editor) {
					display = '[Editor]'
				} else {
					try {
						display = JSON.stringify(result, null, 2) ?? 'undefined'
					} catch {
						display = String(result)
					}
				}
				printLogs.push({ text: `→ ${display}`, isError: false })
			}

			setLogs(printLogs)
		} catch (err: unknown) {
			printLogs.push({
				text: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
				isError: true,
			})
			setLogs(printLogs)
		} finally {
			setIsRunning(false)
		}
	}, [editor, selected])

	const addScript = useCallback(() => {
		const name = `Script ${scripts.length + 1}`
		const newScripts = [...scripts, { name, code: '// New script\n\n' }]
		setScripts(newScripts)
		setSelectedIndex(newScripts.length - 1)
		setTimeout(() => {
			textareaRef.current?.focus()
			if (scriptListRef.current) {
				scriptListRef.current.scrollTop = scriptListRef.current.scrollHeight
			}
		}, 0)
	}, [scripts])

	const deleteScript = useCallback(() => {
		if (scripts.length <= 1) return
		const newScripts = scripts.filter((_, i) => i !== selectedIndex)
		setScripts(newScripts)
		setSelectedIndex(Math.min(selectedIndex, newScripts.length - 1))
	}, [scripts, selectedIndex])

	const renameScript = useCallback(
		(index: number) => {
			const current = scripts[index]
			const name = prompt('Rename script:', current.name)
			if (name && name.trim()) {
				setScripts((prev) => prev.map((s, i) => (i === index ? { ...s, name: name.trim() } : s)))
			}
		},
		[scripts]
	)

	const handleResizePointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault()
			e.stopPropagation()
			isDraggingRef.current = true
			const startX = e.clientX
			const startWidth = panelWidth

			const handlePointerMove = (ev: PointerEvent) => {
				const newWidth = Math.max(
					MIN_PANEL_WIDTH,
					Math.min(MAX_PANEL_WIDTH, startWidth + ev.clientX - startX)
				)
				setPanelWidth(newWidth)
			}

			const handlePointerUp = () => {
				isDraggingRef.current = false
				document.removeEventListener('pointermove', handlePointerMove)
				document.removeEventListener('pointerup', handlePointerUp)
				setPanelWidth((w) => {
					try {
						localStorage.setItem(PANEL_WIDTH_KEY, String(w))
					} catch {
						/* ignore */
					}
					return w
				})
			}

			document.addEventListener('pointermove', handlePointerMove)
			document.addEventListener('pointerup', handlePointerUp)
		},
		[panelWidth]
	)

	const handleScriptListResizePointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault()
			e.stopPropagation()
			const startY = e.clientY
			const startHeight = scriptListHeight

			const handlePointerMove = (ev: PointerEvent) => {
				const newHeight = Math.max(
					MIN_SCRIPT_LIST_HEIGHT,
					Math.min(MAX_SCRIPT_LIST_HEIGHT, startHeight + ev.clientY - startY)
				)
				setScriptListHeight(newHeight)
			}

			const handlePointerUp = () => {
				document.removeEventListener('pointermove', handlePointerMove)
				document.removeEventListener('pointerup', handlePointerUp)
				setScriptListHeight((h) => {
					try {
						localStorage.setItem(SCRIPT_LIST_HEIGHT_KEY, String(h))
					} catch {
						/* ignore */
					}
					return h
				})
			}

			document.addEventListener('pointermove', handlePointerMove)
			document.addEventListener('pointerup', handlePointerUp)
		},
		[scriptListHeight]
	)

	const handleEditorKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			e.stopPropagation()
			if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
				e.preventDefault()
				run()
			}
		},
		[run]
	)

	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				bottom: 0,
				width: panelWidth,
				zIndex: 1000,
				background: bg,
				borderRight: `1px solid ${border}`,
				display: 'flex',
				flexDirection: 'column',
				fontFamily: mono,
				fontSize: 13,
			}}
			onPointerDown={(e) => e.stopPropagation()}
		>
			{/* Resize handle */}
			<div
				onPointerDown={handleResizePointerDown}
				style={{
					position: 'absolute',
					top: 0,
					right: -3,
					bottom: 0,
					width: 6,
					cursor: 'col-resize',
					zIndex: 1001,
				}}
			/>
			{/* Script list */}
			<div
				style={{
					background: bgMantle,
					display: 'flex',
					flexDirection: 'column',
					height: scriptListHeight,
					flexShrink: 0,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '6px 10px',
						borderBottom: `1px solid ${border}`,
					}}
				>
					<span
						style={{
							color: textMuted,
							fontSize: 11,
							fontWeight: 600,
							textTransform: 'uppercase',
							letterSpacing: '0.05em',
						}}
					>
						Scripts
					</span>
					<div style={{ display: 'flex', gap: 4 }}>
						<ToolbarButton title="New script" onClick={addScript}>
							+
						</ToolbarButton>
						<ToolbarButton
							title="Delete script"
							onClick={deleteScript}
							disabled={scripts.length <= 1}
						>
							×
						</ToolbarButton>
					</div>
				</div>
				<div ref={scriptListRef} style={{ flex: 1, overflow: 'auto' }}>
					{scripts.map((script, i) => (
						<div
							key={i}
							onClick={() => {
								setSelectedIndex(i)
								setLogs([])
							}}
							onDoubleClick={() => renameScript(i)}
							style={{
								padding: '5px 12px',
								cursor: 'pointer',
								color: i === selectedIndex ? accent : textSecondary,
								background: i === selectedIndex ? bgSurface : 'transparent',
								borderLeft: i === selectedIndex ? `2px solid ${accent}` : '2px solid transparent',
								fontSize: 12,
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
							}}
						>
							{script.name}
						</div>
					))}
				</div>
			</div>

			{/* Script list / editor resize handle */}
			<div
				onPointerDown={handleScriptListResizePointerDown}
				style={{
					height: 6,
					marginTop: -3,
					marginBottom: -3,
					cursor: 'row-resize',
					zIndex: 1001,
					position: 'relative',
					flexShrink: 0,
					borderTop: `1px solid ${border}`,
				}}
			/>

			{/* Toolbar */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					padding: '6px 10px',
					borderBottom: `1px solid ${border}`,
					background: bgSurface,
				}}
			>
				<button
					onClick={run}
					disabled={isRunning}
					title="Run (⌘+Enter)"
					style={{
						background: green,
						color: bgMantle,
						border: 'none',
						borderRadius: 4,
						padding: '3px 10px',
						fontFamily: 'inherit',
						fontSize: 12,
						fontWeight: 700,
						cursor: isRunning ? 'wait' : 'pointer',
						display: 'flex',
						alignItems: 'center',
						gap: 4,
					}}
				>
					▶ Run
				</button>
				<span
					style={{
						color: textPrimary,
						fontSize: 12,
						fontWeight: 500,
						flex: 1,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{selected?.name}
				</span>
				<span style={{ color: textMuted, fontSize: 11 }}>⌘↵</span>
			</div>

			{/* Code editor */}
			<div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
				<textarea
					ref={textareaRef}
					value={selected?.code || ''}
					onChange={(e) => updateCode(e.target.value)}
					onKeyDown={handleEditorKeyDown}
					spellCheck={false}
					autoCapitalize="off"
					autoCorrect="off"
					style={{
						width: '100%',
						height: '100%',
						background: bg,
						color: textPrimary,
						border: 'none',
						outline: 'none',
						resize: 'none',
						padding: '10px 12px',
						fontFamily: mono,
						fontSize: 13,
						lineHeight: 1.5,
						tabSize: 2,
						boxSizing: 'border-box',
					}}
				/>
			</div>

			{/* Console output */}
			{logs.length > 0 && (
				<div
					ref={logRef}
					style={{
						borderTop: `1px solid ${border}`,
						background: bgMantle,
						maxHeight: 150,
						overflow: 'auto',
						padding: '6px 12px',
					}}
				>
					{logs.map((log, i) => (
						<div
							key={i}
							style={{
								color: log.isError ? errorColor : textSecondary,
								whiteSpace: 'pre-wrap',
								wordBreak: 'break-all',
								fontSize: 12,
								lineHeight: 1.5,
							}}
						>
							{log.text}
						</div>
					))}
				</div>
			)}
		</div>
	)
}

function ToolbarButton({
	children,
	onClick,
	title,
	disabled,
}: {
	children: React.ReactNode
	onClick: () => void
	title: string
	disabled?: boolean
}) {
	return (
		<button
			onClick={onClick}
			title={title}
			disabled={disabled}
			style={{
				background: 'transparent',
				border: `1px solid ${border}`,
				borderRadius: 4,
				color: disabled ? textMuted : textSecondary,
				cursor: disabled ? 'default' : 'pointer',
				fontFamily: mono,
				fontSize: 14,
				lineHeight: 1,
				padding: '2px 6px',
				opacity: disabled ? 0.4 : 1,
			}}
		>
			{children}
		</button>
	)
}
