import { useMemo, useState } from 'react'
import {
	Editor,
	TLShapeId,
	TLShapePartial,
	createShapeId,
	toRichText,
	track,
	useEditor,
	useValue,
} from 'tldraw'
import {
	createGroupKey,
	createIdeaNode,
	forceDirectedLayout,
	getComposedIdeaPosition,
	getIdeaNodeById,
	getIdeaNodes,
	getNextIdeaPosition,
	isIdeaShape,
} from './graph'
import {
	clusterByTitles,
	composeCodeBlocks,
	composeCodePair,
	composeIdeaPair,
	composeIdeas,
	parseCodeBlockFromText,
	parseIdeaFromText,
	priorTemperature,
} from './llm'
import { rankPairSuggestions } from './scoring'
import { CompositionDomain, IdeaNode } from './types'

const MAX_SUGGESTIONS = 8

interface CompositionPanelProps {
	agentAvailable: boolean
}

export const CompositionPanel = track(function CompositionPanel({
	agentAvailable,
}: CompositionPanelProps) {
	const editor = useEditor()
	const [domain, setDomain] = useState<CompositionDomain>('idea')
	const allIdeaNodes = useValue('ideaNodes', () => getIdeaNodes(editor), [editor])
	const ideaNodes = useMemo(
		() => allIdeaNodes.filter((n) => n.domain === domain),
		[allIdeaNodes, domain]
	)
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

	const [priorCompositions, setPriorCompositions] = useState<Map<string, string[]>>(new Map())
	const [ideaText, setIdeaText] = useState('')
	const [parsing, setParsing] = useState<number>(0)
	const [busyPairs, setBusyPairs] = useState<Set<string>>(new Set())
	const [reorganizing, setReorganizing] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const suggestions = useMemo(() => rankPairSuggestions(ideaNodes, MAX_SUGGESTIONS), [ideaNodes])
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
					createIdeaNode(
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

	async function handleCompose(groupKey: string, parentIds: TLShapeId[]) {
		if (!agentAvailable) {
			setError('Gemini API is not configured. Add GEMINI_API_KEY to .env.local.')
			return
		}
		const parents: IdeaNode[] = []
		for (const pid of parentIds) {
			const node = getIdeaNodeById(editor, pid)
			if (!node) return
			parents.push(node)
		}

		const priorTitles = priorCompositions.get(groupKey) ?? []

		setBusyPairs((prev) => new Set(prev).add(groupKey))
		setError(null)
		try {
			const draft =
				parents.length === 2
					? domain === 'code'
						? await composeCodePair(parents[0], parents[1], priorTitles)
						: await composeIdeaPair(parents[0], parents[1], priorTitles)
					: domain === 'code'
						? await composeCodeBlocks(parents, priorTitles)
						: await composeIdeas(parents, priorTitles)
			const parentIds = parents.map((p) => p.id)
			const pos = getComposedIdeaPosition(editor, parentIds)
			const id = createIdeaNode(
				editor,
				{
					domain,
					title: draft.title,
					description: `${draft.description}\n\nWhy: ${draft.whyThisCombination}`,
					inputs: draft.inputs,
					outputs: draft.outputs,
					language: draft.language,
					code: draft.code,
					depth: Math.max(...parents.map((p) => p.depth)) + 1,
					parents: parentIds,
					status: 'accepted',
				},
				pos
			)
			setPriorCompositions((prev) => {
				const next = new Map(prev)
				next.set(groupKey, [...(prev.get(groupKey) ?? []), draft.title])
				return next
			})
			editor.select(id)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Composition failed.')
		} finally {
			setBusyPairs((prev) => {
				const next = new Set(prev)
				next.delete(groupKey)
				return next
			})
		}
	}

	async function handleReorganize() {
		const nodes = getIdeaNodes(editor)
		if (nodes.length < 2) return
		setReorganizing(true)
		setError(null)
		try {
			// Pass 1: LLM clusters by titles → rough semantic positions
			const clustered = await clusterByTitles(nodes)
			const clusteredById = new Map(clustered.map((c) => [c.id, c]))

			// Seed force sim with LLM positions
			const seeded = nodes.map((n) => {
				const c = clusteredById.get(n.id)
				return { ...n, x: c?.x ?? n.x, y: c?.y ?? n.y }
			})

			// Pass 2: Force-directed refinement
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
				<div className="ic-composition-title">Composition mode</div>
				<div className="ic-composition-subtitle">
					{domain === 'idea'
						? 'Text-first idea lattice explorer'
						: 'Description-first program logic composer'}
				</div>
				<div className="ic-row">
					<button
						className={`ic-button ic-button-small ${domain === 'idea' ? 'ic-button-active' : ''}`}
						onClick={() => setDomain('idea')}
					>
						Idea domain
					</button>
					<button
						className={`ic-button ic-button-small ${domain === 'code' ? 'ic-button-active' : ''}`}
						onClick={() => setDomain('code')}
					>
						Code domain
					</button>
				</div>
				{allIdeaNodes.length >= 2 ? (
					<button
						className="ic-button ic-button-small"
						disabled={reorganizing || !agentAvailable}
						onClick={handleReorganize}
					>
						{reorganizing ? 'Reorganizing...' : 'Reorganize canvas'}
					</button>
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
				<button
					className="ic-button"
					disabled={parsing > 0 || !agentAvailable}
					onClick={handleAddPrimitives}
				>
					{parsing > 0
						? `Parsing ${parsing} ${domain === 'idea' ? 'idea' : 'block'}${parsing === 1 ? '' : 's'}...`
						: domain === 'idea'
							? 'Add ideas'
							: 'Add logic blocks'}
				</button>
			</div>

			{selectedGroup ? (
				<div className="ic-composition-card">
					<div className="ic-composition-section-title">Compose selection</div>
					<div className="ic-suggestion-title">
						{selectedGroup.nodes.map((n) => n.title).join(' x ')}
					</div>
					{(() => {
						const count = priorCompositions.get(selectedGroup.groupKey)?.length ?? 0
						const temp = priorTemperature(count)
						return count > 0 ? (
							<div className="ic-suggestion-meta">
								T: {temp?.toFixed(2)} — higher = wilder ideas ({count} prior)
							</div>
						) : null
					})()}
					<button
						className="ic-button"
						disabled={busyPairs.has(selectedGroup.groupKey) || !agentAvailable}
						onClick={() =>
							handleCompose(
								selectedGroup.groupKey,
								selectedGroup.nodes.map((n) => n.id)
							)
						}
					>
						{busyPairs.has(selectedGroup.groupKey)
							? 'Composing...'
							: domain === 'idea'
								? `Compose ${selectedGroup.nodes.length} ideas`
								: `Compose ${selectedGroup.nodes.length} logic blocks`}
					</button>
				</div>
			) : null}

			<div className="ic-composition-card">
				<div className="ic-composition-section-title">
					Frontier suggestions ({suggestions.length})
				</div>
				{suggestions.length === 0 ? (
					<div className="ic-muted">Add at least two primitives to see ranked pairs.</div>
				) : (
					suggestions.map((s) => {
						const count = priorCompositions.get(s.pairKey)?.length ?? 0
						const temp = priorTemperature(count)
						return (
							<div key={s.pairKey} className="ic-suggestion">
								<div className="ic-suggestion-title">
									{s.a.title} x {s.b.title}
								</div>
								<div className="ic-suggestion-meta">
									C: {s.interfaceScore.toFixed(2)} D: {s.diversityScore.toFixed(2)} P:{' '}
									{s.depthPenalty.toFixed(2)} Score: {s.finalScore.toFixed(3)}
									{temp ? ` T: ${temp.toFixed(2)}` : ''}
								</div>
								{count > 0 ? (
									<div className="ic-muted">{count} prior — higher temp = wilder ideas</div>
								) : null}
								<button
									className="ic-button ic-button-small"
									disabled={busyPairs.has(s.pairKey) || !agentAvailable}
									onClick={() => handleCompose(s.pairKey, [s.a.id, s.b.id])}
								>
									{busyPairs.has(s.pairKey) ? 'Composing...' : 'Compose'}
								</button>
							</div>
						)
					})
				)}
			</div>

			<div className="ic-composition-card">
				<div className="ic-composition-section-title">
					{domain === 'idea' ? 'Selected idea' : 'Selected logic block'}
				</div>
				{selectedIdea ? (
					<>
						<div className="ic-suggestion-title">{selectedIdea.title}</div>
						<div className="ic-suggestion-meta">
							Status: {selectedIdea.status} Depth: {selectedIdea.depth}
							{selectedIdea.language ? ` Language: ${selectedIdea.language}` : ''}
						</div>
						{selectedIdea.domain === 'code' && selectedIdea.code ? (
							<>
								<button className="ic-button ic-button-small" onClick={handleToggleCodePreview}>
									{selectedCodePreviewShapeId ? 'Hide code' : 'View code'}
								</button>
								<div className="ic-muted">
									{selectedCodePreviewShapeId
										? 'Code block is open on the canvas next to this node.'
										: 'Code stays hidden until requested.'}
								</div>
							</>
						) : null}
						<div className="ic-suggestion-meta">
							{selectedIdea.description.slice(0, 120)}
							{selectedIdea.description.length > 120 ? '...' : ''}
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
