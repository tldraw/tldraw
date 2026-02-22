import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComposedIdeaDraft } from '../intelligent-canvas/composition/types'
import { BuildResult, buildPrototype, runPipeline } from './pipeline'

type Phase = 'input' | 'processing' | 'choosing' | 'building' | 'done'

export function IdeaMachineModal() {
	const [phase, setPhase] = useState<Phase>('input')
	const [inputText, setInputText] = useState('')
	const [progress, setProgress] = useState('')
	const [ideas, setIdeas] = useState<ComposedIdeaDraft[]>([])
	const [selectedIdea, setSelectedIdea] = useState<ComposedIdeaDraft | null>(null)
	const [buildResult, setBuildResult] = useState<BuildResult | null>(null)
	const [error, setError] = useState('')
	const [apiAvailable, setApiAvailable] = useState(true)
	const [claudeAvailable, setClaudeAvailable] = useState(true)
	const [minimized, setMinimized] = useState(false)
	const abortRef = useRef(false)

	useEffect(() => {
		fetch('/api/gemini/status')
			.then((r) => r.json())
			.then((data) => setApiAvailable(data.available !== false))
			.catch(() => setApiAvailable(false))
		fetch('/api/claude/status')
			.then((r) => r.json())
			.then((data) => setClaudeAvailable(data.available !== false))
			.catch(() => setClaudeAvailable(false))
	}, [])

	const parseLines = useCallback((text: string): string[] => {
		return text
			.split(/[\n,]/)
			.map((s) => s.trim())
			.filter(Boolean)
	}, [])

	const handleGenerate = useCallback(async () => {
		const lines = parseLines(inputText)
		if (lines.length < 2) {
			setError('Enter at least 2 ideas (one per line or comma-separated)')
			return
		}

		setError('')
		setPhase('processing')
		abortRef.current = false

		try {
			const drafts = await runPipeline(lines, (msg) => {
				if (!abortRef.current) setProgress(msg)
			})
			if (abortRef.current) return
			setIdeas(drafts)
			setPhase('choosing')
		} catch (e) {
			if (abortRef.current) return
			setError(e instanceof Error ? e.message : 'Pipeline failed')
			setPhase('input')
		}
	}, [inputText, parseLines])

	const handleChoose = useCallback(async (idea: ComposedIdeaDraft) => {
		setSelectedIdea(idea)
		setPhase('building')
		setProgress('Claude Code is building the example...')
		abortRef.current = false

		try {
			const result = await buildPrototype(idea)
			if (abortRef.current) return
			setBuildResult(result)
			setPhase('done')
		} catch (e) {
			if (abortRef.current) return
			setError(e instanceof Error ? e.message : 'Build failed')
			setPhase('choosing')
		}
	}, [])

	const handleStartOver = useCallback(() => {
		abortRef.current = true
		setPhase('input')
		setInputText('')
		setProgress('')
		setIdeas([])
		setSelectedIdea(null)
		setBuildResult(null)
		setError('')
		setMinimized(false)
	}, [])

	const handleViewExample = useCallback(() => {
		if (buildResult) {
			window.open(`/${buildResult.slug}/full`, '_blank')
		}
	}, [buildResult])

	// Minimized state: small floating pill
	if (minimized && phase === 'done') {
		return (
			<div className="im-minimized">
				<button className="im-pill" onClick={() => setMinimized(false)}>
					{selectedIdea?.title} — built
				</button>
			</div>
		)
	}

	return (
		<div className="im-modal">
			<div className="im-content">
				{error && <div className="im-error">{error}</div>}

				{phase === 'input' && (
					<>
						<h1 className="im-title">Idea machine</h1>
						<p className="im-subtitle">
							Enter concepts, phenomena, or technologies — one per line or comma-separated. The
							machine will combine them into interactive canvas experiences, then build a working
							prototype.
						</p>
						{!apiAvailable && (
							<div className="im-error">
								Gemini API not available. Set GEMINI_API_KEY and restart the dev server.
							</div>
						)}
						{!claudeAvailable && (
							<div className="im-error">
								Claude Code CLI not found. Install it to enable prototype building.
							</div>
						)}
						<textarea
							className="im-textarea"
							placeholder={'Fluid dynamics\nSheet music\nTopographic maps\nGesture recognition'}
							value={inputText}
							onChange={(e) => setInputText(e.target.value)}
							rows={8}
						/>
						<button
							className="im-button-primary"
							onClick={handleGenerate}
							disabled={!apiAvailable || !claudeAvailable || parseLines(inputText).length < 2}
						>
							Generate ideas
						</button>
					</>
				)}

				{phase === 'processing' && (
					<>
						<h1 className="im-title">Generating...</h1>
						<div className="im-processing">
							<div className="im-spinner" />
							<p className="im-progress">{progress}</p>
						</div>
					</>
				)}

				{phase === 'choosing' && (
					<>
						<h1 className="im-title">Pick an idea</h1>
						<p className="im-subtitle">
							Each card is a canvas experience. Click one and Claude will build it.
						</p>
						<div className="im-cards">
							{ideas.map((idea, i) => (
								<button key={i} className="im-card" onClick={() => handleChoose(idea)}>
									<h2 className="im-card-title">{idea.title}</h2>
									<p className="im-card-desc">{idea.description}</p>
									<p className="im-card-why">
										<strong>On the canvas:</strong> {idea.whyThisCombination}
									</p>
									<div className="im-card-tags">
										{idea.inputs.map((t) => (
											<span key={t} className="im-tag im-tag-input">
												{t}
											</span>
										))}
										{idea.outputs.map((t) => (
											<span key={t} className="im-tag im-tag-output">
												{t}
											</span>
										))}
									</div>
								</button>
							))}
						</div>
						<button className="im-button-secondary" onClick={handleStartOver}>
							Start over
						</button>
					</>
				)}

				{phase === 'building' && (
					<>
						<h1 className="im-title">{selectedIdea?.title}</h1>
						<div className="im-processing">
							<div className="im-spinner" />
							<p className="im-progress">{progress}</p>
						</div>
					</>
				)}

				{phase === 'done' && buildResult && (
					<>
						<h1 className="im-title">{selectedIdea?.title}</h1>
						<p className="im-subtitle">{selectedIdea?.description}</p>
						<div className="im-built">
							<p className="im-built-info">
								Built {buildResult.files.length} files in <code>examples/{buildResult.slug}/</code>
							</p>
							<ul className="im-file-list">
								{buildResult.files.map((f) => (
									<li key={f}>
										<code>{f}</code>
									</li>
								))}
							</ul>
						</div>
						<div className="im-actions">
							<button className="im-button-primary" onClick={handleViewExample}>
								Open example
							</button>
							<button className="im-button-secondary" onClick={handleStartOver}>
								Start over
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	)
}
