import { TLShapeId } from 'tldraw'
import { generateGeminiFlashText } from '../agent/api'
import { IdeaNode } from './types'

// --- Types ---

export interface IdeaEmbeddings {
	full: Float32Array
	inputs: Float32Array
	outputs: Float32Array
}

export interface BridgeResult {
	pass: boolean
	bridge: string
}

// --- Cache ---

const embeddingCache = new Map<TLShapeId, IdeaEmbeddings>()

export function getCachedEmbeddings(id: TLShapeId): IdeaEmbeddings | undefined {
	return embeddingCache.get(id)
}

export function hasCachedEmbeddings(id: TLShapeId): boolean {
	return embeddingCache.has(id)
}

export function clearEmbeddingCache(): void {
	embeddingCache.clear()
}

// --- Math ---

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
	if (a.length !== b.length || a.length === 0) return 0
	let dot = 0
	let normA = 0
	let normB = 0
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	const denom = Math.sqrt(normA) * Math.sqrt(normB)
	if (denom === 0) return 0
	return dot / denom
}

// --- API ---

const BATCH_LIMIT = 100

async function embedBatchRaw(texts: string[], taskType: string): Promise<Float32Array[]> {
	const response = await fetch('/api/gemini/embed', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ texts, taskType }),
	})

	if (!response.ok) {
		const errText = await response.text()
		throw new Error(`Embed API error ${response.status}: ${errText}`)
	}

	const data = (await response.json()) as {
		embeddings: Array<{ values: number[] }>
	}

	return data.embeddings.map((e) => new Float32Array(e.values))
}

export async function embedBatch(texts: string[], taskType: string): Promise<Float32Array[]> {
	if (texts.length === 0) return []
	if (texts.length <= BATCH_LIMIT) return embedBatchRaw(texts, taskType)

	// Chunk into batches of BATCH_LIMIT
	const results: Float32Array[] = []
	for (let i = 0; i < texts.length; i += BATCH_LIMIT) {
		const chunk = texts.slice(i, i + BATCH_LIMIT)
		const chunkResults = await embedBatchRaw(chunk, taskType)
		results.push(...chunkResults)
	}
	return results
}

// --- Per-idea embedding ---

function buildTexts(node: Pick<IdeaNode, 'title' | 'description' | 'inputs' | 'outputs'>): {
	full: string
	inputs: string
	outputs: string
} {
	return {
		full: `${node.title}. ${node.description}`,
		inputs: node.inputs.join(', ') || node.title,
		outputs: node.outputs.join(', ') || node.title,
	}
}

export async function embedIdeaNode(
	id: TLShapeId,
	node: Pick<IdeaNode, 'title' | 'description' | 'inputs' | 'outputs'>
): Promise<IdeaEmbeddings> {
	const existing = embeddingCache.get(id)
	if (existing) return existing

	const texts = buildTexts(node)
	const [fullVecs, ioVecs] = await Promise.all([
		embedBatch([texts.full], 'SEMANTIC_SIMILARITY'),
		embedBatch([texts.inputs, texts.outputs], 'RETRIEVAL_DOCUMENT'),
	])

	const embeddings: IdeaEmbeddings = {
		full: fullVecs[0],
		inputs: ioVecs[0],
		outputs: ioVecs[1],
	}

	embeddingCache.set(id, embeddings)
	console.log(`[Gemini Embed] cached embeddings for ${id} (${texts.full.slice(0, 60)})`)
	return embeddings
}

// --- Batch warming ---

export async function embedIdeaNodesBatch(
	nodes: Array<{ id: TLShapeId } & Pick<IdeaNode, 'title' | 'description' | 'inputs' | 'outputs'>>
): Promise<void> {
	const uncached = nodes.filter((n) => !embeddingCache.has(n.id))
	if (uncached.length === 0) return

	console.log(`[Gemini Embed] batch warming ${uncached.length} nodes...`)

	const allTexts = uncached.map((n) => buildTexts(n))

	// Batch 1: full texts for SEMANTIC_SIMILARITY
	const fullTexts = allTexts.map((t) => t.full)
	// Batch 2: interleaved inputs + outputs for RETRIEVAL_DOCUMENT
	const ioTexts = allTexts.flatMap((t) => [t.inputs, t.outputs])

	const [fullVecs, ioVecs] = await Promise.all([
		embedBatch(fullTexts, 'SEMANTIC_SIMILARITY'),
		embedBatch(ioTexts, 'RETRIEVAL_DOCUMENT'),
	])

	for (let i = 0; i < uncached.length; i++) {
		const embeddings: IdeaEmbeddings = {
			full: fullVecs[i],
			inputs: ioVecs[i * 2],
			outputs: ioVecs[i * 2 + 1],
		}
		embeddingCache.set(uncached[i].id, embeddings)
	}

	console.log(`[Gemini Embed] batch warming complete (${uncached.length} nodes cached)`)
}

// --- Bridge evaluator ---

const BRIDGE_SYSTEM_PROMPT = `You evaluate whether two ideas are productively orthogonal — different enough to create interesting combinations, but with enough conceptual overlap to bridge them.

Output valid JSON only. No markdown fences.`

export async function evaluateBridge(a: IdeaNode, b: IdeaNode): Promise<BridgeResult> {
	const prompt = `Are these two ideas productively orthogonal? Could combining them lead to a surprising insight?

Idea A: "${a.title}" — ${a.description}
Inputs: ${a.inputs.join(', ') || 'none'}
Outputs: ${a.outputs.join(', ') || 'none'}

Idea B: "${b.title}" — ${b.description}
Inputs: ${b.inputs.join(', ') || 'none'}
Outputs: ${b.outputs.join(', ') || 'none'}

Return JSON:
{
  "pass": true or false,
  "bridge": "1-2 sentences explaining the conceptual bridge between them — the shared deep structure or surprising connection that makes them composable. Be specific about the mechanism, not vague about 'synergy'."
}

Say pass=true if there's a real conceptual bridge worth exploring. Say pass=false only if they're either too similar (would just merge) or truly unrelated (no productive tension).`

	const raw = await generateGeminiFlashText(BRIDGE_SYSTEM_PROMPT, prompt)
	const start = raw.indexOf('{')
	const end = raw.lastIndexOf('}')
	if (start === -1 || end === -1 || end <= start) {
		return { pass: true, bridge: '' }
	}
	const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>
	return {
		pass: parsed.pass !== false,
		bridge: String(parsed.bridge ?? '').trim(),
	}
}
