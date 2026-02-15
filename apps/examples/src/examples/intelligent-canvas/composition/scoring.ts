import { createPairKey } from './graph'
import { IdeaNode, PairDecision, PairSuggestion } from './types'

const DEPTH_DECAY = 0.85

// Weights for additive scoring
const W_INTERFACE = 0.4
const W_DIVERSITY = 0.4
const W_DEPTH = 0.2

function tokenize(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.split(/[^a-z0-9]+/g)
			.map((s) => s.trim())
			.filter((s) => s.length > 2)
	)
}

function tokenOverlap(aPhrases: string[], bPhrases: string[]): number {
	if (aPhrases.length === 0 || bPhrases.length === 0) return 0
	const aTokens = tokenize(aPhrases.join(' '))
	const bTokens = tokenize(bPhrases.join(' '))
	if (aTokens.size === 0 || bTokens.size === 0) return 0
	let matches = 0
	for (const token of aTokens) {
		if (bTokens.has(token)) matches++
	}
	return matches / Math.max(aTokens.size, bTokens.size)
}

function interfaceCompatibility(a: IdeaNode, b: IdeaNode): number {
	const forward = tokenOverlap(a.outputs, b.inputs)
	const backward = tokenOverlap(b.outputs, a.inputs)
	// Also count any overlap between all inputs/outputs as a weaker signal
	const broad = tokenOverlap([...a.inputs, ...a.outputs], [...b.inputs, ...b.outputs])
	return Math.max(forward, backward, broad * 0.5)
}

function jaccardDistance(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 0.5
	const union = new Set([...a, ...b])
	let intersectionCount = 0
	for (const token of a) {
		if (b.has(token)) intersectionCount++
	}
	return 1 - intersectionCount / Math.max(1, union.size)
}

function coreDiversity(a: IdeaNode, b: IdeaNode): number {
	const aTokens = tokenize(
		`${a.title} ${a.description} ${a.inputs.join(' ')} ${a.outputs.join(' ')}`
	)
	const bTokens = tokenize(
		`${b.title} ${b.description} ${b.inputs.join(' ')} ${b.outputs.join(' ')}`
	)
	return jaccardDistance(aTokens, bTokens)
}

function depthPenalty(a: IdeaNode, b: IdeaNode): number {
	const depth = Math.max(a.depth, b.depth)
	return Math.pow(DEPTH_DECAY, depth)
}

function wasRejected(pairKey: string, decisions: PairDecision[]): boolean {
	return decisions.some((d) => d.pairKey === pairKey && d.decision === 'rejected')
}

export function rankPairSuggestions(
	nodes: IdeaNode[],
	decisions: PairDecision[],
	limit: number
): PairSuggestion[] {
	const suggestions: PairSuggestion[] = []

	for (let i = 0; i < nodes.length; i++) {
		for (let j = i + 1; j < nodes.length; j++) {
			const a = nodes[i]
			const b = nodes[j]
			const pairKey = createPairKey(a.id, b.id)

			if (wasRejected(pairKey, decisions)) continue

			const interfaceScore = interfaceCompatibility(a, b)
			const diversityScore = coreDiversity(a, b)
			const depthValue = depthPenalty(a, b)
			const finalScore =
				W_INTERFACE * interfaceScore + W_DIVERSITY * diversityScore + W_DEPTH * depthValue

			suggestions.push({
				a,
				b,
				pairKey,
				interfaceScore,
				diversityScore,
				depthPenalty: depthValue,
				finalScore,
			})
		}
	}

	return suggestions.sort((x, y) => y.finalScore - x.finalScore).slice(0, limit)
}
