import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Box, Editor, Tldraw, createShapeId } from 'tldraw'
import { useApp, useDocumentTheme, useHostStyles, type App } from '@modelcontextprotocol/ext-apps/react'
import 'tldraw/tldraw.css'

interface McpShape {
	id: string
	type: string
	x: number
	y: number
	rotation?: number
	props?: Record<string, unknown>
	parentId?: string
	[key: string]: unknown
}

interface McpBinding {
	arrowShapeId: string
	targetShapeId: string
	terminal: 'start' | 'end'
}

interface DiagramData {
	shapes: McpShape[]
	bindings: McpBinding[]
	title?: string
}

interface SvgResult {
	html: string
	width: number
	height: number
}

const EDITOR_W = 800
const EDITOR_H = 600
const TITLE_H = 36
const MIN_HEIGHT = 200
const MAX_HEIGHT = 1200
const SVG_PADDING = 48

/** Ensure the editor viewport has valid dimensions (iframe may start at 0×0). */
function ensureViewport(editor: Editor) {
	const bounds = editor.getViewportScreenBounds()
	if (bounds.w < 1 || bounds.h < 1) {
		editor.updateViewportScreenBounds(new Box(0, 0, EDITOR_W, EDITOR_H))
	}
}

/** Apply shapes and bindings to the tldraw editor, then export SVG. */
async function applyAndExport(
	editor: Editor,
	data: DiagramData,
	colorScheme?: 'light' | 'dark'
): Promise<SvgResult | null> {
	// Clear existing shapes
	const existingIds = editor.getCurrentPageShapeIds()
	if (existingIds.size > 0) {
		editor.deleteShapes([...existingIds])
	}

	if (data.shapes.length === 0) return null

	// Create shapes
	const shapesToCreate = data.shapes.map((shape) => ({
		id: createShapeId(shape.id.replace('shape:', '') || undefined),
		type: shape.type,
		x: shape.x,
		y: shape.y,
		rotation: shape.rotation ?? 0,
		props: shape.props ?? {},
	}))

	editor.createShapes(shapesToCreate)

	// Create arrow bindings
	if (data.bindings.length > 0) {
		for (const binding of data.bindings) {
			const arrowId = createShapeId(binding.arrowShapeId.replace('shape:', ''))
			const targetId = createShapeId(binding.targetShapeId.replace('shape:', ''))
			if (!editor.getShape(arrowId) || !editor.getShape(targetId)) continue
			editor.createBinding({
				type: 'arrow',
				fromId: arrowId,
				toId: targetId,
				props: {
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
					terminal: binding.terminal,
				},
				meta: {},
			})
		}
	}

	// Apply color scheme for correct SVG export
	if (colorScheme) {
		editor.user.updateUserPreferences({ colorScheme })
	}

	// Make sure viewport is valid before export
	ensureViewport(editor)

	// Delay to let shapes settle and editor render before SVG export
	await new Promise((r) => setTimeout(r, 150))
	const result = await editor.getSvgString([], {
		background: true,
		padding: SVG_PADDING,
	})
	if (!result) return null

	// Strip fixed width/height — the SVG scales via viewBox + CSS
	let svg = result.svg
	svg = svg.replace(/\s+width="[^"]*"/, '')
	svg = svg.replace(/\s+height="[^"]*"/, '')
	return { html: svg, width: result.width, height: result.height }
}

