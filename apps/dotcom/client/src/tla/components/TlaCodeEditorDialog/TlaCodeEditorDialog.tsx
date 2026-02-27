import Editor, { loader, type OnMount } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { type KeyboardEvent, memo, useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { isCodeEditorOpenAtom } from './code-editor-state'
import styles from './code-editor.module.css'

// Use locally bundled Monaco instead of CDN to avoid CSP issues
loader.config({ monaco })

// Configure Monaco workers for Vite
self.MonacoEnvironment = {
	getWorker(_: string, label: string) {
		if (label === 'typescript' || label === 'javascript') {
			return new Worker(
				new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
				{ type: 'module' }
			)
		}
		return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), {
			type: 'module',
		})
	},
}

// Module-level timer tracking so animations persist after panel closes.
// Timers are only cleared when running new code.
const activeTimers = new Set<number>()

function clearActiveTimers() {
	for (const id of activeTimers) {
		clearInterval(id)
		clearTimeout(id)
	}
	activeTimers.clear()
}

const DEFAULT_CODE = `const cx = 400, cy = 300
const scale3d = 200
const cameraZ = 2
const padding = 150

// Single-point draw path (renders as a dot)
const dotPath = 'AAAAAAAAAAAAAAA/'

function project({ x, y, z }) {
  return { x: x / z, y: y / z }
}

function rotateX({ x, y, z }, a) {
  const c = Math.cos(a), s = Math.sin(a)
  return { x, y: y*c - z*s, z: y*s + z*c }
}

function rotateY({ x, y, z }, a) {
  const c = Math.cos(a), s = Math.sin(a)
  return { x: x*c + z*s, y, z: -x*s + z*c }
}

const minFactor = 1.62, maxFactor = 2.0

const numPoints = 160
const goldenRatio = (1 + Math.sqrt(5)) / 2

const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'violet']
const sizes = ['s', 'm', 'l', 'xl']
const shapeIds = []
for (let i = 0; i < numPoints; i++) {
  const id = 'shape:sphere-' + i
  editor.createShape({
    id,
    type: 'draw',
    x: cx,
    y: cy,
    props: {
      segments: [{ type: 'free', path: dotPath }],
      color: colors[i % 6],
      size: sizes[i % 4],
      isComplete: true,
    }
  })
  shapeIds.push(id)
}

const interval = setInterval(() => {
  const now = Date.now() / 1000
  const time = now * 0.18
  const angleX = now * 0.24
  const angleY = now * 0.30

  const t = (1 - Math.cos(time * 0.5)) / 2
  const spiralFactor = minFactor + t * (maxFactor - minFactor)

  const points = []
  for (let i = 0; i < numPoints; i++) {
    const theta = spiralFactor * Math.PI * i / goldenRatio
    const phi = Math.acos(1 - 2 * (i + 0.5) / numPoints)
    points.push({
      x: Math.sin(phi) * Math.cos(theta),
      y: Math.cos(phi),
      z: Math.sin(phi) * Math.sin(theta),
      idx: i
    })
  }

  const breathe = 1 + 0.1 * Math.sin(time * 1.5)

  const updates = shapeIds.map((id, i) => {
    const pt = points[i]

    const wobbleX = Math.sin(time * 2 + pt.idx * 0.5) * 0.03
    const wobbleY = Math.cos(time * 1.7 + pt.idx * 0.3) * 0.03

    let p = {
      x: (pt.x + wobbleX) * breathe,
      y: (pt.y + wobbleY) * breathe,
      z: pt.z * breathe
    }

    p = rotateX(p, angleX)
    p = rotateY(p, angleY)

    const z = p.z + cameraZ
    const proj = project({ x: p.x, y: p.y, z })
    const screenX = cx + proj.x * scale3d
    const screenY = cy - proj.y * scale3d

    const depth = 1 - (p.z / breathe + 1) / 2
    const dotScale = 0.5 + depth * 1.5
    const colorIdx = Math.floor(time * 0.5 + pt.idx * 0.1) % 6

    return {
      id,
      type: 'draw',
      x: screenX,
      y: screenY,
      props: { color: colors[colorIdx], scale: dotScale },
      opacity: Math.min(1, Math.max(0, 0.3 + depth * 0.7))
    }
  })

  editor.updateShapes(updates)
}, 50)

// Invisible bounding box to control zoom level
editor.createShape({
  type: 'geo',
  x: cx - scale3d - padding,
  y: cy - scale3d - padding,
  props: {
    geo: 'rectangle',
    w: (scale3d + padding) * 2,
    h: (scale3d + padding) * 2,
  },
  opacity: 0
})

editor.zoomToFit({ animation: { duration: 400 } })
`

