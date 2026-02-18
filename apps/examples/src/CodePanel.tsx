import { useEffect, useRef, useState } from 'react'
import './CodePanel.css'

interface SourceFile {
	filename: string
	content: string
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

export function CodePanel({
	files,
	codeUrl,
	onClose,
}: {
	files: SourceFile[]
	codeUrl: string
	onClose: () => void
}) {
	const [activeFile, setActiveFile] = useState(0)
	const [highlightedHtml, setHighlightedHtml] = useState('')
	const [copied, setCopied] = useState(false)
	const contentRef = useRef<HTMLDivElement>(null)

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
		<div className="code-panel">
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
						{copied ? (
							<>
								<CheckIcon /> Copied!
							</>
						) : (
							<>
								<CopyIcon /> Copy
							</>
						)}
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

function CopyIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
		</svg>
	)
}

function CheckIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="m4.5 12.75 6 6 9-13.5" />
		</svg>
	)
}
