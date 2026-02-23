import {
	useApp,
	useDocumentTheme,
	useHostStyles,
	type App,
} from '@modelcontextprotocol/ext-apps/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Box, Editor, Tldraw, createShapeId } from 'tldraw'
import 'tldraw/tldraw.css'

// ─── FocusedShape → tldraw conversion (client-side, no server deps) ─────────

const FOCUSED_TO_GEO_TYPES: Record<string, string> = {
	rectangle: 'rectangle',
	ellipse: 'ellipse',
	triangle: 'triangle',
	diamond: 'diamond',
	hexagon: 'hexagon',
	pill: 'oval',
	cloud: 'cloud',
	'x-box': 'x-box',
	'check-box': 'check-box',
	heart: 'heart',
	pentagon: 'pentagon',
	octagon: 'octagon',
	star: 'star',
	'parallelogram-right': 'rhombus',
	'parallelogram-left': 'rhombus-2',
	trapezoid: 'trapezoid',
	'fat-arrow-right': 'arrow-right',
	'fat-arrow-left': 'arrow-left',
	'fat-arrow-up': 'arrow-up',
	'fat-arrow-down': 'arrow-down',
}

const FOCUSED_TO_TLDRAW_FILLS: Record<string, string> = {
	none: 'none',
	solid: 'lined-fill',
	background: 'semi',
	tint: 'solid',
	pattern: 'pattern',
}

function toRichText(text: string) {
	return {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: text ? [{ type: 'text', text }] : [],
			},
		],
	}
}

interface ConvertedBinding {
	arrowShapeId: string
	targetShapeId: string
	terminal: 'start' | 'end'
}

/** Convert a FocusedShape to a tldraw-compatible shape + bindings. */
function convertFocusedShape(shape: any): {
	id: string
	type: string
	x: number
	y: number
	props: Record<string, unknown>
	bindings: ConvertedBinding[]
} {
	const shapeId = shape.shapeId as string
	const bindings: ConvertedBinding[] = []

	switch (shape._type) {
		case 'text': {
			let textAlign = 'start'
			const a = shape.anchor ?? 'top-left'
			if (['top-center', 'bottom-center', 'center'].includes(a)) textAlign = 'middle'
			else if (['top-right', 'bottom-right', 'center-right'].includes(a)) textAlign = 'end'
			return {
				id: shapeId,
				type: 'text',
				x: shape.x ?? 0,
				y: shape.y ?? 0,
				props: {
					richText: toRichText(shape.text ?? ''),
					color: shape.color ?? 'black',
					size: shape.size ?? 'm',
					font: shape.font ?? 'draw',
					textAlign,
					autoSize: shape.maxWidth == null,
					w: shape.maxWidth ?? 100,
					scale: 1,
				},
				bindings,
			}
		}
		case 'arrow': {
			const x1 = shape.x1 ?? 0
			const y1 = shape.y1 ?? 0
			const x2 = shape.x2 ?? 0
			const y2 = shape.y2 ?? 0
			const minX = Math.min(x1, x2)
			const minY = Math.min(y1, y2)
			if (shape.fromId) {
				bindings.push({
					arrowShapeId: `shape:${shapeId}`,
					targetShapeId: `shape:${shape.fromId}`,
					terminal: 'start',
				})
			}
			if (shape.toId) {
				bindings.push({
					arrowShapeId: `shape:${shapeId}`,
					targetShapeId: `shape:${shape.toId}`,
					terminal: 'end',
				})
			}
			return {
				id: shapeId,
				type: 'arrow',
				x: minX,
				y: minY,
				props: {
					color: shape.color ?? 'black',
					dash: shape.dash ?? 'draw',
					size: shape.size ?? 'm',
					fill: 'none',
					font: 'draw',
					arrowheadStart: 'none',
					arrowheadEnd: 'arrow',
					start: { x: x1 - minX, y: y1 - minY },
					end: { x: x2 - minX, y: y2 - minY },
					bend: (shape.bend ?? 0) * -1,
					richText: toRichText(shape.text ?? ''),
					labelColor: 'black',
					labelPosition: 0.5,
					scale: 1,
					kind: 'arc',
					elbowMidPoint: 0.5,
				},
				bindings,
			}
		}
		case 'line': {
			const x1 = shape.x1 ?? 0
			const y1 = shape.y1 ?? 0
			const x2 = shape.x2 ?? 0
			const y2 = shape.y2 ?? 0
			const minX = Math.min(x1, x2)
			const minY = Math.min(y1, y2)
			return {
				id: shapeId,
				type: 'line',
				x: minX,
				y: minY,
				props: {
					color: shape.color ?? 'black',
					dash: shape.dash ?? 'draw',
					size: shape.size ?? 'm',
					scale: 1,
					spline: 'line',
					points: {
						a1: { id: 'a1', index: 'a1', x: x1 - minX, y: y1 - minY },
						a2: { id: 'a2', index: 'a2', x: x2 - minX, y: y2 - minY },
					},
				},
				bindings,
			}
		}
		case 'note':
			return {
				id: shapeId,
				type: 'note',
				x: shape.x ?? 0,
				y: shape.y ?? 0,
				props: {
					color: shape.color ?? 'yellow',
					richText: toRichText(shape.text ?? ''),
					size: shape.size ?? 'm',
					font: shape.font ?? 'draw',
					align: 'middle',
					verticalAlign: 'middle',
					fontSizeAdjustment: 0,
					growY: 0,
					labelColor: 'black',
					scale: 1,
					url: '',
				},
				bindings,
			}
		case 'frame':
			return {
				id: shapeId,
				type: 'frame',
				x: shape.x ?? 0,
				y: shape.y ?? 0,
				props: {
					w: shape.w ?? 500,
					h: shape.h ?? 300,
					name: shape.name ?? '',
				},
				bindings,
			}
		default: {
			// Geo shapes (rectangle, ellipse, triangle, diamond, etc.)
			const geoType = FOCUSED_TO_GEO_TYPES[shape._type] ?? 'rectangle'
			const fill = FOCUSED_TO_TLDRAW_FILLS[shape.fill] ?? 'none'
			return {
				id: shapeId,
				type: 'geo',
				x: shape.x ?? 0,
				y: shape.y ?? 0,
				props: {
					geo: geoType,
					w: shape.w ?? 200,
					h: shape.h ?? 100,
					color: shape.color ?? 'black',
					fill,
					dash: shape.dash ?? 'draw',
					size: shape.size ?? 'm',
					font: shape.font ?? 'draw',
					align: shape.textAlign ?? 'middle',
					verticalAlign: 'middle',
					growY: 0,
					richText: toRichText(shape.text ?? ''),
					labelColor: 'black',
					scale: 1,
					url: '',
				},
				bindings,
			}
		}
	}
}

