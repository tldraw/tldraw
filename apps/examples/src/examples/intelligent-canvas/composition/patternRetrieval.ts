import { cosineSimilarity, embedBatch } from './embeddings'
import { GAME_DESIGN_PATTERNS, GameDesignPattern } from './gameDesignPatterns'
import { IdeaNode } from './types'

// Retrieves the handful of Björk & Holopainen game design patterns most
// relevant to the ideas being composed, so the composition prompt can use them
// as lenses without drowning in all 623. The pattern summaries are embedded
// once (lazily) and cached; each query embeds the input ideas and ranks by
// cosine similarity. Reuses the example's existing Gemini embedding infra.

let patternVectors: Float32Array[] | null = null
let warming: Promise<Float32Array[]> | null = null

async function warmPatternEmbeddings(): Promise<Float32Array[]> {
	if (patternVectors) return patternVectors
	if (!warming) {
		const texts = GAME_DESIGN_PATTERNS.map((p) => `${p.name}. ${p.summary}`)
		warming = embedBatch(texts, 'RETRIEVAL_DOCUMENT').then((vecs) => {
			patternVectors = vecs
			return vecs
		})
	}
	return warming
}

/** Kick off pattern embedding ahead of time (e.g. on canvas load) so the first
 * composition doesn't pay the warm-up cost. Safe to call repeatedly. */
export function prewarmPatterns(): void {
	void warmPatternEmbeddings().catch(() => {})
}

/** Return the top-K patterns most semantically related to the given ideas.
 * Returns [] (and never throws) if embeddings are unavailable, so composition
 * degrades gracefully to its prior behaviour. */
export async function selectRelevantPatterns(
	nodes: Pick<IdeaNode, 'title' | 'description'>[],
	k = 6
): Promise<GameDesignPattern[]> {
	try {
		const vectors = await warmPatternEmbeddings()
		const query = nodes.map((n) => `${n.title}. ${n.description}`).join(' ')
		const [queryVec] = await embedBatch([query], 'RETRIEVAL_QUERY')
		if (!queryVec) return []
		return GAME_DESIGN_PATTERNS.map((pattern, i) => ({
			pattern,
			score: cosineSimilarity(queryVec, vectors[i]),
		}))
			.sort((a, b) => b.score - a.score)
			.slice(0, k)
			.map((s) => s.pattern)
	} catch (err) {
		console.warn('[patterns] retrieval failed, composing without patterns', err)
		return []
	}
}

/** Format retrieved patterns as a prompt fragment. Empty string when there are
 * none, so it can be interpolated unconditionally. */
export function formatPatternsForPrompt(patterns: GameDesignPattern[]): string {
	if (patterns.length === 0) return ''
	const list = patterns.map((p) => `- ${p.name}: ${p.summary}`).join('\n')
	return `\nGame design patterns (Björk & Holopainen) that may be latent in the gap between these ideas. Use them as lenses to find the mechanic, not as a checklist. Do not name-drop them in the output:\n${list}\n`
}
