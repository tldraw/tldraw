import { GenerateParams, GenerateResult, ImageProvider, OutputType, parseDataUrl } from './types'

// Gemini's image-generation / editing model ("nano banana"). Swap this for a
// different image model — the rest of the app is provider-agnostic.
const MODEL = 'gemini-2.5-flash-image'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

interface GeminiPart {
	text?: string
	inline_data?: { mime_type: string; data: string }
	inlineData?: { mimeType: string; data: string }
}

/**
 * Generates and edits the text-free *background* of a marketing asset. All copy is
 * rendered deterministically by the app on top of this, so the image model is told
 * to produce no text at all — which removes the invented-text, legibility, and
 * alignment-drift problems that come from asking an image model to typeset.
 *
 * First generation: prompt + brand + reference images → a background.
 * Background edit: the current background + an instruction → a revised background.
 */
export const gemini: ImageProvider = {
	name: 'gemini',

	async generate(params: GenerateParams, env: Env): Promise<GenerateResult> {
		const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY
		if (!apiKey) {
			throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured')
		}

		const parts: GeminiPart[] = [{ text: buildPrompt(params) }]

		// On an edit, the current background comes first so the model edits it.
		if (params.currentImage) {
			const { mimeType, data } = parseDataUrl(params.currentImage)
			parts.push({ inline_data: { mime_type: mimeType, data } })
		}

		for (const image of params.referenceImages) {
			try {
				const { mimeType, data } = parseDataUrl(image)
				parts.push({ inline_data: { mime_type: mimeType, data } })
			} catch {
				// Skip anything that isn't a usable base64 data URL.
			}
		}

		const response = await fetch(ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-goog-api-key': apiKey,
			},
			body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
		})

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`Gemini error ${response.status}: ${text}`)
		}

		const result = (await response.json()) as {
			candidates?: Array<{ content?: { parts?: GeminiPart[] } }>
		}

		const responseParts = result.candidates?.[0]?.content?.parts ?? []
		for (const part of responseParts) {
			const inline = part.inlineData ?? part.inline_data
			if (inline) {
				const mime = (part.inlineData?.mimeType ?? part.inline_data?.mime_type) || 'image/png'
				return { imageUrl: `data:${mime};base64,${inline.data}` }
			}
		}

		throw new Error('Gemini returned no image')
	},
}

/** Compose the text instruction sent alongside the images. */
function buildPrompt(params: GenerateParams): string {
	const { prompt, brandText, outputType, instruction, currentImage } = params
	const lines: string[] = []

	if (currentImage) {
		lines.push(
			'Edit the provided background image. Apply ONLY the change described below.',
			instruction ?? prompt,
			'Keep every other part of the background in exactly the same position, scale, and crop — do not move, rescale, or reflow anything the change does not mention. Preserve the existing composition and margins so the result stays cleanly aligned.'
		)
	} else {
		lines.push(
			`Design the background for a ${outputType.label} marketing asset, ${outputType.width}x${outputType.height} pixels (${describeRatio(outputType)}).`,
			`Brief: ${prompt}`,
			'Use the provided reference images for the logo and brand imagery. Composite the logo cleanly; do not distort it.',
			'Lay it out on a clean, consistent grid with even margins and a balanced composition. Leave some calm, low-detail areas (for example near the top or bottom) where text can be placed later.'
		)
	}

	if (brandText.trim()) {
		lines.push('', 'Brand styling — apply these as visual style only:', brandText.trim())
	}

	// The app draws all text itself, so the background must contain none.
	lines.push(
		'',
		'Critical: render NO text whatsoever — no headlines, captions, taglines, labels, prices, URLs, watermarks, colour codes, or font names, and no lettering of any kind anywhere in the image. Output a purely visual background. Do not draw arrows or annotation marks.'
	)

	return lines.join('\n')
}

function describeRatio(outputType: OutputType): string {
	const { width, height } = outputType
	if (width === height) return 'square'
	return width > height ? 'landscape' : 'portrait'
}
