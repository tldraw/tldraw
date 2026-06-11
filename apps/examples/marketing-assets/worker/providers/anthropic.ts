import {
	ClarifyParams,
	ClarifyResult,
	parseDataUrl,
	PlanParams,
	PlanProvider,
	PlanResult,
	TextLayer,
} from './types'

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
// The planner reasons over images and brand constraints, so it defaults to a
// capable Claude vision model. Override per-deployment with the PLAN_MODEL env
// var (any Claude model with vision works); the app stays agent-agnostic.
const DEFAULT_MODEL = 'claude-opus-4-8'

const SCHEMA_DOC = [
	'Each text layer is JSON with these fields:',
	'- text: the exact words to show (use \\n for line breaks).',
	'- x, y: top-left of the text box as fractions of the image width/height (0-1).',
	'- width: text box width as a fraction of the image width (0-1).',
	'- fontRole: "heading" or "body" (maps to the brand fonts).',
	'- fontSize: text size as a fraction of the image height (e.g. 0.08).',
	'- color: a hex colour for the text.',
	'- align: "left", "center", or "right".',
	'- weight: "normal" or "bold".',
	'- scrim: true to place a contrast panel behind the text when the background is busy.',
].join('\n')

/**
 * Plans the text of a marketing asset. The image model only makes a text-free
 * background; this stage decides what words appear and exactly where, returning
 * structured layers the app renders deterministically. On a revise it also reads
 * the annotations and splits the work into text-layer updates (done here) and
 * background edits (handed back to the image model).
 */
export const anthropic: PlanProvider = {
	name: 'anthropic',

	async plan(params: PlanParams, env: Env): Promise<PlanResult> {
		const apiKey = requireApiKey(env)
		const model = env.PLAN_MODEL || DEFAULT_MODEL
		const { mimeType, data } = parseDataUrl(params.image)
		const userText = params.mode === 'create' ? createPrompt(params) : revisePrompt(params)

		const text = await callClaude(apiKey, model, systemPrompt(params.mode), [
			{ type: 'image', source: { type: 'base64', media_type: mimeType, data } },
			{ type: 'text', text: userText },
		])

		return parsePlan(text)
	},

	async clarify(params: ClarifyParams, env: Env): Promise<ClarifyResult> {
		const apiKey = requireApiKey(env)
		const model = env.PLAN_MODEL || DEFAULT_MODEL
		const text = await callClaude(apiKey, model, CLARIFY_SYSTEM, [
			{ type: 'text', text: clarifyPrompt(params) },
		])
		return parseClarify(text)
	},
}

function requireApiKey(env: Env): string {
	const apiKey = env.ANTHROPIC_API_KEY
	if (!apiKey) {
		throw new Error('ANTHROPIC_API_KEY is not configured')
	}
	return apiKey
}

