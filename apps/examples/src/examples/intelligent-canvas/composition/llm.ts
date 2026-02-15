import { generateGeminiText } from '../agent/api'
import { ComposedIdeaDraft, IdeaNode, ParsedIdea } from './types'

const COMPOSITION_SYSTEM_PROMPT = `You are helping generate composition ideas.

Output valid JSON only.
Do not use markdown code fences.

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

	const result = await generateGeminiText(COMPOSITION_SYSTEM_PROMPT, prompt)
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
	const prompt = `Combine these two ideas into one new idea.

Idea A
Title: ${a.title}
Description: ${a.description}
Inputs: ${a.inputs.join(', ') || 'none'}
Outputs: ${a.outputs.join(', ') || 'none'}

Idea B
Title: ${b.title}
Description: ${b.description}
Inputs: ${b.inputs.join(', ') || 'none'}
Outputs: ${b.outputs.join(', ') || 'none'}

Return JSON with this exact shape:
{
  "title": "short plain title",
  "description": "2-4 sentences. Say what the combined thing does, specifically. Simple words, full detail.",
  "inputs": ["what it needs"],
  "outputs": ["what it produces"],
  "whyThisCombination": "1-2 sentences on why these two ideas work well together"
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

	const result = await generateGeminiText(COMPOSITION_SYSTEM_PROMPT, prompt)
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
	const prompt = `Combine these two code logic blocks into one new block.

Block A
Title: ${a.title}
Description: ${a.description}
Inputs: ${a.inputs.join(', ') || 'none'}
Outputs: ${a.outputs.join(', ') || 'none'}
Language: ${a.language ?? 'TypeScript'}
Code:
${a.code ?? 'none'}

Block B
Title: ${b.title}
Description: ${b.description}
Inputs: ${b.inputs.join(', ') || 'none'}
Outputs: ${b.outputs.join(', ') || 'none'}
Language: ${b.language ?? 'TypeScript'}
Code:
${b.code ?? 'none'}

Return JSON with this exact shape:
{
  "title": "short plain title",
  "description": "2-4 sentences explaining what the composed logic does and where it fits.",
  "inputs": ["what this composed block needs"],
  "outputs": ["what this composed block produces"],
  "language": "use one language for the final block",
  "code": "10-30 lines of runnable composed code",
  "whyThisCombination": "1-2 sentences on why these blocks compose well"
}

Rules:
- Keep the code in one cohesive function or module-sized block.
- Preserve the key behavior of both inputs.
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
