import { useRef, useState } from 'react'
import { Editor, useValue } from 'tldraw'
import { apiClarify } from '../api/marketingApi'
import {
	createAndGenerateBatch,
	createVariationsFromSelection,
	generateNextBatch,
	getAssetShapes,
} from '../asset/assetActions'
import { blobToDataUrl } from '../asset/assetBytes'
import { Brand, serializeBrand, useBrand } from '../brand/brandState'
import { BATCH_SIZES, DEFAULT_BATCH_SIZE, getOutputType, outputTypesByPlatform } from '../constants'
import { ExportScope, exportCampaign, exportTargets } from '../export'
import { usePanelTheme } from './usePanelTheme'

// The left panel drives a campaign: write a brief, generate ideas, refine, and
// export. Brand setup lives in its own panel on the right (see BrandPanel) so
// neither column needs much scrolling.
export function MarketingSidebar({ editor }: { editor: Editor }) {
	const brand = useBrand(editor)
	const themeClass = usePanelTheme(editor)

	// The brief, format, and batch size are shared by the first batch, the refine
	// loop, and selection variations, so they live here at the top.
	const [prompt, setPrompt] = useState('')
	const [outputTypeId, setOutputTypeId] = useState(outputTypesByPlatform()[0].types[0].id)
	const [count, setCount] = useState<number>(DEFAULT_BATCH_SIZE)

	return (
		<div className={`MarketingSidebar ${themeClass}`}>
			<div className="MarketingSidebar-scroll">
				<GenerateSection
					editor={editor}
					brand={brand}
					prompt={prompt}
					setPrompt={setPrompt}
					outputTypeId={outputTypeId}
					setOutputTypeId={setOutputTypeId}
					count={count}
					setCount={setCount}
				/>
				<RefineSection editor={editor} prompt={prompt} outputTypeId={outputTypeId} count={count} />
				<ExportSection editor={editor} />
			</div>
		</div>
	)
}

function GenerateSection({
	editor,
	brand,
	prompt,
	setPrompt,
	outputTypeId,
	setOutputTypeId,
	count,
	setCount,
}: {
	editor: Editor
	brand: Brand
	prompt: string
	setPrompt(v: string): void
	outputTypeId: string
	setOutputTypeId(v: string): void
	count: number
	setCount(v: number): void
}) {
	const [shot, setShot] = useState<string | null>(null)
	const [questions, setQuestions] = useState<string[]>([])
	const [answers, setAnswers] = useState<Record<number, string>>({})
	const [asking, setAsking] = useState(false)
	const shotInput = useRef<HTMLInputElement>(null)

	// Fold the brief together with any answered clarifying questions.
	function buildBrief(): string {
		const qa = questions
			.map((q, i) => (answers[i]?.trim() ? `${q} ${answers[i].trim()}` : ''))
			.filter(Boolean)
		return [prompt.trim(), ...qa].filter(Boolean).join('\n')
	}

	async function suggestQuestions() {
		if (!prompt.trim()) return
		setAsking(true)
		try {
			const { questions } = await apiClarify({
				prompt: prompt.trim(),
				brandText: serializeBrand(brand),
				outputType: getOutputType(outputTypeId),
			})
			setQuestions(questions)
			setAnswers({})
		} finally {
			setAsking(false)
		}
	}

	function generate() {
		const brief = buildBrief()
		if (!brief) return
		createAndGenerateBatch(editor, {
			prompt: brief,
			outputTypeId,
			count,
			references: shot ? [shot] : [],
		})
	}

	return (
		<section className="MarketingSidebar-section">
			<h2 className="MarketingSidebar-heading">New campaign</h2>

			<label className="MarketingSidebar-label">Brief</label>
			<textarea
				className="MarketingSidebar-textarea"
				placeholder="LinkedIn campaign for the tldraw SDK build-vs-buy calculator, aimed at prospects who've tried the SDK"
				value={prompt}
				onChange={(e) => setPrompt(e.target.value)}
			/>

			<label className="MarketingSidebar-label">Format</label>
			<select
				className="MarketingSidebar-select"
				value={outputTypeId}
				onChange={(e) => setOutputTypeId(e.target.value)}
			>
				{outputTypesByPlatform().map((group) => (
					<optgroup key={group.platform} label={group.platform}>
						{group.types.map((t) => (
							<option key={t.id} value={t.id}>
								{t.label} ({t.width}×{t.height})
							</option>
						))}
					</optgroup>
				))}
			</select>

			<label className="MarketingSidebar-label">Ideas per batch</label>
			<select
				className="MarketingSidebar-select"
				value={count}
				onChange={(e) => setCount(Number(e.target.value))}
			>
				{BATCH_SIZES.map((n) => (
					<option key={n} value={n}>
						{n === 1 ? '1 idea' : `${n} ideas`}
					</option>
				))}
			</select>

			<label className="MarketingSidebar-label">Reference image (optional)</label>
			{shot ? (
				<div className="MarketingSidebar-imageRow">
					<img className="MarketingSidebar-thumb" src={shot} alt="reference" />
					<button className="MarketingSidebar-textButton" onClick={() => setShot(null)}>
						Remove
					</button>
				</div>
			) : (
				<button className="MarketingSidebar-fileButton" onClick={() => shotInput.current?.click()}>
					Upload image
				</button>
			)}
			<input
				ref={shotInput}
				type="file"
				accept="image/*"
				hidden
				onChange={async (e) => {
					const file = e.target.files?.[0]
					if (file) setShot(await blobToDataUrl(file))
					e.target.value = ''
				}}
			/>

			{questions.length > 0 && (
				<div className="MarketingSidebar-questions">
					{questions.map((q, i) => (
						<div key={i}>
							<label className="MarketingSidebar-label">{q}</label>
							<textarea
								className="MarketingSidebar-textarea MarketingSidebar-answer"
								value={answers[i] ?? ''}
								onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
							/>
						</div>
					))}
				</div>
			)}

			<button
				className="MarketingSidebar-secondary"
				disabled={!prompt.trim() || asking}
				onClick={suggestQuestions}
			>
				{asking ? 'Thinking…' : 'Suggest clarifying questions'}
			</button>

			<button className="MarketingSidebar-generate" disabled={!prompt.trim()} onClick={generate}>
				Generate {count === 1 ? 'idea' : `${count} ideas`}
			</button>
		</section>
	)
}

