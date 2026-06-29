import { TLShapeId } from 'tldraw'
import { generateGeminiProText, generateGeminiText } from '../agent/api'
import { formatPatternsForPrompt, selectRelevantPatterns } from './patternRetrieval'
import { ComposedIdeaDraft, IdeaNode, ParsedIdea } from './types'

const PARSING_SYSTEM_PROMPT = `You are helping structure raw ideas into clean primitives.

Output valid JSON only.
Do not use markdown code fences.

Writing style:
- Use simple, plain language. No jargon or filler.
- Be specific about what the thing actually does. Don't lose detail.
- Be literal and grounded. Describe the idea as-is, don't embellish or reimagine it.
- Write like you're explaining the idea to a smart friend, not writing a pitch deck.
- Good: "a canvas that stays in sync between multiple people over the network"
- Bad: "a collaborative real-time multiplayer synchronization framework leveraging WebSocket infrastructure"
`

const COMPOSITION_SYSTEM_PROMPT = `You are helping invent game ideas at the intersection of two or more ideas.

Output valid JSON only.
Do not use markdown code fences.

Your job is NOT to merge ideas into a grand hybrid genre. Your job is to find the one surprising game mechanic you can only see by looking at both ideas together. The best output is an "oh!" moment — a simple mechanic that neither input alone would have suggested, the kind of thing a player discovers and grins at.

Design lenses (use them to think; never name them in the output):
- Koster (A Theory of Fun): fun is the brain enjoying learning a pattern. A good mechanic teaches a pattern the player keeps getting better at — never trivial, never noise. If there is nothing left to master, it is not fun.
- MDA (Hunicke, LeBlanc & Zubek): mechanics produce dynamics produce aesthetics. You design the mechanic (the rule), but aim at the felt experience. Name the small rule, and the feeling it is reaching for.
- Wright (possibility space): a game is a space of possibilities the player explores. Design the space, not a fixed path. Favor a few rules that open a wide space of meaningful, surprising play — emergence over scripted content.

Priorities:
- A single core mechanic, not a whole game. What does the player DO, moment to moment?
- Emergence over content: simple rules that create surprising situations. Avoid mechanics that need lots of hand-authored levels or tutorials to be fun.
- Earned discovery: the best mechanics reward the player for noticing something, not for being told. Don't explain the trick — let it be found.
- Simplicity over impressiveness. One verb, one twist. If it needs a paragraph to explain, it's too complicated.
- Find the adjacent possible: the mechanic that was latent in both inputs, waiting to be noticed. Not the cleverest combination, but the most inevitable one.
- It should be something you'd want to see and play with on a canvas — vivid, spatial, alive.

Writing style:
- Use simple, plain language. No jargon, no genre buzzwords ("roguelike deckbuilder").
- Describe the actual moment of play. "You drag a shadow and the object it belongs to moves too."
- Write like you're pitching a mechanic to a smart friend, not writing a store page.
- Good: "you can only see enemies in the reflection of your shield, so you fight while looking away"
- Bad: "an immersive asymmetric perception-based combat system leveraging environmental reflection mechanics"
`

function extractJsonObject(text: string): string {
	const start = text.indexOf('{')
	const end = text.lastIndexOf('}')
	if (start === -1 || end === -1 || end <= start) {
		throw new Error('Model did not return JSON.')
	}
	return text.slice(start, end + 1)
}

function sanitizeList(value: unknown): string[] {
	if (!Array.isArray(value)) return []
	return value.map((v) => String(v).trim()).filter(Boolean)
}

export async function parseIdeaFromText(raw: string): Promise<ParsedIdea> {
	const prompt = `Turn this into a structured idea primitive.

Input: "${raw}"

Return JSON with this exact shape:
{
  "title": "short plain title, max 6 words",
  "description": "1-2 sentences saying what it does, specifically. Simple words, full detail.",
  "inputs": ["what this needs or takes in"],
  "outputs": ["what this produces or makes possible"]
}

List 2-4 inputs and outputs. Keep them as short noun phrases.
`

	const result = await generateGeminiText(PARSING_SYSTEM_PROMPT, prompt)
	const json = extractJsonObject(result)
	const parsed = JSON.parse(json) as Record<string, unknown>

	return {
		title: String(parsed.title ?? raw.slice(0, 40)).trim(),
		description: String(parsed.description ?? raw).trim(),
		inputs: sanitizeList(parsed.inputs),
		outputs: sanitizeList(parsed.outputs),
	}
}

const TEMP_BASE = 1.0

