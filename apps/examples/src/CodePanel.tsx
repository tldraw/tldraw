import { useCallback, useEffect, useRef, useState } from 'react'
import './CodePanel.css'

interface SourceFile {
	filename: string
	content: string
}

const MIN_WIDTH = 280
const MAX_WIDTH = 900
const DEFAULT_WIDTH = 480
const STORAGE_KEY = 'examples:codePanelWidth'

function getStoredWidth() {
	try {
		const v = localStorage.getItem(STORAGE_KEY)
		if (v) return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Number(v)))
	} catch {
		// ignore
	}
	return DEFAULT_WIDTH
}

// Cache the highlighter so it's only created once
let highlighterPromise: ReturnType<typeof initHighlighter> | null = null

async function initHighlighter() {
	const shiki = await import('shiki')
	return shiki.createHighlighter({
		themes: ['github-light'],
		langs: ['tsx', 'typescript', 'css'],
	})
}

function getHighlighter() {
	if (!highlighterPromise) {
		highlighterPromise = initHighlighter()
	}
	return highlighterPromise
}

export function CodePanel({ files, onClose }: { files: SourceFile[]; onClose: () => void }) {
	const [activeFile, setActiveFile] = useState(0)
	const [highlightedHtml, setHighlightedHtml] = useState('')
	const [copied, setCopied] = useState(false)
	const [width, setWidth] = useState(getStoredWidth)
	const contentRef = useRef<HTMLDivElement>(null)
	const isDragging = useRef(false)

	const handleResizeStart = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault()
			isDragging.current = true
			const startX = e.clientX
			const startWidth = width

			const handleMove = (moveEvent: PointerEvent) => {
				const newWidth = Math.min(
					MAX_WIDTH,
					Math.max(MIN_WIDTH, startWidth + (moveEvent.clientX - startX))
				)
				setWidth(newWidth)
			}

			const handleUp = () => {
				isDragging.current = false
				document.removeEventListener('pointermove', handleMove)
				document.removeEventListener('pointerup', handleUp)
				document.body.style.cursor = ''
				document.body.style.userSelect = ''
			}

			document.body.style.cursor = 'col-resize'
			document.body.style.userSelect = 'none'
			document.addEventListener('pointermove', handleMove)
			document.addEventListener('pointerup', handleUp)
		},
		[width]
	)

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, String(width))
		} catch {
			// ignore
		}
	}, [width])

	useEffect(() => {
		setActiveFile(0)
	}, [files])

	useEffect(() => {
		let cancelled = false
		const file = files[activeFile]
		if (!file) return

		setHighlightedHtml('')

		async function highlight() {
			const highlighter = await getHighlighter()
			const ext = file.filename.split('.').pop() ?? 'tsx'
			const langMap: Record<string, string> = {
				tsx: 'tsx',
				ts: 'typescript',
				css: 'css',
				jsx: 'tsx',
				js: 'typescript',
			}
			const html = highlighter.codeToHtml(file.content, {
				lang: langMap[ext] ?? 'tsx',
				theme: 'github-light',
			})
			if (!cancelled) {
				setHighlightedHtml(html)
			}
		}

		highlight()
		return () => {
			cancelled = true
		}
	}, [files, activeFile])

	useEffect(() => {
		contentRef.current?.scrollTo(0, 0)
	}, [activeFile])

	const handleCopy = async () => {
		const file = files[activeFile]
		if (!file) return
		await navigator.clipboard.writeText(file.content)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="code-panel" style={{ width }}>
			<div className="code-panel__resize-handle" onPointerDown={handleResizeStart} />
			<div className="code-panel__header">
				<div className="code-panel__tabs">
					{files.map((f, i) => (
						<button
							key={f.filename}
							className="code-panel__tab"
							data-active={i === activeFile}
							onClick={() => setActiveFile(i)}
						>
							{f.filename}
						</button>
					))}
				</div>
				<div className="code-panel__actions">
					<button className="code-panel__action" onClick={handleCopy} title="Copy to clipboard">
						{copied ? 'Copied!' : 'Copy'}
					</button>
					<button className="code-panel__action" onClick={onClose} title="Close code panel">
						&#x2715;
					</button>
				</div>
			</div>
			<div className="code-panel__content" ref={contentRef}>
				{highlightedHtml ? (
					<div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
				) : (
					<div className="code-panel__loading">Loading...</div>
				)}
			</div>
		</div>
	)
}
