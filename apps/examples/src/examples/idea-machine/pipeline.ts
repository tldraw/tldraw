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

// Canvas nudge for the composition step — aim for visual impact, not minimal viability.
const CANVAS_BRIDGE = `The result should be a visually striking interactive canvas experience — think generative art meets infinite canvas. It should look impressive the moment it loads, before anyone even interacts.`

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

	const prompt = `Build a tldraw example that brings an idea to life on the canvas. It should be a proof-of-concept — interesting to look at, fun to interact with.

The idea:
- Title: ${idea.title}
- Description: ${idea.description}
- Inputs: ${idea.inputs.join(', ')}
- Outputs: ${idea.outputs.join(', ')}
- Why this combination: ${idea.whyThisCombination}

IMPORTANT — before writing any code, read the reference example:
  apps/examples/src/examples/slime-mold-fermentation/simulation.ts
  apps/examples/src/examples/slime-mold-fermentation/SlimeMoldFermentationExample.tsx
This shows the pattern: use tldraw's native shapes (geo, arrow, draw, note) as your visual primitives. Animate by creating, updating, and morphing shape properties — color, size, geo type, opacity, position, bend — in an editor.on('tick', ...) loop. Do NOT drop down to Canvas2D or SVG overlays unless the idea truly requires pixel-level rendering.

Key patterns from the reference:
- editor.createShape / editor.updateShape with native types (geo, arrow, draw, note)
- Geo shape props: geo ('rectangle','ellipse','star','cloud','triangle',...), w, h, color, fill ('solid','semi','none'), dash ('draw','solid','dashed'), size ('s','m','l','xl')
- Arrow props: start, end, color, bend, arrowheadStart, arrowheadEnd ('none','arrow','triangle',...)
- editor.on('tick', fn) for simulation/animation loops
- editor.run(() => { ... }) to batch multiple updates in one frame
- Custom StateNode tools for pointer interaction
- TLComponents to customize UI (TopPanel for controls, hide unused panels)
- editor.getShapePageBounds(id) for spatial queries

Create exactly 2 files in apps/examples/src/examples/${slug}/.
IMPORTANT: Write the main component file FIRST, then README.md (to avoid HMR errors).
You can split into multiple .ts files if the logic warrants it (like the reference does with simulation.ts).

1. ExampleComponent.tsx (default export):
- import from 'tldraw' and 'react'
- Wrap <Tldraw /> in <div className="tldraw__editor">
- import 'tldraw/tldraw.css'

2. README.md (write this LAST):
---
title: ${idea.title}
component: ./ExampleComponent.tsx
category: use-cases
priority: 3
---
${idea.description}`

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
