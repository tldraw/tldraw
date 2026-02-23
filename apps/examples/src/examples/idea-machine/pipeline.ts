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

	const prompt = `Build a visually impressive tldraw example. This is a proof-of-concept — it should look visually impressive, and have interesting user interactions.

The idea:
- Title: ${idea.title}
- Description: ${idea.description}
- Inputs: ${idea.inputs.join(', ')}
- Outputs: ${idea.outputs.join(', ')}
- Why this combination: ${idea.whyThisCombination}

Design indication:
- Use animation, color, and movement. The canvas should feel alive.
- If not, it should be an interesting proof of concept for an idea, which is reflective of the composition.
- Stellar generative art or design engineering. Think: Bees & Bombs loops, Raven Kwok projections, Zach Lieberman's daily sketches, Refik Anadol's data sculptures, Bartosz Ciechanowski's interactive explainers, or Lyle Klyne / Rauno Freiberg / Emil Kowalski-style design engineering.
- Prefer using tldraw's built-in shapes (geo, arrow, draw, note, etc.) as your visual primitives. Animate by creating, updating, and morphing shape properties — color, size, geo type, opacity, position — rather than rendering to a Canvas2D or SVG overlay.

Key tldraw patterns you can use (pick what fits the idea):
- editor.on('tick', ...) for animation loops (60fps, use deltaMs for timing)
- InFrontOfTheCanvas component: HTML/Canvas2D overlay on top of the canvas (good for particle systems, trails)
- OnTheCanvas component: SVG layer that scales with zoom (good for shape decorations)
- Custom ShapeUtil: define new shape types with custom rendering, geometry, and handles
- editor.getViewportScreenBounds() / editor.getCamera() for camera-aware rendering
- editor.getCurrentPageShapes() to read all shapes on the page
- editor.createShapes([...]) to programmatically add shapes
- requestAnimationFrame for canvas-based rendering in overlays

Create exactly 2 files in apps/examples/src/examples/${slug}/.
IMPORTANT: Write ExampleComponent.tsx FIRST, then README.md (to avoid HMR errors).

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