export const TlaCodeEditorPanel = memo(function TlaCodeEditorPanel() {
	const isOpen = useValue('code-editor-open', () => isCodeEditorOpenAtom.get(), [])
	const tldrawEditor = useEditor()
	const isDark = useValue('dark', () => tldrawEditor.user.getIsDarkMode(), [tldrawEditor])
	const panelRef = useRef<HTMLDivElement | null>(null)
	const [code, setCode] = useState(DEFAULT_CODE)
	const [output, setOutput] = useState<string[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isRunning, setIsRunning] = useState(false)
	const [showHelp, setShowHelp] = useState(false)
	const codeRef = useRef(code)
	codeRef.current = code

	const handleClose = useCallback(() => {
		isCodeEditorOpenAtom.set(false)
	}, [])

	const runCode = useCallback(() => {
		setIsRunning(true)
		setError(null)

		// Clear previous timers
		clearActiveTimers()

		// Capture console output
		const logs: string[] = []
		const mockConsole = {
			log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
			warn: (...args: unknown[]) => logs.push(`⚠ ${args.map(String).join(' ')}`),
			error: (...args: unknown[]) => logs.push(`✕ ${args.map(String).join(' ')}`),
			info: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
		}

		// Tracked timer wrappers that batch editor updates
		const trackedSetInterval = (fn: () => void, ms: number) => {
			const id = window.setInterval(() => {
				tldrawEditor.run(fn)
			}, ms)
			activeTimers.add(id)
			return id
		}
		const trackedSetTimeout = (fn: () => void, ms: number) => {
			const id = window.setTimeout(() => {
				activeTimers.delete(id)
				tldrawEditor.run(fn)
			}, ms)
			activeTimers.add(id)
			return id
		}
		const trackedClearInterval = (id: number) => {
			window.clearInterval(id)
			activeTimers.delete(id)
		}
		const trackedClearTimeout = (id: number) => {
			window.clearTimeout(id)
			activeTimers.delete(id)
		}

		const currentCode = codeRef.current
		const markId = tldrawEditor.markHistoryStoppingPoint('code-editor-run')

		try {
			const fn = new Function(
				'editor',
				'console',
				'setInterval',
				'setTimeout',
				'clearInterval',
				'clearTimeout',
				currentCode
			)
			let userError: unknown = null
			tldrawEditor.run(() => {
				try {
					fn(
						tldrawEditor,
						mockConsole,
						trackedSetInterval,
						trackedSetTimeout,
						trackedClearInterval,
						trackedClearTimeout
					)
				} catch (e) {
					userError = e
				}
			})
			if (userError) {
				tldrawEditor.bailToMark(markId)
				const message = userError instanceof Error ? userError.message : String(userError)
				setError(message)
			}
			setOutput(logs)
		} catch (e) {
			tldrawEditor.bailToMark(markId)
			const message = e instanceof Error ? e.message : String(e)
			setError(message)
			setOutput(logs)
		} finally {
			setIsRunning(false)
		}
	}, [tldrawEditor])

	// Stop propagation of key events so they don't reach tldraw
	// but allow Cmd+Enter to run code and Escape to close
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			e.stopPropagation()
			if (e.key === 'Escape') {
				e.preventDefault()
				handleClose()
			}
		},
		[handleClose]
	)
	const handleKeyUp = useCallback((e: KeyboardEvent) => {
		e.stopPropagation()
	}, [])

	const handleEditorMount: OnMount = useCallback(
		(editor) => {
			editor.focus()
			editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
				runCode()
			})
			editor.onKeyDown((e) => {
				if (e.metaKey && e.keyCode === monaco.KeyCode.Enter) {
					e.preventDefault()
					e.stopPropagation()
					runCode()
				}
			})
		},
		[runCode]
	)

	useEffect(() => {
		const onWindowKeyDown = (e: globalThis.KeyboardEvent) => {
			if (!isOpen) return
			if (!e.metaKey || e.key !== 'Enter') return
			const panel = panelRef.current
			if (!panel) return
			const active = document.activeElement
			if (active && !panel.contains(active)) return
			e.preventDefault()
			e.stopPropagation()
			runCode()
		}
		window.addEventListener('keydown', onWindowKeyDown, true)
		return () => window.removeEventListener('keydown', onWindowKeyDown, true)
	}, [isOpen, runCode])

	return (
		<div
			ref={panelRef}
			className={styles.panel}
			style={{ display: isOpen ? undefined : 'none' }}
			onKeyDown={handleKeyDown}
			onKeyUp={handleKeyUp}
		>
			<div className={styles.header}>
				<span className={styles.title}>Developer mode</span>
				<button
					className={styles.helpButton}
					aria-label="Help"
					onClick={() => setShowHelp(!showHelp)}
				>
					<TlaIcon icon="question" />
				</button>
				<div className={styles.headerActions}>
					<button
						id="tla-code-editor-run-btn"
						className={styles.runButton}
						onClick={runCode}
						disabled={isRunning}
					>
						Run ⌘⏎
					</button>
				</div>
				<button className={styles.closeButton} onClick={handleClose} aria-label="Close">
					✕
				</button>
			</div>
			{showHelp && (
				<div className={styles.helpPanel}>
					<p>
						Write JavaScript that controls the tldraw canvas. Your code has access to the{' '}
						<code>editor</code> object — use it to create, update, and delete shapes.
					</p>
					<p>
						Use <code>setInterval</code> and <code>setTimeout</code> for animations. Timers persist
						after closing the panel and are cleared when you run new code.
					</p>
				</div>
			)}
			<div className={styles.editorContainer}>
				<Editor
					defaultValue={DEFAULT_CODE}
					language="javascript"
					theme={isDark ? 'vs-dark' : 'light'}
					onChange={(value) => setCode(value ?? '')}
					onMount={handleEditorMount}
					options={{
						minimap: { enabled: false },
						fontSize: 13,
						fontFamily:
							"'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
						lineNumbers: 'on',
						scrollBeyondLastLine: false,
						automaticLayout: true,
						tabSize: 2,
						wordWrap: 'on',
						padding: { top: 12 },
						overviewRulerLanes: 0,
						hideCursorInOverviewRuler: true,
						overviewRulerBorder: false,
						scrollbar: {
							vertical: 'hidden',
							horizontal: 'hidden',
						},
					}}
				/>
			</div>
			{(output.length > 0 || error) && (
				<div className={styles.outputPanel}>
					<div className={styles.outputHeader}>Output</div>
					<div className={styles.outputContent}>
						{output.map((line, i) => (
							<div key={i} className={styles.outputLine}>
								{line}
							</div>
						))}
						{error && <div className={styles.errorLine}>{error}</div>}
					</div>
				</div>
			)}
		</div>
	)
})
