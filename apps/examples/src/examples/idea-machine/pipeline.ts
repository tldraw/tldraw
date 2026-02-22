import { createShapeId } from 'tldraw'
import { embedIdeaNode } from '../intelligent-canvas/composition/embeddings'
import { composeIdeas, parseIdeaFromText } from '../intelligent-canvas/composition/llm'
import { rankAllSuggestions } from '../intelligent-canvas/composition/scoring'
import type {
	ComposedIdeaDraft,
	GroupSuggestion,
	IdeaNode,
	PairSuggestion,
} from '../intelligent-canvas/composition/types'

type ProgressCallback = (message: string) => void

// Light canvas nudge — the composition system prompt already handles simplicity/adjacent-possible.
// We just need to ground it in "this is a canvas tool someone could build in a day."
const CANVAS_BRIDGE = `The result should be a simple interactive canvas tool — something one person could build in a day using tldraw. Think: what would someone draw, drag, or click? Keep it grounded.`

// --- Pipeline ---

export async function runPipeline(
	rawLines: string[],
	onProgress: ProgressCallback
): Promise<ComposedIdeaDraft[]> {
	if (rawLines.length < 2) {
		throw new Error('Need at least 2 ideas to compose')
	}

	// 1. Parse each line into a structured idea (no extra reinterpretation — keep it grounded)
	onProgress(`Parsing ${rawLines.length} ideas...`)
	const parsed = await Promise.all(rawLines.map((line) => parseIdeaFromText(line)))

	// 2. Create lightweight IdeaNode objects
	const nodes: IdeaNode[] = parsed.map((p) => ({
		id: createShapeId(),
		domain: 'idea' as const,
		title: p.title,
		description: p.description,
		inputs: p.inputs,
		outputs: p.outputs,
		depth: 0,
		parents: [],
		status: 'seed' as const,
		x: 0,
		y: 0,
	}))

	// 3. Embed all nodes
	onProgress('Embedding ideas...')
	const embeddings = await Promise.all(
		nodes.map((node) =>
			embedIdeaNode(node.id, {
				title: node.title,
				description: node.description,
				inputs: node.inputs,
				outputs: node.outputs,
			})
		)
	)

	// Attach embeddings to nodes (the scoring system reads from the embedding cache)
	void embeddings // embeddings are cached by id inside embedIdeaNode

	// 4. Score combinations
	onProgress('Scoring combinations...')
	const ranked = rankAllSuggestions(nodes, 20)

	// 5. Merge pairs + groups, take top 3 by finalScore
	const allCombos: Array<{ members: IdeaNode[]; finalScore: number }> = []

	for (const pair of ranked.pairs as PairSuggestion[]) {
		allCombos.push({ members: [pair.a, pair.b], finalScore: pair.finalScore })
	}
	for (const group of ranked.groups as GroupSuggestion[]) {
		allCombos.push({ members: group.members, finalScore: group.finalScore })
	}

	allCombos.sort((a, b) => b.finalScore - a.finalScore)
	const topCombos = allCombos.slice(0, 3)

	if (topCombos.length === 0) {
		throw new Error('No valid combinations found')
	}

	// 6. Compose each top combo — light canvas nudge via bridge, simplicity comes from system prompt
	onProgress(`Composing top ${topCombos.length} ideas...`)
	const priorTitles: string[] = []
	const drafts: ComposedIdeaDraft[] = []
	for (const combo of topCombos) {
		const draft = await composeIdeas(combo.members, priorTitles, CANVAS_BRIDGE)
		drafts.push(draft)
		priorTitles.push(draft.title)
	}

	return drafts
}

export interface BuildResult {
	slug: string
	files: string[]
	output: string
}

function toSlug(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 40)
}

export async function buildPrototype(idea: ComposedIdeaDraft): Promise<BuildResult> {
	const slug = toSlug(idea.title)

	const prompt = `Create a new tldraw example in apps/examples/src/examples/${slug}/.

The idea:
- Title: ${idea.title}
- Description: ${idea.description}
- Inputs: ${idea.inputs.join(', ')}
- Outputs: ${idea.outputs.join(', ')}
- Why this combination: ${idea.whyThisCombination}

Example file pattern to follow:

README.md:
---
title: ${idea.title}
component: ./ExampleComponent.tsx
category: use-cases
priority: 3
keywords: [canvas, interactive]
---
${idea.description}

ExampleComponent.tsx (default export):
- import { Tldraw, TLComponents } from 'tldraw'
- import 'tldraw/tldraw.css'
- Render <Tldraw persistenceKey="${slug}" components={components} /> inside <div className="tldraw__editor">
- Use InFrontOfTheCanvas for any custom overlay (Canvas 2D or SVG)

Rules:
- Only create files inside apps/examples/src/examples/${slug}/
- Import from 'tldraw' and 'react'.
- Keep it simple and self-contained.
- Make it visually interesting and interactive from the moment it loads.`

	const response = await fetch('/api/claude/build', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ prompt, slug }),
	})

	if (!response.ok) {
		const err = await response.json()
		throw new Error(err.error || `Build failed (${response.status})`)
	}

	return (await response.json()) as BuildResult
}
