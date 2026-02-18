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
import { useComposition } from './CompositionContext'
import {
	createGroupKey,
	createIdeaNode,
	forceDirectedLayout,
	getIdeaNodeById,
	getIdeaNodes,
	getNextIdeaPosition,
	isIdeaShape,
} from './graph'
import { clusterByTitles, parseCodeBlockFromText, parseIdeaFromText } from './llm'
import { IdeaNode } from './types'

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

	async function handleReorganize() {
		const nodes = getIdeaNodes(editor)
		if (nodes.length < 2) return
		setReorganizing(true)
		setError(null)
		try {
			const clustered = await clusterByTitles(nodes)
			const clusteredById = new Map(clustered.map((c) => [c.id, c]))

			const seeded = nodes.map((n) => {
				const c = clusteredById.get(n.id)
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
						const temp = getPriorTemperature(selectedGroup.groupKey)
						return temp ? (
							<div className="ic-suggestion-meta">T: {temp.toFixed(2)} — higher = wilder ideas</div>
						) : null
					})()}
					<button
						className="ic-button"
						disabled={busyPairs.has(selectedGroup.groupKey) || !agentAvailable}
						onClick={() =>
							handleCompose(
								editor,
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
