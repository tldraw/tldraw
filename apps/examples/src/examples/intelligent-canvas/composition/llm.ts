import { generateGeminiText } from '../agent/api'
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

const COMPOSITION_SYSTEM_PROMPT = `You are helping find insights at the intersection of two or more ideas.

Output valid JSON only.
Do not use markdown code fences.

Your job is NOT to merge ideas into a grand hybrid. Your job is to find the one surprising, specific thing you can only see by looking at both ideas together. The best output is an "oh!" moment - a simple idea that neither input alone would have suggested.

Priorities:
- Simplicity over impressiveness. The idea should feel elegant, not overengineered.
- A specific interaction or mechanic, not a vague system.
- Find the adjacent possible: the idea that was latent in both inputs, waiting to be noticed. Not the cleverest combination, but the most inevitable one.s
- Focus on what the person DOES (the verb), not what the system IS (the noun).

Writing style:
- Use simple, plain language. No jargon or filler.
- Be specific about what the thing actually does. Don't lose detail.
- Write like you're explaining the idea to a smart friend, not writing a pitch deck.
- Good: "a canvas that stays in sync between multiple people over the network"
- Bad: "a collaborative real-time multiplayer synchronization framework leveraging WebSocket infrastructure"
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

export async function composeIdeaPair(a: IdeaNode, b: IdeaNode): Promise<ComposedIdeaDraft> {
	return composeIdeas([a, b])
}

export async function composeIdeas(nodes: IdeaNode[]): Promise<ComposedIdeaDraft> {
	const ideaSections = nodes
		.map(
			(n, i) =>
				`Idea ${i + 1}\nTitle: ${n.title}\nDescription: ${n.description}\nInputs: ${n.inputs.join(', ') || 'none'}\nOutputs: ${n.outputs.join(', ') || 'none'}`
		)
		.join('\n\n')

	const prompt = `Look at these ${nodes.length} ideas together. What's the one surprising, specific thing you can only see at their intersection? Not a merger - an insight.

${ideaSections}

Think about what interaction pattern or mechanic lives in the gap between these. What would make someone say "oh, that's clever"? It can be fantastical, but it needs a core you could explain in one sentence.

Return JSON with this exact shape:
{
  "title": "short plain title, max 6 words",
  "description": "2-4 sentences. Describe the specific thing someone does or experiences - the core mechanic. Not a system description. Simple words, full detail.",
  "inputs": ["what it needs"],
  "outputs": ["what it produces"],
  "whyThisCombination": "1 sentence: what's the specific insight that only emerges from this pairing?"
}
`

	const raw = await generateGeminiText(COMPOSITION_SYSTEM_PROMPT, prompt)
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

export async function composeCodePair(a: IdeaNode, b: IdeaNode): Promise<ComposedIdeaDraft> {
	return composeCodeBlocks([a, b])
}

export async function composeCodeBlocks(nodes: IdeaNode[]): Promise<ComposedIdeaDraft> {
	const blockSections = nodes
		.map(
			(n, i) =>
				`Block ${i + 1}\nTitle: ${n.title}\nDescription: ${n.description}\nInputs: ${n.inputs.join(', ') || 'none'}\nOutputs: ${n.outputs.join(', ') || 'none'}\nLanguage: ${n.language ?? 'TypeScript'}\nCode:\n${n.code ?? 'none'}`
		)
		.join('\n\n')

	const prompt = `Look at these ${nodes.length} code blocks together. What's the one small, clever program that you can only see at their intersection? Not a merge of all the code - a new thing inspired by both.

${blockSections}

Think about what mechanic or behavior emerges from the combination. It can be playful or weird, but the code should do one clear thing.

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

	const raw = await generateGeminiText(COMPOSITION_SYSTEM_PROMPT, prompt)
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