function buildPriorContext(priorTitles: string[]): string {
	if (priorTitles.length === 0) return ''
	return `\nAlready generated for this combination: ${priorTitles.map((t) => `"${t}"`).join(', ')}. Find a different angle.`
}

export function priorTemperature(priorCount: number): number | undefined {
	if (priorCount === 0) return undefined
	// Exponential growth: 1.3 → 1.69 → 2.20 → 2.86 → ...
	return TEMP_BASE * Math.pow(1.3, priorCount)
}

export async function composeIdeaPair(
	a: IdeaNode,
	b: IdeaNode,
	priorTitles: string[] = [],
	bridge?: string
): Promise<ComposedIdeaDraft> {
	return composeIdeas([a, b], priorTitles, bridge)
}

export async function composeIdeas(
	nodes: IdeaNode[],
	priorTitles: string[] = [],
	bridge?: string
): Promise<ComposedIdeaDraft> {
	const ideaSections = nodes
		.map(
			(n, i) =>
				`Idea ${i + 1}\nTitle: ${n.title}\nDescription: ${n.description}\nInputs: ${n.inputs.join(', ') || 'none'}\nOutputs: ${n.outputs.join(', ') || 'none'}`
		)
		.join('\n\n')

	const bridgeContext = bridge
		? `\nA prior analysis found this connection between them: "${bridge}". Use this as a starting point, but feel free to go deeper or in a different direction.\n`
		: ''

	const patternContext = formatPatternsForPrompt(await selectRelevantPatterns(nodes))

	const prompt = `Look at these ${nodes.length} ideas together. What's the one surprising game mechanic you can only see at their intersection? Not a merger — an insight a player would grin at.

${ideaSections}
${bridgeContext}${patternContext}
Think about what interaction or mechanic lives in the gap between these. What would make a player say "oh, that's clever"? It can be fantastical, but it needs a core you could explain in one sentence.
${buildPriorContext(priorTitles)}
Return JSON with this exact shape:
{
  "title": "short plain title, max 6 words",
  "description": "2-4 sentences. Describe the specific thing someone does or experiences — the core mechanic. Simple words, full detail.",
  "inputs": ["what it needs"],
  "outputs": ["what it produces"],
  "whyThisCombination": "1 sentence: what's the specific insight that only emerges from this pairing?"
}
`

	const raw = await generateGeminiProText(
		COMPOSITION_SYSTEM_PROMPT,
		prompt,
		priorTemperature(priorTitles.length)
	)
	const json = extractJsonObject(raw)
	const parsed = JSON.parse(json) as Record<string, unknown>

	return {
		title: String(parsed.title ?? 'Untitled composition').trim(),
		description: String(parsed.description ?? '').trim(),
		inputs: sanitizeList(parsed.inputs),
		outputs: sanitizeList(parsed.outputs),
		whyThisCombination: String(parsed.whyThisCombination ?? '').trim(),
	}
}

export async function parseCodeBlockFromText(raw: string): Promise<ParsedIdea> {
	const prompt = `Turn this into a tiny logic block for a program.

Input: "${raw}"

Return JSON with this exact shape:
{
  "title": "short plain title, max 6 words",
  "description": "1-2 sentences saying what this logic block does, in plain language.",
  "inputs": ["data this logic consumes"],
  "outputs": ["data this logic produces"],
  "language": "one of: TypeScript, JavaScript, Python",
  "code": "8-20 lines of runnable code for this block only"
}

Rules:
- Keep code focused on one responsibility.
- Prefer TypeScript unless the input explicitly asks for another language.
- Do not include markdown fences.
- Keep inputs and outputs as short noun phrases (2-4 each).
`

	const result = await generateGeminiText(PARSING_SYSTEM_PROMPT, prompt)
	const json = extractJsonObject(result)
	const parsed = JSON.parse(json) as Record<string, unknown>

	return {
		title: String(parsed.title ?? raw.slice(0, 40)).trim(),
		description: String(parsed.description ?? raw).trim(),
		inputs: sanitizeList(parsed.inputs),
		outputs: sanitizeList(parsed.outputs),
		language: String(parsed.language ?? 'TypeScript').trim(),
		code: String(parsed.code ?? '').trim(),
	}
}

export async function composeCodePair(
	a: IdeaNode,
	b: IdeaNode,
	priorTitles: string[] = [],
	bridge?: string
): Promise<ComposedIdeaDraft> {
	return composeCodeBlocks([a, b], priorTitles, bridge)
}

