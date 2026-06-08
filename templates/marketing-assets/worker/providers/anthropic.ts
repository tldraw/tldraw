import { parseDataUrl, PlanParams, PlanProvider, PlanResult, TextLayer } from './types'

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
// The planner reasons over images and brand constraints, so it uses a capable
// vision model. Swap this for any Claude model with vision.
const MODEL = 'claude-opus-4-8'

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
		const apiKey = env.ANTHROPIC_API_KEY
		if (!apiKey) {
			throw new Error('ANTHROPIC_API_KEY is not configured')
		}

		const { mimeType, data } = parseDataUrl(params.image)
		const userText = params.mode === 'create' ? createPrompt(params) : revisePrompt(params)

		const response = await fetch(ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: MODEL,
				max_tokens: 2048,
				system: systemPrompt(params.mode),
				messages: [
					{
						role: 'user',
						content: [
							{ type: 'image', source: { type: 'base64', media_type: mimeType, data } },
							{ type: 'text', text: userText },
						],
					},
				],
			}),
		})

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`Anthropic error ${response.status}: ${text}`)
		}

		const result = (await response.json()) as { content?: Array<{ type: string; text?: string }> }
		const text = (result.content ?? [])
			.filter((b) => b.type === 'text')
			.map((b) => b.text ?? '')
			.join('')

		return parsePlan(text)
	},
}

function systemPrompt(mode: 'create' | 'revise'): string {
	const common = [
		'You are a brand designer laying out the text of a marketing asset.',
		'The image you are given is a text-free background; the app will render your text layers on top of it.',
		'Choose positions over calm, high-contrast areas of the background, set scrim:true where the background is busy, and keep contrast strong so text is easy to read.',
		'Use the brand fonts (via fontRole) and brand colours. Keep copy short and on-message; only include text that serves the brief.',
		SCHEMA_DOC,
		'Respond with ONLY a JSON object and no other prose.',
	]
	if (mode === 'create') {
		common.push('Return: { "textLayers": TextLayer[], "backgroundInstructions": [] }.')
	} else {
		common.push(
			'You are shown the current asset with the user\'s annotations (arrows and notes) drawn on it. Arrows point at what to change; the text says how.',
			'Update the text layers to satisfy every annotation that concerns text (wording, size, colour, position, adding or removing text).',
			'For annotations that concern the background imagery rather than text (colours, objects, style, composition), do not change the text — instead add a short instruction to backgroundInstructions, one per change.',
			'Return the FULL updated set of text layers (not just the changed ones).',
			'Return: { "textLayers": TextLayer[], "backgroundInstructions": string[] }.'
		)
	}
	return common.join('\n')
}

function createPrompt(params: PlanParams): string {
	return [
		`This is a ${params.outputType.label} (${params.outputType.width}x${params.outputType.height}).`,
		`Brief: ${params.prompt || '(none)'}`,
		params.brandText.trim() ? `Brand guidelines: ${params.brandText.trim()}` : '',
		'Lay out the text for this asset over the background. Return the JSON object.',
	]
		.filter(Boolean)
		.join('\n')
}

function revisePrompt(params: PlanParams): string {
	return [
		`This is a ${params.outputType.label} (${params.outputType.width}x${params.outputType.height}).`,
		`Original brief: ${params.prompt || '(none)'}`,
		params.brandText.trim() ? `Brand guidelines: ${params.brandText.trim()}` : '',
		`Current text layers: ${JSON.stringify(params.currentLayers ?? [])}`,
		(params.annotations ?? []).length
			? `Annotations (location — change wanted):\n${(params.annotations ?? [])
					.map((a, i) => `${i + 1}. ${a}`)
					.join('\n')}`
			: 'No annotations were extracted as text — read them from the image.',
		'Update the text layers and list any background edits. Return the JSON object.',
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
		textLayers: Array.isArray(parsed.textLayers) ? parsed.textLayers.map(normalizeLayer) : [],
		backgroundInstructions: Array.isArray(parsed.backgroundInstructions)
			? parsed.backgroundInstructions.filter((s): s is string => typeof s === 'string' && !!s.trim())
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