function RefineSection({
	editor,
	prompt,
	outputTypeId,
	count,
}: {
	editor: Editor
	prompt: string
	outputTypeId: string
	count: number
}) {
	const [feedback, setFeedback] = useState('')
	const [busy, setBusy] = useState<'next' | 'variations' | null>(null)

	const counts = useValue(
		'verdicts',
		() => {
			const assets = getAssetShapes(editor).filter((s) => s.props.versions.length > 0)
			return {
				liked: assets.filter((s) => s.props.verdict === 'liked').length,
				disliked: assets.filter((s) => s.props.verdict === 'disliked').length,
			}
		},
		[editor]
	)
	const selectionCount = useValue('selection', () => editor.getSelectedShapeIds().length, [editor])

	async function nextBatch() {
		setBusy('next')
		try {
			await generateNextBatch(editor, { prompt, outputTypeId, count, feedback })
		} finally {
			setBusy(null)
		}
	}

	async function variations() {
		setBusy('variations')
		try {
			await createVariationsFromSelection(editor, {
				prompt: prompt.trim() || 'A new on-brand variation',
				outputTypeId,
				count,
			})
		} finally {
			setBusy(null)
		}
	}

	return (
		<section className="MarketingSidebar-section">
			<h2 className="MarketingSidebar-heading">Refine</h2>
			<p className="MarketingSidebar-hint">
				{counts.liked} liked · {counts.disliked} disliked. Like the ideas that work, then generate a
				new batch that builds on them.
			</p>

			<label className="MarketingSidebar-label">Feedback for the next batch</label>
			<textarea
				className="MarketingSidebar-textarea"
				placeholder="Lean into the calculator screenshot, punchier headline, less text"
				value={feedback}
				onChange={(e) => setFeedback(e.target.value)}
			/>

			<button className="MarketingSidebar-generate" disabled={busy !== null} onClick={nextBatch}>
				{busy === 'next' ? 'Working…' : 'Generate next batch'}
			</button>

			<button
				className="MarketingSidebar-secondary"
				disabled={busy !== null || selectionCount === 0}
				title={
					selectionCount === 0
						? 'Select something on the canvas to riff on'
						: 'Generate ideas from the current selection'
				}
				onClick={variations}
			>
				{busy === 'variations' ? 'Working…' : 'Make variations from selection'}
			</button>
		</section>
	)
}

function ExportSection({ editor }: { editor: Editor }) {
	const [scope, setScope] = useState<ExportScope>('liked')
	const [busy, setBusy] = useState(false)

	const targetCount = useValue('exportTargets', () => exportTargets(editor, scope).length, [
		editor,
		scope,
	])

	async function doExport() {
		setBusy(true)
		try {
			await exportCampaign(editor, scope)
		} finally {
			setBusy(false)
		}
	}

	return (
		<section className="MarketingSidebar-section">
			<h2 className="MarketingSidebar-heading">Export</h2>
			<label className="MarketingSidebar-label">Which assets</label>
			<select
				className="MarketingSidebar-select"
				value={scope}
				onChange={(e) => setScope(e.target.value as ExportScope)}
			>
				<option value="liked">Liked</option>
				<option value="selected">Selected</option>
				<option value="all">All</option>
			</select>
			<button
				className="MarketingSidebar-generate"
				disabled={busy || targetCount === 0}
				onClick={doExport}
			>
				{busy
					? 'Packaging…'
					: `Export ${targetCount} ${targetCount === 1 ? 'asset' : 'assets'} (.zip)`}
			</button>
			<p className="MarketingSidebar-hint">
				PNG per asset, each platform caption as a .txt, plus a copy.csv of all text.
			</p>
		</section>
	)
}
