import Editor, { loader, type OnMount } from '@monaco-editor/react'
import { b64Vecs } from '@tldraw/tlschema'
import * as monaco from 'monaco-editor'
import {
	type KeyboardEvent,
	memo,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createShapeId, useEditor, useValue } from 'tldraw'
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
const FALLBACK_INSPECTOR_WIDTH = 300
const FALLBACK_INSPECTOR_HEIGHT = 300
const INSPECTOR_MARGIN = 8
const INSPECTOR_BOTTOM_GAP = 56

function clampPanelPosition(
	position: { x: number; y: number },
	width: number,
	height: number,
	containerWidth: number,
	containerHeight: number
) {
	const maxX = Math.max(INSPECTOR_MARGIN, containerWidth - width - INSPECTOR_MARGIN)
	const maxY = Math.max(INSPECTOR_MARGIN, containerHeight - height - INSPECTOR_MARGIN)
	return {
		x: Math.min(Math.max(position.x, INSPECTOR_MARGIN), maxX),
		y: Math.min(Math.max(position.y, INSPECTOR_MARGIN), maxY),
	}
}

function getInspectorSize(panel: HTMLElement | null) {
	return {
		width: panel?.offsetWidth ?? FALLBACK_INSPECTOR_WIDTH,
		height: panel?.offsetHeight ?? FALLBACK_INSPECTOR_HEIGHT,
	}
}

function clearActiveTimers() {
	for (const id of activeTimers) {
		clearInterval(id)
		clearTimeout(id)
	}
	activeTimers.clear()
}

const DEFAULT_CODE = `clearCanvas()

const cx = 400, cy = 300
const scale3d = 200
const cameraZ = 2
const padding = 150

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
  if (!editor.getShape(id)) {
    createDot(cx, cy, {
      color: colors[i % 6],
      size: sizes[i % 4],
    }, id)
  }
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
if (!editor.getShape('shape:sphere-bounds')) {
  editor.createShape({
    id: 'shape:sphere-bounds',
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
}

editor.zoomToFit({ animation: { duration: 400 } })
`