/** POST a message to Claude and return the concatenated text of the reply. */
async function callClaude(
	apiKey: string,
	model: string,
	system: string,
	content: unknown[]
): Promise<string> {
	const response = await fetch(ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model,
			max_tokens: 2048,
			system,
			messages: [{ role: 'user', content }],
		}),
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Anthropic error ${response.status}: ${text}`)
	}

	const result = (await response.json()) as { content?: Array<{ type: string; text?: string }> }
	return (result.content ?? [])
		.filter((b) => b.type === 'text')
		.map((b) => b.text ?? '')
		.join('')
}

const CLARIFY_SYSTEM = [
	'You are a creative director scoping a marketing campaign before any assets are made.',
	'Given the brief, brand, and target format, ask up to 3 short, specific clarifying questions that would most improve the result — for example the audience, the single key message, the call to action, must-include elements, or hard constraints.',
	'Ask only what genuinely matters; if the brief is already clear, return an empty list.',
	'Respond with ONLY a JSON object of the form { "questions": string[] } and no other prose.',
].join('\n')

function clarifyPrompt(params: ClarifyParams): string {
	return [
		`Target format: ${params.outputType.label} (${params.outputType.width}x${params.outputType.height}).`,
		`Brief: ${params.prompt || '(none)'}`,
		params.brandText.trim() ? `Brand guidelines: ${params.brandText.trim()}` : '',
		'List the clarifying questions. Return the JSON object.',
	]
		.filter(Boolean)
		.join('\n')
}

/** Pull the questions array out of the model's reply, capped at three. */
function parseClarify(text: string): ClarifyResult {
	const start = text.indexOf('{')
	const end = text.lastIndexOf('}')
	if (start === -1 || end === -1) return { questions: [] }
	try {
		const parsed = JSON.parse(text.slice(start, end + 1)) as { questions?: unknown }
		const questions = Array.isArray(parsed.questions)
			? parsed.questions.filter((q): q is string => typeof q === 'string' && !!q.trim()).slice(0, 3)
			: []
		return { questions }
	} catch {
		return { questions: [] }
	}
}

function systemPrompt(mode: 'create' | 'revise'): string {
	const common = [
		'You are a brand designer composing a marketing asset: one clean image plus the post copy that runs alongside it (like a social post and its caption).',
		'The image you are given is a text-free background; the app will render your text layers on top of it.',
		'CRITICAL: prefer NO text on the image. Default to zero text layers — a clean, text-free image with the message carried entirely by the caption underneath is the best outcome. Add a SINGLE short headline (a few words, one line) ONLY when it clearly strengthens the asset; never add more than one, and never use the image for body copy, lists, prices, or fine print. Everything beyond a one-line headline belongs in the caption, not on the image.',
		'If you do add the one headline: keep it very short so it cannot wrap awkwardly or clip; place it over a calm, high-contrast area with x and width chosen so the whole text box stays inside the safe margins (roughly x within 0.06–0.94 and x+width <= 0.94, y within 0.06–0.9); set scrim:true if the background behind it is busy; keep contrast strong; use the brand fonts (via fontRole) and brand colours.',
		SCHEMA_DOC,
		'Separately, write the "caption": the body copy shown beside the image. This is where the message, detail, and call to action live. Voice it for the brand tone and tailor it to the target platform and audience (see the platform guidance in the user message). Respect that platform\'s length norm. Do not repeat the headline verbatim; complement it.',
		'Respond with ONLY a JSON object and no other prose.',
	]
	if (mode === 'create') {
		common.push(
			'Return: { "textLayers": TextLayer[] (length 0 or 1), "caption": string, "backgroundInstructions": [] }.'
		)
	} else {
		common.push(
			"You are shown the current asset with the user's annotations (arrows and notes) drawn on it. Arrows point at what to change; the text says how.",
			'Update the single headline layer to satisfy any annotation about on-image text (wording, size, colour, position). Keep at most one text layer.',
			'For annotations about the background imagery (colours, objects, style, composition), do not change the text — add a short instruction to backgroundInstructions, one per change.',
			'Adding, removing, moving, resizing, or restoring the LOGO or any imagery is a BACKGROUND change: put it in backgroundInstructions (e.g. "add the brand logo in the lower-right corner"), never as a text layer — the logo is an image, not text. A brand logo image is available to the image model.',
			'Re-write the caption if any annotation concerns the body copy or messaging; otherwise return it unchanged. Keep it on-tone and within the platform length norm.',
			'Return the FULL updated result.',
			'Return: { "textLayers": TextLayer[] (length 0 or 1), "caption": string, "backgroundInstructions": string[] }.'
		)
	}
	return common.join('\n')
}

/**
 * Per-platform voice and length guidance for the caption. Falls back to a sensible
 * default for formats with no platform (e.g. a print poster).
 */
function platformGuidance(platform: string | undefined): string {
	switch (platform) {
		case 'LinkedIn':
			return 'Platform: LinkedIn. Audience: professionals and decision-makers. Voice: business-focused, credible, benefit-led; lead with the insight or outcome. Length: a short hook line then 1–3 tight sentences (roughly 50–120 words). At most one or two relevant hashtags.'
		case 'X':
			return 'Platform: X (Twitter). Audience: developers and technical builders. Voice: developer-focused, direct, concrete, no marketing fluff. Length: a single punchy post under 280 characters. Hashtags sparingly, if at all.'
		case 'Instagram':
			return 'Platform: Instagram. Audience: a broad, visual-first feed. Voice: warm and vivid, scannable. Length: 1–2 short sentences (front-load the first ~125 characters, since the rest is truncated). A few tasteful hashtags are fine.'
		case 'Facebook':
			return 'Platform: Facebook. Audience: a general feed. Voice: friendly and clear with a light call to action. Length: 1–2 short sentences (around 40–80 words).'
		default:
			return 'No specific social platform. Voice: match the brand tone. Length: one or two concise sentences of supporting copy.'
	}
}

function createPrompt(params: PlanParams): string {
	return [
		`This is a ${params.outputType.label} (${params.outputType.width}x${params.outputType.height}).`,
		platformGuidance(params.outputType.platform),
		`Brief: ${params.prompt || '(none)'}`,
		params.brandText.trim() ? `Brand guidelines: ${params.brandText.trim()}` : '',
		params.captionAngle
			? `Caption angle for THIS asset: ${params.captionAngle} This asset is one of several variations on the same brief — make its caption clearly distinct from the others in angle, opening line, and wording; do not write a generic caption that could belong to any of them.`
			: '',
		'Prefer no text on the image (zero text layers); add a single short headline only if it clearly helps. Write the accompanying caption. Return the JSON object.',
	]
		.filter(Boolean)
		.join('\n')
}

function revisePrompt(params: PlanParams): string {
	return [
		`This is a ${params.outputType.label} (${params.outputType.width}x${params.outputType.height}).`,
		platformGuidance(params.outputType.platform),
		`Original brief: ${params.prompt || '(none)'}`,
		params.brandText.trim() ? `Brand guidelines: ${params.brandText.trim()}` : '',
		`Current text layers: ${JSON.stringify(params.currentLayers ?? [])}`,
		(params.annotations ?? []).length
			? `Annotations (location — change wanted):\n${(params.annotations ?? [])
					.map((a, i) => `${i + 1}. ${a}`)
					.join('\n')}`
			: 'No annotations were extracted as text — read them from the image.',
		'Update the headline and caption, and list any background edits. Return the JSON object.',
	]
		.filter(Boolean)
		.join('\n')
}

/** Robustly pull the JSON object out of the model's reply. */
function parsePlan(text: string): PlanResult {
	const start = text.indexOf('{')
	const end = text.lastIndexOf('}')
	if (start === -1 || end === -1) {
		throw new Error('Planner did not return JSON')
	}
	const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<PlanResult>
	return {
		// Hard cap at one on-image text layer so the image never crowds, whatever
		// the model returns. The rest of the message lives in the caption.
		textLayers: Array.isArray(parsed.textLayers)
			? parsed.textLayers.slice(0, 1).map(normalizeLayer)
			: [],
		caption: typeof parsed.caption === 'string' ? parsed.caption.trim() : '',
		backgroundInstructions: Array.isArray(parsed.backgroundInstructions)
			? parsed.backgroundInstructions.filter(
					(s): s is string => typeof s === 'string' && !!s.trim()
				)
			: [],
	}
}

/** Clamp and default a layer so the client always gets renderable values. */
function normalizeLayer(layer: Partial<TextLayer>): TextLayer {
	const clamp = (n: unknown, lo: number, hi: number, fallback: number) =>
		typeof n === 'number' && isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback
	return {
		text: typeof layer.text === 'string' ? layer.text : '',
		x: clamp(layer.x, 0, 1, 0.1),
		y: clamp(layer.y, 0, 1, 0.1),
		width: clamp(layer.width, 0.05, 1, 0.8),
		fontRole: layer.fontRole === 'body' ? 'body' : 'heading',
		fontSize: clamp(layer.fontSize, 0.02, 0.4, 0.08),
		color: typeof layer.color === 'string' ? layer.color : '#ffffff',
		align: layer.align === 'left' || layer.align === 'right' ? layer.align : 'center',
		weight: layer.weight === 'normal' ? 'normal' : 'bold',
		scrim: layer.scrim === true,
	}
}
