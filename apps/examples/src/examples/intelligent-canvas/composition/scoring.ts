import { cosineSimilarity, getCachedEmbeddings } from './embeddings'
import { createGroupKey, createPairKey } from './graph'
import { GroupSuggestion, IdeaNode, PairSuggestion, RankedSuggestions } from './types'

const DEPTH_DECAY = 0.85

// Weights for additive scoring
const W_DIVERSITY = 0.5
const W_INTERFACE = 0.35
const W_DEPTH = 0.15

// Beam expansion + random sampling constants
const BEAM_TOP_K = 10
const BEAM_WIDTH = 8
const MAX_ARITY = 4
const RANDOM_SAMPLES = 30
const WILDCARD_THRESHOLD = 0.65

// --- Token-based fallbacks (used when embeddings aren't cached yet) ---

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

function fallbackInterfaceScore(a: IdeaNode, b: IdeaNode): number {
	const forward = tokenOverlap(a.outputs, b.inputs)
	const backward = tokenOverlap(b.outputs, a.inputs)
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

function fallbackDiversityScore(a: IdeaNode, b: IdeaNode): number {
	const aTokens = tokenize(
		`${a.title} ${a.description} ${a.inputs.join(' ')} ${a.outputs.join(' ')}`
	)
	const bTokens = tokenize(
		`${b.title} ${b.description} ${b.inputs.join(' ')} ${b.outputs.join(' ')}`
	)
	return jaccardDistance(aTokens, bTokens)
}

// --- Embedding-based scoring ---

function embeddingDiversityScore(a: IdeaNode, b: IdeaNode): number | null {
	const embA = getCachedEmbeddings(a.id)
	const embB = getCachedEmbeddings(b.id)
	if (!embA || !embB) return null
	return 1 - cosineSimilarity(embA.full, embB.full)
}

function embeddingInterfaceScore(a: IdeaNode, b: IdeaNode): number | null {
	const embA = getCachedEmbeddings(a.id)
	const embB = getCachedEmbeddings(b.id)
	if (!embA || !embB) return null
	const forward = cosineSimilarity(embA.outputs, embB.inputs)
	const backward = cosineSimilarity(embB.outputs, embA.inputs)
	return Math.max(forward, backward)
}

// --- Depth penalty ---

function depthPenalty(a: IdeaNode, b: IdeaNode): number {
	const depth = Math.max(a.depth, b.depth)
	return Math.pow(DEPTH_DECAY, depth)
}

// --- Public API ---

export function rankPairSuggestions(nodes: IdeaNode[], limit: number): PairSuggestion[] {
	const suggestions: PairSuggestion[] = []

	for (let i = 0; i < nodes.length; i++) {
		for (let j = i + 1; j < nodes.length; j++) {
			const a = nodes[i]
			const b = nodes[j]
			const pairKey = createPairKey(a.id, b.id)

			// Use embedding scores when available, fall back to token-based
			const diversityScore = embeddingDiversityScore(a, b) ?? fallbackDiversityScore(a, b)
			const interfaceScore = embeddingInterfaceScore(a, b) ?? fallbackInterfaceScore(a, b)
			const depthValue = depthPenalty(a, b)
			const finalScore =
				W_DIVERSITY * diversityScore + W_INTERFACE * interfaceScore + W_DEPTH * depthValue

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

// --- Group scoring (arity >= 3) ---

function groupSpreadScore(members: IdeaNode[]): number {
	let total = 0
	let count = 0
	for (let i = 0; i < members.length; i++) {
		for (let j = i + 1; j < members.length; j++) {
			const embScore = embeddingDiversityScore(members[i], members[j])
			total += embScore ?? fallbackDiversityScore(members[i], members[j])
			count++
		}
	}
	return count > 0 ? total / count : 0
}

function groupMeshScore(members: IdeaNode[]): number {
	let total = 0
	for (let i = 0; i < members.length; i++) {
		let bestForMember = 0
		for (let j = 0; j < members.length; j++) {
			if (i === j) continue
			const embScore = embeddingInterfaceScore(members[i], members[j])
			const score = embScore ?? fallbackInterfaceScore(members[i], members[j])
			if (score > bestForMember) bestForMember = score
		}
		total += bestForMember
	}
	return members.length > 0 ? total / members.length : 0
}

function groupDepthPenalty(members: IdeaNode[]): number {
	const maxDepth = Math.max(...members.map((m) => m.depth))
	return Math.pow(DEPTH_DECAY, maxDepth)
}

function scoreGroup(members: IdeaNode[], source: GroupSuggestion['source']): GroupSuggestion {
	const sorted = [...members].sort((a, b) => (a.id < b.id ? -1 : 1))
	const spreadScore = groupSpreadScore(sorted)
	const meshScore = groupMeshScore(sorted)
	const depthValue = groupDepthPenalty(sorted)
	const finalScore = W_DIVERSITY * spreadScore + W_INTERFACE * meshScore + W_DEPTH * depthValue

	return {
		members: sorted,
		arity: sorted.length,
		groupKey: createGroupKey(sorted.map((m) => m.id)),
		spreadScore,
		meshScore,
		depthPenalty: depthValue,
		finalScore,
		source,
	}
}

// --- Beam expansion ---

function beamExpand(nodes: IdeaNode[], pairSuggestions: PairSuggestion[]): GroupSuggestion[] {
	// Seed beam with top pairs as GroupSuggestions
	const topPairs = pairSuggestions.slice(0, BEAM_TOP_K)
	let beam: GroupSuggestion[] = topPairs.map((p) => scoreGroup([p.a, p.b], 'beam'))

	const allGroups: GroupSuggestion[] = []

	for (let arity = 3; arity <= MAX_ARITY; arity++) {
		const candidates: GroupSuggestion[] = []
		const seen = new Set<string>()

		for (const group of beam) {
			const memberIds = new Set(group.members.map((m) => m.id))
			for (const node of nodes) {
				if (memberIds.has(node.id)) continue
				const newMembers = [...group.members, node]
				const key = createGroupKey(newMembers.map((m) => m.id))
				if (seen.has(key)) continue
				seen.add(key)
				candidates.push(scoreGroup(newMembers, 'beam'))
			}
		}

		candidates.sort((a, b) => b.finalScore - a.finalScore)
		beam = candidates.slice(0, BEAM_WIDTH)
		allGroups.push(...beam)
	}

	return allGroups
}

// --- Random sampling ---

function randomSample(nodes: IdeaNode[]): GroupSuggestion[] {
	const results: GroupSuggestion[] = []

	for (let arity = 3; arity <= MAX_ARITY; arity++) {
		if (nodes.length < arity) continue

		const totalCombinations = binomial(nodes.length, arity)

		if (totalCombinations <= RANDOM_SAMPLES) {
			// Score exhaustively
			const combos = allCombinations(nodes, arity)
			for (const combo of combos) {
				const group = scoreGroup(combo, 'exhaustive')
				if (group.finalScore >= WILDCARD_THRESHOLD) {
					results.push(group)
				}
			}
		} else {
			// Random sampling
			const seen = new Set<string>()
			let attempts = 0
			const maxAttempts = RANDOM_SAMPLES * 3

			while (seen.size < RANDOM_SAMPLES && attempts < maxAttempts) {
				attempts++
				const indices = randomDistinctIndices(nodes.length, arity)
				const key = indices.sort((a, b) => a - b).join(',')
				if (seen.has(key)) continue
				seen.add(key)

				const members = indices.map((i) => nodes[i])
				const group = scoreGroup(members, 'random')
				if (group.finalScore >= WILDCARD_THRESHOLD) {
					results.push(group)
				}
			}
		}
	}

	return results
}

function binomial(n: number, k: number): number {
	if (k > n) return 0
	if (k === 0 || k === n) return 1
	let result = 1
	for (let i = 0; i < k; i++) {
		result = (result * (n - i)) / (i + 1)
	}
	return Math.round(result)
}

function allCombinations(nodes: IdeaNode[], k: number): IdeaNode[][] {
	const results: IdeaNode[][] = []
	function recurse(start: number, combo: IdeaNode[]) {
		if (combo.length === k) {
			results.push([...combo])
			return
		}
		for (let i = start; i < nodes.length; i++) {
			combo.push(nodes[i])
			recurse(i + 1, combo)
			combo.pop()
		}
	}
	recurse(0, [])
	return results
}

function randomDistinctIndices(n: number, k: number): number[] {
	const indices: number[] = []
	const used = new Set<number>()
	while (indices.length < k) {
		const idx = Math.floor(Math.random() * n)
		if (!used.has(idx)) {
			used.add(idx)
			indices.push(idx)
		}
	}
	return indices
}

// --- Public API ---

export function rankAllSuggestions(nodes: IdeaNode[], pairLimit: number): RankedSuggestions {
	const pairs = rankPairSuggestions(nodes, pairLimit)

	if (nodes.length < 3) {
		return { pairs, groups: [] }
	}

	// Beam expansion from top pairs
	const beamGroups = beamExpand(nodes, pairs)

	// Random sampling for wildcards
	const randomGroups = randomSample(nodes)

	// Merge and deduplicate
	const seen = new Set<string>()
	const allGroups: GroupSuggestion[] = []

	for (const group of [...beamGroups, ...randomGroups]) {
		if (!seen.has(group.groupKey)) {
			seen.add(group.groupKey)
			allGroups.push(group)
		}
	}

	allGroups.sort((a, b) => b.finalScore - a.finalScore)

	return { pairs, groups: allGroups }
}