function McpApp() {
	const editorRef = useRef<Editor | null>(null)
	const appRef = useRef<App | null>(null)
	const dataRef = useRef<DiagramData | null>(null)
	const containerRef = useRef<HTMLDivElement | null>(null)
	const [svgResult, setSvgResult] = useState<SvgResult | null>(null)
	const [title, setTitle] = useState<string>('')
	const [displayHeight, setDisplayHeight] = useState(400)

	const resizeToFit = useCallback(
		(svg: SvgResult, hasTitle: boolean) => {
			// Measure actual container width from the DOM
			const containerWidth = containerRef.current?.clientWidth ?? 700
			const aspectRatio = svg.height / svg.width
			const svgDisplayHeight = Math.round(containerWidth * aspectRatio)
			const titleExtra = hasTitle ? TITLE_H : 0
			const totalHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, svgDisplayHeight + titleExtra))

			setDisplayHeight(totalHeight)
			appRef.current?.sendSizeChanged({ height: totalHeight }).catch(() => {})
		},
		[]
	)

	const pendingSchemeRef = useRef<'light' | 'dark' | undefined>(undefined)

	const renderDiagram = useCallback(async (scheme?: 'light' | 'dark') => {
		const editor = editorRef.current
		const data = dataRef.current
		if (!editor || !data) {
			// Editor not ready — store scheme for later retry
			pendingSchemeRef.current = scheme
			return
		}

		try {
			let result = await applyAndExport(editor, data, scheme)
			// Retry once with a longer delay if SVG export failed
			if (!result && data.shapes.length > 0) {
				await new Promise((r) => setTimeout(r, 300))
				result = await applyAndExport(editor, data, scheme)
			}
			if (result) {
				setSvgResult(result)
				resizeToFit(result, !!(data.title))
				pendingSchemeRef.current = undefined
			}
		} catch {
			// Editor may not be fully ready — will retry on mount or timer
			pendingSchemeRef.current = scheme
		}
	}, [resizeToFit])

	const appInstanceRef = useRef<App | null>(null)
	const theme = useDocumentTheme(appInstanceRef.current)
	const themeRef = useRef(theme)
	themeRef.current = theme
	useHostStyles(appInstanceRef.current)

	const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff'
	const titleBg = theme === 'dark' ? '#2a2a2a' : '#fafafa'
	const titleBorder = theme === 'dark' ? '#444' : '#e5e5e5'
	const titleColor = theme === 'dark' ? '#e0e0e0' : undefined

	useApp({
		appInfo: { name: 'tldraw', version: '1.0.0' },
		onAppCreated: (app) => {
			appInstanceRef.current = app
			appRef.current = app
			app.sendSizeChanged({ height: 400 }).catch(() => {})

			app.ontoolresult = (result: Record<string, unknown>) => {
				const sc = result.structuredContent as DiagramData | undefined
				if (sc?.shapes) {
					dataRef.current = {
						shapes: sc.shapes,
						bindings: sc.bindings ?? [],
						title: sc.title,
					}
					setTitle(sc.title ?? '')
					const scheme = themeRef.current === 'dark' ? 'dark' : 'light'
					renderDiagram(scheme)
				}
			}
		},
	})

	const handleMount = useCallback(
		(editor: Editor) => {
			editorRef.current = editor
			ensureViewport(editor)
			if (dataRef.current) {
				// Give the editor time to fully initialize its rendering pipeline
				const scheme = pendingSchemeRef.current
				setTimeout(() => renderDiagram(scheme), 100)
			}
		},
		[renderDiagram]
	)

	// Auto-retry: if data arrived but SVG hasn't rendered yet, keep trying
	useEffect(() => {
		if (svgResult) return
		if (!dataRef.current) return

		const timer = setInterval(() => {
			if (!editorRef.current || !dataRef.current) return
			const scheme = pendingSchemeRef.current ?? (themeRef.current === 'dark' ? 'dark' : 'light')
			renderDiagram(scheme)
		}, 1000)

		return () => clearInterval(timer)
	}, [svgResult, renderDiagram])

	// Re-measure on window resize (host may resize iframe)
	useEffect(() => {
		if (!svgResult) return
		const onResize = () => resizeToFit(svgResult, !!title)
		window.addEventListener('resize', onResize)
		return () => window.removeEventListener('resize', onResize)
	}, [svgResult, title, resizeToFit])

	// Re-render when theme changes
	useEffect(() => {
		if (!dataRef.current || !editorRef.current) return
		const scheme = theme === 'dark' ? 'dark' : 'light'
		renderDiagram(scheme)
	}, [theme, renderDiagram])

	const svgAreaHeight = displayHeight - (title ? TITLE_H : 0)

	return (
		<div ref={containerRef} style={{ width: '100%', height: displayHeight, background: bgColor, position: 'relative' }}>
			{/* Hidden tldraw editor — used only for shape creation + SVG export */}
			<div
				style={{
					position: 'absolute',
					left: -9999,
					top: 0,
					width: EDITOR_W,
					height: EDITOR_H,
					overflow: 'hidden',
				}}
			>
				<Tldraw hideUi onMount={handleMount} />
			</div>

			{/* Title bar */}
			{title && (
				<div
					style={{
						padding: '8px 12px',
						fontWeight: 600,
						fontSize: 14,
						borderBottom: `1px solid ${titleBorder}`,
						background: titleBg,
						color: titleColor,
					}}
				>
					{title}
				</div>
			)}

			{/* SVG output — scales via viewBox to fill available space */}
			{svgResult ? (
				<div
					className="svg-container"
					style={{
						width: '100%',
						height: svgAreaHeight,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						overflow: 'hidden',
					}}
					dangerouslySetInnerHTML={{ __html: svgResult.html }}
				/>
			) : (
				<div
					style={{
						width: '100%',
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: '#999',
						fontSize: 14,
					}}
				>
					Waiting for diagram data...
				</div>
			)}
		</div>
	)
}

// Global styles
const style = document.createElement('style')
style.textContent = `
html, body, #root {
	margin: 0;
	padding: 0;
	height: 100%;
}
.svg-container svg {
	width: 100%;
	height: 100%;
}
`
document.head.appendChild(style)

const root = createRoot(document.getElementById('root')!)
root.render(<McpApp />)
