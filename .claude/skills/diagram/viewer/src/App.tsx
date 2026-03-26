import { useCallback, useRef, useEffect } from 'react'
import { Tldraw, type Editor } from 'tldraw'
import { createMermaidDiagram } from '@tldraw/mermaid'
import 'tldraw/tldraw.css'

const POLL_INTERVAL = 1000

export default function App() {
	const editorRef = useRef<Editor | null>(null)
	const fileContents = useRef<Map<string, string>>(new Map())
	const rendering = useRef(false)

	const syncDiagrams = useCallback(async (editor: Editor) => {
		if (rendering.current) return
		rendering.current = true

		try {
			const indexRes = await fetch(`/diagrams/index.json?t=${Date.now()}`, {
				cache: 'no-store',
			})
			if (!indexRes.ok) return
			const files: string[] = await indexRes.json()
			if (files.length === 0) return

			const entries: { name: string; content: string }[] = []
			for (const file of files) {
				const res = await fetch(`/diagrams/${file}?t=${Date.now()}`, {
					cache: 'no-store',
				})
				if (!res.ok) continue
				const content = (await res.text()).trim()
				if (content) {
					entries.push({ name: file.replace(/\.mmd$/, ''), content })
				}
			}

			if (entries.length === 0) return

			const currentFileNames = new Set(entries.map((e) => e.name))

			// Remove pages for deleted files
			for (const page of editor.getPages()) {
				if (!currentFileNames.has(page.name)) {
					if (editor.getPages().length > 1) {
						if (editor.getCurrentPageId() === page.id) {
							const other = editor.getPages().find((p) => p.id !== page.id)
							if (other) editor.setCurrentPage(other.id)
						}
						editor.deletePage(page.id)
						fileContents.current.delete(page.name)
					}
				}
			}

			let newestPage: string | null = null

			for (const { name, content } of entries) {
				// Skip unchanged files
				if (fileContents.current.get(name) === content) continue
				newestPage = name

				let page = editor.getPages().find((p) => p.name === name)
				if (!page) {
					editor.createPage({ name })
					page = editor.getPages().find((p) => p.name === name)!
				}

				editor.setCurrentPage(page.id)

				const ids = editor.getCurrentPageShapeIds()
				if (ids.size > 0) {
					editor.selectAll()
					editor.deleteShapes(editor.getSelectedShapeIds())
				}

				try {
					await createMermaidDiagram(editor, content, {
						blueprintRender: {
							position: { x: 0, y: 0 },
							centerOnPosition: false,
						},
					})
					editor.zoomToFit({ animation: { duration: 200 } })
					fileContents.current.set(name, content)
				} catch (e) {
					console.error(`[diagram-viewer] failed to render "${name}":`, e)
				}
			}

			// Clean up default empty page
			const pages = editor.getPages()
			if (pages.length > 1) {
				const emptyDefault = pages.find(
					(p) => !currentFileNames.has(p.name) && editor.getPageShapeIds(p.id).size === 0
				)
				if (emptyDefault) {
					if (editor.getCurrentPageId() === emptyDefault.id) {
						const other = pages.find((p) => p.id !== emptyDefault.id)
						if (other) editor.setCurrentPage(other.id)
					}
					editor.deletePage(emptyDefault.id)
				}
			}

			// Navigate to the most recently changed diagram
			if (newestPage) {
				const target = editor.getPages().find((p) => p.name === newestPage)
				if (target) {
					editor.setCurrentPage(target.id)
					editor.zoomToFit({ animation: { duration: 200 } })
				}
			}
		} catch (e) {
			console.error('[diagram-viewer] sync error:', e)
		} finally {
			rendering.current = false
		}
	}, [])

	const handleMount = useCallback(
		(editor: Editor) => {
			editorRef.current = editor
			syncDiagrams(editor)
		},
		[syncDiagrams]
	)

	useEffect(() => {
		const interval = setInterval(() => {
			if (editorRef.current) syncDiagrams(editorRef.current)
		}, POLL_INTERVAL)
		return () => clearInterval(interval)
	}, [syncDiagrams])

	return <Tldraw persistenceKey={undefined} onMount={handleMount} />
}