export const TlaCodeEditorPanel = memo(function TlaCodeEditorPanel() {
	const isOpen = useValue('code-editor-open', () => isCodeEditorOpenAtom.get(), [])
	const tldrawEditor = useEditor()
	const isDark = useValue('dark', () => tldrawEditor.user.getIsDarkMode(), [tldrawEditor])
	const panelRef = useRef<HTMLDivElement | null>(null)
	const inspectorPanelRef = useRef<HTMLDivElement | null>(null)
	const inspectorDragStateRef = useRef<{
		pointerId: number
		offsetX: number
		offsetY: number
	} | null>(null)
	const [code, setCode] = useState(DEFAULT_CODE)
	const [output, setOutput] = useState<string[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isRunning, setIsRunning] = useState(false)
	const [showHelp, setShowHelp] = useState(false)
	const [isInspectorDragging, setIsInspectorDragging] = useState(false)
	const [isInspectorMinimized, setIsInspectorMinimized] = useState(false)
	const [inspectorPosition, setInspectorPosition] = useState<{ x: number; y: number } | null>(null)
	const codeRef = useRef(code)
	codeRef.current = code
	const selectedShapes = useValue('dev-selected-shapes', () => tldrawEditor.getSelectedShapes(), [
		tldrawEditor,
	])
	const camera = useValue('dev-camera', () => tldrawEditor.getCamera(), [tldrawEditor])
	const allRecords = useValue('dev-all-records', () => tldrawEditor.store.allRecords(), [
		tldrawEditor,
	])
	const selectedShapeIds = selectedShapes.map((shape) => shape.id)
	const selectedShapeIdSet = useMemo(
		() => new Set(selectedShapeIds.map((id) => String(id))),
		[selectedShapeIds]
	)
	const primarySelectedShape = selectedShapes[0] ?? null
	const selectedBindings = useMemo(() => {
		if (!selectedShapeIdSet.size) return []
		return allRecords.filter((record) => {
			if (record.typeName !== 'binding') return false
			const binding = record as {
				fromId?: string
				toId?: string
			}
			return (
				(binding.fromId && selectedShapeIdSet.has(String(binding.fromId))) ||
				(binding.toId && selectedShapeIdSet.has(String(binding.toId)))
			)
		}) as Array<{
			id: string
			typeName: string
			type?: string
			fromId?: string
			toId?: string
			props?: Record<string, unknown>
		}>
	}, [allRecords, selectedShapeIdSet])
	const storeSummary = useMemo(() => {
		const counts = new Map<string, number>()
		for (const record of allRecords) {
			counts.set(record.typeName, (counts.get(record.typeName) ?? 0) + 1)
		}
		return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
	}, [allRecords])
	const primaryShapePropsJson = useMemo(() => {
		if (!primarySelectedShape) return ''
		return JSON.stringify(primarySelectedShape.props, null, 2)
	}, [primarySelectedShape])

	const handleClose = useCallback(() => {
		isCodeEditorOpenAtom.set(false)
	}, [])

	useEffect(() => {
		if (!isOpen || inspectorPosition) return
		const panel = panelRef.current
		const inspectorPanel = inspectorPanelRef.current
		const { width: inspectorWidth, height: inspectorHeight } = getInspectorSize(inspectorPanel)
		const offsetParent = panel?.offsetParent as HTMLElement | null
		const containerWidth = offsetParent?.clientWidth ?? window.innerWidth
		const containerHeight = offsetParent?.clientHeight ?? window.innerHeight
		const defaultPosition = clampPanelPosition(
			{
				x: containerWidth - inspectorWidth - INSPECTOR_MARGIN,
				y: containerHeight - inspectorHeight - INSPECTOR_BOTTOM_GAP,
			},
			inspectorWidth,
			inspectorHeight,
			containerWidth,
			containerHeight
		)
		setInspectorPosition(defaultPosition)
	}, [inspectorPosition, isOpen])

	const handleInspectorPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
		if (e.button !== 0) return
		const panel = e.currentTarget.parentElement
		if (!panel) return
		const rect = panel.getBoundingClientRect()
		inspectorDragStateRef.current = {
			pointerId: e.pointerId,
			offsetX: e.clientX - rect.left,
			offsetY: e.clientY - rect.top,
		}
		e.currentTarget.setPointerCapture(e.pointerId)
		setIsInspectorDragging(true)
		e.preventDefault()
	}, [])

	const handleInspectorPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
		const dragState = inspectorDragStateRef.current
		if (!dragState || dragState.pointerId !== e.pointerId) return
		const panel = e.currentTarget.parentElement
		if (!panel) return
		const { width: inspectorWidth, height: inspectorHeight } = getInspectorSize(panel)
		const offsetParent = panel.offsetParent as HTMLElement | null
		const containerRect = offsetParent?.getBoundingClientRect()
		const containerWidth = offsetParent?.clientWidth ?? window.innerWidth
		const containerHeight = offsetParent?.clientHeight ?? window.innerHeight
		const nextPosition = clampPanelPosition(
			{
				x: e.clientX - dragState.offsetX - (containerRect?.left ?? 0),
				y: e.clientY - dragState.offsetY - (containerRect?.top ?? 0),
			},
			inspectorWidth,
			inspectorHeight,
			containerWidth,
			containerHeight
		)
		setInspectorPosition(nextPosition)
	}, [])

	const handleInspectorPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
		const dragState = inspectorDragStateRef.current
		if (!dragState || dragState.pointerId !== e.pointerId) return
		inspectorDragStateRef.current = null
		e.currentTarget.releasePointerCapture(e.pointerId)
		setIsInspectorDragging(false)
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
		const clearCanvas = () => {
			const ids = [...tldrawEditor.getCurrentPageShapeIds()]
			if (ids.length) {
				tldrawEditor.deleteShapes(ids)
			}
		}

		const dotPath = b64Vecs.encodePoints([{ x: 0, y: 0, z: 0.5 }])
		const createDot = (
			x: number,
			y: number,
			options: Record<string, unknown> = {},
			id = createShapeId()
		) => {
			tldrawEditor.createShapes([
				{
					id,
					type: 'draw',
					x,
					y,
					props: {
						segments: [{ type: 'free', path: dotPath }],
						isComplete: true,
						...options,
					},
				},
			])
			return id
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
				'createDot',
				'clearCanvas',
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
						trackedClearTimeout,
						createDot,
						clearCanvas
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
		<>
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
							<code>editor</code> object plus helpers like <code>createDot</code> and{' '}
							<code>clearCanvas()</code>.
						</p>
						<p>
							Use <code>setInterval</code> and <code>setTimeout</code> for animations. Timers
							persist after closing the panel and are cleared when you run new code.
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

			<div
				ref={inspectorPanelRef}
				className={styles.inspectorPanel}
				data-minimized={isInspectorMinimized}
				style={{
					display: isOpen ? undefined : 'none',
					left: inspectorPosition?.x ?? -10000,
					top: inspectorPosition?.y ?? -10000,
				}}
			>
				<div
					className={styles.inspectorHeader}
					data-dragging={isInspectorDragging}
					onPointerDown={handleInspectorPointerDown}
					onPointerMove={handleInspectorPointerMove}
					onPointerUp={handleInspectorPointerUp}
					onPointerCancel={handleInspectorPointerUp}
				>
					<span className={styles.title}>Debug inspector</span>
					<button
						className={styles.minimizeDot}
						data-minimized={isInspectorMinimized}
						onPointerDown={(e) => e.stopPropagation()}
						onClick={() => setIsInspectorMinimized(!isInspectorMinimized)}
						aria-label={isInspectorMinimized ? 'Expand inspector' : 'Minimize inspector'}
					/>
				</div>
				{!isInspectorMinimized && (
					<div className={styles.inspectorContent}>
						<div className={styles.inspectorSection}>
							<div className={styles.inspectorSectionTitle}>Selection</div>
							<div className={styles.inspectorBody}>
								<div className={styles.inspectorMeta}>Count: {selectedShapes.length}</div>
								{primarySelectedShape ? (
									<div className={styles.inspectorMeta}>
										Primary: {primarySelectedShape.type} ({primarySelectedShape.id})
									</div>
								) : (
									<div className={styles.inspectorMeta}>No selected shape</div>
								)}
								{selectedShapeIds.length > 0 && (
									<div className={styles.inspectorList}>
										{selectedShapeIds.map((id) => (
											<div key={id} className={styles.inspectorListItem}>
												{id}
											</div>
										))}
									</div>
								)}
							</div>
						</div>
						<div className={styles.inspectorSection}>
							<div className={styles.inspectorSectionTitle}>Shape props</div>
							<div className={styles.inspectorBody}>
								{primaryShapePropsJson ? (
									<pre className={styles.inspectorCode}>{primaryShapePropsJson}</pre>
								) : (
									<div className={styles.inspectorMeta}>Select a shape to inspect props</div>
								)}
							</div>
						</div>
						<div className={styles.inspectorSection}>
							<div className={styles.inspectorSectionTitle}>Bindings</div>
							<div className={styles.inspectorBody}>
								<div className={styles.inspectorMeta}>Connected: {selectedBindings.length}</div>
								{selectedBindings.length > 0 && (
									<div className={styles.inspectorList}>
										{selectedBindings.map((binding) => (
											<div key={binding.id} className={styles.inspectorListItem}>
												{binding.type ?? binding.typeName}: {binding.fromId} → {binding.toId}
											</div>
										))}
									</div>
								)}
							</div>
						</div>
						<div className={styles.inspectorSection}>
							<div className={styles.inspectorSectionTitle}>Store</div>
							<div className={styles.inspectorBody}>
								<div className={styles.inspectorMeta}>Page: {tldrawEditor.getCurrentPageId()}</div>
								<div className={styles.inspectorMeta}>
									Camera: x {camera.x.toFixed(1)}, y {camera.y.toFixed(1)}, z {camera.z.toFixed(2)}
								</div>
								<div className={styles.inspectorMeta}>Records: {allRecords.length}</div>
								<div className={styles.inspectorList}>
									{storeSummary.map(([typeName, count]) => (
										<div key={typeName} className={styles.inspectorListItem}>
											{typeName}: {count}
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	)
})