export async function composeCodeBlocks(
	nodes: IdeaNode[],
	priorTitles: string[] = [],
	bridge?: string
): Promise<ComposedIdeaDraft> {
	const blockSections = nodes
		.map(
			(n, i) =>
				`Block ${i + 1}\nTitle: ${n.title}\nDescription: ${n.description}\nInputs: ${n.inputs.join(', ') || 'none'}\nOutputs: ${n.outputs.join(', ') || 'none'}\nLanguage: ${n.language ?? 'TypeScript'}\nCode:\n${n.code ?? 'none'}`
		)
		.join('\n\n')

	const bridgeContext = bridge
		? `\nA prior analysis found this connection between them: "${bridge}". Use this as a starting point, but feel free to go deeper or in a different direction.\n`
		: ''

	const patternContext = formatPatternsForPrompt(await selectRelevantPatterns(nodes))

	const prompt = `Look at these ${nodes.length} code blocks together. What's the one small, clever game mechanic you can implement that you can only see at their intersection? Not a merge of all the code - a new playable thing inspired by both.

${blockSections}
${bridgeContext}${patternContext}
Think about what mechanic or behavior emerges from the combination. It can be playful or weird, but the code should do one clear thing.
${buildPriorContext(priorTitles)}
Return JSON with this exact shape:
{
  "title": "short plain title, max 6 words",
  "description": "2-4 sentences. What does this code do, specifically? Describe the behavior, not the architecture.",
  "inputs": ["what this block needs"],
  "outputs": ["what this block produces"],
  "language": "use one language for the final block",
  "code": "10-30 lines of runnable code that demonstrates the core idea",
  "whyThisCombination": "1 sentence: what's the insight that only emerges from this pairing?"
}

Rules:
- The code should do ONE thing well, not try to incorporate everything from both inputs.
- Keep it in one cohesive function or module-sized block.
- Do not include markdown fences.
`

	const raw = await generateGeminiProText(
		COMPOSITION_SYSTEM_PROMPT,
		prompt,
		priorTemperature(priorTitles.length)
	)
	const json = extractJsonObject(raw)
	const parsed = JSON.parse(json) as Record<string, unknown>

	return {
		title: String(parsed.title ?? 'Untitled composed logic').trim(),
		description: String(parsed.description ?? '').trim(),
		inputs: sanitizeList(parsed.inputs),
		outputs: sanitizeList(parsed.outputs),
		language: String(parsed.language ?? 'TypeScript').trim(),
		code: String(parsed.code ?? '').trim(),
		whyThisCombination: String(parsed.whyThisCombination ?? '').trim(),
	}
}

const CLUSTER_SYSTEM_PROMPT = `You are arranging ideas on a 2D canvas based on semantic similarity.

Given a list of idea titles (each with an ID), place them on a coordinate grid from 0 to 1000 in both axes. Ideas that are semantically related should be near each other. Ideas that are unrelated should be far apart. Think of it like a social graph — clusters of related concepts with space between clusters.

Output valid JSON only. No markdown fences.
Return: {"positions": [{"id": "...", "x": number, "y": number}, ...]}`

export async function clusterByTitles(
	nodes: IdeaNode[]
): Promise<{ id: TLShapeId; x: number; y: number }[]> {
	const listing = nodes.map((n) => `- ${n.id}: "${n.title}"`).join('\n')

	const prompt = `Place these ${nodes.length} ideas on a 1000x1000 grid based on semantic similarity. Related ideas should cluster together, unrelated ones should be far apart.

${listing}

Return JSON: {"positions": [{"id": "...", "x": number, "y": number}, ...]}`

	const raw = await generateGeminiText(CLUSTER_SYSTEM_PROMPT, prompt)
	const json = extractJsonObject(raw)
	const parsed = JSON.parse(json) as Record<string, unknown>
	const positions = parsed.positions
	if (!Array.isArray(positions)) {
		throw new Error('Model did not return a positions array.')
	}

	const validIds = new Set(nodes.map((n) => n.id))

	// Scale from 0-1000 grid to canvas coordinates
	const SCALE = 6 // 1000 units → 6000px canvas space

	return positions
		.filter(
			(p: unknown): p is { id: string; x: number; y: number } =>
				typeof p === 'object' &&
				p !== null &&
				typeof (p as Record<string, unknown>).id === 'string' &&
				typeof (p as Record<string, unknown>).x === 'number' &&
				typeof (p as Record<string, unknown>).y === 'number'
		)
		.filter((p) => validIds.has(p.id as any))
		.map((p) => ({
			id: p.id as TLShapeId,
			x: Math.round(p.x * SCALE),
			y: Math.round(p.y * SCALE),
		}))
}
