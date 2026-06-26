import { useMemo, useState } from 'react'
import {
	Editor,
	TLShapeId,
	TLShapePartial,
	TldrawUiButton,
	TldrawUiButtonLabel,
	createShapeId,
	toRichText,
	track,
	useEditor,
	useValue,
} from 'tldraw'
import { useComposition } from './CompositionContext'
import { embedIdeaNode, embedIdeaNodesBatch, hasCachedEmbeddings } from './embeddings'
import {
	createGroupKey,
	createIdeaNode,
	forceDirectedLayout,
	getIdeaNodeById,
	getIdeaNodes,
	getNextIdeaPosition,
	isIdeaShape,
	mdsLayout,
} from './graph'
import { parseCodeBlockFromText, parseIdeaFromText } from './llm'
import { rankAllSuggestions } from './scoring'
import { IdeaNode } from './types'

const MAX_PANEL_SUGGESTIONS = 12

export const CompositionPanel = track(function CompositionPanel() {
	const editor = useEditor()
	const {
		domain,
		setDomain,
		busyPairs,
		agentAvailable,
		error,
		setError,
		handleCompose,
		getPriorTemperature,
	} = useComposition()

	const allIdeaNodes = useValue('ideaNodes', () => getIdeaNodes(editor), [editor])
	const selectedShape = useValue('selectedShape', () => editor.getOnlySelectedShape(), [editor])
	const selectedIdea = useMemo(() => {
		if (!selectedShape || !isIdeaShape(selectedShape)) return null
		const node = getIdeaNodeById(editor, selectedShape.id)
		if (!node || node.domain !== domain) return null
		return node
	}, [domain, editor, selectedShape])

	const selectedGroup = useValue(
		'selectedGroup',
		() => {
			const shapes = editor.getSelectedShapes()
			if (shapes.length < 2) return null
			const nodes: IdeaNode[] = []
			for (const shape of shapes) {
				if (!isIdeaShape(shape)) return null
				const node = getIdeaNodeById(editor, shape.id)
				if (!node || node.domain !== domain) return null
				nodes.push(node)
			}
			return { nodes, groupKey: createGroupKey(nodes.map((n) => n.id)) }
		},
		[domain, editor]
	)

	const ideaNodes = useMemo(
		() => allIdeaNodes.filter((n) => n.domain === domain),
		[allIdeaNodes, domain]
	)

	const { pairs: suggestions, groups } = useMemo(
		() => rankAllSuggestions(ideaNodes, MAX_PANEL_SUGGESTIONS),
		[ideaNodes]
	)

	const embeddedCount = useMemo(
		() => ideaNodes.filter((n) => hasCachedEmbeddings(n.id)).length,
		[ideaNodes]
	)

	const [ideaText, setIdeaText] = useState('')
	const [parsing, setParsing] = useState<number>(0)
	const [reorganizing, setReorganizing] = useState(false)

	const selectedCodePreviewShapeId = useValue(
		'selectedCodePreviewShapeId',
		() => {
			if (!selectedIdea?.code) return null
			return findCodePreviewShapeId(editor, selectedIdea.id)
		},
		[editor, selectedIdea?.code, selectedIdea?.id]
	)

	async function handleAddPrimitives() {
		const lines = ideaText
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean)
		if (lines.length === 0) {
			setError(
				domain === 'idea'
					? 'Enter one or more ideas, one per line.'
					: 'Enter one or more logic blocks, one per line.'
			)
			return
		}
		if (!agentAvailable) {
			setError('Gemini API is not configured. Add GEMINI_API_KEY to .env.local.')
			return
		}
		setParsing(lines.length)
		setError(null)
		const errors: string[] = []

		await Promise.all(
			lines.map(async (line) => {
				try {
					const parsed =
						domain === 'code' ? await parseCodeBlockFromText(line) : await parseIdeaFromText(line)
					const pos = getNextIdeaPosition(editor)
					const id = createIdeaNode(
						editor,
						{
							domain,
							title: parsed.title,
							description: parsed.description,
							inputs: parsed.inputs,
							outputs: parsed.outputs,
							language: parsed.language,
							code: parsed.code,
							depth: 0,
							parents: [],
							status: 'seed',
						},
						pos
					)
					// Fire-and-forget: embed the new idea node
					embedIdeaNode(id, parsed).catch(() => {})
				} catch (err) {
					errors.push(`"${line.slice(0, 30)}…": ${err instanceof Error ? err.message : 'failed'}`)
				} finally {
					setParsing((prev) => prev - 1)
				}
			})
		)

		if (errors.length > 0) {
			setError(errors.join('\n'))
		} else {
			setIdeaText('')
		}
	}

	async function handleReorganize() {
		const nodes = getIdeaNodes(editor)
		if (nodes.length < 2) return
		setReorganizing(true)
		setError(null)
		try {
			// Ensure embeddings are cached before layout
			await embedIdeaNodesBatch(nodes)

			const mds = mdsLayout(nodes)
			const mdsById = mds ? new Map(mds.map((c) => [c.id, c])) : null

			const seeded = nodes.map((n) => {
				const c = mdsById?.get(n.id)
				return { ...n, x: c?.x ?? n.x, y: c?.y ?? n.y }
			})

			const positions = forceDirectedLayout(seeded)
			const partials = positions
				.map((p) => {
					const shape = editor.getShape(p.id)
					if (!shape) return null
					return { id: shape.id, type: shape.type, x: p.x, y: p.y } as TLShapePartial
				})
				.filter((p): p is TLShapePartial => p !== null)
			editor.animateShapes(partials, { animation: { duration: 800 } })
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Reorganization failed.')
		} finally {
			setReorganizing(false)
		}
	}

	function handleToggleCodePreview() {
		if (!selectedIdea?.code) return
		const existing = findCodePreviewShapeId(editor, selectedIdea.id)
		if (existing) {
			editor.deleteShapes([existing])
			return
		}

		editor.createShape({
			id: createShapeId(),
			type: 'text',
			x: selectedIdea.x + 520,
			y: selectedIdea.y,
			props: {
				richText: toRichText(`// ${selectedIdea.title}\n${selectedIdea.code}`),
				autoSize: false,
				w: 560,
				font: 'mono',
			},
			meta: {
				kind: 'idea-code-preview',
				previewFor: selectedIdea.id,
				domain: selectedIdea.domain,
			},
		})
	}

	return (
		<div className="ic-composition-panel">
			<div className="ic-composition-card">
				<div className="ic-composition-subtitle">
					{domain === 'idea'
						? 'Text-first idea lattice explorer'
						: 'Description-first program logic composer'}
				</div>
				<div className="ic-segmented">
					<button
						className="ic-seg-btn"
						data-active={domain === 'idea'}
						onClick={() => setDomain('idea')}
					>
						Idea domain
					</button>
					<button
						className="ic-seg-btn"
						data-active={domain === 'code'}
						onClick={() => setDomain('code')}
					>
						Code domain
					</button>
				</div>
				{allIdeaNodes.length >= 2 ? (
					<TldrawUiButton
						type="normal"
						className="ic-button-full"
						disabled={reorganizing || !agentAvailable}
						onClick={handleReorganize}
					>
						<TldrawUiButtonLabel>
							{reorganizing ? 'Reorganizing…' : 'Reorganize canvas'}
						</TldrawUiButtonLabel>
					</TldrawUiButton>
				) : null}
			</div>

			<div className="ic-composition-card">
				<div className="ic-composition-section-title">
					{domain === 'idea' ? 'Add ideas' : 'Add logic blocks'}
				</div>
				<textarea
					className="ic-textarea"
					placeholder={
						domain === 'idea'
							? 'One idea per line, e.g.\na chat built on a canvas\na tool for laying out trees of connected data'
							: 'One logic block per line, e.g.\nparse CLI args into config\nvalidate user input payload\nrender report rows as CSV'
					}
					value={ideaText}
					onChange={(e) => setIdeaText(e.target.value)}
				/>
				<TldrawUiButton
					type="primary"
					className="ic-button-full"
					disabled={parsing > 0 || !agentAvailable}
					onClick={handleAddPrimitives}
				>
					<TldrawUiButtonLabel>
						{parsing > 0
							? `Parsing ${parsing} ${domain === 'idea' ? 'idea' : 'block'}${parsing === 1 ? '' : 's'}…`
							: domain === 'idea'
								? 'Add ideas'
								: 'Add logic blocks'}
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</div>

			{selectedGroup ? (
				<div className="ic-composition-card">
					<div className="ic-composition-section-title">Compose selection</div>
					<div className="ic-suggestion">
						<div className="ic-suggestion-title">
							{selectedGroup.nodes.map((n) => n.title).join(' × ')}
						</div>
						{(() => {
							const temp = getPriorTemperature(selectedGroup.groupKey)
							return temp ? (
								<div className="ic-suggestion-meta">
									T: {temp.toFixed(2)} — higher = wilder ideas
								</div>
							) : null
						})()}
						<TldrawUiButton
							type="normal"
							className="ic-button-full"
							disabled={busyPairs.has(selectedGroup.groupKey) || !agentAvailable}
							onClick={() =>
								handleCompose(
									editor,
									selectedGroup.groupKey,
									selectedGroup.nodes.map((n) => n.id)
								)
							}
						>
							<TldrawUiButtonLabel>
								{busyPairs.has(selectedGroup.groupKey)
									? 'Composing…'
									: domain === 'idea'
										? `Compose ${selectedGroup.nodes.length} ideas`
										: `Compose ${selectedGroup.nodes.length} logic blocks`}
							</TldrawUiButtonLabel>
						</TldrawUiButton>
					</div>
				</div>
			) : null}

			{suggestions.length > 0 ? (
				<div className="ic-composition-card">
					<div className="ic-composition-section-title">
						Top suggestions ({suggestions.length})
						{embeddedCount < ideaNodes.length ? (
							<span className="ic-muted">
								{embeddedCount}/{ideaNodes.length} embedded
							</span>
						) : null}
					</div>
					<div className="ic-suggestions-list">
						{suggestions.map((s) => {
							const temp = getPriorTemperature(s.pairKey)
							const isBusy = busyPairs.has(s.pairKey)
							return (
								<div key={s.pairKey} className="ic-suggestion">
									<div className="ic-suggestion-title">
										{s.a.title} × {s.b.title}
									</div>
									<div className="ic-suggestion-scores">
										<span title="Interface (I/O connectivity)">
											I: {s.interfaceScore.toFixed(2)}
										</span>
										<span title="Diversity (semantic distance)">
											D: {s.diversityScore.toFixed(2)}
										</span>
										<span title="Depth penalty">P: {s.depthPenalty.toFixed(2)}</span>
										<span className="ic-score-final" title="Weighted final score">
											{s.finalScore.toFixed(3)}
										</span>
									</div>
									{temp ? (
										<div className="ic-suggestion-meta">
											T: {temp.toFixed(2)} —{' '}
											{(getPriorTemperature(s.pairKey) ?? 0) > 1.5 ? 'wild' : 'warm'}
										</div>
									) : null}
									<TldrawUiButton
										type="normal"
										className="ic-button-full"
										disabled={isBusy || !agentAvailable}
										onClick={() => handleCompose(editor, s.pairKey, [s.a.id, s.b.id])}
									>
										<TldrawUiButtonLabel>{isBusy ? 'Composing…' : 'Compose'}</TldrawUiButtonLabel>
									</TldrawUiButton>
								</div>
							)
						})}
					</div>
				</div>
			) : null}

			{groups.length > 0 ? (
				<div className="ic-composition-card">
					<div className="ic-composition-section-title">
						Multi-node combinations ({groups.length})
					</div>
					<div className="ic-suggestions-list">
						{groups.map((g) => {
							const isBusy = busyPairs.has(g.groupKey)
							const arityLabel = g.arity === 3 ? 'Triple' : 'Quad'
							return (
								<div key={g.groupKey} className="ic-suggestion">
									<div className="ic-suggestion-title">
										{g.members.map((m) => m.title).join(' × ')}
									</div>
									<div className="ic-row">
										<span className="ic-suggestion-arity">{arityLabel}</span>
										<span className="ic-suggestion-arity">{g.source}</span>
									</div>
									<div className="ic-suggestion-scores">
										<span title="Spread (avg pairwise diversity)">
											S: {g.spreadScore.toFixed(2)}
										</span>
										<span title="Mesh (avg best I/O per member)">M: {g.meshScore.toFixed(2)}</span>
										<span title="Depth penalty">P: {g.depthPenalty.toFixed(2)}</span>
										<span className="ic-score-final" title="Weighted final score">
											{g.finalScore.toFixed(3)}
										</span>
									</div>
									<TldrawUiButton
										type="normal"
										className="ic-button-full"
										disabled={isBusy || !agentAvailable}
										onClick={() =>
											handleCompose(
												editor,
												g.groupKey,
												g.members.map((m) => m.id)
											)
										}
									>
										<TldrawUiButtonLabel>
											{isBusy ? 'Composing…' : `Compose ${g.arity}`}
										</TldrawUiButtonLabel>
									</TldrawUiButton>
								</div>
							)
						})}
					</div>
				</div>
			) : null}

			<div className="ic-composition-card">
				<div className="ic-composition-section-title">
					{domain === 'idea' ? 'Selected idea' : 'Selected logic block'}
				</div>
				{selectedIdea ? (
					<>
						<div className="ic-suggestion-title">{selectedIdea.title}</div>
						<div className="ic-suggestion-meta">
							Status: {selectedIdea.status} · Depth: {selectedIdea.depth}
							{selectedIdea.language ? ` · ${selectedIdea.language}` : ''}
						</div>
						{selectedIdea.domain === 'code' && selectedIdea.code ? (
							<>
								<TldrawUiButton
									type="low"
									className="ic-button-full"
									onClick={handleToggleCodePreview}
								>
									<TldrawUiButtonLabel>
										{selectedCodePreviewShapeId ? 'Hide code' : 'View code'}
									</TldrawUiButtonLabel>
								</TldrawUiButton>
								<div className="ic-muted">
									{selectedCodePreviewShapeId
										? 'Code block is open on the canvas next to this node.'
										: 'Code stays hidden until requested.'}
								</div>
							</>
						) : null}
						<div className="ic-suggestion-meta">
							{selectedIdea.description.slice(0, 120)}
							{selectedIdea.description.length > 120 ? '…' : ''}
						</div>
					</>
				) : (
					<div className="ic-muted">
						{domain === 'idea'
							? 'Select an idea node on the canvas.'
							: 'Select a logic block node on the canvas.'}
					</div>
				)}
			</div>

			{error ? <div className="ic-error">{error}</div> : null}
		</div>
	)
})

function findCodePreviewShapeId(editor: Editor, ideaId: TLShapeId): TLShapeId | null {
	const shapes = editor.getCurrentPageShapes()
	for (const shape of shapes) {
		const meta = shape.meta as Record<string, unknown> | undefined
		if (!meta) continue
		if (meta.kind !== 'idea-code-preview') continue
		if (meta.previewFor !== ideaId) continue
		return shape.id
	}
	return null
}
