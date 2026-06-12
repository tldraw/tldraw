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
	const { prompt, brandText, outputType, instruction, currentImage, referenceImages } = params
	const lines: string[] = []

	if (currentImage) {
		lines.push(
			'The FIRST image is the current background. Edit that image, applying ONLY the change described below.',
			instruction ?? prompt,
			'Keep every other part of the background in exactly the same position, scale, and crop — do not move, rescale, or reflow anything the change does not mention. Preserve the existing composition and margins so the result stays cleanly aligned.',
			// Edits run as a chain of passes (one change per pass), so any detail the
			// model redraws — a logo especially — degrades a little more on every pass.
			// Call the logo out explicitly as untouchable unless the change names it.
			'TREAT EXISTING DETAILS AS UNTOUCHABLE: any logo, wordmark, icon, product shot, or other distinct element already in the image must be preserved pixel-for-pixel — identical position, size, colours, and lettering. Do not redraw, restyle, blur, or remove them, even if your edit changes the area around them. Only alter such an element when the change above explicitly names it.'
		)
		// On an edit the brand logo and reference images are passed after the
		// background, so the model can composite them in (e.g. "add the logo").
		// Without this, those extra images are ignored and the request silently fails.
		if (referenceImages.length) {
			lines.push(
				'Any images AFTER the first are brand assets — the logo and reference imagery — not part of the background. When the change asks to add, place, or restore the logo, composite the PROVIDED logo image into the background cleanly and undistorted, at a sensible size and position; do not redraw, restyle, or invent a logo. If the background already contains the logo, use the provided logo image as ground truth: if your edit would disturb it, restore it from the provided image, undistorted, in its current position and size. Leave the rest of the background unchanged.'
			)
		}
	} else {
		lines.push(
			`Design the background for a ${outputType.label} marketing asset, ${outputType.width}x${outputType.height} pixels (${describeRatio(outputType)}).`,
			`Brief: ${prompt}`,
			'Use the provided reference images for the logo and brand imagery. Composite the logo cleanly; do not distort it.',
			'Lay it out on a clean, consistent grid with even margins and a balanced composition. Keep a generous, calm, low-detail area of negative space (for example near the top or bottom) and keep the focal subject away from the edges.'
		)
	}

	if (brandText.trim()) {
		lines.push('', 'Brand styling — apply these as visual style only:', brandText.trim())
	}

	// All copy is rendered separately by the app and shown beside/under the asset.
	// The preference is a completely text-free image: any lettering the model bakes
	// in cannot be moved or measured, so it ends up overlapping or clipping the copy.
	lines.push(
		'',
		'CRITICAL — the image must contain as little text as possible, and the strong preference is NONE. Do not add headlines, captions, taglines, body copy, labels, prices, URLs, watermarks, colour codes, font names, UI, or lettering of ANY kind anywhere in the image. Never invent words to fill space. The one and only exception is legible wordmark/lettering that already exists inside a provided brand logo, composited as-is; do not add any other text around it. Output a purely visual, text-free background with clean empty space. Do not draw arrows or annotation marks.'
	)

	return lines.join('\n')
}

function describeRatio(outputType: OutputType): string {
	const { width, height } = outputType
	if (width === height) return 'square'
	return width > height ? 'landscape' : 'portrait'
}