// ─── TldrawRecord rendering (for ontoolresult fallback) ─────────────────────

interface McpShape {
	id: string
	type: string
	x: number
	y: number
	rotation?: number
	props?: Record<string, unknown>
	parentId?: string
}

interface McpBinding {
	arrowShapeId: string
	targetShapeId: string
	terminal: 'start' | 'end'
}

function renderTldrawRecords(editor: Editor, shapes: McpShape[], bindings: McpBinding[]) {
	try {
		ensureViewport(editor)
		editor.run(() => {
			const existingIds = editor.getCurrentPageShapeIds()
			if (existingIds.size > 0) {
				editor.deleteShapes([...existingIds])
			}
			if (shapes.length === 0) return

			editor.createShapes(
				shapes.map((shape) => {
					const parentId =
						shape.parentId && shape.parentId !== 'page:page' ? (shape.parentId as any) : undefined
					return {
						id: createShapeId(shape.id.replace('shape:', '')),
						type: shape.type,
						x: shape.x,
						y: shape.y,
						rotation: shape.rotation ?? 0,
						props: shape.props ?? {},
						parentId,
					}
				})
			)

			for (const binding of bindings) {
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
		})

		if (shapes.length > 0) {
			setTimeout(() => {
				try {
					ensureViewport(editor)
					editor.zoomToFit({ animation: { duration: 200 } })
				} catch {
					/* editor disposed */
				}
			}, 200)
		}
	} catch (err) {
		console.error('[tldraw-mcp] renderTldrawRecords failed:', err)
	}
}

// ─── Editor helpers ──────────────────────────────────────────────────────────

const EDITOR_W = 800
const EDITOR_H = 600
const EDITOR_HEIGHT = 500

function ensureViewport(editor: Editor) {
	const bounds = editor.getViewportScreenBounds()
	if (bounds.w < 1 || bounds.h < 1) {
		editor.updateViewportScreenBounds(new Box(0, 0, EDITOR_W, EDITOR_H))
	}
}

/** Full sync: clear editor and render all FocusedShapes from scratch. */
function fullSyncFocusedShapes(editor: Editor, focusedShapes: any[]) {
	try {
		ensureViewport(editor)

		editor.run(() => {
			const existingIds = editor.getCurrentPageShapeIds()
			if (existingIds.size > 0) {
				editor.deleteShapes([...existingIds])
			}
			if (focusedShapes.length === 0) return

			const shapesToCreate: any[] = []
			const allBindings: ConvertedBinding[] = []

			for (const fs of focusedShapes) {
				if (!fs._type || !fs.shapeId) continue
				const converted = convertFocusedShape(fs)
				shapesToCreate.push({
					id: createShapeId(converted.id),
					type: converted.type,
					x: converted.x,
					y: converted.y,
					rotation: 0,
					props: converted.props,
				})
				allBindings.push(...converted.bindings)
			}

			editor.createShapes(shapesToCreate)

			for (const binding of allBindings) {
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
		})

		// Handle frame children
		for (const fs of focusedShapes) {
			if (fs._type === 'frame' && fs.children?.length) {
				for (const childId of fs.children) {
					const childShapeId = createShapeId(childId)
					const frameShapeId = createShapeId(fs.shapeId)
					const childShape = editor.getShape(childShapeId)
					if (childShape && editor.getShape(frameShapeId)) {
						editor.updateShape({
							id: childShapeId,
							type: childShape.type,
							parentId: frameShapeId,
						})
					}
				}
			}
		}

		if (focusedShapes.length > 0) {
			setTimeout(() => {
				try {
					ensureViewport(editor)
					editor.zoomToFit({ animation: { duration: 200 } })
				} catch {
					/* editor disposed */
				}
			}, 200)
		}
	} catch (err) {
		console.error('[tldraw-mcp] fullSyncFocusedShapes failed:', err)
	}
}

// ─── App components ──────────────────────────────────────────────────────────

/** Try to render pending data (FocusedShapes from ontoolinput or TldrawRecords from ontoolresult). */
function tryRenderPending(
	editor: Editor,
	pendingRef: React.MutableRefObject<
		| { type: 'focused'; shapes: any[] }
		| { type: 'records'; shapes: McpShape[]; bindings: McpBinding[] }
		| null
	>
) {
	const pending = pendingRef.current
	if (!pending) return
	pendingRef.current = null
	if (pending.type === 'focused') {
		fullSyncFocusedShapes(editor, pending.shapes)
	} else {
		renderTldrawRecords(editor, pending.shapes, pending.bindings)
	}
}

function TldrawAppCore({ app }: { app: App }) {
	const editorRef = useRef<Editor | null>(null)
	const hasRenderedRef = useRef(false)
	const pendingRef = useRef<
		| { type: 'focused'; shapes: any[] }
		| { type: 'records'; shapes: McpShape[]; bindings: McpBinding[] }
		| null
	>(null)
	const [toolInput, setToolInput] = useState<any>(null)

	const theme = useDocumentTheme(app)
	useHostStyles(app)

	// Set up MCP event handlers
	useEffect(() => {
		app.sendSizeChanged({ height: EDITOR_HEIGHT }).catch(() => {})

		app.ontoolinput = async (input: any) => {
			const args = input?.arguments || input
			setToolInput({ ...args })
		}

		app.ontoolresult = (result: any) => {
			// Fallback: if shapes weren't rendered via ontoolinput,
			// render from the server's structuredContent (TldrawRecords).
			if (hasRenderedRef.current) return
			const sc = result.structuredContent
			if (!sc?.shapes?.length) return
			const editor = editorRef.current
			if (editor) {
				renderTldrawRecords(editor, sc.shapes ?? [], sc.bindings ?? [])
			} else {
				// Editor not ready yet — store for when it mounts
				pendingRef.current = {
					type: 'records',
					shapes: sc.shapes ?? [],
					bindings: sc.bindings ?? [],
				}
			}
		}

		app.onteardown = async () => ({})
	}, [app])

	// Render when final tool input arrives
	useEffect(() => {
		if (!toolInput) return

		const shapesStr = toolInput.shapes
		if (!shapesStr) return

		let parsed: any[]
		try {
			parsed = JSON.parse(shapesStr)
			if (!Array.isArray(parsed) || parsed.length === 0) return
		} catch {
			/* invalid JSON — wait for ontoolresult fallback */
			return
		}

		hasRenderedRef.current = true
		const editor = editorRef.current
		if (editor) {
			fullSyncFocusedShapes(editor, parsed)
		} else {
			// Editor not ready yet — store for when it mounts
			pendingRef.current = { type: 'focused', shapes: parsed }
		}
	}, [toolInput])

	// Apply theme
	useEffect(() => {
		if (!editorRef.current || !theme) return
		editorRef.current.user.updateUserPreferences({
			colorScheme: theme === 'dark' ? 'dark' : 'light',
		})
	}, [theme])

	const handleMount = useCallback(
		(editor: Editor) => {
			editorRef.current = editor
			ensureViewport(editor)
			editor.setCurrentTool('hand')
			if (theme) {
				editor.user.updateUserPreferences({
					colorScheme: theme === 'dark' ? 'dark' : 'light',
				})
			}
			// Apply any data that arrived before the editor mounted
			setTimeout(() => tryRenderPending(editor, pendingRef), 100)
		},
		[theme]
	)

	return (
		<div style={{ width: '100%', height: EDITOR_HEIGHT, position: 'relative' }}>
			<Tldraw hideUi onMount={handleMount} />
		</div>
	)
}

function McpApp() {
	const { app, error } = useApp({
		appInfo: { name: 'tldraw', version: '1.0.0' },
		capabilities: {},
	})

	if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error.message}</div>
	if (!app) return <div style={{ padding: 20, opacity: 0.5 }}>Connecting...</div>
	return <TldrawAppCore app={app} />
}

// ─── Bootstrap ──────────────────────────────────────────────────────────────

const root = createRoot(document.getElementById('root')!)
root.render(<McpApp />)
